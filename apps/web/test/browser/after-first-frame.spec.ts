import { expect, test, type Page } from 'playwright/test';
import { WEB } from './web.ts';

test.skip(({ browserName }) => browserName !== 'chromium', 'the charts and controls are plain DOM, so one engine proves it');
test.use({ baseURL: WEB });

async function openInteractive(page: Page, path = '/?tier=phone'): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(() => performance.getEntriesByName('app:interactive').length > 0);
}

function count(text: string | null): number {
  return Number(text?.replaceAll(',', ''));
}

interface Loads {
  firstFrame: number;
  charts: number[];
  controls: number[];
  cameraInput: number[];
}

// The first frame's mark, and when each lazy chunk started loading.
async function loadStarts(page: Page): Promise<Loads> {
  return page.evaluate(() => {
    const startsOf = (chunk: RegExp): number[] =>
      performance
        .getEntriesByType('resource')
        .filter((entry) => chunk.test(new URL(entry.name).pathname))
        .map((entry) => entry.startTime);
    return {
      firstFrame: performance.getEntriesByName('frame:first')[0].startTime,
      charts: startsOf(/^\/assets\/charts-[\w-]+\.js$/),
      controls: startsOf(/^\/assets\/controls-[\w-]+\.js$/),
      cameraInput: startsOf(/^\/assets\/camera-input-[\w-]+\.js$/),
    };
  });
}

test('loads uPlot after the first frame, and no developer panel without ?dev=1', async ({ page }) => {
  await openInteractive(page);
  const loads = await loadStarts(page);
  expect(loads.charts).toHaveLength(1);
  expect(loads.cameraInput).toHaveLength(1);
  expect(loads.charts[0]).toBeGreaterThanOrEqual(loads.firstFrame);
  expect(loads.cameraInput[0]).toBeGreaterThanOrEqual(loads.firstFrame);
  expect(loads.controls).toEqual([]);
  await expect(page.locator('.lil-gui')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Map', exact: true })).toHaveCount(1);
});

test('loads lil-gui after the first frame for ?dev=1, with its Zoom slider and no second Map button', async ({ page }) => {
  await openInteractive(page, '/?tier=phone&dev=1');
  const loads = await loadStarts(page);
  expect(loads.controls).toHaveLength(1);
  expect(loads.controls[0]).toBeGreaterThanOrEqual(loads.firstFrame);
  await expect(page.locator('.lil-gui').getByRole('textbox', { name: 'Zoom' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Map', exact: true })).toHaveCount(1);
});

test('gives every chart a data table', async ({ page }) => {
  await openInteractive(page);
  const figures = page.locator('#charts figure');
  // The charts appear with the first stats, at their next once-a-second refresh.
  await expect(figures).toHaveCount(2, { timeout: 15_000 });
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
