import { expect, test, type Page } from 'playwright/test';
import { WEB } from './web.ts';

test.skip(({ browserName }) => browserName !== 'chromium', 'the charts and controls are plain DOM, so one engine proves it');
test.use({ baseURL: WEB });

async function openInteractive(page: Page): Promise<void> {
  await page.goto('/?tier=phone');
  await page.waitForFunction(() => performance.getEntriesByName('app:interactive').length > 0);
}

function count(text: string | null): number {
  return Number(text?.replaceAll(',', ''));
}

test('loads uPlot and lil-gui after the first frame', async ({ page }) => {
  await openInteractive(page);
  const loads = await page.evaluate(() => {
    const startsOf = (chunk: RegExp): number[] =>
      performance
        .getEntriesByType('resource')
        .filter((entry) => chunk.test(new URL(entry.name).pathname))
        .map((entry) => entry.startTime);
    return {
      firstFrame: performance.getEntriesByName('frame:first')[0].startTime,
      charts: startsOf(/^\/assets\/charts-[\w-]+\.js$/),
      controls: startsOf(/^\/assets\/controls-[\w-]+\.js$/),
    };
  });
  expect(loads.charts).toHaveLength(1);
  expect(loads.controls).toHaveLength(1);
  expect(loads.charts[0]).toBeGreaterThanOrEqual(loads.firstFrame);
  expect(loads.controls[0]).toBeGreaterThanOrEqual(loads.firstFrame);
});

test('gives every chart a data table', async ({ page }) => {
  await openInteractive(page);
  const figures = page.locator('#charts figure');
  await expect(figures).toHaveCount(2);
  await page.waitForTimeout(2000);
  // uPlot's legend is a table too, so the data table is the one inside details.
  for (const figure of await figures.all()) {
    // The legend lists Tick, then every series.
    const labels = await figure.locator('.u-legend .u-label').allTextContents();
    await expect(figure.locator('details thead th')).toHaveText(labels);
    const rows = await figure.locator('details tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(1);
    expect(rows).toBeLessThanOrEqual(20);
  }
  const lastRow = figures.first().locator('details tbody tr').last();
  const lastTick = count(await lastRow.locator('td').first().textContent());
  const hudTick = count(await page.locator('#hud-tick').textContent());
  expect(Math.abs(hudTick - lastTick)).toBeLessThanOrEqual(20);
});
