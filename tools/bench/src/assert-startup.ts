import { existsSync, readFileSync } from 'node:fs';

// A regression must pass both, so run-to-run noise on a fast load never fails the gate (Performance budget, R5).
export const REGRESSION_PERCENT = 15;
export const REGRESSION_MS = 20;
const TIMINGS = ['firstFrameMs', 'interactiveMs'] as const;

export type StartupResult = Record<(typeof TIMINGS)[number], { median: number }>;

// What startup.spec.ts records beside the medians; loadavg is null on Windows, which keeps none.
interface StartupRecord extends StartupResult {
  cpuRate: number;
  benchmarkIndex: number | null;
  loadavg: string | null;
}

// Only regressions against main's last run: startup.spec.ts asserts the absolute budgets.
export function compareStartup(current: StartupResult, baseline: StartupResult | null): string[] {
  if (baseline === null) return [];
  const failures: string[] = [];
  for (const timing of TIMINGS) {
    const nowMs = current[timing].median;
    const mainMs = baseline[timing].median;
    const slowerMs = nowMs - mainMs;
    if (slowerMs > REGRESSION_MS && slowerMs * 100 > mainMs * REGRESSION_PERCENT) {
      failures.push(
        `${timing}: median ${Math.round(nowMs)} ms against main's ${Math.round(mainMs)} ms, ` +
          `over ${REGRESSION_PERCENT}% and ${REGRESSION_MS} ms slower`,
      );
    }
  }
  return failures;
}

function readRecord(url: URL): StartupRecord {
  return JSON.parse(readFileSync(url, 'utf8')) as StartupRecord;
}

function describeRun(label: string, run: StartupRecord): string {
  const { firstFrameMs, interactiveMs, cpuRate, benchmarkIndex, loadavg } = run;
  const medians = `first frame ${Math.round(firstFrameMs.median)} ms, interactive ${Math.round(interactiveMs.median)} ms`;
  return `${label}: ${medians} at CPU rate ${cpuRate} (BenchmarkIndex ${benchmarkIndex}), loadavg ${loadavg}`;
}

// Reads the spec's apps/web/test-results/startup.json and the perf workflow's cached perf-baseline/startup.json.
if (import.meta.main) {
  const root = new URL('../../../', import.meta.url);
  const baselineUrl = new URL('perf-baseline/startup.json', root);
  const baseline = existsSync(baselineUrl) ? readRecord(baselineUrl) : null;
  const current = readRecord(new URL('apps/web/test-results/startup.json', root));
  console.log(describeRun('this run', current));
  if (baseline !== null) console.log(describeRun('main', baseline));
  const failures = compareStartup(current, baseline);
  for (const failure of failures) console.log(failure);
  if (baseline === null) console.log('no baseline from main yet, so nothing to compare');
  else console.log(`${failures.length} startup regressions against main`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}
