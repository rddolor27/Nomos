import { expect, test } from 'playwright/test';
import type { WorldSpec } from '../../harness/map.ts';
import type { MapCamera } from '../../src/map/camera.ts';

const GRASS = 2;
const PEAK = 10;
// Two countries, a peak, a river, a road and two settlements: enough that every part of a frame shows.
const biome = Array<number>(48).fill(GRASS);
biome[9] = PEAK;
const WORLD: WorldSpec = {
  width: 8,
  height: 6,
  biome,
  country: Array.from({ length: 48 }, (_, cell) => (cell % 8 < 4 ? 1 : 2)),
  colour: [0, 4],
  river: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, ...Array<number>(36).fill(0)],
  receiver: [...Array<number>(10).fill(-1), 11, 12, ...Array<number>(36).fill(-1)],
  roads: [[24, 25, 26, 27, 28, 29]],
  settlements: [
    { cell: 26, tier: 0, landmarks: [3] },
    { cell: 37, tier: 3 },
  ],
};
// Up the ladder and back down: the view gives way to Region at 32 px a cell, and holds at 16 on the way back.
const LADDER: MapCamera[] = [
  { x: 0, y: 0, cellPx: 8 },
  { x: 0, y: 0, cellPx: 16 },
  { x: 0.25, y: -0.5, cellPx: 32 },
  { x: 0, y: 0, cellPx: 16 },
  { x: -1, y: 0, cellPx: 8 },
];

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

test('draws through WebGL2 and picks the view by CSS px a cell, with hysteresis', async ({ page }) => {
  const result = await page.evaluate(
    async ({ world, ladder }) => {
      const harness = window.mapHarness;
      const backend = harness.bootRenderer(160, 120);
      if (backend !== 'webgl2') return null;
      harness.world(world);
      await harness.atlas();
      return ladder.map((camera) => harness.render(camera, false));
    },
    { world: WORLD, ladder: LADDER },
  );
  test.skip(result === null, 'no WebGL2 in this browser');
  expect(result?.map((r) => r.view)).toEqual(['country', 'country', 'region', 'region', 'country']);
  expect(result?.map((r) => r.wrong)).toEqual(LADDER.map(() => []));
});

test('falls back to Canvas2D when asked: flat fills and settlement icons', async ({ page }) => {
  const result = await page.evaluate(
    async ({ world, ladder }) => {
      const harness = window.mapHarness;
      const backend = harness.bootRenderer(160, 120, { backend: 'canvas2d' });
      harness.world(world);
      const before = harness.render(ladder[0], false);
      await harness.atlas();
      return { backend, before, after: ladder.map((camera) => harness.render(camera, false)) };
    },
    { world: WORLD, ladder: LADDER },
  );
  expect(result.backend).toBe('canvas2d');
  expect(result.before.wrong).toEqual([]);
  expect(result.after.map((r) => r.wrong)).toEqual(LADDER.map(() => []));
});

test('recovers a lost context', async ({ page }) => {
  const result = await page.evaluate(
    async ({ world, camera }) => {
      const harness = window.mapHarness;
      if (harness.bootRenderer(160, 120) !== 'webgl2') return null;
      harness.world(world);
      await harness.atlas();
      const before = harness.render(camera, false);
      if (!(await harness.loseContext())) return null;
      let threw = false;
      try {
        harness.render(camera, false);
      } catch {
        threw = true;
      }
      await harness.restoreContext();
      return { before, threw, after: harness.render(camera, false) };
    },
    { world: WORLD, camera: LADDER[2] },
  );
  test.skip(result === null, 'no WebGL2 context to lose in this browser');
  expect(result?.threw).toBe(false);
  expect(result?.before.wrong).toEqual([]);
  expect(result?.after).toMatchObject({ backend: 'webgl2', swapped: false, wrong: [] });
});

// The app draws only on demand, so nothing else would draw the map again.
test('draws the last frame again when a lost context comes back, unasked', async ({ page }) => {
  const result = await page.evaluate(
    async ({ world, camera }) => {
      const harness = window.mapHarness;
      if (harness.bootRenderer(160, 120) !== 'webgl2') return null;
      harness.world(world);
      await harness.atlas();
      const before = harness.render(camera, false);
      if (!(await harness.loseContext())) return null;
      await harness.restoreContext();
      return { before, after: harness.shown(camera, false) };
    },
    { world: WORLD, camera: LADDER[2] },
  );
  test.skip(result === null, 'no WebGL2 context to lose in this browser');
  expect(result?.before.wrong).toEqual([]);
  expect(result?.after).toMatchObject({ backend: 'webgl2', view: result?.before.view, swapped: false, wrong: [] });
});

test('falls back to Canvas2D when the context stays lost', async ({ page }) => {
  const result = await page.evaluate(
    async ({ world, camera }) => {
      const harness = window.mapHarness;
      if (harness.bootRenderer(160, 120, { restoreTimeoutMs: 100 }) !== 'webgl2') return null;
      harness.world(world);
      await harness.atlas();
      if (!(await harness.loseContext())) return null;
      await new Promise((resolve) => setTimeout(resolve, 300));
      return harness.render(camera, false);
    },
    { world: WORLD, camera: LADDER[1] },
  );
  test.skip(result === null, 'no WebGL2 context to lose in this browser');
  expect(result).toMatchObject({ backend: 'canvas2d', swapped: true, wrong: [] });
});

test('draws the last frame on the Canvas2D canvas when the context stays lost, unasked', async ({ page }) => {
  const result = await page.evaluate(
    async ({ world, camera }) => {
      const harness = window.mapHarness;
      if (harness.bootRenderer(160, 120, { restoreTimeoutMs: 100 }) !== 'webgl2') return null;
      harness.world(world);
      await harness.atlas();
      const before = harness.render(camera, false);
      if (!(await harness.loseContext())) return null;
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { before, after: harness.shown(camera, false) };
    },
    { world: WORLD, camera: LADDER[1] },
  );
  test.skip(result === null, 'no WebGL2 context to lose in this browser');
  expect(result?.before.wrong).toEqual([]);
  expect(result?.after).toMatchObject({ backend: 'canvas2d', swapped: true, wrong: [] });
});
