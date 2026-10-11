import { describe, expect, it } from 'vitest';
import { SUPPLIERS } from '../src/agents/store.ts';
import { planConsumption } from '../src/consumption/plan.ts';
import { dayBoundary, requestTown } from '../src/day/day.ts';
import { CITY } from '../src/economy/city.ts';
import { CITY_RECORD } from '../src/economy/city-record.ts';
import { TIER_AGENTS, TIER_MEMORY_BYTES } from '../src/memory/tiers.ts';
import { OK, checkInvariants } from '../src/money/invariants.ts';
import { MINT } from '../src/money/ledger.ts';
import { draw2 } from '../src/random/draw.ts';
import { SPAWN_DRAW } from '../src/random/streams.ts';
import { stepAwayTown } from '../src/spawn/away.ts';
import { foldToLedger } from '../src/spawn/fold.ts';
import { createHomes, createStandInTownHomes, fitHouseholds, type Homes } from '../src/spawn/homes.ts';
import {
  LEDGER_EMPLOYED,
  LEDGER_FIELDS,
  LEDGER_FIRM_CASH,
  LEDGER_HOUSEHOLDS,
  LEDGER_HOUSEHOLD_CASH,
  LEDGER_PRICE,
  populationOf,
  scaleRecord,
  townRecord,
} from '../src/spawn/record.ts';
import { createStandInTown, seatTown } from '../src/spawn/town.ts';
import { step } from '../src/step/step.ts';
import { TICKS_PER_DAY } from '../src/time/calendar.ts';
import { checkpoint, restoreWorld, stateHash } from '../src/world/checkpoint.ts';
import { standInGround, type Ground } from '../src/world/ground.ts';
import { MAX_TOWNS, NO_PLACE, TICK, createWorld, currentTick, layoutWorld, type World } from '../src/world/world.ts';
import { run } from './run.ts';

const SEED = 42;
// Place 0 is live at tick 0 with 1,000 beds on the stand-in ground. Place 1 has 600 on a smaller ground, and any other place
// 300.
const PEOPLE = [1_000, 600];
const OTHER_PEOPLE = 300;
const GROUND = standInGround();
const SMALL_GROUND: Ground = { width: 64, height: 64, walk: new Uint8Array(64 * 64).fill(1) };
// The stand-in homes have 6 beds each.
const LARGEST_HOME = 6;

function groundFor(place: number): Ground {
  return place === 1 ? SMALL_GROUND : GROUND;
}

function homesFor(place: number): Homes {
  return createStandInTownHomes(groundFor(place), PEOPLE[place] ?? OTHER_PEOPLE);
}

function townWorld(): World {
  return createStandInTown(SEED, 'phone', GROUND, PEOPLE[0]);
}

function request(world: World, place: number, homes: Homes = homesFor(place)): void {
  expect(requestTown(world, place, groundFor(place), homes), `a request for place ${place}`).toBe(true);
}

function folded(world: World): number[] {
  const record = new Float64Array(LEDGER_FIELDS);
  foldToLedger(world, record);
  return Array.from(record);
}

function rowOf(world: World, town: number): number[] {
  return Array.from(world.townRecords.subarray(town * LEDGER_FIELDS, (town + 1) * LEDGER_FIELDS));
}

function firstRecord(beds: number): number[] {
  const record = new Float64Array(LEDGER_FIELDS);
  townRecord(beds, LARGEST_HOME, record);
  return Array.from(record);
}

// What `months` summary months make of a row at `town`, as a table of one row would.
function lived(row: readonly number[], town: number, months: number[]): number[] {
  const rows = new Float64Array((town + 1) * LEDGER_FIELDS);
  rows.set(row, town * LEDGER_FIELDS);
  for (const month of months) stepAwayTown(rows, town, SEED, month, new Float64Array(LEDGER_FIELDS));
  return Array.from(rows.subarray(town * LEDGER_FIELDS));
}

