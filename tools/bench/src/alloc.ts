import { TICKS_PER_DAY, currentTick, type Tier, type World } from '@nomos/sim-core';
import { allocationWindow, runTicks } from './compute/allocation.ts';
import { ALLOCATION_DAYS, MAX_HEAP_GROWTH_BYTES_PER_TICK, MAX_YOUNG_BYTES_PER_DAY, TIERS } from './compute/budgets.ts';
import { readLoadavg } from './machine/loadavg.ts';
import { BENCH_WARM_DAYS, createBenchWorld } from './compute/sample.ts';

interface DayAllocation {
  readonly day: number;
  readonly ticks: number;
  readonly scavenges: number;
  readonly youngBytes: number;
  readonly heapGrowthPerTick: number;
  readonly pass: boolean;
}

interface TierAllocation {
  readonly tier: Tier;
  readonly loadavg: { readonly before: string | null; readonly after: string | null };
  readonly days: readonly DayAllocation[];
  readonly pass: boolean;
}

// Steps on to the start of `day` and measures its ticks. Whole days, so the window opens on a day boundary and spans a full
// day of slices (R6), past R5's 1,000 ticks.
async function checkDay(world: World, view: Uint32Array, day: number): Promise<DayAllocation> {
  runTicks(world, day * TICKS_PER_DAY - currentTick(world), view);
  const { scavenges, youngBytes, heapGrowthPerTick } = await allocationWindow(world, TICKS_PER_DAY, view);
  // A NaN reading fails too: growth from a run without --expose-gc, young bytes if V8 renames new_space.
  const pass =
    scavenges === 0 && youngBytes <= MAX_YOUNG_BYTES_PER_DAY && heapGrowthPerTick < MAX_HEAP_GROWTH_BYTES_PER_TICK;
  return { day, ticks: TICKS_PER_DAY, scavenges, youngBytes, heapGrowthPerTick, pass };
}

async function checkTier(tier: Tier): Promise<TierAllocation> {
  const before = readLoadavg();
  const { world, view } = createBenchWorld(tier);
  runTicks(world, BENCH_WARM_DAYS * TICKS_PER_DAY, view);
  const days: DayAllocation[] = [];
  for (const day of ALLOCATION_DAYS) days.push(await checkDay(world, view, day));
  return { tier, loadavg: { before, after: readLoadavg() }, days, pass: days.every((result) => result.pass) };
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
