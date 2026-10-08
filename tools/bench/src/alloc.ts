import { TICKS_PER_DAY, type Tier } from '@nomos/sim-core';
import { allocationWindow, runTicks } from './allocation.ts';
import { MAX_HEAP_GROWTH_BYTES_PER_TICK, MAX_YOUNG_BYTES_PER_DAY, TIERS } from './budgets.ts';
import { readLoadavg } from './loadavg.ts';
import { BENCH_WARM_DAYS, createBenchWorld } from './sample.ts';

interface TierAllocation {
  readonly tier: Tier;
  readonly loadavg: { readonly before: string | null; readonly after: string | null };
  readonly ticks: number;
  readonly scavenges: number;
  readonly youngBytes: number;
  readonly heapGrowthPerTick: number;
  readonly pass: boolean;
}

async function checkTier(tier: Tier): Promise<TierAllocation> {
  const before = readLoadavg();
  const { world, view } = createBenchWorld(tier);
  // Whole warm days, so the window opens on a day boundary and spans a full day of slices (R6), past R5's 1,000 ticks.
  runTicks(world, BENCH_WARM_DAYS * TICKS_PER_DAY, view);
  const { scavenges, youngBytes, heapGrowthPerTick } = await allocationWindow(world, TICKS_PER_DAY, view);
  // A NaN reading fails too: growth from a run without --expose-gc, young bytes if V8 renames new_space.
  const pass =
    scavenges === 0 && youngBytes <= MAX_YOUNG_BYTES_PER_DAY && heapGrowthPerTick < MAX_HEAP_GROWTH_BYTES_PER_TICK;
  return { tier, loadavg: { before, after: readLoadavg() }, ticks: TICKS_PER_DAY, scavenges, youngBytes, heapGrowthPerTick, pass };
}

const tiers: TierAllocation[] = [];
for (const tier of TIERS) tiers.push(await checkTier(tier));
const report = {
  engine: 'node',
  version: process.version,
  v8: process.versions.v8,
  maxYoungBytesPerDay: MAX_YOUNG_BYTES_PER_DAY,
  maxHeapGrowthBytesPerTick: MAX_HEAP_GROWTH_BYTES_PER_TICK,
  tiers,
};
console.log(JSON.stringify(report, null, 2));
if (tiers.some((result) => !result.pass)) process.exitCode = 1;
