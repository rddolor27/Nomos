import { expect, test, type Page } from 'playwright/test';
import { WEB } from './web.ts';

test.skip(({ browserName }) => browserName !== 'chromium', 'the HUD is plain DOM, so one engine proves it');
test.use({ baseURL: WEB });

const TOWN = '/?tier=phone';
// The HUD refreshes 4 times a second, so a value read this long after a change is settled.
const SETTLE_MS = 400;

async function open(page: Page, path = TOWN): Promise<void> {
  await page.goto(path);
  await expect(page.locator('#play')).toBeEnabled();
}

async function tick(page: Page): Promise<number> {
  return Number((await page.locator('#hud-tick').textContent())?.replaceAll(',', ''));
}

// The tick after the HUD settles, and again a second later.
async function tickOverOneSecond(page: Page): Promise<[number, number]> {
  await page.waitForTimeout(SETTLE_MS);
  const before = await tick(page);
  await page.waitForTimeout(1000);
  return [before, await tick(page)];
}

async function setVisibility(page: Page, state: 'hidden' | 'visible'): Promise<void> {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'visibilityState', { value, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

async function camera(page: Page): Promise<{ x: number; y: number; zoom: number }> {
  return page.evaluate(() => {
    const { x, y, zoom } = window.__app?.camera ?? { x: NaN, y: NaN, zoom: NaN };
    return { x, y, zoom };
  });
}

test('pauses and resumes', async ({ page }) => {
  await open(page);
  await expect.poll(() => tick(page)).toBeGreaterThan(0);
  await page.locator('#play').click();
  await expect(page.locator('#play')).toHaveText('Play');
  const [before, after] = await tickOverOneSecond(page);
  expect(after).toBe(before);
  await page.locator('#play').click();
  await expect(page.locator('#play')).toHaveText('Pause');
  await expect.poll(() => tick(page)).toBeGreaterThan(after);
});

test("lists each system's milliseconds", async ({ page }) => {
  await open(page);
  const rows = page.locator('#hud-systems dd');
  await expect.poll(() => rows.count()).toBeGreaterThanOrEqual(2);
  for (const text of await rows.allTextContents()) expect(text).toMatch(/^\d+\.\d{2} ms$/);
  await expect(page.locator('#hud-systems dt').last()).toHaveText('frame');
});

test('says when Canvas2D caps the agents', async ({ page }) => {
  await open(page, `${TOWN}&canvas`);
  await expect(page.locator('#hud-agents')).toHaveText('5,000 of 10,000 agents shown (no WebGL2)');
});

test('shows the tier the device gets', async ({ page }) => {
  await open(page, `${TOWN}&canvas`);
  await expect(page.locator('#hud-tier')).toHaveText('Phone tier');
  // Without ?tier=, a desktop gets 100,000 agents (Task 7).
  await open(page, '/?canvas');
  await expect(page.locator('#hud-tier')).toHaveText('Desktop tier');
  await expect(page.locator('#hud-agents')).toHaveText('5,000 of 100,000 agents shown (no WebGL2)');
});

test('pauses while hidden', async ({ page }) => {
  await open(page);
  await expect.poll(() => tick(page)).toBeGreaterThan(0);
  await setVisibility(page, 'hidden');
  const [before, after] = await tickOverOneSecond(page);
  expect(after).toBe(before);
  await setVisibility(page, 'visible');
  await expect.poll(() => tick(page)).toBeGreaterThan(after);
});

test('stays paused after the user paused', async ({ page }) => {
  await open(page);
  await page.locator('#play').click();
  await setVisibility(page, 'hidden');
  await setVisibility(page, 'visible');
  const [before, after] = await tickOverOneSecond(page);
  expect(after).toBe(before);
  await expect(page.locator('#play')).toHaveText('Play');
});

test('keeps Play/Pause disabled when the start fails', async ({ page }) => {
  await page.route('**/assets/maps/**', (route) => route.fulfill({ status: 404 }));
  await page.goto(TOWN);
  await expect(page.locator('#status')).toContainText('map');
  await expect(page.locator('#play')).toBeDisabled();
});

test('zooms and pans', async ({ page }) => {
  await open(page);
  const view = page.locator('#view');
  await expect(page.locator('#hud-zoom')).toHaveText('Zoom 1×');
  await view.press('+');
  await expect(page.locator('#hud-zoom')).toHaveText('Zoom 2×');
  const box = await view.boundingBox();
  if (!box) throw new Error('the view has no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -100);
  await expect(page.locator('#hud-zoom')).toHaveText('Zoom 3×');
  for (let press = 0; press < 20; press++) await view.press('-');
  await expect(page.locator('#hud-zoom')).toHaveText('Zoom 1×');

  const start = await camera(page);
  await view.press('ArrowRight');
  expect((await camera(page)).x).toBe(start.x + 16);
  // A drag moves the world with the pointer, so the camera moves the other way.
  const at = await camera(page);
  await page.mouse.move(box.x + 300, box.y + 300);
  await page.mouse.down();
  await page.mouse.move(box.x + 340, box.y + 320, { steps: 4 });
  await page.mouse.up();
  const after = await camera(page);
  expect([after.x, after.y]).toEqual([at.x - 40, at.y - 20]);
});
