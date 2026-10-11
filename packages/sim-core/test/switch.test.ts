import { describe, expect, it } from 'vitest';
import { SUPPLIERS } from '../src/agents/store.ts';
import { attachTown, dayBoundary, requestTown } from '../src/day/day.ts';
import { CITY_RECORD } from '../src/economy/city-record.ts';
import { ECONOMY_TICKS } from '../src/economy/economy.ts';
import { STAT_WAGE_BILL } from '../src/economy/stats.ts';
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
  LEDGER_UNEMPLOYED,
  LEDGER_WAGE,
  populationOf,
  scaleRecord,
  townRecord,
} from '../src/spawn/record.ts';
import { createStandInTown, seatTown } from '../src/spawn/town.ts';
import { step } from '../src/step/step.ts';
import { NO_SHOPS } from '../src/street/shops.ts';
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

const PAYROLL_DAY = 20;
const PLAYED_DAYS = 62;

function wageBill(world: World): number {
  const { firms } = world;
  let owed = 0;
  for (let f = 0; f < firms.count[0]; f++) owed += firms.employees[f] * firms.wage[f];
  return owed;
}

function unemployment(world: World): number {
  const record = new Float64Array(LEDGER_FIELDS);
  foldToLedger(world, record);
  return record[LEDGER_UNEMPLOYED] / populationOf(record);
}

