import { expect, test, type Page } from 'playwright/test';
import { WEB } from './web.ts';

// Runs in every engine, since the early boot, the module worker and COEP differ by engine. ?tier=phone holds the
// agent count at 10,000 on desktops, which otherwise get 100,000 once tiers arrive (Task 7).
test.use({ baseURL: WEB });

const TOWN = '/?tier=phone';
const PHONE_AGENTS = 10_000;
// render-gl's CANVAS2D_AGENT_CAP: Canvas2D draws at most this many agents.
const CANVAS2D_AGENTS = 5_000;

function markTimes(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() =>
    Object.fromEntries(performance.getEntriesByType('mark').map((mark) => [mark.name, mark.startTime])),
  );
}

function waitForMark(page: Page, name: string, timeout = 10_000): Promise<unknown> {
  return page.waitForFunction((mark) => performance.getEntriesByName(mark).length > 0, name, { timeout });
}

test('starts the worker before the entry module runs', async ({ page }) => {
  await page.goto(TOWN);
  await waitForMark(page, 'main:eval');
  const marks = await markTimes(page);
  expect(marks['worker:new']).toBeLessThan(marks['main:eval']);
});

test('draws the first frame', async ({ page }) => {
  await page.goto(TOWN);
  await waitForMark(page, 'frame:first');
  const drawn = await page.evaluate(() => ({
    backend: window.__app?.renderer.backend,
    agents: window.__app?.renderer.drawnAgents,
  }));
  expect(drawn.agents).toBe(drawn.backend === 'canvas2d' ? CANVAS2D_AGENTS : PHONE_AGENTS);
});

test('says when the map is missing', async ({ page }) => {
  await page.route('**/assets/maps/**', (route) => route.fulfill({ status: 404 }));
  await page.goto(TOWN);
  await expect(page.locator('#status')).toContainText('map');
});
