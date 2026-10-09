import { PLACE_TILE_PX as TILE } from '@nomos/sim-protocol/place';
import { buildPlace, generateWorld, placeContexts } from '@nomos/worldgen';
import { expect, test } from 'playwright/test';
import { WEB } from './web.ts';

test.use({ baseURL: WEB });

// The map makes the seed's large world, so Node can build the same place and its loops to check the page against.
const SEED = 42;
const TOWN = `/?seed=${SEED}&tier=phone`;
const SAMPLES = 20;
const SAMPLE_GAP_MS = 150;

test.describe.configure({ timeout: 120_000 });

// Every spot the place's first walker can stand on: each step of its loop, one art px at a time, at the spot in the tile
// where place.py put it (walkers.ts).
function firstWalkerSpots(place: number): Set<string> {
  const { layout, walks } = buildPlace(placeContexts(generateWorld(SEED, 'large'))[place]);
  const person = walks.person[0];
  const inX = layout.people.x[person] % TILE;
  const inY = layout.people.y[person] % TILE;
  const first = walks.offsets[0];
  const length = walks.offsets[1] - first;
  const spots = new Set<string>();
  for (let leg = 0; leg < length; leg++) {
    const from = walks.cells[first + leg];
    const to = walks.cells[first + ((leg + 1) % length)];
    const [fx, fy] = [from % layout.width, Math.floor(from / layout.width)];
    const [dx, dy] = [(to % layout.width) - fx, Math.floor(to / layout.width) - fy];
    for (let into = 0; into < TILE; into++) spots.add(`${fx * TILE + inX + dx * into},${fy * TILE + inY + dy * into}`);
  }
  return spots;
}

test("walks the capital's first walker along the loop the map worker built for it", async ({ page }) => {
  await page.goto(TOWN);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  const list = page.getByRole('combobox', { name: 'Go to a settlement' });
  await expect(list).toBeEnabled({ timeout: 60_000 });
  const capital = (await list.locator('optgroup').first().locator('option').first().textContent()) ?? '';
  await list.selectOption({ label: capital });
  await page.getByRole('button', { name: `Enter ${capital}` }).click();
  await expect.poll(() => page.evaluate(() => window.__place?.ready), { timeout: 30_000 }).toBe(true);
  const place = (await page.evaluate(() => window.__place?.place)) ?? -1;
  const spots = firstWalkerSpots(place);

  const seen: string[] = [];
  for (let k = 0; k < SAMPLES; k++) {
    seen.push(await page.evaluate(() => `${window.__place?.walkerX},${window.__place?.walkerY}`));
    await page.waitForTimeout(SAMPLE_GAP_MS);
  }
  expect(new Set(seen).size, 'the first walker, walking').toBeGreaterThan(1);
  expect(seen.filter((spot) => !spots.has(spot))).toEqual([]);
});
