import { expect, test, type Page } from 'playwright/test';
import { WEB } from './web.ts';

test.skip(({ browserName }) => browserName !== 'chromium', 'the HUD is plain DOM, so one engine proves it');
test.use({ baseURL: WEB });

const TOWN = '/?tier=phone';
// The HUD refreshes 4 times a second, so a value read this long after a change is settled.
const SETTLE_MS = 400;
const TOUCH_TARGET_CSS_PX = 44;
// The buttons between the HUD's 8 px of padding.
const ONE_ROW_CSS_PX = TOUCH_TARGET_CSS_PX + 2 * 8;
const HUD_BUTTONS = '#hud > button, #speed button';
// The inspector's longest line, about 75 characters. On a phone it may be 20rem of 15 px wide, and a line of text is
// 21 px tall.
const LONG_LINE = 'Marisol Ardent-Vale, works at Shop 12 for 1,428.00 a month, wallet 3,100.00';
const INSPECTOR_MAX_CSS_PX = 20 * 15;
const LINE_CSS_PX = 21;

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

test('sets the speed from the buttons and the keys 1 to 3, and the town runs faster', async ({ page }) => {
  await open(page);
  const group = page.getByRole('group', { name: 'Speed' });
  const [one, four, sixteen] = ['1×', '4×', '16×'].map((name) => group.getByRole('button', { name, exact: true }));
  await expect(one).toHaveAttribute('aria-pressed', 'true');
  await expect(four).toHaveAttribute('aria-pressed', 'false');
  const [slowBefore, slowAfter] = await tickOverOneSecond(page);

  await four.click();
  await expect(four).toHaveAttribute('aria-pressed', 'true');
  await expect(one).toHaveAttribute('aria-pressed', 'false');
  // Focus is on the 4× button, and a digit pressed there still picks a speed, as it does in the view.
  await page.keyboard.press('3');
  await expect(sixteen).toHaveAttribute('aria-pressed', 'true');
  await expect(four).toHaveAttribute('aria-pressed', 'false');
  const [fastBefore, fastAfter] = await tickOverOneSecond(page);
  expect(fastAfter - fastBefore).toBeGreaterThan(4 * (slowAfter - slowBefore));

  await page.locator('#view').press('1');
  await expect(one).toHaveAttribute('aria-pressed', 'true');
  await expect(sixteen).toHaveAttribute('aria-pressed', 'false');
});

test("lists each system's milliseconds for ?dev=1 only", async ({ page }) => {
  await open(page);
  await expect.poll(() => tick(page)).toBeGreaterThan(0);
  await expect(page.locator('#hud-systems')).toHaveCount(0);

  await open(page, `${TOWN}&dev=1`);
  const rows = page.locator('#hud-systems dd');
  await expect.poll(() => rows.count()).toBeGreaterThanOrEqual(2);
  for (const text of await rows.allTextContents()) expect(text).toMatch(/^\d+\.\d{2} ms$/);
  await expect(page.locator('#hud-systems dt').last()).toHaveText('frame');
});

test('keeps the HUD to one row of 44 px buttons, and scrolls it only on a phone', async ({ page }) => {
  await open(page);
  await expect.poll(() => tick(page)).toBeGreaterThan(0);
  for (const [size, scrolls] of [
    [{ width: 1280, height: 720 }, false],
    [{ width: 390, height: 844 }, true],
  ] as const) {
    await page.setViewportSize(size);
    // Play, the three speeds and Map.
    const buttons = await page.locator(HUD_BUTTONS).all();
    expect(buttons).toHaveLength(5);
    for (const button of buttons) {
      const box = await button.boundingBox();
      if (!box) throw new Error('a HUD button has no box');
      expect(box.width).toBeGreaterThanOrEqual(TOUCH_TARGET_CSS_PX);
      expect(box.height).toBeGreaterThanOrEqual(TOUCH_TARGET_CSS_PX);
    }
    const row = await page.locator('#hud').evaluate((hud) => ({
      height: hud.getBoundingClientRect().height,
      overflows: hud.scrollWidth > hud.clientWidth,
    }));
    expect(row.height, `the HUD's height at ${size.width} px`).toBeLessThanOrEqual(ONE_ROW_CSS_PX);
    expect(row.overflows, `the HUD's sideways scroll at ${size.width} px`).toBe(scrolls);
  }
});

test('wraps the inspector line within itself where the HUD row scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page.waitForFunction(() => performance.getEntriesByName('app:interactive').length > 0);
  await page.locator('#view').press('Enter');
  const line = page.locator('#inspector');
  await expect(line).toHaveText(/./);

  // The longest line the inspector writes is about 75 characters, which would make the row about 500 px wider.
  await line.evaluate((node, text) => {
    node.textContent = text;
  }, LONG_LINE);
  const box = await line.boundingBox();
  if (!box) throw new Error('the inspector line has no box');
  expect(box.width).toBeLessThanOrEqual(INSPECTOR_MAX_CSS_PX);
  expect(box.height).toBeGreaterThan(LINE_CSS_PX);
  const hud = await page.locator('#hud').boundingBox();
  expect(hud?.height).toBeLessThanOrEqual(ONE_ROW_CSS_PX);
});

test('says when Canvas2D caps the agents', async ({ page }) => {
  await open(page, `${TOWN}&canvas`);
  await expect(page.locator('#hud-agents')).toHaveText('5,000 of 10,000 agents shown (no WebGL2)');
});

test('shows the tier the device gets', async ({ page }) => {
  await open(page, `${TOWN}&canvas`);
  await expect(page.locator('#hud-tier')).toHaveText('Phone tier');
  // Without ?tier=, a desktop fills Highcourt's 15,862 walkable tiles at one blob to two, past Canvas2D's cap.
  await open(page, '/?canvas');
  await expect(page.locator('#hud-tier')).toHaveText('Desktop tier');
  await expect(page.locator('#hud-agents')).toHaveText('5,000 of 7,931 agents shown (no WebGL2)');
});

test.describe('on a phone whose storage throws', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  });

  // As in Safari's private mode, where reading localStorage at all can throw.
  test('starts at the phone tier', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
      });
    });
    await open(page, '/');
    const read = await page.evaluate(() => {
      try {
        return window.localStorage ? 'read' : 'empty';
      } catch {
        return 'threw';
      }
    });
    expect(read).toBe('threw');
    await expect(page.locator('#hud-tier')).toHaveText('Phone tier');
    // Highcourt's 15,862 walkable tiles at one blob to four.
    await expect(page.locator('#hud-agents')).toContainText('3,965 agents');
  });
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
  const view = page.locator('#view');
  // Paused from the start, as under reduced motion, so the town redraws only when the camera moves. A running town
  // redraws every frame, which SwiftShader's software GL makes slow enough to hold up each key and pointer event here.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await expect(view).toHaveAttribute('aria-label', /arrow keys pan/);
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
  // A drag is never a click: given time to load, no inspector appears.
  await page.waitForTimeout(500);
  await expect(page.locator('#inspector')).toHaveCount(0);
});
