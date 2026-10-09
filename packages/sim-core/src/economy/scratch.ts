import { take, type Arena } from '../memory/arena.ts';
import { STATS } from './stats.ts';

// Working arrays the economy day reuses, outside the state hash. Each has one owner, named here.
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
  // wages/.
  readonly pay: Float64Array;
  // The economy day sets the day-end slots, and each system adds to its own.
  readonly stats: Float64Array;
}

export function createEconomyScratch(arena: Arena, agents: number, firms: number): EconomyScratch {
  return {
    order: take(arena, Int32Array, agents, false),
    weights: take(arena, Float64Array, agents, false),
    shares: take(arena, Float64Array, agents, false),
    firmPrefix: take(arena, Int32Array, firms, false),
    firmTally: take(arena, Int32Array, firms, false),
    pay: take(arena, Float64Array, firms, false),
    stats: take(arena, Float64Array, STATS, false),
  };
}
