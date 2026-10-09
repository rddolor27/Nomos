import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Tier } from '@nomos/sim-core';
import { build } from 'esbuild';
import { expect, test } from 'playwright/test';
import { BUDGET_ROWS, TIERS } from '../../src/compute/budgets.ts';
import { formatVerdict, judge, type Verdict } from '../../src/compute/judge.ts';
import { readLoadavg } from '../../src/machine/loadavg.ts';
import { serveIsolated } from '../../src/compute/serve-isolated.ts';

const ENTRY = fileURLToPath(new URL('../../src/browser-entry.ts', import.meta.url));
const PAGE = '<!doctype html><meta charset="utf-8"><title>Nomos budget</title>';

interface WorkerRun {
  readonly isolated: boolean;
  readonly samples: Record<string, number[]>;
}

interface TierReport {
  readonly tier: Tier;
  readonly loadavg: { readonly before: string | null; readonly after: string | null };
  readonly verdicts: Verdict[];
  readonly samples: Record<string, number[]>;
}

// Runs in the page, one worker per tier. The days come back as plain arrays, which Playwright returns as they are.
function sampleInWorker(tier: Tier): Promise<WorkerRun> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('/entry.js', { type: 'module' });
    worker.onmessage = (event: MessageEvent<{ isolated: boolean; samples: Record<string, Float64Array> }>) => {
      worker.terminate();
      const samples: Record<string, number[]> = {};
      for (const [system, values] of Object.entries(event.data.samples)) samples[system] = Array.from(values);
      resolve({ isolated: event.data.isolated, samples });
    };
    worker.onerror = (event) => reject(new Error(event.message));
    worker.postMessage(tier);
  });
}

// Opt-in: sampling every tier takes minutes, and only the perf workflow gates on it.
test.skip(!process.env.BENCH, 'set BENCH=1 to run the budget gate');
test.skip(({ browserName }) => browserName !== 'chromium', 'the budget gate times Chromium alone');

test('keeps every system within its budget in Chromium', async ({ page, browser }, testInfo) => {
  test.setTimeout(600_000);
  const bundle = await build({ entryPoints: [ENTRY], bundle: true, write: false, format: 'esm' });
  const server = await serveIsolated({ '/index.html': PAGE, '/entry.js': bundle.outputFiles[0].text });
  try {
    await page.goto(`${server.origin}/index.html`);
    expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
    const runs: TierReport[] = [];
    for (const tier of TIERS) {
      const before = readLoadavg();
      const { isolated, samples } = await page.evaluate(sampleInWorker, tier);
      const after = readLoadavg();
      expect(isolated, `the ${tier} worker is cross-origin isolated`).toBe(true);
      const verdicts = judge(BUDGET_ROWS, tier, samples);
      for (const verdict of verdicts) console.log(formatVerdict(verdict));
      runs.push({ tier, loadavg: { before, after }, verdicts, samples });
    }
    const report = { engine: 'chromium', version: browser.version(), runs };
    mkdirSync(testInfo.project.outputDir, { recursive: true });
    writeFileSync(join(testInfo.project.outputDir, 'budget-chromium.json'), `${JSON.stringify(report, null, 2)}\n`);
    const failures = runs.flatMap((run) => run.verdicts.filter((verdict) => !verdict.pass).map(formatVerdict));
    expect(failures).toEqual([]);
  } finally {
    await server.close();
  }
});