// The day boundary of `day`, as a step runs it at the day's tick 0. The days between touch no row, so a test of the table
// can skip them.
function boundary(world: World, day: number): void {
  world.globals[TICK] = day * TICKS_PER_DAY;
  dayBoundary(world);
}

function enter(world: World, place: number, day: number, homes?: Homes): void {
  request(world, place, homes);
  boundary(world, day);
}

// A request at each of its ticks, in a step loop as the worker runs it.
function drive(world: World, requests: readonly (readonly [number, number])[], toTick: number): World {
  while (currentTick(world) < toTick) {
    for (const [tick, place] of requests) if (tick === currentTick(world)) request(world, place);
    step(world);
  }
  return world;
}

function firstDifference(got: Uint8Array, want: Uint8Array): number {
  for (let i = 0; i < got.length; i++) if (got[i] !== want[i]) return i;
  return got.length === want.length ? -1 : Math.min(got.length, want.length);
}

// MINT holds minus the live town's cash, and nothing else lost a cent.
function expectOnlyTheLiveTownsMoney(world: World): void {
  const live = folded(world);
  expect(world.cash.balance[MINT]).toBe(-(live[LEDGER_HOUSEHOLD_CASH] + live[LEDGER_FIRM_CASH]));
  expect(checkInvariants(world.cash, world.claims)).toBe(OK);
}

