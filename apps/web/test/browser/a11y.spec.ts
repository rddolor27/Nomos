import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from 'playwright/test';
import { WEB } from './web.ts';

test.skip(({ browserName }) => browserName !== 'chromium', 'the HUD and charts are plain DOM, so one engine proves it');
test.use({ baseURL: WEB });

const TOWN = '/?tier=phone';
const BLOCKING = new Set(['serious', 'critical']);

async function setVisibility(page: Page, state: 'hidden' | 'visible'): Promise<void> {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'visibilityState', { value, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

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
