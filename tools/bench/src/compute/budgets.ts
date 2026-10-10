import { DAYS_PER_MONTH, type Tier } from '@nomos/sim-core';

// A system's budget in reference-machine ms a tick, keyed by scale so that M7 can add 1k and 10k country rows. A mean
// row gates the day's average tick and a max row its worst, as the day slices need (R6).
export interface BudgetRow {
  readonly system: string;
  readonly reduce: 'mean' | 'max';
  readonly rmMs: Readonly<Record<string, number>>;
}

// The Performance budget's sub-budgets for the systems that exist. The owner raised the 100k snapshot row from 0.3 ms
// to 0.6 ms out of the tick's slack on 8 October 2026.
// Desktop comes first because V8 gives every literal with the same keys in the same order one hidden class. In sim-core's
// tier tables (phone, phone-plus, desktop) the fields hold small integers, so fractions here would widen them to doubles
// and deoptimize the code warmUp compiled, which left the allocation gate measuring cold code.
export const BUDGET_ROWS: readonly BudgetRow[] = [
  { system: 'move', reduce: 'mean', rmMs: { desktop: 0.8, phone: 0.1, 'phone-plus': 0.25 } },
  { system: 'day', reduce: 'max', rmMs: { desktop: 0.35, phone: 0.35, 'phone-plus': 0.35 } },
  { system: 'snapshot', reduce: 'mean', rmMs: { desktop: 0.6, phone: 0.1, 'phone-plus': 0.2 } },
];

// The system whose worst tick each day is timed and printed, with no budget to judge it by (owner, 10 October 2026): the
// economy runs one system a tick, and slicing shopping for 100k waits for M6 (M2.2b Ruling 2).
export const ECONOMY_SYSTEM = 'economy';

// In ms to spawn 100k people, not per tick, so it stays out of BUDGET_ROWS, which sampleTier times at every tier.
// Measured 33.2 ms (fastest of 9, Node 24.18, Windows), rounded up to 5 ms; M9 spawns only districts in view, never 100k at once.
export const SPAWN_ROW: BudgetRow = { system: 'spawn', reduce: 'mean', rmMs: { desktop: 35 } };

export const TIERS: readonly Tier[] = ['phone', 'phone-plus', 'desktop'];

// Medians drifted 10.8% between runs on a shared machine, so the gate judges the fastest of at least 9 samples (R5).
export const MIN_SAMPLES = 9;
export const TOLERANCE = 0.1;

// The days the allocation gate measures, a window of one day each, in order, after the bench's warm days. Day 1 is a plain
// day. Day 20 is a month's last, where a town's economy runs its 7 month-end systems and the month record, and day 21 the
// next month's first, where it runs its 5 month-start systems: every system but the year record, due on day 111 (M2.2b's
// review).
export const ALLOCATION_DAYS: readonly number[] = [1, DAYS_PER_MONTH - 1, DAYS_PER_MONTH];

// The allocation gate's limit beside its zero scavenges (R5).
export const MAX_HEAP_GROWTH_BYTES_PER_TICK = 65_536;

// The young generation's bytes in use may grow this much over a day's window: a warmed one absorbs a day of small
// garbage with no scavenge. Nothing planted measured about 3 KB, nearly all of it the stats call itself, and one
// new Array(8) a tick about 170 KB (M0.6's review).
export const MAX_YOUNG_BYTES_PER_DAY = 16_384;
