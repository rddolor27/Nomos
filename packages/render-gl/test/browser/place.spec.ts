import { readFileSync } from 'node:fs';
import { expect, test } from 'playwright/test';
import type { PlaceCamera } from '../../src/place/camera.ts';
import type { PlacePixels } from '../place-fixtures.ts';

const FIXTURES = (
  JSON.parse(readFileSync(new URL('../fixtures/places-v1.json', import.meta.url), 'utf8')) as { places: { name: string; pixels: PlacePixels }[] }
).places;
const CAPITAL = FIXTURES.find((place) => place.name === 'capital')?.pixels;
const ONE_TO_ONE: PlaceCamera = { x: 0, y: 0, scale: 1 };
// round(x * scale) is 201 and round(y * scale) 121: a camera between whole device pixels, snapped the same way by both.
const OFF_THE_GRID: PlaceCamera = { x: 100.3, y: 60.6, scale: 2 };
// Two people in that view: a merchant with an emote nudged within its row, and a walker with an emote carried down
// past five people on row 190.
const MOVES: [person: number, dx: number, dy: number][] = [
  [3, 5, 3],
  [22, -7, 40],
];

let errors: string[] = [];

// The harness builds the town atlas on its first request, which takes seconds.
test.describe.configure({ timeout: 90_000 });

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/place.html');
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

for (const { name, pixels } of FIXTURES) {
  const expected = { width: pixels.width, height: pixels.height, sha256: pixels.sha256 };

  test(`draws the ${name} place as placedraw.py does through WebGL2, pixel for pixel`, async ({ page }) => {
    const shown = await page.evaluate(
      async ({ name, camera }) => {
        const harness = window.placeHarness;
        if ((await harness.boot(name, 1)) !== 'webgl2') return null;
        return harness.render(camera);
      },
      { name, camera: ONE_TO_ONE },
    );
    test.skip(shown === null, 'no WebGL2 in this browser');
    expect(shown).toEqual({ backend: 'webgl2', swapped: false, ...expected });
  });

  test(`draws the ${name} place as placedraw.py does through Canvas2D, pixel for pixel`, async ({ page }) => {
    const shown = await page.evaluate(
      async ({ name, camera }) => {
        const harness = window.placeHarness;
        await harness.boot(name, 1, { backend: 'canvas2d' });
        return harness.render(camera);
      },
      { name, camera: ONE_TO_ONE },
    );
    expect(shown).toEqual({ backend: 'canvas2d', swapped: false, ...expected });
  });
}

// placedraw.py's 1x picture holds at every scale: a 2x frame is the 1x frame scaled up by nearest neighbour.
for (const backend of ['webgl2', 'canvas2d'] as const) {
  test(`draws each place at 2x as its 1x picture scaled up, through ${backend}`, async ({ page }) => {
    const drawn = await page.evaluate(
      async ({ names, backend }) => {
        const harness = window.placeHarness;
        const options = backend === 'canvas2d' ? { backend } : undefined;
        const out: { name: string; one: string; upscaled: string; two: string }[] = [];
        for (const name of names) {
          if ((await harness.boot(name, 1, options)) !== backend) return null;
          const one = await harness.render({ x: 0, y: 0, scale: 1 });
          const upscaled = await harness.render({ x: 0, y: 0, scale: 1 }, 2);
          await harness.boot(name, 2, options);
          const two = await harness.render({ x: 0, y: 0, scale: 2 });
          out.push({ name, one: one.sha256, upscaled: upscaled.sha256, two: two.sha256 });
        }
        return out;
      },
      { names: FIXTURES.map((place) => place.name), backend },
    );
    test.skip(drawn === null, `no ${backend} in this browser`);
    for (const { name, one, upscaled, two } of drawn ?? []) {
      expect(one, `${name} at 1x`).toBe(FIXTURES.find((place) => place.name === name)?.pixels.sha256);
      expect(two, `${name} at 2x`).toBe(upscaled);
    }
  });
}

test('redraws moved people, and both backends draw them alike at 2x off the whole pixel', async ({ page }) => {
  const result = await page.evaluate(
    async ({ camera, moves }) => {
      const harness = window.placeHarness;
      if ((await harness.boot('capital', 1)) !== 'webgl2') return null;
      const before = await harness.render(camera);
      for (const [j, dx, dy] of moves) harness.move(j, dx, dy);
      const moved = await harness.render(camera);
      for (const [j, dx, dy] of moves) harness.move(j, -dx, -dy);
      const back = await harness.render(camera);
      await harness.boot('capital', 1, { backend: 'canvas2d' });
      for (const [j, dx, dy] of moves) harness.move(j, dx, dy);
      const canvasMoved = await harness.render(camera);
      return { before: before.sha256, moved: moved.sha256, back: back.sha256, canvasMoved: canvasMoved.sha256 };
    },
    { camera: OFF_THE_GRID, moves: MOVES },
  );
  test.skip(result === null, 'no WebGL2 in this browser');
  expect(result?.moved).not.toBe(result?.before);
  expect(result?.back).toBe(result?.before);
  expect(result?.canvasMoved).toBe(result?.moved);
});

test('draws the place again when a lost context comes back, unasked', async ({ page }) => {
  const result = await page.evaluate(
    async ({ camera }) => {
      const harness = window.placeHarness;
      if ((await harness.boot('capital', 1)) !== 'webgl2') return null;
      const before = await harness.render(camera);
      if (!(await harness.loseContext())) return null;
      await harness.restoreContext();
      return { before, after: await harness.shown() };
    },
    { camera: ONE_TO_ONE },
  );
  test.skip(result === null, 'no WebGL2 context to lose in this browser');
  expect(result?.before.sha256).toBe(CAPITAL?.sha256);
  expect(result?.after).toMatchObject({ backend: 'webgl2', swapped: false, sha256: CAPITAL?.sha256 });
});

test('falls back to Canvas2D and draws the same place when the context stays lost', async ({ page }) => {
  const result = await page.evaluate(
    async ({ camera }) => {
      const harness = window.placeHarness;
      if ((await harness.boot('capital', 1, { restoreTimeoutMs: 100 })) !== 'webgl2') return null;
      await harness.render(camera);
      if (!(await harness.loseContext())) return null;
      await new Promise((resolve) => setTimeout(resolve, 300));
      return harness.shown();
    },
    { camera: ONE_TO_ONE },
  );
  test.skip(result === null, 'no WebGL2 context to lose in this browser');
  expect(result).toMatchObject({ backend: 'canvas2d', swapped: true, sha256: CAPITAL?.sha256 });
});
