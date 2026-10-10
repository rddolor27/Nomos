import { describe, expect, it } from 'vitest';
import { ACTION_IDLE } from '../src/agents/actions.ts';
import { SUPPLIERS } from '../src/agents/store.ts';
import { economyDay } from '../src/economy/economy.ts';
import { LENGNICK } from '../src/economy/params.ts';
import { TIER_AGENTS, TIER_MEMORY_BYTES } from '../src/memory/tiers.ts';
import { OK, checkCash } from '../src/money/invariants.ts';
import { MINT } from '../src/money/ledger.ts';
import { foldToLedger } from '../src/spawn/fold.ts';
import { createStandInHomes, type Homes } from '../src/spawn/homes.ts';
import {
  LEDGER_EMPLOYED,
  LEDGER_FIELDS,
  LEDGER_FIRMS,
  LEDGER_FIRM_CASH,
  LEDGER_HOUSEHOLDS,
  LEDGER_HOUSEHOLD_CASH,
  LEDGER_PRICE,
  LEDGER_STOCK,
  LEDGER_UNEMPLOYED,
  LEDGER_WAGE,
  populationOf,
} from '../src/spawn/record.ts';
import { spawnFromLedger } from '../src/spawn/spawn.ts';
import { DAYS_PER_MONTH } from '../src/time/calendar.ts';
import { stateHash } from '../src/world/checkpoint.ts';
import { standInGround, tileOf } from '../src/world/ground.ts';
import { layoutWorld, populate, type World } from '../src/world/world.ts';
import { randomRecord } from './engines/records.ts';

const SEED = 2026;
const RECORDS = 1_000;
// A random record holds at most 60 households of each size, 1,260 people, and 500 homes of 6 beds hold over twice that.
const SMALL_AGENTS = 1_500;
const SMALL_BYTES = 1 << 20;
const SMALL_HOMES = createStandInHomes(standInGround(), 500);
// 10,000 people in households of 1 to 6, with 1,000 firms.
const TOWN = Float64Array.of(3_200, 1_500, 600, 300, 100, 50, 9_500, 500, 1_000, 3_100_000_000, 50_000_000, 2_500, 142_800, 30_000);
// 1,000 people near LENGNICK's start, with 310,000,000 cents between households and firms.
const CITY = Float64Array.of(350, 150, 50, 30, 10, 5, 950, 50, 100, 300_000_000, 10_000_000, 2_500, 142_800, 3_000);
const CITY_CASH = 310_000_000;
const RUN_DAYS = 2_000;

function smallWorld(seed: number): World {
  return layoutWorld(seed, 'phone', SMALL_AGENTS, SMALL_BYTES);
}

function phoneWorld(seed: number): World {
  return layoutWorld(seed, 'phone', TIER_AGENTS.phone, TIER_MEMORY_BYTES.phone);
}

// Beds for twice the people, which always seat a mix of sizes (homes.test.ts).
function homesFor(record: Float64Array): Homes {
  return createStandInHomes(standInGround(), Math.ceil(populationOf(record) / 3));
}

function recordAt(index: number): Float64Array {
  const record = new Float64Array(LEDGER_FIELDS);
  randomRecord(SEED, index, record);
  return record;
}

function spawnedSmall(record: Float64Array, seed: number, settlement: number, day: number): World {
  const world = smallWorld(seed);
  spawnFromLedger(world, record, SMALL_HOMES, LENGNICK, settlement, day);
  return world;
}

function folded(world: World): Float64Array {
  const record = new Float64Array(LEDGER_FIELDS);
  foldToLedger(world, record);
  return record;
}

function withFields(base: Float64Array, edits: Record<number, number>): Float64Array {
  const record = Float64Array.from(base);
  for (const [field, value] of Object.entries(edits)) record[Number(field)] = value;
  return record;
}

