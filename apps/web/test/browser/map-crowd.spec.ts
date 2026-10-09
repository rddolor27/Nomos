import { expect, test, type Locator, type Page } from 'playwright/test';
import { WEB } from './web.ts';

test.skip(({ browserName }) => browserName !== 'chromium', "the renderer's own specs draw the crowd in every engine");
test.use({ baseURL: WEB });

// The map's world comes from the seed alone, and the phone tier keeps the town light, so it never slows the map.
const TOWN = '/?seed=42&tier=phone';

async function openMap(page: Page): Promise<void> {
  await page.goto(TOWN);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('#map .map-legend li')).not.toHaveCount(0, { timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => window.__map?.frameMs ?? 0)).toBeGreaterThan(0);
}

async function crowd(page: Page): Promise<{ view?: string; dots?: number; crowdDrawn?: boolean }> {
  return page.evaluate(() => ({ view: window.__map?.view, dots: window.__map?.dots, crowdDrawn: window.__map?.crowdDrawn }));
}

// Labels come in priority order, so the first settlement labelled in the Country view is a capital. Its label hangs
// below its cell, 8 CSS px tall here, and two wheel steps over that cell reach 32 px a cell, a Region step.
async function zoomOnCapital(page: Page): Promise<void> {
  const label = page.locator('#map .map-label:not(.map-country)').filter({ visible: true }).first();
  const box = await label.boundingBox();
  if (!box) throw new Error('no settlement is labelled in the Country view');
  await page.mouse.move(box.x + box.width / 2, box.y - 4);
  await page.mouse.wheel(0, -100);
  await page.mouse.wheel(0, -100);
  await expect.poll(async () => (await crowd(page)).view).toBe('region');
}

// Nothing else on the canvas moves, so a changed frame is the crowd walking.
async function movesWithin(canvas: Locator, ms: number): Promise<boolean> {
  const first = await canvas.screenshot();
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (!(await canvas.screenshot()).equals(first)) return true;
  }
  return false;
}

test('draws no crowd in the Country view, where nothing moves', async ({ page }) => {
  await openMap(page);
  expect(await crowd(page)).toEqual({ view: 'country', dots: expect.any(Number), crowdDrawn: false });
  expect((await crowd(page)).dots).toBeGreaterThan(0);
  expect(await movesWithin(page.locator('#map canvas'), 1000)).toBe(false);
});

test('draws the crowd at a Region step, and a dot moves within a second', async ({ page }) => {
  await openMap(page);
  await zoomOnCapital(page);
  expect((await crowd(page)).crowdDrawn).toBe(true);
  expect(await movesWithin(page.locator('#map canvas'), 1000)).toBe(true);
});

test("zooms with the bar's buttons into the Region view, where the crowd draws, and back out", async ({ page }) => {
  await openMap(page);
  const zoomIn = page.getByRole('button', { name: 'Zoom in' });
  const zoomOut = page.getByRole('button', { name: 'Zoom out' });
  await expect(zoomIn).toHaveText('+');
  await expect(zoomOut).toHaveText('\u{2212}');
  await zoomIn.click();
  await zoomIn.click();
  await expect.poll(() => crowd(page)).toMatchObject({ view: 'region', crowdDrawn: true });
  // Back at 16 px a cell the Region view holds, by its 15% hysteresis, so the Country view takes a second step.
  await zoomOut.click();
  await zoomOut.click();
  await expect.poll(() => crowd(page)).toMatchObject({ view: 'country', crowdDrawn: false });
});

test('keeps every dot still under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openMap(page);
  await zoomOnCapital(page);
  expect((await crowd(page)).crowdDrawn).toBe(true);
  expect(await movesWithin(page.locator('#map canvas'), 1000)).toBe(false);
});