describe('switchTown', () => {
  it("folds the live town into its row on the day's tick 0 and re-enters it within the month exactly, money for money", () => {
    const world = run(townWorld(), 2 * TICKS_PER_DAY);
    const left = folded(world);
    request(world, 1);

    expect([world.focus[0], world.agents.count[0]]).toEqual([0, PEOPLE[0]]);
    expect(world.ground).toBe(GROUND);
    step(world);

    expect([world.focus[0], world.agents.count[0]]).toEqual([1, PEOPLE[1]]);
    expect(world.ground).toBe(SMALL_GROUND);
    expect(rowOf(world, 0)).toEqual(left);
    expect(rowOf(world, 1)).toEqual(firstRecord(PEOPLE[1]));
    expectOnlyTheLiveTownsMoney(world);

    run(world, 4 * TICKS_PER_DAY);
    request(world, 0);
    step(world);

    expect([world.focus[0], world.agents.count[0]]).toEqual([0, PEOPLE[0]]);
    expect(world.ground).toBe(GROUND);
    expect(folded(world)).toEqual(left);
    expect(world.cash.balance[MINT]).toBe(-(left[LEDGER_HOUSEHOLD_CASH] + left[LEDGER_FIRM_CASH]));
    expectOnlyTheLiveTownsMoney(world);
  });

  it('steps a town that is away over a month start by one summary month, and spawns it from that row', () => {
    const world = townWorld();
    enter(world, 1, 20);
    const left = rowOf(world, 0);
    const stepped = lived(left, 0, [1]);
    boundary(world, 21);

    expect(rowOf(world, 0)).toEqual(stepped);
    expect(stepped).not.toEqual(left);
    // The live town runs its own economy, so its row waits.
    expect(rowOf(world, 1)).toEqual(firstRecord(PEOPLE[1]));

    enter(world, 0, 22);
    expect(folded(world)).toEqual(stepped);
    expectOnlyTheLiveTownsMoney(world);
  });

  it('lets a town first entered later live the months that began before that day, and steps the one just left on a month start', () => {
    const world = townWorld();
    enter(world, 2, 50);
    // Months 1 (day 21) and 2 (day 42) began before day 50.
    expect(rowOf(world, 2)).toEqual(lived(firstRecord(OTHER_PEOPLE), 2, [1, 2]));

    const left = folded(world);
    enter(world, 3, 63);
    // Month 3 begins on day 63, so place 3 meets it as the live town, and place 2, just folded, takes its step at once.
    expect(rowOf(world, 3)).toEqual(lived(firstRecord(OTHER_PEOPLE), 3, [1, 2]));
    expect(rowOf(world, 2)).toEqual(lived(left, 2, [3]));
    expectOnlyTheLiveTownsMoney(world);
  });

  it('steps no town on day 0, which begins month 0', () => {
    const world = townWorld();
    const left = folded(world);
    enter(world, 1, 0);

    expect(rowOf(world, 0)).toEqual(left);
  });

  it("makes the month's consumption plans at once off a month's first day, and leaves them to the economy on one", () => {
    const world = townWorld();
    const planned = (): number => world.agents.plannedUnits.subarray(0, world.agents.count[0]).reduce((sum, units) => sum + units, 0);
    expect(planned()).toBe(0);
    enter(world, 1, 5);
    expect(planned()).toBeGreaterThan(0);
    enter(world, 0, 21);
    expect(planned()).toBe(0);
  });

  it('empties a town to a new world\'s layout, so a switched-in town is the one a fresh world spawns', () => {
    const world = run(townWorld(), 3 * TICKS_PER_DAY);
    enter(world, 1, 3);

    const fresh = layoutWorld(SEED, 'phone', TIER_AGENTS.phone, TIER_MEMORY_BYTES.phone, SMALL_GROUND);
    seatTown(fresh, Float64Array.from(firstRecord(PEOPLE[1])), homesFor(1), 1, 3);
    planConsumption(fresh, CITY);

    expect(firstDifference(world.agentBytes, fresh.agentBytes)).toBe(-1);
    expect(firstDifference(world.economyBytes, fresh.economyBytes)).toBe(-1);
    expect(Array.from(world.cash.balance)).toEqual(Array.from(fresh.cash.balance));
  });

  it("trims a folded row's households to the fit under the day's key, so a re-entry never throws", () => {
    const village = createHomes([4, 4, 6, 6, 6].map((capacity, i) => ({ doorX: i, doorY: 0, capacity })));
    const row = new Float64Array(LEDGER_FIELDS);
    scaleRecord(CITY_RECORD, 26, row);
    row.set([1, 3, 3, 1, 0, 1], LEDGER_HOUSEHOLDS);
    // These households seat under most keys and not under all; the first day whose key trims them is the test's.
    let day = 1;
    const trimmed = new Float64Array(LEDGER_FIELDS);
    do {
      trimmed.set(row);
      fitHouseholds(trimmed, village, SEED, draw2(SEED, SPAWN_DRAW, 1, day));
    } while (trimmed.join() === row.join() && ++day < 200);
    expect(day).toBeLessThan(200);

    const world = townWorld();
    world.townRecords.set(row, LEDGER_FIELDS);
    enter(world, 1, day, village);

    expect(populationOf(Float64Array.from(folded(world)))).toBe(26);
    expect(folded(world)).toEqual(Array.from(trimmed));
  });

  it("checks the request's homes before it folds, so beds that fall short throw with the live town and every row as they were", () => {
    const world = townWorld();
    enter(world, 1, 3);
    request(world, 0);
    // Place 0 folded 1,000 people, and these homes have 300 beds.
    world.request.homes = homesFor(2);
    world.globals[TICK] = 4 * TICKS_PER_DAY;
    const hash = stateHash(world);
    const table = Array.from(world.townRecords);

    expect(() => boundary(world, 4)).toThrow(RangeError);
    expect(stateHash(world)).toBe(hash);
    expect(Array.from(world.townRecords)).toEqual(table);
    expect([world.focus[0], world.agents.count[0], world.request.place]).toEqual([1, PEOPLE[1], NO_PLACE]);
    expectOnlyTheLiveTownsMoney(world);
  });

  it("lands a request logged at a day's tick 5 on the next tick 0, and a twin replaying the log reaches the same hash at tick 3,000", () => {
    const requests: [number, number][] = [
      [5, 1],
      [2_000, 0],
    ];
    const world = townWorld();
    drive(world, requests, TICKS_PER_DAY);
    expect([world.focus[0], world.agents.count[0]]).toEqual([0, PEOPLE[0]]);
    drive(world, requests, TICKS_PER_DAY + 1);
    expect([world.focus[0], world.agents.count[0]]).toEqual([1, PEOPLE[1]]);
    drive(world, requests, 3_000);

    const log = world.inputs;
    const logged = Array.from({ length: log.cursor[0] }, (_, n): [number, number] => [log.tick[n], log.a[n]]);
    expect(logged).toEqual(requests);
    const twin = drive(townWorld(), logged, 3_000);
    expect(stateHash(twin)).toBe(stateHash(world));
    expect(stateHash(drive(townWorld(), [], 3_000))).not.toBe(stateHash(world));
  });
});