// people households of 1, all at work in the 7 firms, at the lowest price and wage a record may hold.
function singles(people: number): Float64Array {
  return withFields(new Float64Array(LEDGER_FIELDS), {
    [LEDGER_HOUSEHOLDS]: people,
    [LEDGER_EMPLOYED]: people,
    [LEDGER_FIRMS]: SUPPLIERS,
    [LEDGER_PRICE]: 100,
    [LEDGER_WAGE]: 100,
  });
}

// Walks the households in order, member p following household h - 1's, and lists each blob that is not standing idle
// in its household's door tile.
function misplaced(world: World, homes: Homes): number[] {
  const { agents, households } = world;
  const wrong: number[] = [];
  let p = 0;
  for (let h = 0; h < households.count[0]; h++) {
    const home = households.home[h];
    for (let m = 0; m < households.size[h]; m++, p++) {
      const atDoor = tileOf(agents.x[p]) === homes.doorX[home] && tileOf(agents.y[p]) === homes.doorY[home];
      const idle = agents.action[p] === ACTION_IDLE && agents.vx[p] === 0 && agents.vy[p] === 0;
      if (!atDoor || !idle) wrong.push(p);
    }
  }
  return wrong;
}

function membersOf(world: World): number {
  let members = 0;
  for (let h = 0; h < world.households.count[0]; h++) members += world.households.size[h];
  return members;
}

function overfull(world: World, homes: Homes): number[] {
  const used = new Int32Array(homes.count);
  for (let h = 0; h < world.households.count[0]; h++) used[world.households.home[h]] += world.households.size[h];
  return Array.from(used.keys()).filter((i) => used[i] > homes.capacity[i]);
}

function linksOf(world: World, p: number): number[] {
  return Array.from(world.agents.suppliers.subarray(p * SUPPLIERS, (p + 1) * SUPPLIERS));
}

// Each blob whose links repeat a firm or name no firm.
function badLinks(world: World): number[] {
  const firms = world.firms.count[0];
  const bad: number[] = [];
  for (let p = 0; p < world.agents.count[0]; p++) {
    const links = linksOf(world, p);
    if (new Set(links).size !== SUPPLIERS || links.some((f) => f < 0 || f >= firms)) bad.push(p);
  }
  return bad;
}

