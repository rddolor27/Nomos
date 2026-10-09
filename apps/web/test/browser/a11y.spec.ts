import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from 'playwright/test';
import { WEB } from './web.ts';

test.use({ baseURL: WEB });

const TOWN = '/?tier=phone';
const BLOCKING = new Set(['serious', 'critical']);
const RING = { color: [0xf7, 0xc9, 0x48], width: 3, tolerance: 8 };
const MAX_TABS = 30;
const MIN_EDGE_SHARE = 0.9;

async function setVisibility(page: Page, state: 'hidden' | 'visible'): Promise<void> {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'visibilityState', { value, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

// Node has no PNG reader, so the page decodes the screenshot.
async function ringShares(page: Page, png: Buffer): Promise<Record<'top' | 'right' | 'bottom' | 'left', number>> {
  return page.evaluate(
    async ({ base64, ring }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const { width, height } = image;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('no 2D context to read the screenshot with');
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, width, height);
      const share = (left: number, top: number, w: number, h: number): number => {
        let hits = 0;
        for (let y = top; y < top + h; y++) {
          for (let x = left; x < left + w; x++) {
            const at = (y * width + x) * 4;
            if (ring.color.every((channel, i) => Math.abs(data[at + i] - channel) <= ring.tolerance)) hits++;
          }
        }
        return hits / (w * h);
      };
      return {
        top: share(0, 0, width, ring.width),
        right: share(width - ring.width, 0, ring.width, height),
        bottom: share(0, height - ring.width, width, ring.width),
        left: share(0, 0, ring.width, height),
      };
    },
    { base64: png.toString('base64'), ring: RING },
  );
}

test.describe('the HUD and charts', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the HUD and charts are plain DOM, so one engine proves it');

  test('puts Play/Pause first in tab order', async ({ page }) => {
    await page.goto(TOWN);
    await expect(page.locator('#play')).toBeEnabled();
    await page.keyboard.press('Tab');
    await expect(page.locator('#play')).toBeFocused();
  });

  test('starts paused under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(TOWN);
    await expect(page.locator('#play')).toBeEnabled();
    await expect(page.locator('#play')).toHaveText('Play');
    const drawn = await page.evaluate(() => ({
      firstFrame: performance.getEntriesByName('frame:first').length,
      agents: window.__app?.renderer.drawnAgents,
    }));
    expect(drawn).toEqual({ firstFrame: 1, agents: 10_000 });
    // Showing the tab again sends no resume: the setting counts as the user's own pause.
    await setVisibility(page, 'hidden');
    await setVisibility(page, 'visible');
    await page.waitForTimeout(2000);
    await expect(page.locator('#hud-tick')).toHaveText('0');
    await expect(page.locator('#play')).toHaveText('Play');
  });

  test('passes axe on the HUD and charts', async ({ page }) => {
    await page.goto(TOWN);
    // The data tables fill with the first stats, and a header with no data cells under it would itself be a violation.
    // Charts refresh once a second, so under a loaded suite the first row can take a few seconds.
    await expect(page.locator('#charts details tbody tr').first()).toBeAttached({ timeout: 15_000 });
    const results = await new AxeBuilder({ page }).include('#hud').include('#charts').analyze();
    const blocking = results.violations
      .filter((violation) => BLOCKING.has(violation.impact ?? ''))
      .map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map((node) => node.target.join(' ')) }));
    expect(blocking).toEqual([]);
  });
});

// Each engine paints outlines and stacks layers its own way, so this one runs in all three.
test('shows the focus ring on every edge of the view', async ({ page }) => {
  await page.goto(TOWN);
  await expect(page.locator('#play')).toBeEnabled();
  const view = page.locator('#view');
  for (let presses = 0; presses < MAX_TABS; presses++) {
    await page.keyboard.press('Tab');
    if ((await page.evaluate(() => document.activeElement?.id)) === 'view') break;
  }
  await expect(view).toBeFocused();
  const shares = await ringShares(page, await view.screenshot());
  const bare = Object.entries(shares)
    .filter(([, share]) => share < MIN_EDGE_SHARE)
    .map(([edge]) => edge);
  expect(bare).toEqual([]);
});
