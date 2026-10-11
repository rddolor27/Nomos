import { describe, expect, it } from 'vitest';
import { ACTION_IDLE, ACTION_WALK, FACING_DOWN } from '../src/agents/actions.ts';
import { SUPPLIERS } from '../src/agents/store.ts';
import { CITY_RECORD } from '../src/economy/city-record.ts';
import { OK, checkInvariants } from '../src/money/invariants.ts';
import { MINT } from '../src/money/ledger.ts';
import { WALK_X_Q8, WALK_Y_Q8, facingFor } from '../src/movement/walk.ts';
import { foldToLedger } from '../src/spawn/fold.ts';
import { createHomes, createStandInTownHomes, type Homes } from '../src/spawn/homes.ts';
import {
  LEDGER_EMPLOYED,
  LEDGER_FIELDS,
  LEDGER_FIRMS,
  LEDGER_FIRM_CASH,
  LEDGER_HOUSEHOLDS,
  LEDGER_HOUSEHOLD_CASH,
  populationOf,
  scaleRecord,
  townRecord,
} from '../src/spawn/record.ts';
import { createStandInTown, createTown, spawnTown } from '../src/spawn/town.ts';
import { TICKS_PER_DAY } from '../src/time/calendar.ts';
import { stateHash } from '../src/world/checkpoint.ts';
import { standInGround, type Ground } from '../src/world/ground.ts';
import { TICK, TOWN, createWorld, layoutWorld, type World } from '../src/world/world.ts';

// Highcourt's phone crowd before M2.2c. A stand-in town of this size keeps the walking start's counts pinned below; the
// town's own homes are in sim-protocol's town-homes test.
const PEOPLE = 3_965;
// The households of sizes 1 to 6 are the first six fields of a record.
const SIZES = 6;

function folded(world: World): Float64Array {
  const record = new Float64Array(LEDGER_FIELDS);
  foldToLedger(world, record);
  return record;
}

function recordFor(beds: number, largestHome: number): Float64Array {
  const record = new Float64Array(LEDGER_FIELDS);
  townRecord(beds, largestHome, record);
  return record;
}

function householdsOf(record: Float64Array): number[] {
  return Array.from(record.subarray(LEDGER_HOUSEHOLDS, LEDGER_HOUSEHOLDS + SIZES));
}

describe('townRecord', () => {
  it("gives Highcourt's 2,688 beds 985 households in the mix, and scales the rest of CITY's record to them", () => {
    const record = recordFor(2_688, 24);
    const scaled = new Float64Array(LEDGER_FIELDS);
    scaleRecord(CITY_RECORD, 2_688, scaled);

    expect(householdsOf(record)).toEqual([229, 272, 194, 165, 77, 48]);
    expect(populationOf(record)).toBe(2_688);
    expect(Array.from(record.subarray(LEDGER_EMPLOYED))).toEqual(Array.from(scaled.subarray(LEDGER_EMPLOYED)));
  });

  it("leaves out the households past the town's largest home, and the one-person households take their people", () => {
    const record = recordFor(1_200, 4);

    expect(householdsOf(record)).toEqual([408, 121, 86, 73, 0, 0]);
    expect(populationOf(record)).toBe(1_200);
  });
});

describe('createStandInTown', () => {
  it('spawns 3,965 people that fold back exactly into the town record, in people and cents', () => {
    const world = createStandInTown(42, 'phone', standInGround(), PEOPLE);
    const want = recordFor(PEOPLE, 6);
    const got = folded(world);

    expect(Array.from(got)).toEqual(Array.from(want));
    expect([world.agents.count[0], populationOf(got)]).toEqual([PEOPLE, PEOPLE]);
    expect(world.cash.balance[MINT]).toBe(-(want[LEDGER_HOUSEHOLD_CASH] + want[LEDGER_FIRM_CASH]));
    expect(checkInvariants(world.cash, world.claims)).toBe(OK);
  });

  it('marks the town to run CITY, and no other world', () => {
    expect(createStandInTown(42, 'phone', standInGround(), PEOPLE).globals[TOWN]).toBe(1);
    expect(createWorld(42, 'phone').globals[TOWN]).toBe(0);
  });

  it('replays: the same inputs give one hash, and another seed another', () => {
    const hash = stateHash(createStandInTown(42, 'phone', standInGround(), PEOPLE));

    expect(stateHash(createStandInTown(42, 'phone', standInGround(), PEOPLE))).toBe(hash);
    expect(stateHash(createStandInTown(43, 'phone', standInGround(), PEOPLE))).not.toBe(hash);
  });
});

function actionsOf(world: World): number[] {
  return Array.from(world.agents.action.subarray(0, world.agents.count[0]));
}

describe('the walking start', () => {
  it('sets three in four of a town walking on a keyed heading, and leaves the rest idle facing down', () => {
    const world = createStandInTown(42, 'phone', standInGround(), PEOPLE);
    const { count, action, heading, vx, vy, facing } = world.agents;
    const wrong: number[] = [];
    const quadrants = new Set<number>();
    let walkers = 0;
    for (let p = 0; p < count[0]; p++) {
      const walks = action[p] === ACTION_WALK;
      if (walks) {
        walkers++;
        quadrants.add(heading[p] >> 6);
      }
      const want = walks
        ? [ACTION_WALK, heading[p], WALK_X_Q8[heading[p]], WALK_Y_Q8[heading[p]], facingFor(heading[p])]
        : [ACTION_IDLE, 0, 0, 0, FACING_DOWN];
      if ([action[p], heading[p], vx[p], vy[p], facing[p]].join() !== want.join()) wrong.push(p);
    }

    expect(wrong).toEqual([]);
    expect(walkers).toBe(2_998);
    expect(quadrants.size).toBe(4);
  });

  it('keys the walkers on the seed', () => {
    const walking = actionsOf(createStandInTown(42, 'phone', standInGround(), PEOPLE));

    expect(actionsOf(createStandInTown(42, 'phone', standInGround(), PEOPLE))).toEqual(walking);
    expect(actionsOf(createStandInTown(43, 'phone', standInGround(), PEOPLE))).not.toEqual(walking);
  });
});

