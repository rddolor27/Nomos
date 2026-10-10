import { take, type Arena } from '../memory/arena.ts';

export const MAX_HOUSEHOLD = 6;
// Zeroed memory would read as home 0, so a household with no home carries -1.
export const NO_HOME = -1;
export const NO_HOUSEHOLD = -1;

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

// Both lookups add up sizes from row 0, which a click's query can afford and a tick cannot.
// The row of the household that holds agent p, or NO_HOUSEHOLD where no row reaches p, as in a world with none.
export function householdOf(households: HouseholdStore, agent: number): number {
  const { count, size } = households;
  let end = 0;
  for (let h = 0; h < count[0]; h++) {
    end += size[h];
    if (agent < end) return h;
  }
  return NO_HOUSEHOLD;
}

// A row holds no first-member index, so household h's first member is the total size of the rows before it.
export function firstMemberOf(households: HouseholdStore, household: number): number {
  let first = 0;
  for (let h = 0; h < household; h++) first += households.size[h];
  return first;
}