describe('requestTown', () => {
  it('refuses what a switch could not spawn, logs nothing, and lets a request for the live town switch nothing', () => {
    const world = townWorld();
    const tiny = createHomes([{ doorX: 1, doorY: 1, capacity: SUPPLIERS - 1 }]);
    const plain = createWorld(SEED, 'phone');
    const refused = [
      requestTown(world, MAX_TOWNS, GROUND, homesFor(2)),
      requestTown(world, -1, GROUND, homesFor(2)),
      requestTown(world, 1.5, GROUND, homesFor(2)),
      requestTown(world, 1, GROUND, tiny),
      requestTown(plain, 1, GROUND, homesFor(2)),
    ];
    expect(refused).toEqual([false, false, false, false, false]);
    expect([world.inputs.cursor[0], plain.inputs.cursor[0]]).toEqual([0, 0]);

    const where = Array.from(world.agents.x.subarray(0, PEOPLE[0]));
    enter(world, 0, 1);
    expect(world.inputs.cursor[0]).toBe(1);
    expect(Array.from(world.agents.x.subarray(0, PEOPLE[0]))).toEqual(where);
    expect(rowOf(world, 0).every((field) => field === 0)).toBe(true);
  });

  it('refuses a return into fewer beds than the town folded people, which would fold the live town and then throw', () => {
    const world = townWorld();
    enter(world, 1, 3);
    const left = rowOf(world, 0);
    const hash = stateHash(world);
    const table = Array.from(world.townRecords);
    const logged = world.inputs.cursor[0];

    // Place 0 holds 1,000 people, as a ?tier= start's crowd would in the homes of Highcourt's 2,688 beds.
    expect(requestTown(world, 0, GROUND, homesFor(2))).toBe(false);
    expect([stateHash(world), world.inputs.cursor[0], world.request.place]).toEqual([hash, logged, NO_PLACE]);
    expect(Array.from(world.townRecords)).toEqual(table);
    boundary(world, 4);
    expect([world.focus[0], world.agents.count[0]]).toEqual([1, PEOPLE[1]]);

    enter(world, 0, 5);
    expect([world.focus[0], world.agents.count[0]]).toEqual([0, PEOPLE[0]]);
    expect(rowOf(world, 0)).toEqual(left);
  });
});

describe('the ledger table in the state', () => {
  it('is hashed once a town has switched, with its live place, and a checkpoint carries it', () => {
    const world = townWorld();
    enter(world, 1, 3);
    const hash = stateHash(world);
    const bytes = new Uint8Array(world.arena.memory.buffer);
    const employedAt = world.townRecords.byteOffset + LEDGER_EMPLOYED * Float64Array.BYTES_PER_ELEMENT;
    const unvisitedPriceAt = world.townRecords.byteOffset + (4 * LEDGER_FIELDS + LEDGER_PRICE) * Float64Array.BYTES_PER_ELEMENT;

    bytes[employedAt + 1] ^= 1;
    expect(stateHash(world)).not.toBe(hash);
    bytes[employedAt + 1] ^= 1;
    world.focus[0] = 7;
    expect(stateHash(world)).not.toBe(hash);
    world.focus[0] = 1;
    // A row with no people is unvisited, and the hash leaves it out.
    bytes[unvisitedPriceAt + 1] ^= 1;
    expect(stateHash(world)).toBe(hash);

    const restored = restoreWorld(SEED, 'phone', checkpoint(world), world.ground);
    expect(stateHash(restored)).toBe(hash);
    expect(rowOf(restored, 0)).toEqual(rowOf(world, 0));
    expect(restored.focus[0]).toBe(1);
  });
});