// Homes of the given bed counts, with their doors on the stand-in ground's first rows.
function homesOf(beds: number[]): Homes {
  return createHomes(beds.map((capacity, i) => ({ doorX: i % 16, doorY: Math.floor(i / 16), capacity })));
}

// count homes of the same size.
function evenHomes(count: number, beds: number): Homes {
  return homesOf(new Array<number>(count).fill(beds));
}

// The people sleeping in each home: the sizes of the households seated there.
function peopleAt(world: World, homes: Homes): number[] {
  const { count, size, home } = world.households;
  const people = new Array<number>(homes.count).fill(0);
  for (let h = 0; h < count[0]; h++) people[home[h]] += size[h];
  return people;
}

describe('one blob to a bed', () => {
  it('fills every bed of 300 homes of 4 with households of 1 to 4, and none of 5 or 6', () => {
    const homes = evenHomes(300, 4);
    const world = createTown(1, 'phone', standInGround(), homes);

    expect(world.agents.count[0]).toBe(1_200);
    expect(householdsOf(folded(world))).toEqual([408, 121, 86, 73, 0, 0]);
    expect(peopleAt(world, homes)).toEqual(Array.from(homes.capacity));
  });

  it('trims the big households a village of huts and farmhouses cannot seat, and still fills every bed', () => {
    // 24 huts, 17 houses of 4 and 3 farmhouses: 134 beds. The mix wants 3 households of 5 and 2 of 6, but only the farmhouses
    // can seat them, so the 2 of 6 take two and one of the 5 takes the third.
    const homes = homesOf([...new Array<number>(24).fill(2), ...new Array<number>(17).fill(4), 6, 6, 6]);
    const world = createTown(1, 'phone', standInGround(), homes);

    expect(householdsOf(recordFor(134, 6))).toEqual([22, 13, 9, 8, 3, 2]);
    expect(world.agents.count[0]).toBe(134);
    expect(householdsOf(folded(world))).toEqual([32, 13, 9, 8, 1, 2]);
    expect(peopleAt(world, homes)).toEqual(Array.from(homes.capacity));
  });

  it('seats a one-person household in each home of 1 bed', () => {
    const homes = evenHomes(10, 1);
    const world = createTown(1, 'phone', standInGround(), homes);
    const { size, home } = world.households;

    expect([world.agents.count[0], world.households.count[0]]).toEqual([10, 10]);
    expect(Array.from(size.subarray(0, 10))).toEqual(new Array<number>(10).fill(1));
    expect(new Set(home.subarray(0, 10)).size).toBe(10);
  });

  it("stops at the layout's agent rows when the beds outnumber them", () => {
    const world = layoutWorld(1, 'phone', 1_024, 1 << 20);
    spawnTown(world, evenHomes(300, 4));

    expect([world.agents.count[0], populationOf(folded(world))]).toEqual([1_024, 1_024]);
  });
});

describe('spawnTown', () => {
  it('keeps 7 firms for 69 people, in a smaller layout than the tier', () => {
    const world = layoutWorld(1, 'phone', 1_024, 1 << 20);
    spawnTown(world, createStandInTownHomes(world.ground, 69));
    const got = folded(world);

    expect([got[LEDGER_FIRMS], world.firms.count[0], populationOf(got)]).toEqual([7, 7, 69]);
    expect(Array.from(got)).toEqual(Array.from(recordFor(69, 6)));
    expect(world.globals[TOWN]).toBe(1);
  });

  it('refuses a world past tick 0, whose first month would run with no plans, and writes nothing', () => {
    for (const tick of [1, TICKS_PER_DAY]) {
      const world = layoutWorld(1, 'phone', 1_024, 1 << 20);
      world.globals[TICK] = tick;

      expect(() => spawnTown(world, createStandInTownHomes(world.ground, 69)), `tick ${tick}`).toThrow(RangeError);
      const { agents, households, firms, globals } = world;
      expect([agents.count[0], households.count[0], firms.count[0], globals[TOWN]]).toEqual([0, 0, 0, 0]);
    }
  });
});

describe('the smallest town', () => {
  const lone: Ground = { width: 2, height: 2, walk: new Uint8Array([0, 0, 0, 1]) };

  it('spawns 7 people on one walkable tile, with 7 firms', () => {
    const world = createStandInTown(1, 'phone', lone, SUPPLIERS);

    expect([world.agents.count[0], world.firms.count[0]]).toEqual([SUPPLIERS, SUPPLIERS]);
    expect(checkInvariants(world.cash, world.claims)).toBe(OK);
  });

  it('refuses 6 people, whom the 7 firms of a town outnumber', () => {
    expect(() => createStandInTown(1, 'phone', lone, SUPPLIERS - 1)).toThrow(RangeError);
  });
});
