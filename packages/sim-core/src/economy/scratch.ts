import { take, type Arena } from '../memory/arena.ts';
import { STATS } from './stats.ts';

// The value agents/store.ts gives an agent with no employer.
const NO_FIRM = -1;

// Working arrays the economy day reuses, outside the state hash. Each has one owner, named here. No system holds order,
// weights or shares between days, so spawn/ borrows all three before the first day.
export interface EconomyScratch {
  // Refilled by keyedShuffle just before each use.
  readonly order: Int32Array;
  // wealth/ and money/fiat.ts.
  readonly weights: Float64Array;
  readonly shares: Float64Array;
  // consumption/.
  readonly firmPrefix: Int32Array;
  // labour/.
  readonly firmTally: Int32Array;
  // wages/ writes each firm's pay per worker at a month's end, and firms/renew.ts reads it.
  readonly pay: Float64Array;
  // The economy day sets the day-end slots, and each system adds to its own.
  readonly stats: Float64Array;
  // economy/stats.ts: each person's month ends in a row out of work, and the employer and wage at the last year end.
  readonly spellMonths: Uint8Array;
  readonly yearEmployer: Int32Array;
  readonly yearWage: Float64Array;
  // 1 for a firm that exits with workers at this month's end: firms/renew.ts writes it, and labour/layoffs.ts reads it.
  readonly exiting: Uint8Array;
}

export function createEconomyScratch(arena: Arena, agents: number, firms: number): EconomyScratch {
  const scratch: EconomyScratch = {
    order: take(arena, Int32Array, agents, false),
    weights: take(arena, Float64Array, agents, false),
    shares: take(arena, Float64Array, agents, false),
    firmPrefix: take(arena, Int32Array, firms, false),
    firmTally: take(arena, Int32Array, firms, false),
    pay: take(arena, Float64Array, firms, false),
    stats: take(arena, Float64Array, STATS, false),
    spellMonths: take(arena, Uint8Array, agents, false),
    yearEmployer: take(arena, Int32Array, agents, false),
    yearWage: take(arena, Float64Array, firms, false),
    exiting: take(arena, Uint8Array, firms, false),
  };
  // Nobody held a job at a year end that has not come yet, so no one is a stayer at the first.
  scratch.yearEmployer.fill(NO_FIRM);
  return scratch;
}
