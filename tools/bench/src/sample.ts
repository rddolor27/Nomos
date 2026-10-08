import { SYSTEM_NAMES, TICKS_PER_DAY, createWorld, step, warmUp, type SystemTimer, type Tier } from '@nomos/sim-core';
import { createSnapshotPool, takeView, writeSnapshot } from '@nomos/sim-protocol';
import { BUDGET_ROWS } from './budgets.ts';

export const BENCH_SEED = 42;
// Named apart from sim-core's WARM_DAYS (40), which warmUp runs on a throwaway world.
export const BENCH_WARM_DAYS = 1;
export const SAMPLE_DAYS = 9;

// The step's systems in SystemTimer order, then the snapshot, which the worker writes after each step.
const SLOTS: readonly string[] = [...SYSTEM_NAMES, 'snapshot'];
const SNAPSHOT_SLOT = SYSTEM_NAMES.length;

// One value per day for each budget row: the day's mean tick, or its worst tick for a max row, so a row's fastest
// sample is its best day.
export function sampleTier(tier: Tier, days: number, now: () => number): Record<string, Float64Array> {
  warmUp();
  const world = createWorld(BENCH_SEED, tier);
  world.checks = false;
  const view = takeView(createSnapshotPool(world.agents.capacity));
  if (view === null) throw new Error('a new snapshot pool has no free view');
  const totalMs = new Float64Array(SLOTS.length);
  const worstMs = new Float64Array(SLOTS.length);
  let lapStartMs = 0;
  const timer: SystemTimer = {
    lap(slot: number): void {
      const endMs = now();
      totalMs[slot] += endMs - lapStartMs;
      worstMs[slot] = Math.max(worstMs[slot], endMs - lapStartMs);
      lapStartMs = endMs;
    },
  };
  const samples: Record<string, Float64Array> = {};
  for (const row of BUDGET_ROWS) samples[row.system] = new Float64Array(days);
  // The warm days are timed like the rest and dropped, so the timer's path is compiled before the first sample.
  for (let day = -BENCH_WARM_DAYS; day < days; day++) {
    totalMs.fill(0);
    worstMs.fill(0);
    for (let tick = 0; tick < TICKS_PER_DAY; tick++) {
      lapStartMs = now();
      step(world, timer);
      lapStartMs = now();
      writeSnapshot(world, view);
      timer.lap(SNAPSHOT_SLOT);
    }
    if (day >= 0) recordDay(samples, day, totalMs, worstMs);
  }
  return samples;
}

function recordDay(
  samples: Record<string, Float64Array>,
  day: number,
  totalMs: Float64Array,
  worstMs: Float64Array,
): void {
  for (const row of BUDGET_ROWS) {
    const slot = SLOTS.indexOf(row.system);
    samples[row.system][day] = row.reduce === 'mean' ? totalMs[slot] / TICKS_PER_DAY : worstMs[slot];
  }
}
