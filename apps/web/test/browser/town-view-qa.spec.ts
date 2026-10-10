import { PLACE_TILE_PX as TILE } from '@nomos/sim-protocol/place';
import { crowdedPlace, generateWorld, placeContexts } from '@nomos/worldgen';
import { expect, test } from 'playwright/test';
import { WEB } from './web.ts';

test.use({ baseURL: WEB });

// The map makes the seed's large world, so Node can build the same place and its streets to check the page against.
const SEED = 42;
const TOWN = `/?seed=${SEED}&tier=phone`;
const SAMPLES = 20;
const SAMPLE_GAP_MS = 150;
// A walker steps at most 4 art px along each axis a tick, and a frame draws it eased between its last two ticks, so a
// drawn walker lies within a step of a tile it stood on, even where its step cut a corner.
const STEP_PX = 4;

test.describe.configure({ timeout: 120_000 });

// The tiles the place's first walker may stand on: the street network, every tile of every walk loop and of the street
// crowd's loops, within the box of the first walker's own loop (walkers.ts).
function firstWalkerTiles(place: number): { width: number; open: Set<number> } {
  const { layout, walks, crowd } = crowdedPlace(placeContexts(generateWorld(SEED, 'large'))[place]);
  const width = layout.width;
  const loop = Array.from(walks.cells.subarray(walks.offsets[0], walks.offsets[1]));
  const xs = loop.map((cell) => cell % width);
  const ys = loop.map((cell) => Math.floor(cell / width));
  const inBox = (cell: number): boolean => {
    const [x, y] = [cell % width, Math.floor(cell / width)];
    return x >= Math.min(...xs) && x <= Math.max(...xs) && y >= Math.min(...ys) && y <= Math.max(...ys);
  };
  return { width, open: new Set([...walks.cells, ...crowd.cells].filter(inBox)) };
}

function onStreets(spot: string, width: number, open: Set<number>): boolean {
  const [x, y] = spot.split(',').map(Number);
  const near = [-STEP_PX, 0, STEP_PX];
  return near.some((dy) => near.some((dx) => open.has(Math.floor((y + dy) / TILE) * width + Math.floor((x + dx) / TILE))));
}

test("walks the capital's first walker on the street network the map worker built for it", async ({ page }) => {
  await page.goto(TOWN);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  const list = page.getByRole('combobox', { name: 'Go to a settlement' });
  await expect(list).toBeEnabled({ timeout: 60_000 });
  const capital = (await list.locator('optgroup').first().locator('option').first().textContent()) ?? '';
  await list.selectOption({ label: capital });
  await page.getByRole('button', { name: `Enter ${capital}` }).click();
  await expect.poll(() => page.evaluate(() => window.__place?.ready), { timeout: 30_000 }).toBe(true);
  const place = (await page.evaluate(() => window.__place?.place)) ?? -1;
  const { width, open } = firstWalkerTiles(place);

  const seen: string[] = [];
  for (let k = 0; k < SAMPLES; k++) {
    seen.push(await page.evaluate(() => `${window.__place?.walkerX},${window.__place?.walkerY}`));
    await page.waitForTimeout(SAMPLE_GAP_MS);
  }
  expect(new Set(seen).size, 'the first walker, walking').toBeGreaterThan(1);
  expect(seen.filter((spot) => !onStreets(spot, width, open))).toEqual([]);
});
