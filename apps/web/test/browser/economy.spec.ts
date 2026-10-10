import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { TIER_AGENTS, createTown, step } from '@nomos/sim-core';
import { createEconomyFeed, economyDayEnded, parseMap, writeEconomyFeed } from '@nomos/sim-protocol';
import { expect, test, type Page } from 'playwright/test';
import { WEB } from './web.ts';

test.skip(({ browserName }) => browserName !== 'chromium', 'the panel is plain DOM, so one engine proves it');
test.use({ baseURL: WEB });

const TOWN = '/?seed=42&tier=phone';
const NO_DAYS = 'No economy figures yet';
// The first day ends 1.8 s after Play at 1x, but SwiftShader's slow draw can hold up a loaded runner.
const FIRST_DAY_MS = 60_000;
const SIZES = [
  { name: 'at desktop size', viewport: { width: 1280, height: 720 } },
  { name: 'at 390 x 844', viewport: { width: 390, height: 844 } },
];

// Day 0 of the world the page builds for this URL, run here in Node: a town of the phone tier's whole crowd.
const map = new Uint8Array(readFileSync(new URL('../../../../assets/maps/town.nmap', import.meta.url)));
const twin = createTown(42, 'phone', parseMap(map.buffer), TIER_AGENTS.phone);
const day0 = createEconomyFeed();
while (!economyDayEnded(twin)) step(twin);
writeEconomyFeed(twin, day0);

// Intl here, so the panel's own digit grouping is checked against an independent formatter.
function figure(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CHARTS = [
  { title: 'Mean price per unit', latest: figure(day0.meanPriceCents[0] / 100) },
  { title: 'Mean wage a month', latest: figure(day0.meanWageCents[0] / 100) },
  { title: 'Unemployment (%)', latest: figure(day0.unemploymentPpm[0] / 10_000) },
];

// The feed holds the trades oldest first and the table lists the newest first. Shops count from 1.
const TRADES = Array.from({ length: day0.trades }, (_, row) => {
  const trade = day0.trades - 1 - row;
  return [`Shop ${day0.tradeShop[trade] + 1}`, String(day0.tradeUnits[trade]), figure(day0.tradeCents[trade] / 100)];
});

// Paused from the start by reduced motion, so the day ends only once Play is pressed.
async function openPaused(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(TOWN);
  await page.waitForFunction(() => performance.getEntriesByName('app:interactive').length > 0);
}

// Pauses again once the figures show, to spare the CPU of the draw the rest of the spec does not need.
async function playUntilFirstDay(page: Page): Promise<void> {
  await page.locator('#play').click();
  await expect(page.locator('#economy figure')).toHaveCount(CHARTS.length, { timeout: FIRST_DAY_MS });
  await page.locator('#play').click();
}

async function expectFigures(page: Page): Promise<void> {
  const figures = page.locator('#economy figure');
  for (const [index, { title, latest }] of CHARTS.entries()) {
    const chart = figures.nth(index);
    await expect(chart.locator('figcaption')).toContainText(title);
    await expect(chart.locator('figcaption span')).toHaveText(latest);
    await expect(chart.locator('canvas')).toBeVisible();
    await expect(chart.locator('details thead th')).toHaveText(['Day', title]);
    await expect(chart.locator('details tbody td')).toHaveText(['0', latest]);
  }
}

async function expectTrades(page: Page): Promise<void> {
  const trades = page.locator('#economy > table');
  await expect(trades.locator('caption')).toHaveText('Last trades of day 0');
  await expect(trades.locator('thead th')).toHaveText(['Shop', 'Units', 'Amount']);
  const rows = await trades
    .locator('tbody tr')
    .evaluateAll((trs) => trs.map((tr) => [...(tr as HTMLTableRowElement).cells].map((cell) => cell.textContent)));
  expect(rows).toEqual(TRADES);
}

async function expectNoAxeViolations(page: Page): Promise<void> {
  // The data tables start closed, and axe skips what is not shown.
  for (const summary of await page.locator('#economy summary').all()) await summary.click();
  const results = await new AxeBuilder({ page }).include('#economy').analyze();
  const violations = results.violations.map(({ id, impact, nodes }) => ({
    id,
    impact,
    targets: nodes.map((node) => node.target.join(' ')),
  }));
  expect(violations).toEqual([]);
}

for (const { name, viewport } of SIZES) {
  test.describe(name, () => {
    test.use({ viewport });

    // One flow for all of it, as each page that has run a town takes seconds to close under SwiftShader, which is also why
    // the test gets the slow-test timeout.
    test("shows day 0's figures and trades after Play, and passes axe", async ({ page }) => {
      test.slow();
      await openPaused(page);
      await expect(page.locator('#economy')).toContainText(NO_DAYS);
      expect(day0.trades).toBeGreaterThan(0);
      await playUntilFirstDay(page);
      await expect(page.locator('#economy')).not.toContainText(NO_DAYS);
      await expectFigures(page);
      await expectTrades(page);

      // The app keeps the latest message, so a panel that mounts late draws at once: a new listener gets day 0 now.
      const lateDay = await page.evaluate(
        () => new Promise<number>((resolve) => window.__app?.onEconomy((message) => resolve(message.day))),
      );
      expect(lateDay).toBe(0);

      await expectNoAxeViolations(page);
    });
  });
}

test('loads the economy panel after the first frame', async ({ page }) => {
  await openPaused(page);
  // The panel's note shows once its chunk has loaded and mounted, as the page is interactive before then.
  await expect(page.locator('#economy')).toContainText(NO_DAYS);
  const loads = await page.evaluate(() => ({
    firstFrame: performance.getEntriesByName('frame:first')[0].startTime,
    economy: performance
      .getEntriesByType('resource')
      .filter((entry) => /^\/assets\/economy-[\w-]+\.js$/.test(new URL(entry.name).pathname))
      .map((entry) => entry.startTime),
  }));

  expect(loads.economy).toHaveLength(1);
  expect(loads.economy[0]).toBeGreaterThanOrEqual(loads.firstFrame);
});
