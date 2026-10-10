import { describe, expect, it } from 'vitest';
import { CITY_RECORD } from '../src/economy/city-record.ts';
import { OK, checkInvariants } from '../src/money/invariants.ts';
import { MINT } from '../src/money/ledger.ts';
import { foldToLedger } from '../src/spawn/fold.ts';
import {
  LEDGER_FIELDS,
  LEDGER_FIRMS,
  LEDGER_FIRM_CASH,
  LEDGER_HOUSEHOLD_CASH,
  populationOf,
  scaleRecord,
} from '../src/spawn/record.ts';
import { createTown, spawnTown } from '../src/spawn/town.ts';
import { stateHash } from '../src/world/checkpoint.ts';
import { standInGround } from '../src/world/ground.ts';
import { TOWN, createWorld, layoutWorld, type World } from '../src/world/world.ts';

// Highcourt's phone crowd (townAgents on the 176 x 112 map).
const PEOPLE = 3_965;

function folded(world: World): Float64Array {
  const record = new Float64Array(LEDGER_FIELDS);
  foldToLedger(world, record);
  return record;
}

function scaled(people: number): Float64Array {
  const record = new Float64Array(LEDGER_FIELDS);
  scaleRecord(CITY_RECORD, people, record);
  return record;
}

describe('createTown', () => {
  it('spawns 3,965 people that fold back exactly into the scaled record, in people and cents', () => {
    const world = createTown(42, 'phone', standInGround(), PEOPLE);
    const want = scaled(PEOPLE);
    const got = folded(world);

    expect(Array.from(got)).toEqual(Array.from(want));
    expect([world.agents.count[0], populationOf(got)]).toEqual([PEOPLE, PEOPLE]);
    expect(world.cash.balance[MINT]).toBe(-(want[LEDGER_HOUSEHOLD_CASH] + want[LEDGER_FIRM_CASH]));
    expect(checkInvariants(world.cash, world.claims)).toBe(OK);
  });

  it('marks the town to run CITY, and no other world', () => {
    expect(createTown(42, 'phone', standInGround(), PEOPLE).globals[TOWN]).toBe(1);
    expect(createWorld(42, 'phone').globals[TOWN]).toBe(0);
  });

  it('replays: the same inputs give one hash, and another seed another', () => {
    const hash = stateHash(createTown(42, 'phone', standInGround(), PEOPLE));

    expect(stateHash(createTown(42, 'phone', standInGround(), PEOPLE))).toBe(hash);
    expect(stateHash(createTown(43, 'phone', standInGround(), PEOPLE))).not.toBe(hash);
  });
});

describe('spawnTown', () => {
  it('keeps 7 firms for 69 people, in a smaller layout than the tier', () => {
    const world = layoutWorld(1, 'phone', 1_024, 1 << 20);
    spawnTown(world, 69);
    const got = folded(world);

    expect([got[LEDGER_FIRMS], world.firms.count[0], populationOf(got)]).toEqual([7, 7, 69]);
    expect(Array.from(got)).toEqual(Array.from(scaled(69)));
    expect(world.globals[TOWN]).toBe(1);
  });
});
