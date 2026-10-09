import { expect, test } from 'playwright/test';
import type { WorldSpec } from '../../harness/map.ts';
import type { MapCamera, MapView } from '../../src/map/camera.ts';

// Every biome twice over a 6 x 4 world, with each cell's variant its index mod 4; the waters belong to no country.
const BIOMES = [...Array.from({ length: 12 }, (_, b) => b), ...Array.from({ length: 12 }, (_, b) => b)];
const TILES: WorldSpec = {
  width: 6,
  height: 4,
  biome: BIOMES,
  variant: BIOMES.map((_, cell) => cell % 4),
  country: BIOMES.map((b) => (b <= 1 ? 0 : 1)),
  colour: [2],
};
// Two countries split down x 3, a river along the top row, a bridged road across the middle and a sea lane below.
const LINES: WorldSpec = {
  width: 6,
  height: 3,
  country: Array.from({ length: 18 }, (_, cell) => (cell % 6 < 3 ? 1 : 2)),
  colour: [3, 4],
  river: [1, 1, 0, 0, 0, 0, ...Array<number>(12).fill(0)],
  receiver: [1, 2, -1, -1, -1, -1, ...Array<number>(12).fill(-1)],
  roads: [[6, 7, 8, 9, 10, 11]],
  bridges: [8],
  lanes: [[12, 13, 14]],
};
const CAMERAS: [MapView, MapCamera][] = [
  ['country', { x: 0, y: 0, cellPx: 8 }],
  ['country', { x: -0.5, y: -0.25, cellPx: 16 }],
  ['region', { x: 0, y: 0, cellPx: 16 }],
  ['region', { x: 0.3, y: 0.7, cellPx: 32 }],
  ['region', { x: -1, y: 0.5, cellPx: 48 }],
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

test('draws every tile texel for texel, in both views and at any camera', async ({ page }) => {
  const wrong = await page.evaluate(
    async ({ world, cameras }) => {
      const harness = window.mapHarness;
      if (!harness.boot(100, 70)) return null;
      harness.world(world);
      await harness.atlas();
      return cameras.map(([view, camera]) => harness.check(camera, view, false));
    },
    { world: TILES, cameras: CAMERAS },
  );
  test.skip(wrong === null, 'no WebGL2 in this browser');
  expect(wrong).toEqual(CAMERAS.map(() => []));
});

test('draws rivers, routes, bridges, bands and borders over the tiles', async ({ page }) => {
  const wrong = await page.evaluate(
    async ({ world, cameras }) => {
      const harness = window.mapHarness;
      if (!harness.boot(100, 70)) return null;
      harness.world(world);
      await harness.atlas();
      return cameras.map(([view, camera]) => harness.check(camera, view, false));
    },
    { world: LINES, cameras: CAMERAS },
  );
  test.skip(wrong === null, 'no WebGL2 in this browser');
  expect(wrong).toEqual(CAMERAS.map(() => []));
});

test('fills countries flat, hiding water and routes but keeping borders', async ({ page }) => {
  const result = await page.evaluate(
    async ({ world, cameras }) => {
      const harness = window.mapHarness;
      if (!harness.boot(100, 70)) return null;
      harness.world(world);
      await harness.atlas();
      const wrong = cameras.map(([view, camera]) => harness.check(camera, view, true));
      harness.check({ x: 0, y: 0, cellPx: 8 }, 'country', true);
      // In the Country view at 8 px a cell, art pixel (4, 4) is on the river and column 23 on the border.
      return { wrong, river: harness.pixel(4, 4), border: harness.pixel(23, 4), colours: harness.colours };
    },
    { world: LINES, cameras: CAMERAS },
  );
  test.skip(result === null, 'no WebGL2 in this browser');
  expect(result?.wrong).toEqual(CAMERAS.map(() => []));
  expect(result?.river).toBe(result?.colours.countries[3]);
  expect(result?.border).toBe(result?.colours.border);
});

test('draws flat until the atlas page arrives', async ({ page }) => {
  const wrong = await page.evaluate(
    ({ world, cameras }) => {
      const harness = window.mapHarness;
      if (!harness.boot(100, 70)) return null;
      harness.world(world);
      return cameras.map(([view, camera]) => harness.check(camera, view, false));
    },
    { world: LINES, cameras: CAMERAS },
  );
  test.skip(wrong === null, 'no WebGL2 in this browser');
  expect(wrong).toEqual(CAMERAS.map(() => []));
});
