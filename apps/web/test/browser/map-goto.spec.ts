import { expect, test, type Locator, type Page } from 'playwright/test';
import { WEB } from './web.ts';

test.skip(({ browserName }) => browserName !== 'chromium', 'the map view is plain DOM over the renderer, so one engine proves it');
test.use({ baseURL: WEB });

// The map's world comes from the seed alone, and the phone tier keeps the town light, so it never slows the map.
const TOWN = '/?seed=42&tier=phone';
// At DPR 1 a settlement opens at 64 CSS px a cell, and its label hangs from its cell's bottom edge, half a cell below
// the cell's centre.
const HALF_CELL_CSS = 32;

async function openMap(page: Page): Promise<void> {
  await page.goto(TOWN);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('#map .map-legend li')).not.toHaveCount(0, { timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => window.__map?.frameMs ?? 0)).toBeGreaterThan(0);
}

function goToList(page: Page): Locator {
  return page.getByRole('combobox', { name: 'Go to a settlement' });
}

function view(page: Page): Promise<string | undefined> {
  return page.evaluate(() => window.__map?.view);
}

// Where a settlement's label sits, in CSS px from the view's centre.
async function offCentre(page: Page, name: string): Promise<{ x: number; y: number }> {
  const map = await page.locator('#map').boundingBox();
  const label = await page.locator('#map .map-label').filter({ hasText: new RegExp(`^${name}$`) }).boundingBox();
  if (!map || !label) throw new Error(`no label shows ${name}`);
  return { x: label.x + label.width / 2 - (map.x + map.width / 2), y: label.y - (map.y + map.height / 2) };
}

async function expectCentred(page: Page, name: string): Promise<void> {
  await expect.poll(() => view(page)).toBe('region');
  const { x, y } = await offCentre(page, name);
  expect(Math.abs(x), `${name}, across`).toBeLessThanOrEqual(1);
  expect(Math.abs(y - HALF_CELL_CSS), `${name}, down`).toBeLessThanOrEqual(1);
}

test('lists each country with its capital first, and centres the view on the settlement chosen', async ({ page }) => {
  await openMap(page);
  const [country, capital] = /^(.+): capital (.+), \d+ settlements?$/.exec(
    (await page.locator('#map .map-legend li').nth(1).textContent()) ?? '',
  )?.slice(1) ?? ['', ''];
  const group = goToList(page).locator('optgroup').nth(1);
  await expect(group).toHaveAttribute('label', country);
  await expect(group.locator('option').first()).toHaveText(capital);

  // selectOption leaves focus where it was, so the list takes it first, as a pick by mouse or keys gives it.
  await goToList(page).focus();
  await goToList(page).selectOption({ label: capital });
  await expectCentred(page, capital);
  // The list keeps its choice until it loses focus, then shows its placeholder again.
  await page.locator('#map').focus();
  await expect(goToList(page)).toHaveValue('');
});

test("walks town by town with the list's arrow keys", async ({ page }) => {
  await openMap(page);
  const options = goToList(page).locator('optgroup').first().locator('option');
  const first = (await options.nth(0).textContent()) ?? '';
  await goToList(page).focus();
  await goToList(page).press('ArrowDown');
  await expectCentred(page, first);
  await goToList(page).press('ArrowDown');
  await expect(goToList(page)).toHaveValue((await options.nth(1).getAttribute('value')) ?? '');
});

test('jumps to the settlement clicked on the map', async ({ page }) => {
  await openMap(page);
  // Labels come in priority order, so the first settlement labelled in the Country view is a capital. Its label hangs
  // below its cell, 8 CSS px tall here.
  const label = page.locator('#map .map-label:not(.map-country)').filter({ visible: true }).first();
  const name = (await label.textContent()) ?? '';
  const box = await label.boundingBox();
  if (!box) throw new Error('no settlement is labelled in the Country view');
  await page.mouse.click(box.x + box.width / 2, box.y - 4);
  await expectCentred(page, name);
});
