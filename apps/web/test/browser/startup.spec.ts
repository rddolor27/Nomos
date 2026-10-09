import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLoadavg } from '@nomos/bench/src/machine/loadavg.ts';
import { expect, test, type Browser } from 'playwright/test';
import { startServer } from '../serve.ts';

test.skip(
  ({ browserName }) => browserName !== 'chromium' || !process.env.STARTUP,
  'times cold loads only when asked: pnpm --filter @nomos/web startup',
);

const LOADS = 7;
// tools/bench/src/calibrate.ts sets both, so the page and the worker run at Lighthouse BenchmarkIndex ≈ 375 on any
// runner. Without them, 4 is round 5's calibration of its VM.
const CPU_RATE = Number(process.env.CPU_RATE ?? 4);
const BENCHMARK_INDEX = process.env.BENCHMARK_INDEX ? Number(process.env.BENCHMARK_INDEX) : null;
// Long enough after app:interactive for a few stats messages, which come about every 300 ms.
const STATS_WINDOW_MS = 1500;
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
// apps/web/test-results/startup.json, which M0.6's startup gate reads.
const RESULTS = fileURLToPath(new URL('../../test-results/startup.json', import.meta.url));

interface Load {
  firstFrameMs: number;
  interactiveMs: number;
  bytes: number;
  jsBytes: number;
  systemMsSums: number[];
}

function median(values: number[]): number {
  return [...values].sort((a, b) => a - b)[values.length >> 1];
}

function summary(values: number[]): { median: number; min: number; max: number } {
  return { median: median(values), min: Math.min(...values), max: Math.max(...values) };
}

// Body bytes, as compressed on the wire, of every response finished before the first frame.
async function coldLoad(browser: Browser, url: string): Promise<Load> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE });
    await page.goto(`${url}/?tier=phone`);
    await page.waitForFunction(() => performance.getEntriesByName('app:interactive').length > 0, undefined, {
      timeout: 30_000,
    });
    const systemMsSums = await page.evaluate(
      (windowMs) =>
        new Promise<number[]>((resolve) => {
          const sums: number[] = [];
          window.__app?.onStats((_tick, systemMs) => sums.push(Object.values(systemMs).reduce((sum, ms) => sum + ms, 0)));
          setTimeout(() => resolve(sums), windowMs);
        }),
      STATS_WINDOW_MS,
    );
    const timing = await page.evaluate(() => {
      const firstFrameMs = performance.getEntriesByName('frame:first')[0].startTime;
      const responses = [
        ...performance.getEntriesByType('navigation'),
        ...performance.getEntriesByType('resource'),
      ] as PerformanceResourceTiming[];
      const before = responses.filter((entry) => entry.responseEnd <= firstFrameMs);
      const bytesOf = (entries: PerformanceResourceTiming[]): number =>
        entries.reduce((sum, entry) => sum + entry.encodedBodySize, 0);
      return {
        firstFrameMs,
        interactiveMs: performance.getEntriesByName('app:interactive')[0].startTime,
        bytes: bytesOf(before),
        jsBytes: bytesOf(before.filter((entry) => new URL(entry.name).pathname.endsWith('.js'))),
      };
    });
    return { ...timing, systemMsSums };
  } finally {
    await context.close();
  }
}

test('meets the first-frame and byte budgets on cold Fast 4G', async ({ browser }) => {
  test.setTimeout(240_000);
  const server = await startServer({ root: DIST, workerSlowdown: CPU_RATE });
  const loads: Load[] = [];
  try {
    for (let load = 0; load < LOADS; load++) loads.push(await coldLoad(browser, server.url));
  } finally {
    await server.close();
  }
  const result = {
    loads: LOADS,
    cpuRate: CPU_RATE,
    benchmarkIndex: BENCHMARK_INDEX,
    firstFrameMs: summary(loads.map((load) => load.firstFrameMs)),
    interactiveMs: summary(loads.map((load) => load.interactiveMs)),
    bytes: summary(loads.map((load) => load.bytes)),
    jsBytes: summary(loads.map((load) => load.jsBytes)),
    // The sim's own cost, as its stats report it: the slowed worker's waits fall outside the timed systems.
    systemMsSum: median(loads.flatMap((load) => load.systemMsSums)),
    chromium: browser.version(),
    loadavg: readLoadavg(),
  };
  mkdirSync(dirname(RESULTS), { recursive: true });
  writeFileSync(RESULTS, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
  expect(result.firstFrameMs.median).toBeLessThanOrEqual(1500);
  expect(result.interactiveMs.median).toBeLessThanOrEqual(2000);
  expect(result.bytes.median).toBeLessThanOrEqual(100_000);
  expect(result.jsBytes.median).toBeLessThanOrEqual(35_000);
});
