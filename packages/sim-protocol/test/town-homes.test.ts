import { readFileSync } from 'node:fs';
import {
  LEDGER_FIELDS,
  LEDGER_FIRM_CASH,
  LEDGER_HOUSEHOLDS,
  LEDGER_HOUSEHOLD_CASH,
  MINT,
  OK,
  checkInvariants,
  createHomes,
  createTown,
  foldToLedger,
  seatHouseholds,
  townRecord,
  type Homes,
  type World,
} from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import { ENTITY_HOME, parseMap, type MapV1 } from '../src/index.ts';

const townFile = new URL('../../../assets/maps/town.nmap', import.meta.url);
const SEED = 42;
const KEY = 7;
const UNSEATED = -1;

function loadTown(): MapV1 {
  return parseMap(new Uint8Array(readFileSync(townFile)).buffer);
}

// The caller's filter, from the map's entities to its homes, is the lookup the 10 ms spawn row leaves out.
function highcourtHomes(): Homes {
  return createHomes(loadTown().entities.filter((entity) => entity.kind === ENTITY_HOME));
}

// counts[i] households of i + 1 people, smallest first.
function householdsOf(counts: number[]): Uint8Array {
  const size = new Uint8Array(counts.reduce((total, n) => total + n, 0));
  let from = 0;
  counts.forEach((n, i) => {
    size.fill(i + 1, from, from + n);
    from += n;
  });
  return size;
}

function seat(size: Uint8Array, homes: Homes): Int32Array {
  const home = new Int32Array(size.length).fill(UNSEATED);
  seatHouseholds(size, size.length, home, homes, SEED, KEY);
  return home;
}

function peopleAt(size: Uint8Array, home: Int32Array, homes: Homes): Int32Array {
  const people = new Int32Array(homes.count);
  for (let h = 0; h < size.length; h++) people[home[h]] += size[h];
  return people;
}

describe("Highcourt's homes", () => {
  it('hold 1,960 beds, 238 homes of 4 and 42 of 24', () => {
    const { count, capacity } = highcourtHomes();
    const homesOf = (beds: number) => capacity.filter((bedCount) => bedCount === beds).length;

    expect([count, homesOf(4), homesOf(24)]).toEqual([280, 238, 42]);
    expect(capacity.reduce((beds, bedCount) => beds + bedCount, 0)).toBe(1_960);
  });

  it('seat 1,750 people in households of 1 to 6, none over capacity', () => {
    const homes = highcourtHomes();
    const size = householdsOf([150, 150, 115, 115, 45, 45]);
    const home = seat(size, homes);

    const people = peopleAt(size, home, homes);
    expect(home.every((index) => index >= 0 && index < homes.count)).toBe(true);
    expect(people.reduce((total, here) => total + here, 0)).toBe(1_750);
    expect(Array.from(people.keys()).filter((index) => people[index] > homes.capacity[index])).toEqual([]);
  });

  it('seat 168 households of 5, since only the 42 homes of 24 take them, 4 each, and throw for a 169th', () => {
    const homes = highcourtHomes();

    const home = seat(householdsOf([0, 0, 0, 0, 168]), homes);
    expect(new Set(home).size).toBe(42);
    expect(() => seat(householdsOf([0, 0, 0, 0, 169]), homes)).toThrow(RangeError);
    expect(() => seat(householdsOf([0, 0, 0, 0, 169]), homes)).toThrow(/household of 5/);
  });
});

// The people sleeping in each home, from the household rows.
function bedsTaken(world: World, homes: Homes): number[] {
  const { count, size, home } = world.households;
  const taken = new Array<number>(homes.count).fill(0);
  for (let h = 0; h < count[0]; h++) taken[home[h]] += size[h];
  return taken;
}

describe('Highcourt spawned', () => {
  it('has a blob in every one of its 1,960 beds, in 719 households of 1 to 6, and folds back exactly', () => {
    const homes = highcourtHomes();
    const world = createTown(SEED, 'phone', loadTown(), homes);
    const got = new Float64Array(LEDGER_FIELDS);
    foldToLedger(world, got);
    const want = new Float64Array(LEDGER_FIELDS);
    townRecord(1_960, 24, want);

    expect(world.agents.count[0]).toBe(1_960);
    expect(Array.from(got.subarray(LEDGER_HOUSEHOLDS, LEDGER_HOUSEHOLDS + 6))).toEqual([168, 198, 142, 120, 56, 35]);
    expect(bedsTaken(world, homes)).toEqual(Array.from(homes.capacity));
    expect(Array.from(got)).toEqual(Array.from(want));
    expect(world.cash.balance[MINT]).toBe(-(want[LEDGER_HOUSEHOLD_CASH] + want[LEDGER_FIRM_CASH]));
    expect(checkInvariants(world.cash, world.claims)).toBe(OK);
  });
});
