import { take, type Arena } from '../memory/arena.ts';

export const MAX_HOUSEHOLD = 6;
// Zeroed memory would read as home 0, so a household with no home carries -1.
export const NO_HOME = -1;

// A household's members are the blobs at adjacent indices that follow household h - 1's, so a row holds no first-member
// index (M2.2 Ruling 2). size is 1 to MAX_HOUSEHOLD people, and home a row of the town's homes, or NO_HOME.
export interface HouseholdStore {
  readonly capacity: number;
  readonly count: Int32Array;
  readonly size: Uint8Array;
  readonly home: Int32Array;
}

export function createHouseholdStore(arena: Arena, capacity: number): HouseholdStore {
  return {
    capacity,
    count: take(arena, Int32Array, 1, true),
    size: take(arena, Uint8Array, capacity, true),
    home: take(arena, Int32Array, capacity, true),
  };
}
