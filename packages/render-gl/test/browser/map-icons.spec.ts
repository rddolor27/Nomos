import { expect, test } from 'playwright/test';
import type { WorldSpec } from '../../harness/map.ts';
import type { MapCamera, MapView } from '../../src/map/camera.ts';

const GRASS = 2;
const MOUNTAIN = 9;
const PEAK = 10;
// An 8 x 6 world: a peak, a mountain whose variant raises a low peak in the Region view, a capital with two in-place
// landmarks, a village, a geyser and a lighthouse on a cell of its own (codes from sim-protocol's name tables).
const biome = Array<number>(48).fill(GRASS);
biome[9] = PEAK;
biome[14] = MOUNTAIN;
const variant = Array<number>(48).fill(0);
variant[14] = 2;
const ICONS: WorldSpec = {
  width: 8,
  height: 6,
  biome,
  variant,
  settlements: [
    { cell: 27, tier: 0, landmarks: [3, 5] },
    { cell: 38, tier: 3 },
  ],
  wonders: [[5, 33]],
  sites: [[0, 13]],
};
const CAMERAS: [MapView, MapCamera][] = [
  ['country', { x: 0, y: 0, cellPx: 8 }],
  ['country', { x: -0.5, y: -1, cellPx: 16 }],
  ['region', { x: 0, y: 0, cellPx: 16 }],
  ['region', { x: 0.3, y: -0.6, cellPx: 32 }],
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

for (const flat of [false, true]) {
  test(`draws peaks, settlements, wonders and landmarks in row order${flat ? ', peaks aside, when flat' : ''}`, async ({
    page,
  }) => {
    const wrong = await page.evaluate(
      async ({ world, cameras, flatView }) => {
        const harness = window.mapHarness;
        if (!harness.boot(160, 120)) return null;
        harness.world(world);
        await harness.atlas();
        return cameras.map(([view, camera]) => harness.check(camera, view, flatView));
      },
      { world: ICONS, cameras: CAMERAS, flatView: flat },
    );
    test.skip(wrong === null, 'no WebGL2 in this browser');
    expect(wrong).toEqual(CAMERAS.map(() => []));
  });
}

test('draws no icon before the atlas page arrives', async ({ page }) => {
  const wrong = await page.evaluate(
    ({ world, cameras }) => {
      const harness = window.mapHarness;
      if (!harness.boot(160, 120)) return null;
      harness.world(world);
      return cameras.map(([view, camera]) => harness.check(camera, view, false));
    },
    { world: ICONS, cameras: CAMERAS },
  );
  test.skip(wrong === null, 'no WebGL2 in this browser');
  expect(wrong).toEqual(CAMERAS.map(() => []));
});
