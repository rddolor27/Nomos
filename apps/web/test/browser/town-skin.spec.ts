import { expect, test, type Page } from 'playwright/test';
import { WEB } from './web.ts';

// The Town skin on the first screen (interfaces.md, The Town skin). At DPR 1 a texel is a device pixel, and ?tier=phone
// spawns the phone tier's whole 10,000 on any device.
test.use({ baseURL: WEB, viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

const TOWN = '/?seed=42&tier=phone';
const AGENTS = 10_000;
// Its art, layout and first draw load in idle time, after the HUD and charts.
const LENT_MS = 60_000;
const TOWN_FAILED = 'The Town skin did not load, so the town stays dots';

let errors: string[] = [];

test.beforeEach(({ page }) => {
  errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

function drawnSkin(page: Page): Promise<string | undefined> {
  return page.evaluate(() => window.__app?.renderer.drawnSkin);
}

function waitForSkin(page: Page, skin: string): Promise<unknown> {
  return page.waitForFunction((wanted) => window.__app?.renderer.drawnSkin === wanted, skin, { timeout: LENT_MS });
}

async function zoomBy(page: Page, steps: number): Promise<void> {
  await page.locator('#view').focus();
  for (let i = 0; i < Math.abs(steps); i++) await page.keyboard.press(steps > 0 ? '+' : '-');
}

// The view as the eye sees it, with the HUD and charts out of the way.
async function viewPicture(page: Page): Promise<Buffer> {
  await page.addStyleTag({ content: '#hud, #charts, .lil-gui { visibility: hidden; }' });
  return page.locator('#view').screenshot();
}

test('draws Highcourt and every blob with the Town skin, over the hidden dots', async ({ page }) => {
  await page.goto(`${TOWN}&skin=town`);
  await waitForSkin(page, 'town');
  const shown = await page.evaluate(() => ({
    town: document.querySelector<HTMLCanvasElement>('#town')?.hidden,
    dots: window.__app?.renderer.canvas.style.visibility,
    drawn: window.__app?.renderer.drawnAgents,
  }));

  expect(shown).toEqual({ town: false, dots: 'hidden', drawn: AGENTS });
  await expect(page.getByRole('img', { name: 'Highcourt, with every agent as a blob' })).toBeVisible();
  await expect(page.locator('fieldset output')).toBeEmpty();
});

test.describe('on a 2560 x 1440 screen', () => {
  // At zoom 1 this view holds some 7,300 of the 10,000, over autoSkin's 4,600, and at zoom 2 some 1,800, under its
  // 4,000. The 1280 x 720 view holds some 1,800 at zoom 1, so it opens as the town.
  test.use({ viewport: { width: 2560, height: 1440 } });

  test('shows the town under Auto from town zoom inward, and the dots zoomed out', async ({ page }) => {
    await page.goto(TOWN);
    await page.waitForFunction(() => performance.getEntriesByName('app:interactive').length > 0);
    expect(await drawnSkin(page)).toBe('dots');
    await zoomBy(page, 1);
    await waitForSkin(page, 'town');
    await zoomBy(page, -1);
    await waitForSkin(page, 'dots');
    expect(await page.evaluate(() => document.querySelector<HTMLCanvasElement>('#town')?.hidden)).toBe(true);
    expect(await page.evaluate(() => window.__app?.renderer.canvas.style.visibility)).toBe('');
  });
});

test('keeps the dots under Dots once the town is in, and draws the town again under Town', async ({ page }) => {
  await page.goto(`${TOWN}&skin=town`);
  await waitForSkin(page, 'town');
  const radio = (name: string) => page.getByRole('radio', { name, exact: true });

  await radio('Dots').check();
  await waitForSkin(page, 'dots');
  await zoomBy(page, 4);
  expect(await drawnSkin(page)).toBe('dots');
  await radio('Town').check();
  await waitForSkin(page, 'town');
});

test.describe('paused at tick 0', () => {
  test.use({ reducedMotion: 'reduce' });

  // The same snapshot drawn by the other backend, as the fallback must draw it.
  test('draws the same picture in Canvas2D as in WebGL2', async ({ page }) => {
    await page.goto(`${TOWN}&skin=town`);
    await waitForSkin(page, 'town');
    expect(await page.evaluate(() => window.__app?.renderer.backend)).toBe('webgl2');
    const webgl = await viewPicture(page);
    await page.goto(`${TOWN}&skin=town&canvas`);
    await waitForSkin(page, 'town');
    expect(await page.evaluate(() => window.__app?.renderer.backend)).toBe('canvas2d');
    const canvas2d = await viewPicture(page);
    // So the pictures compared hold the town, never the same blank.
    await page.goto(`${TOWN}&skin=dots`);
    await page.waitForFunction(() => performance.getEntriesByName('app:interactive').length > 0);
    const dots = await viewPicture(page);

    expect(canvas2d.equals(webgl)).toBe(true);
    expect(dots.equals(webgl)).toBe(false);
  });
});

test('keeps the dots, and says why in the console, when the town art does not load', async ({ page }) => {
  await page.route('**/atlas/atlas.json', (route) => route.fulfill({ status: 404 }));
  const failed = page.waitForEvent('console', (message) => message.text().startsWith(TOWN_FAILED));
  await page.goto(`${TOWN}&skin=town`);
  await failed;

  expect(await drawnSkin(page)).toBe('dots');
  errors = errors.filter((error) => !error.startsWith(TOWN_FAILED) && !error.includes('404'));
});
