import { mkdirSync, writeFileSync } from 'node:fs';
import { BUDGET_ROWS, MIN_SAMPLES, REPORTED_WORST, SPAWN_ROW, TIERS } from './compute/budgets.ts';
import { formatReported, formatVerdict, judge } from './compute/judge.ts';
import { readLoadavg } from './machine/loadavg.ts';
import { SAMPLE_DAYS, sampleTier } from './compute/sample.ts';
import { sampleSpawn } from './compute/spawn.ts';

const RESULTS = new URL('../bench-results/', import.meta.url);

console.log(`node ${process.version} (V8 ${process.versions.v8})`);
const runs = TIERS.map((tier) => {
  const before = readLoadavg();
  const samples = sampleTier(tier, SAMPLE_DAYS, () => performance.now());
  const after = readLoadavg();
  const verdicts = judge(BUDGET_ROWS, tier, samples);
  console.log(`${tier}: loadavg ${before} before, ${after} after`);
  for (const verdict of verdicts) console.log(formatVerdict(verdict));
  for (const system of REPORTED_WORST) console.log(formatReported(tier, system, samples[system]));
  const days = Object.fromEntries(Object.entries(samples).map(([system, values]) => [system, Array.from(values)]));
  return { tier, loadavg: { before, after }, verdicts, samples: days };
});

// Spawning is timed once a sample, not per tick, so it has its own run beside the tiers'.
const spawnBefore = readLoadavg();
const spawnSamples = sampleSpawn(MIN_SAMPLES, () => performance.now());
const spawnAfter = readLoadavg();
const spawnVerdicts = judge([SPAWN_ROW], 'desktop', spawnSamples);
console.log(`spawn: loadavg ${spawnBefore} before, ${spawnAfter} after`);
for (const verdict of spawnVerdicts) console.log(formatVerdict(verdict));
const spawn = {
  loadavg: { before: spawnBefore, after: spawnAfter },
  verdicts: spawnVerdicts,
  samples: { [SPAWN_ROW.system]: Array.from(spawnSamples[SPAWN_ROW.system]) },
};

mkdirSync(RESULTS, { recursive: true });
const report = { engine: 'node', version: process.version, v8: process.versions.v8, runs, spawn };
writeFileSync(new URL('budget-node.json', RESULTS), `${JSON.stringify(report, null, 2)}\n`);
const failed = [...runs.flatMap((run) => run.verdicts), ...spawnVerdicts].some((verdict) => !verdict.pass);
if (failed) process.exitCode = 1;
