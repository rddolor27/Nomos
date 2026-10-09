import type { Page } from 'playwright';
import { computeBenchmarkIndex } from './machine/benchmark-index.ts';
import { readLoadavg } from './machine/loadavg.ts';

// Lighthouse's mid-tier mobile bracket, where R5 set the startup budgets (load notes §2).
export const TARGET_BENCHMARK_INDEX = 375;
const MIN_CPU_RATE = 1;
const MAX_CPU_RATE = 10;
const BENCHMARK_RUNS = 3;

// The CDP CPU throttling rate, in half steps, that slows a machine with this BenchmarkIndex to the target's.
export function cpuRate(benchmarkIndex: number, target = TARGET_BENCHMARK_INDEX): number {
  const halfSteps = Math.round((benchmarkIndex / target) * 2);
  return Math.min(MAX_CPU_RATE, Math.max(MIN_CPU_RATE, halfSteps / 2));
}

export async function benchmarkIndex(page: Page): Promise<number> {
  const runs: number[] = [];
  for (let run = 0; run < BENCHMARK_RUNS; run++) runs.push(await page.evaluate(computeBenchmarkIndex));
  return runs.sort((a, b) => a - b)[BENCHMARK_RUNS >> 1];
}

// Prints only NAME=value lines, for $GITHUB_ENV, and the engine and load on stderr (docs rules).
if (import.meta.main) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const index = await benchmarkIndex(await browser.newPage());
    console.log(`BENCHMARK_INDEX=${index}`);
    console.log(`CPU_RATE=${cpuRate(index)}`);
    console.error(`calibrated in chromium ${browser.version()}, loadavg ${readLoadavg()}`);
  } finally {
    await browser.close();
  }
}