function correlation(xs: number[], ys: number[]): number {
  const mean = (values: number[]) => values.reduce((total, v) => total + v, 0) / values.length;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

describe('spawnFromLedger', () => {
  it('folds back into each of 1,000 random records field for field, with the money exact', () => {
    const out = new Float64Array(LEDGER_FIELDS);
    for (let index = 0; index < RECORDS; index++) {
      const record = recordAt(index);
      const world = spawnedSmall(record, index + 1, index % 4, index);
      foldToLedger(world, out);
      expect(Array.from(out), `record ${index}`).toEqual(Array.from(record));
      expect(checkCash(world.cash), `record ${index}`).toBe(OK);
    }
  });

  it('issues exactly the record cash from MINT', () => {
    const record = recordAt(3);
    const world = spawnedSmall(record, 1, 0, 0);
    expect(world.cash.balance[MINT]).toBe(-(record[LEDGER_HOUSEHOLD_CASH] + record[LEDGER_FIRM_CASH]));
  });
});

describe('spawned households', () => {
  it('keep their members side by side, standing idle in their home door tile', () => {
    for (let index = 0; index < 20; index++) {
      const world = spawnedSmall(recordAt(index), index + 1, 0, index);
      expect(membersOf(world), `record ${index}`).toBe(world.agents.count[0]);
      expect(misplaced(world, SMALL_HOMES), `record ${index}`).toEqual([]);
      expect(overfull(world, SMALL_HOMES), `record ${index}`).toEqual([]);
    }
  });

  it('come in a shuffled order of sizes, not smallest first', () => {
    const world = phoneWorld(1);
    spawnFromLedger(world, TOWN, homesFor(TOWN), LENGNICK, 0, 0);
    const sizes = Array.from(world.households.size.subarray(0, world.households.count[0]));
    expect(sizes.some((size, h) => h > 0 && size < sizes[h - 1])).toBe(true);
  });
});

describe('spawned firms', () => {
  it('post prices summing to exactly F x price, none under 1 cent, and the record wage', () => {
    for (let index = 0; index < 100; index++) {
      const record = recordAt(index);
      const { firms } = spawnedSmall(record, index + 1, 0, index);
      const prices = Array.from(firms.price.subarray(0, firms.count[0]));
      const wages = Array.from(firms.wage.subarray(0, firms.count[0]));
      expect(prices.reduce((total, price) => total + price, 0), `record ${index}`).toBe(
        record[LEDGER_FIRMS] * record[LEDGER_PRICE],
      );
      expect(Math.min(...prices), `record ${index}`).toBeGreaterThanOrEqual(1);
      expect(new Set(wages), `record ${index}`).toEqual(new Set([record[LEDGER_WAGE]]));
    }
  });

  it('hold the workers that name them, and last month as their output', () => {
    for (let index = 0; index < 20; index++) {
      const record = recordAt(index);
      const { agents, firms } = spawnedSmall(record, index + 1, 0, index);
      const staff = new Int32Array(firms.count[0]);
      for (let p = 0; p < agents.count[0]; p++) if (agents.employer[p] >= 0) staff[agents.employer[p]]++;
      expect(Array.from(firms.employees.subarray(0, firms.count[0])), `record ${index}`).toEqual(Array.from(staff));
      const monthOutput = Array.from(staff, (workers) => DAYS_PER_MONTH * LENGNICK.unitsPerWorkerDay * workers);
      expect(Array.from(firms.lastDemand.subarray(0, firms.count[0])), `record ${index}`).toEqual(monthOutput);
      const reservations = new Set(agents.reservationWage.subarray(0, agents.count[0]));
      expect(reservations, `record ${index}`).toEqual(new Set([record[LEDGER_WAGE]]));
    }
  });

  it('are each linked by a blob at most once', () => {
    for (let index = 0; index < 100; index++) {
      expect(badLinks(spawnedSmall(recordAt(index), index + 1, 0, index)), `record ${index}`).toEqual([]);
    }
  });

  it('draw links in step with workers + 1, on 10,000 people and 1,000 firms', () => {
    const world = phoneWorld(1);
    spawnFromLedger(world, TOWN, homesFor(TOWN), LENGNICK, 0, 0);
    const { agents, firms } = world;
    const links = new Array<number>(firms.count[0]).fill(0);
    for (let k = 0; k < agents.count[0] * SUPPLIERS; k++) links[agents.suppliers[k]]++;
    const workersPlusOne = Array.from(firms.employees.subarray(0, firms.count[0]), (workers) => workers + 1);

    expect(badLinks(world)).toEqual([]);
    expect(correlation(links, workersPlusOne)).toBeGreaterThan(0.9);
  });
});

describe('spawn replays', () => {
  it('gives one state hash for the same inputs, and another for another day or settlement', () => {
    const record = recordAt(7);
    const hash = stateHash(spawnedSmall(record, 9, 2, 40));

    expect(stateHash(spawnedSmall(record, 9, 2, 40))).toBe(hash);
    const fresh = smallWorld(9);
    spawnFromLedger(fresh, record, createStandInHomes(standInGround(), SMALL_HOMES.count), LENGNICK, 2, 40);
    expect(stateHash(fresh)).toBe(hash);
    expect(stateHash(spawnedSmall(record, 9, 2, 41))).not.toBe(hash);
    expect(stateHash(spawnedSmall(record, 9, 3, 40))).not.toBe(hash);
    expect(stateHash(spawnedSmall(record, 10, 2, 40))).not.toBe(hash);
  });
});

describe('spawn guards', () => {
  const record = recordAt(1);

  it('refuses a world that already holds agents, households or firms', () => {
    const peopled = smallWorld(1);
    populate(peopled, 10);
    const housed = smallWorld(1);
    housed.households.count[0] = 1;
    const staffed = smallWorld(1);
    staffed.firms.count[0] = SUPPLIERS;
    const spawned = spawnedSmall(record, 1, 0, 0);

    for (const world of [peopled, housed, staffed, spawned]) {
      expect(() => spawnFromLedger(world, record, SMALL_HOMES, LENGNICK, 0, 0)).toThrow(RangeError);
    }
  });

  it('refuses each bad record before writing anything', () => {
    const bad = [
      withFields(record, { [LEDGER_HOUSEHOLDS + 1]: 0.5 }),
      withFields(record, { [LEDGER_STOCK]: -1 }),
      withFields(record, { [LEDGER_UNEMPLOYED]: record[LEDGER_UNEMPLOYED] + 1 }),
      singles(0),
      singles(SMALL_AGENTS + 1),
      withFields(singles(SUPPLIERS), { [LEDGER_FIRMS]: SUPPLIERS - 1 }),
      withFields(singles(SUPPLIERS), { [LEDGER_FIRMS]: SUPPLIERS + 1 }),
      withFields(record, { [LEDGER_PRICE]: 99 }),
      withFields(record, { [LEDGER_WAGE]: 99 }),
      withFields(record, { [LEDGER_STOCK]: 2 ** 31 }),
      withFields(record, { [LEDGER_HOUSEHOLD_CASH]: Number.MAX_SAFE_INTEGER + 1 }),
      // Each field is exact, but MINT would hold minus their sum.
      withFields(record, { [LEDGER_HOUSEHOLD_CASH]: 2 ** 52, [LEDGER_FIRM_CASH]: 2 ** 52 }),
      withFields(record, { [LEDGER_PRICE]: Math.floor(Number.MAX_SAFE_INTEGER / record[LEDGER_FIRMS]) + 1 }),
    ];
    for (const fields of bad) {
      const world = smallWorld(1);
      const hash = stateHash(world);
      expect(() => spawnFromLedger(world, fields, SMALL_HOMES, LENGNICK, 0, 0), String(fields)).toThrow(RangeError);
      expect(stateHash(world), String(fields)).toBe(hash);
    }
    expect(() => spawnFromLedger(smallWorld(1), singles(SUPPLIERS), SMALL_HOMES, LENGNICK, 0, 0)).not.toThrow();
  });

  it('throws a RangeError naming the size when the homes run out of room', () => {
    const fours = withFields(singles(0), { [LEDGER_HOUSEHOLDS + 3]: 2, [LEDGER_EMPLOYED]: 8 });
    const oneHome = createStandInHomes(standInGround(), 1);

    expect(() => spawnFromLedger(smallWorld(1), fours, oneHome, LENGNICK, 0, 0)).toThrow(RangeError);
    expect(() => spawnFromLedger(smallWorld(1), fours, oneHome, LENGNICK, 0, 0)).toThrow(/household of 4/);
  });
});

describe('a spawned city', () => {
  it('runs 2,000 days of the LENGNICK economy with its money and people intact', () => {
    const world = phoneWorld(SEED);
    spawnFromLedger(world, CITY, homesFor(CITY), LENGNICK, 0, 0);
    expect(world.checks).toBe(true);

    // economyDay checks the money invariants every day while world.checks is on, and throws on the first that fails.
    for (let day = 0; day < RUN_DAYS; day++) economyDay(world, LENGNICK, day);

    const record = folded(world);
    expect(world.cash.balance[MINT]).toBe(-CITY_CASH);
    expect(record[LEDGER_HOUSEHOLD_CASH] + record[LEDGER_FIRM_CASH]).toBe(CITY_CASH);
    expect(record[LEDGER_EMPLOYED] + record[LEDGER_UNEMPLOYED]).toBe(populationOf(CITY));
    expect(Array.from(record.subarray(LEDGER_HOUSEHOLDS, LEDGER_EMPLOYED))).toEqual(
      Array.from(CITY.subarray(LEDGER_HOUSEHOLDS, LEDGER_EMPLOYED)),
    );
  });
});
