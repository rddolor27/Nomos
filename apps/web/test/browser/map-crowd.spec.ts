import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from 'playwright/test';
import { WEB } from './web.ts';

test.skip(({ browserName }) => browserName !== 'chromium', "the renderer's own specs draw the crowd in every engine");
test.use({ baseURL: WEB });

// The map's world comes from the seed alone, and the phone tier keeps the town light, so it never slows the map.
const TOWN = '/?seed=42&tier=phone';
// Sun, rose and silver mark only the crowd: the map's art, lines and country colours use none of them, which the
// Country view's count of none keeps checking.
const { crowd: CROWD_HEX } = JSON.parse(
  readFileSync(new URL('../../../../packages/render-gl/src/map/map-colours.json', import.meta.url), 'utf8'),
) as { crowd: Record<string, string> };
const DOT_ONLY = ['sun', 'rose', 'silver'].map((hue) => Number.parseInt(CROWD_HEX[hue].slice(1), 16));
// The labels, bar, legend box and focus ring lie over the canvas, so they hide while it is read.
const CANVAS_ONLY = '.map-labels, .ui-bar, .ui-info, #map::after { visibility: hidden; }';

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

// The canvas pixels in a dot-only colour. Node has no PNG reader, so the page decodes the screenshot.
async function dotPixels(page: Page): Promise<number> {
  const png = await page.locator('#map canvas').screenshot({ style: CANVAS_ONLY });
  return page.evaluate(
    async ({ base64, colours }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('no 2D context to read the screenshot with');
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, image.width, image.height);
      let count = 0;
      for (let at = 0; at < data.length; at += 4) {
        if (colours.includes((data[at] << 16) | (data[at + 1] << 8) | data[at + 2])) count++;
      }
      return count;
    },
    { base64: png.toString('base64'), colours: DOT_ONLY },
  );
}

// Nothing else on the canvas moves, so a changed frame is the crowd walking. The bar's buttons, which ease after a
// press, lie over the canvas, so they hide while it is read.
async function movesWithin(canvas: Locator, ms: number): Promise<boolean> {
  const first = await canvas.screenshot({ style: CANVAS_ONLY });
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (!(await canvas.screenshot({ style: CANVAS_ONLY })).equals(first)) return true;
  }
  return false;
}

test('draws no crowd in the Country view, where nothing moves', async ({ page }) => {
  await openMap(page);
  expect(await crowd(page)).toEqual({ view: 'country', dots: expect.any(Number), crowdDrawn: false });
  expect((await crowd(page)).dots).toBeGreaterThan(0);
  expect(await dotPixels(page)).toBe(0);
  expect(await movesWithin(page.locator('#map canvas'), 1000)).toBe(false);
});

test('draws the crowd at a Region step, and a dot moves within a second', async ({ page }) => {
  await openMap(page);
  await zoomOnCapital(page);
  expect(await dotPixels(page)).toBeGreaterThan(0);
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

test('stands every dot still while Pause dots is pressed, and walks them on when it is released', async ({ page }) => {
  await openMap(page);
  await zoomOnCapital(page);
  const pause = page.getByRole('button', { name: 'Pause dots' });
  const canvas = page.locator('#map canvas');
  await pause.click();
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  expect(await movesWithin(canvas, 1000)).toBe(false);
  await pause.click();
  await expect(pause).toHaveAttribute('aria-pressed', 'false');
  expect(await movesWithin(canvas, 1000)).toBe(true);
});

test('keeps every dot still under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openMap(page);
  await zoomOnCapital(page);
  expect(await dotPixels(page)).toBeGreaterThan(0);
  expect(await movesWithin(page.locator('#map canvas'), 1000)).toBe(false);
});
