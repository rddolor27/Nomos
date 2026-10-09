import { mkdirSync, writeFileSync } from 'node:fs';
import { BUDGET_ROWS, TIERS } from './compute/budgets.ts';
import { formatVerdict, judge } from './compute/judge.ts';
import { readLoadavg } from './machine/loadavg.ts';
import { SAMPLE_DAYS, sampleTier } from './compute/sample.ts';

const RESULTS = new URL('../bench-results/', import.meta.url);

console.log(`node ${process.version} (V8 ${process.versions.v8})`);
const runs = TIERS.map((tier) => {
  const before = readLoadavg();
  const samples = sampleTier(tier, SAMPLE_DAYS, () => performance.now());
  const after = readLoadavg();
  const verdicts = judge(BUDGET_ROWS, tier, samples);
  console.log(`${tier}: loadavg ${before} before, ${after} after`);
  for (const verdict of verdicts) console.log(formatVerdict(verdict));
  const days = Object.fromEntries(Object.entries(samples).map(([system, values]) => [system, Array.from(values)]));
  return { tier, loadavg: { before, after }, verdicts, samples: days };
});

mkdirSync(RESULTS, { recursive: true });
const report = { engine: 'node', version: process.version, v8: process.versions.v8, runs };
writeFileSync(new URL('budget-node.json', RESULTS), `${JSON.stringify(report, null, 2)}\n`);
if (runs.some((run) => run.verdicts.some((verdict) => !verdict.pass))) process.exitCode = 1;