// Place 1 entered by the step on `day` and played to day 62: the wage bill the first payroll owed and what it paid, and the
// highest share out of work on a day's end. The ledger is checked once at the end, since the phone tier's 10,000 wallets make
// a check a tick slow.
function playedFrom(day: number): { owed: number; paid: number; peak: number } {
  const world = townWorld();
  world.checks = false;
  world.globals[TICK] = day * TICKS_PER_DAY;
  request(world, 1);
  const payTick = PAYROLL_DAY * TICKS_PER_DAY;
  const played = { owed: 0, paid: 0, peak: 0 };
  while (currentTick(world) < PLAYED_DAYS * TICKS_PER_DAY) {
    if (currentTick(world) === payTick) played.owed = wageBill(world);
    step(world);
    const tick = currentTick(world);
    if (tick === payTick + ECONOMY_TICKS) played.paid = world.economyScratch.stats[STAT_WAGE_BILL];
    if (tick % TICKS_PER_DAY === 0) played.peak = Math.max(played.peak, unemployment(world));
  }
  expectOnlyTheLiveTownsMoney(world);
  return played;
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

function cashOf(record: readonly number[]): number {
  return record[LEDGER_HOUSEHOLD_CASH] + record[LEDGER_FIRM_CASH];
}

// A record without how its cash splits between households and firms, which a spawn off a month's first day moves.
function withoutCashSplit(record: readonly number[]): number[] {
  return record.map((value, field) => (field === LEDGER_HOUSEHOLD_CASH || field === LEDGER_FIRM_CASH ? 0 : value));
}

// MINT holds minus the live town's cash, and nothing else lost a cent.
function expectOnlyTheLiveTownsMoney(world: World): void {
  expect(world.cash.balance[MINT]).toBe(-cashOf(folded(world)));
  expect(checkInvariants(world.cash, world.claims)).toBe(OK);
}

describe('switchTown', () => {
  it("folds the live town into its row on the day's tick 0 and re-enters it within the month with every count and cent exact", () => {
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
    // Day 4's firms hold the cash a live town has by then, which the fold on day 2 did not yet: only the split moves.
    expect(withoutCashSplit(folded(world))).toEqual(withoutCashSplit(left));
    expect(cashOf(folded(world))).toBe(cashOf(left));
    expect(folded(world)[LEDGER_FIRM_CASH]).toBeGreaterThan(left[LEDGER_FIRM_CASH]);
    expect(world.cash.balance[MINT]).toBe(-cashOf(left));
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
    expect(withoutCashSplit(folded(world))).toEqual(withoutCashSplit(stepped));
    expect(cashOf(folded(world))).toBe(cashOf(stepped));
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

  it("makes the month's plans and the firms' demand so far at once off a month's first day, and leaves both to the economy on one", () => {
    const world = townWorld();
    const sum = (column: Int32Array, count: number): number => column.subarray(0, count).reduce((total, value) => total + value, 0);
    const planned = (): number => sum(world.agents.plannedUnits, world.agents.count[0]);
    const demanded = (): number => sum(world.firms.demand, world.firms.count[0]);
    expect([planned(), demanded()]).toEqual([0, 0]);

    enter(world, 1, 5);
    const { firms } = world;
    const wrong: number[] = [];
    for (let f = 0; f < firms.count[0]; f++) if (firms.demand[f] !== Math.floor((firms.lastDemand[f] * 5) / 21)) wrong.push(f);
    expect(planned()).toBeGreaterThan(0);
    expect(demanded()).toBeGreaterThan(0);
    expect(wrong).toEqual([]);

    enter(world, 0, 21);
    expect([planned(), demanded()]).toEqual([0, 0]);
  });

  it("moves the month so far's share of the wage bill from the households to the firms of a town that spawns mid-month", () => {
    const world = townWorld();
    const first = firstRecord(PEOPLE[1]);
    const moved = Math.floor((first[LEDGER_EMPLOYED] * first[LEDGER_WAGE] * 15) / 21);
    enter(world, 1, 15);
    const got = folded(world);

    expect(moved).toBeGreaterThan(0);
    expect(got[LEDGER_FIRM_CASH]).toBe(first[LEDGER_FIRM_CASH] + moved);
    expect(got[LEDGER_HOUSEHOLD_CASH]).toBe(first[LEDGER_HOUSEHOLD_CASH] - moved);
    expect(withoutCashSplit(got)).toEqual(withoutCashSplit(first));
    expectOnlyTheLiveTownsMoney(world);
  });

  it('stops at the cash a town holds, and leaves firms that already hold more as they are', () => {
    const poor = firstRecord(OTHER_PEOPLE);
    [poor[LEDGER_HOUSEHOLD_CASH], poor[LEDGER_FIRM_CASH]] = [1_000, 5_000];
    const flush = firstRecord(OTHER_PEOPLE);
    [flush[LEDGER_HOUSEHOLD_CASH], flush[LEDGER_FIRM_CASH]] = [30_000_000, 60_000_000];
    const world = townWorld();
    world.townRecords.set(poor, 2 * LEDGER_FIELDS);
    world.townRecords.set(flush, 3 * LEDGER_FIELDS);
    const cashes = (): number[] => [folded(world)[LEDGER_HOUSEHOLD_CASH], folded(world)[LEDGER_FIRM_CASH]];

    enter(world, 2, 15);
    expect(cashes()).toEqual([0, 6_000]);
    enter(world, 3, 16);
    expect(cashes()).toEqual([30_000_000, 60_000_000]);
    expectOnlyTheLiveTownsMoney(world);
  });

  it("covers a mid-month spawn's first payroll, and holds its unemployment under a day-0 spawn's peak", () => {
    const early = playedFrom(0);
    const late = playedFrom(15);

    expect(early.paid / early.owed).toBeGreaterThan(0.99);
    expect(late.paid / late.owed).toBeGreaterThan(0.99);
    expect(late.peak).toBeLessThan(early.peak + 0.01);
  });

  it('empties a town to a new world\'s layout, so a switched-in town is the one a fresh world spawns', () => {
    const world = run(townWorld(), 3 * TICKS_PER_DAY);
    enter(world, 1, 21);

    const fresh = layoutWorld(SEED, 'phone', TIER_AGENTS.phone, TIER_MEMORY_BYTES.phone, SMALL_GROUND);
    seatTown(fresh, Float64Array.from(firstRecord(PEOPLE[1])), homesFor(1), 1, 21);

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

    const got = folded(world);
    expect(populationOf(Float64Array.from(got))).toBe(26);
    expect(withoutCashSplit(got)).toEqual(withoutCashSplit(Array.from(trimmed)));
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
    expect([world.focus[0], world.agents.count[0], world.focus[1]]).toEqual([1, PEOPLE[1], NO_PLACE]);
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
    expect([stateHash(world), world.inputs.cursor[0], world.focus[1]]).toEqual([hash, logged, NO_PLACE]);
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

describe('the pending switch in the arena', () => {
  // A request waits at tick 300, and a checkpoint of the world is restored, with the live town's ground as a restore has it.
  function restoredWithRequest(): { original: World; restored: World } {
    const original = run(townWorld(), 300);
    request(original, 1);
    return { original, restored: restoreWorld(SEED, 'phone', checkpoint(original), original.ground) };
  }

  it('is carried by a checkpoint, and a restored world with its ground and homes attached reaches the same hash at the boundary', () => {
    const { original, restored } = restoredWithRequest();
    expect([original.focus[1], restored.focus[1]]).toEqual([1, 1]);
    attachTown(restored, 1, SMALL_GROUND, homesFor(1), NO_SHOPS);

    run(original, TICKS_PER_DAY + 1);
    run(restored, TICKS_PER_DAY + 1);

    expect([restored.focus[0], restored.focus[1], restored.agents.count[0]]).toEqual([1, NO_PLACE, PEOPLE[1]]);
    expect(stateHash(restored)).toBe(stateHash(original));
  });

  it('makes a boundary throw when nothing is attached for the pending place, with the live town as it was', () => {
    const { restored } = restoredWithRequest();
    run(restored, TICKS_PER_DAY);
    const hash = stateHash(restored);

    expect(() => step(restored)).toThrow(RangeError);
    expect(stateHash(restored)).toBe(hash);
    expect([restored.focus[0], restored.focus[1], restored.agents.count[0]]).toEqual([0, NO_PLACE, PEOPLE[0]]);
    expectOnlyTheLiveTownsMoney(restored);
  });
});
