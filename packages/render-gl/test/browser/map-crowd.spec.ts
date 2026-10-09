import { expect, test } from 'playwright/test';
import type { WorldSpec } from '../../harness/map.ts';
import type { MapCamera } from '../../src/map/camera.ts';

const CAPITAL = 0;
const VILLAGE = 3;
// Two countries split down x 5, with a capital at (3, 1) and a village at (7, 5).
const WORLD: WorldSpec = {
  width: 10,
  height: 8,
  country: Array.from({ length: 80 }, (_, cell) => (cell % 10 < 5 ? 1 : 2)),
  colour: [0, 4],
  settlements: [
    { cell: 13, tier: CAPITAL },
    { cell: 57, tier: VILLAGE },
  ],
};
// The capital's people on a grid south of its icon, one more over the last, one under the icon, and the village's
// few: every hue, at places a float32 holds exactly.
const PLACES: [number, number][] = [
  ...[2.75, 3, 3.25].flatMap((y) => [3.125, 3.375, 3.625, 3.875].map((x): [number, number] => [x, y])),
  [3.9375, 3.3125],
  [3.5, 1.5],
  [7.25, 6.25],
  [7.75, 6.25],
  [7.5, 6.5],
];
const CROWD = { hue: PLACES.map((_, dot) => dot % 6), xy: PLACES.flat() };

// The canvas is 160 x 120 device px, centred on the capital's people.
function centred(cellPx: number): MapCamera {
  return { x: 3.5 - 80 / cellPx, y: 3 - 60 / cellPx, cellPx };
}

// Up the ladder, then back down: the Region view holds at 16 px a cell and gives way at 8 (camera.ts's hysteresis).
const LADDER = [8, 16, 32, 48, 64, 96, 128, 16, 8].map(centred);
const VIEWS = ['country', 'country', 'region', 'region', 'region', 'region', 'region', 'region', 'country'];
const BACKENDS = ['auto', 'canvas2d'] as const;

interface Drawn {
  view: string;
  wrong: string[];
  hues: number[];
}

let errors: string[] = [];

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/map.html');
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

// Every pixel as the reference draws it, and all six hues shown in the Region view and none in the Country view.
function expectLadder(drawn: Drawn[]): void {
  expect(drawn.map((d) => d.view)).toEqual(VIEWS);
  expect(drawn.map((d) => d.wrong)).toEqual(LADDER.map(() => []));
  drawn.forEach((d, step) => {
    const shown = d.hues.map((count) => count > 0);
    expect(shown, `${LADDER[step].cellPx} px a cell`).toEqual(d.hues.map(() => d.view === 'region'));
  });
}

for (const backend of BACKENDS) {
  test(`draws the crowd from the Region view in, in body hues under the icons (${backend})`, async ({ page }) => {
    const drawn = await page.evaluate(
      async ({ world, crowd, ladder, options }) => {
        const harness = window.mapHarness;
        if (harness.bootRenderer(160, 120, { backend: options }) !== 'webgl2' && options === 'auto') return null;
        harness.world(world);
        await harness.atlas();
        harness.crowd(crowd.hue, crowd.xy);
        return ladder.map((camera) => harness.render(camera, false));
      },
      { world: WORLD, crowd: CROWD, ladder: LADDER, options: backend },
    );
    test.skip(drawn === null, 'no WebGL2 in this browser');
    expectLadder(drawn ?? []);
  });

  test(`moves the dots when the caller rewrites xy in place (${backend})`, async ({ page }) => {
    const result = await page.evaluate(
      async ({ world, crowd, camera, options }) => {
        const harness = window.mapHarness;
        if (harness.bootRenderer(160, 120, { backend: options }) !== 'webgl2' && options === 'auto') return null;
        harness.world(world);
        await harness.atlas();
        harness.crowd(crowd.hue, crowd.xy);
        const before = harness.render(camera, false);
        const from = harness.dotCentre(0, camera);
        const fromBefore = harness.pixel(...from);
        harness.moveCrowd(crowd.xy.map((at, k) => at + (k % 2 === 0 ? 0.125 : 0.0625)));
        const after = harness.render(camera, false);
        const to = harness.dotCentre(0, camera);
        return { before, after, from, to, fromBefore, fromAfter: harness.pixel(...from), toAfter: harness.pixel(...to) };
      },
      { world: WORLD, crowd: CROWD, camera: centred(64), options: backend },
    );
    test.skip(result === null, 'no WebGL2 in this browser');
    const sun = await page.evaluate(() => window.mapHarness.colours.crowd[0]);
    expect(result?.before.wrong).toEqual([]);
    expect(result?.after.wrong).toEqual([]);
    expect(result?.to).not.toEqual(result?.from);
    expect([result?.fromBefore, result?.toAfter]).toEqual([sun, sun]);
    expect(result?.fromAfter).not.toBe(sun);
  });
}

test('draws the crowd over the flat Countries view at a Region step', async ({ page }) => {
  const drawn = await page.evaluate(
    async ({ world, crowd, camera }) => {
      const harness = window.mapHarness;
      if (harness.bootRenderer(160, 120) !== 'webgl2') return null;
      harness.world(world);
      await harness.atlas();
      harness.crowd(crowd.hue, crowd.xy);
      return harness.render(camera, true);
    },
    { world: WORLD, crowd: CROWD, camera: centred(48) },
  );
  test.skip(drawn === null, 'no WebGL2 in this browser');
  expect(drawn?.wrong).toEqual([]);
  expect(drawn?.hues.every((count) => count > 0)).toBe(true);
});

test('draws the crowd again after a lost context comes back', async ({ page }) => {
  const result = await page.evaluate(
    async ({ world, crowd, camera }) => {
      const harness = window.mapHarness;
      if (harness.bootRenderer(160, 120) !== 'webgl2') return null;
      harness.world(world);
      await harness.atlas();
      harness.crowd(crowd.hue, crowd.xy);
      const before = harness.render(camera, false);
      if (!(await harness.loseContext())) return null;
      await harness.restoreContext();
      return { before, after: harness.render(camera, false) };
    },
    { world: WORLD, crowd: CROWD, camera: centred(64) },
  );
  test.skip(result === null, 'no WebGL2 context to lose in this browser');
  expect(result?.before.hues.every((count) => count > 0)).toBe(true);
  expect(result?.after).toMatchObject({ backend: 'webgl2', swapped: false, wrong: [], hues: result?.before.hues });
});

test('hands the crowd to Canvas2D when the context stays lost', async ({ page }) => {
  const drawn = await page.evaluate(
    async ({ world, crowd, camera }) => {
      const harness = window.mapHarness;
      if (harness.bootRenderer(160, 120, { restoreTimeoutMs: 100 }) !== 'webgl2') return null;
      harness.world(world);
      await harness.atlas();
      harness.crowd(crowd.hue, crowd.xy);
      if (!(await harness.loseContext())) return null;
      await new Promise((resolve) => setTimeout(resolve, 300));
      return harness.render(camera, false);
    },
    { world: WORLD, crowd: CROWD, camera: centred(96) },
  );
  test.skip(drawn === null, 'no WebGL2 context to lose in this browser');
  expect(drawn).toMatchObject({ backend: 'canvas2d', swapped: true, wrong: [] });
  expect(drawn?.hues.every((count) => count > 0)).toBe(true);
});
