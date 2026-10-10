import type { Tier } from '@nomos/sim-core';

// A system's budget in reference-machine ms a tick, keyed by scale so that M7 can add 1k and 10k country rows. A mean
// row gates the day's average tick and a max row its worst, as the day slices need (R6).
export interface BudgetRow {
  readonly system: string;
  readonly reduce: 'mean' | 'max';
  readonly rmMs: Readonly<Record<string, number>>;
}

// The Performance budget's sub-budgets for the systems that exist. The owner raised the 100k snapshot row from 0.3 ms
// to 0.6 ms out of the tick's slack on 8 October 2026.
export const BUDGET_ROWS: readonly BudgetRow[] = [
  { system: 'move', reduce: 'mean', rmMs: { phone: 0.1, 'phone-plus': 0.25, desktop: 0.8 } },
  { system: 'day', reduce: 'max', rmMs: { phone: 0.35, 'phone-plus': 0.35, desktop: 0.35 } },
  { system: 'snapshot', reduce: 'mean', rmMs: { phone: 0.1, 'phone-plus': 0.2, desktop: 0.6 } },
];

// Systems whose worst tick each day is timed and printed, with no budget to judge it by (owner, 10 October 2026): the
// economy runs one system a tick, and slicing shopping for 100k waits for M6 (M2.2b Ruling 2).
export const REPORTED_WORST: readonly string[] = ['economy'];

// In ms to spawn 100k people, not per tick, so it stays out of BUDGET_ROWS, which sampleTier times at every tier.
// Measured 33.2 ms (fastest of 9, Node 24.18, Windows), rounded up to 5 ms; M9 spawns only districts in view, never 100k at once.
export const SPAWN_ROW: BudgetRow = { system: 'spawn', reduce: 'mean', rmMs: { desktop: 35 } };

export const TIERS: readonly Tier[] = ['phone', 'phone-plus', 'desktop'];

// Medians drifted 10.8% between runs on a shared machine, so the gate judges the fastest of at least 9 samples (R5).
export const MIN_SAMPLES = 9;
export const TOLERANCE = 0.1;

// The allocation gate's limit beside its zero scavenges (R5).
export const MAX_HEAP_GROWTH_BYTES_PER_TICK = 65_536;

// The young generation's bytes in use may grow this much over a day's window: a warmed one absorbs a day of small
// garbage with no scavenge. Nothing planted measured about 3 KB, nearly all of it the stats call itself, and one
// new Array(8) a tick about 170 KB (M0.6's review).
export const MAX_YOUNG_BYTES_PER_DAY = 16_384;
