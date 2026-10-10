import { describe, expect, it } from 'vitest';
import { SUPPLIERS } from '../src/agents/store.ts';
import { CITY } from '../src/economy/city.ts';
import { LENGNICK, checkParams, type EconomyParams } from '../src/economy/params.ts';
import { startEconomy } from '../src/economy/start.ts';
import {
  BREAD,
  CLOTH,
  DAYS_ON_SALE,
  FISH,
  FUEL,
  GOOD_COUNT,
  GOOD_NAMES,
  MILK,
  SHARE_PER_10K,
  SHOP_NAMES,
  goodOfLink,
  isFood,
  openingPriceOf,
  outputPerWorkerDay,
  splitByGood,
} from '../src/goods/goods.ts';
import { FOOD_RING, assignGoods, createGoodsStore, ringSlot } from '../src/goods/store.ts';
import { PHONE_MEMORY_BYTES, reserveArena } from '../src/memory/arena.ts';
import { OK, checkCash } from '../src/money/invariants.ts';
import { MINT } from '../src/money/ledger.ts';
import { foldToLedger } from '../src/spawn/fold.ts';
import { createStandInHomes } from '../src/spawn/homes.ts';
import {
  LEDGER_EMPLOYED,
  LEDGER_FIELDS,
  LEDGER_FIRMS,
  LEDGER_FIRM_CASH,
  LEDGER_HOUSEHOLD_CASH,
  LEDGER_PRICE,
} from '../src/spawn/record.ts';
import { spawnFromLedger } from '../src/spawn/spawn.ts';
import { DAYS_PER_MONTH } from '../src/time/calendar.ts';
import { checkpoint, restoreWorld, stateHash, stateHashExcept } from '../src/world/checkpoint.ts';
import { standInGround } from '../src/world/ground.ts';
import { DAY_LAYOFFS, GOODS, createWorld, layoutWorld, type World } from '../src/world/world.ts';
import { randomRecord } from './engines/records.ts';

// Goods 1 to 7 of a split.
function splitOf(total: number, least: number): number[] {
  const out = new Int32Array(GOOD_COUNT);
  splitByGood(total, least, out);
  return Array.from(out.subarray(BREAD));
}

describe('the goods table', () => {
  it('lists the generic good and seven more, a food with its days on sale and a shop for each', () => {
    expect(GOOD_COUNT).toBe(8);
    expect(GOOD_NAMES).toEqual(['Generic', 'Bread', 'Vegetables', 'Fish', 'Milk', 'Cloth', 'Tools', 'Fuel']);
    expect(SHOP_NAMES).toEqual(['Shop', 'Bakery', 'Greengrocer', 'Fishmonger', 'Dairy', 'Draper', 'Smithy', 'Fuel Store']);
    expect(Array.from(DAYS_ON_SALE)).toEqual([0, 4, 7, 3, 14, 0, 0, 0]);
    expect(Array.from(DAYS_ON_SALE, (_, good) => isFood(good))).toEqual([false, true, true, true, true, false, false, false]);
    expect([0, 1, 2, 3, 4, 5, 6].map(goodOfLink)).toEqual([BREAD, 2, FISH, MILK, CLOTH, 6, FUEL]);
  });

  it('shares rows and jobs in parts of 10,000: 4.5% to each food, then 27.33, 27.33 and 27.34%', () => {
    expect(Array.from(SHARE_PER_10K)).toEqual([0, 450, 450, 450, 450, 2733, 2733, 2734]);
    expect(SHARE_PER_10K.reduce((total, share) => total + share, 0)).toBe(10_000);
  });

  it('has a worker make 18 portions of food or 3 units of anything else, and prices a portion at a sixth', () => {
    expect([BREAD, MILK, CLOTH, FUEL].map((good) => outputPerWorkerDay(good, 3))).toEqual([18, 18, 3, 3]);
    expect(outputPerWorkerDay(BREAD, 5)).toBe(30);
    expect([BREAD, FISH, CLOTH, 0].map((good) => openingPriceOf(good, 3_200))).toEqual([533, 533, 3_200, 3_200]);
  });
});

describe('splitByGood', () => {
  it("gives each good its exact share, the largest remainders first and ties to the lower good", () => {
    expect(splitOf(10_000, 1)).toEqual([450, 450, 450, 450, 2_733, 2_733, 2_734]);
    expect(splitOf(1_000, 1)).toEqual([45, 45, 45, 45, 273, 273, 274]);
    // 4.5 of each food leaves three leftover rows, which the equal remainders of .5 hand to the first three foods.
    expect(splitOf(100, 1)).toEqual([5, 5, 5, 4, 27, 27, 27]);
  });

  it('holds one row of each good when there are only 7 or a few more rows, and refuses fewer', () => {
    expect(splitOf(7, 1)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(splitOf(10, 1)).toEqual([1, 1, 1, 1, 2, 2, 2]);
    for (let total = 7; total <= 400; total++) {
      const rows = splitOf(total, 1);
      expect(rows.reduce((sum, count) => sum + count, 0), `${total} rows`).toBe(total);
      expect(Math.min(...rows), `${total} rows`).toBeGreaterThanOrEqual(1);
    }
    expect(() => splitOf(6, 1)).toThrow(RangeError);
  });

  it('splits jobs with no least, so a good may hold none', () => {
    expect(splitOf(3, 0)).toEqual([0, 0, 0, 0, 1, 1, 1]);
    expect(splitOf(0, 0)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('the goods store', () => {
  it('holds a byte, a ring of 16 and a counter for each firm row, 69 bytes a firm, off the canonical list', () => {
    const arena = reserveArena(PHONE_MEMORY_BYTES);
    const goods = createGoodsStore(arena, 1_000);
    expect([goods.good.length, goods.ring.length, goods.wasted.length]).toEqual([1_000, 1_000 * FOOD_RING, 1_000]);
    expect([goods.good, goods.ring, goods.wasted].map((column) => column.constructor)).toEqual([Uint8Array, Int32Array, Int32Array]);
    expect(goods.byteLength).toBe(69 * 1_000);
    expect(goods.byteOffset).toBe(goods.good.byteOffset);
    expect(arena.canonical).toEqual([]);
  });

  it('names a ring slot by the firm and the day it was made, wrapping every 16 days', () => {
    expect(ringSlot(3, 5)).toBe(3 * 16 + 5);
    expect(ringSlot(3, 21)).toBe(ringSlot(3, 5));
    expect(ringSlot(3, -1)).toBe(3 * 16 + 15);
  });

  it('lays the rows out good by good in table order, the foods first', () => {
    const goods = createGoodsStore(reserveArena(PHONE_MEMORY_BYTES), 1_000);
    assignGoods(goods, 100);
    expect(Array.from(goods.rowCount.subarray(BREAD))).toEqual([5, 5, 5, 4, 27, 27, 27]);
    expect(Array.from(goods.firstRow.subarray(BREAD))).toEqual([0, 5, 10, 15, 19, 46, 73]);
    const rows = Array.from(goods.good.subarray(0, 101));
    expect(rows.slice(0, 6)).toEqual([BREAD, BREAD, BREAD, BREAD, BREAD, 2]);
    expect(rows.slice(18, 20)).toEqual([MILK, CLOTH]);
    expect(rows.slice(99)).toEqual([FUEL, 0]);
  });

  it('puts one of each good in 7 rows, and refuses fewer', () => {
    const goods = createGoodsStore(reserveArena(PHONE_MEMORY_BYTES), 1_000);
    assignGoods(goods, 7);
    expect(Array.from(goods.good.subarray(0, 8))).toEqual([1, 2, 3, 4, 5, 6, 7, 0]);
    expect(() => assignGoods(goods, 6)).toThrow(RangeError);
  });
});

describe('the goods flag and the state hash', () => {
  function writeColumns(world: World, row: number): void {
    world.goods.good[row] = FISH;
    world.goods.ring[row * FOOD_RING + 4] = 36;
    world.goods.wasted[row] = 378;
  }

  it('is global slot 6, after the layoffs', () => {
    expect([DAY_LAYOFFS, GOODS]).toEqual([5, 6]);
    expect(createWorld(42, 'phone', undefined, 10).globals[GOODS]).toBe(0);
  });

  it('leaves the goods store out of a world that runs without goods', () => {
    const world = createWorld(42, 'phone', undefined, 10);
    const plain = stateHash(world);
    writeColumns(world, 2);
    expect(stateHash(world)).toBe(plain);
  });

  it('mixes each goods column in once GOODS is 1', () => {
    const world = createWorld(42, 'phone', undefined, 10);
    const plain = stateHash(world);
    world.globals[GOODS] = 1;
    const flagged = stateHash(world);
    expect(flagged).not.toBe(plain);
    for (const column of [world.goods.good, world.goods.ring, world.goods.wasted]) {
      const was = column[5];
      column[5] = was + 1;
      expect(stateHash(world)).not.toBe(flagged);
      column[5] = was;
    }
    expect(stateHash(world)).toBe(flagged);
  });

  it('lets a skip leave the goods store out, as it does a canonical region', () => {
    const world = createWorld(42, 'phone', undefined, 10);
    world.globals[GOODS] = 1;
    const skipped = stateHashExcept(world, [world.goods.good]);
    writeColumns(world, 2);
    expect(stateHashExcept(world, [world.goods.good])).toBe(skipped);
    expect(stateHash(world)).not.toBe(skipped);
  });

  it('carries the store through a checkpoint, whether or not it is hashed', () => {
    const world = createWorld(42, 'phone', undefined, 10);
    writeColumns(world, 2);
    for (const flag of [0, 1]) {
      world.globals[GOODS] = flag;
      const restored = restoreWorld(42, 'phone', checkpoint(world));
      expect(stateHash(restored), `GOODS ${flag}`).toBe(stateHash(world));
      expect([restored.goods.good[2], restored.goods.ring[2 * FOOD_RING + 4], restored.goods.wasted[2]]).toEqual([FISH, 36, 378]);
    }
  });
});

describe('EconomyParams.goods', () => {
  const withGoods = (goods: number): EconomyParams => ({ ...CITY, goods });

  it('is 0 in both presets, so they run as before', () => {
    expect([LENGNICK.goods, CITY.goods]).toEqual([0, 0]);
  });

  it('is a switch of 0 or 1, and passes in every tier', () => {
    for (const tier of ['phone', 'phone-plus', 'desktop'] as const) {
      expect(() => checkParams(withGoods(1), tier), tier).not.toThrow();
    }
    for (const bad of [2, -1, 0.5]) {
      expect(() => checkParams(withGoods(bad), 'phone'), String(bad)).toThrow(RangeError);
    }
    expect(() => checkParams(withGoods(2), 'phone')).toThrow(/^goods must be 0 to 1, not 2/);
  });
});

const GOODS_CITY: EconomyParams = { ...CITY, goods: 1 };
// A day of food from 18 portions a worker, and a month of it as last month's demand.
const FOOD_PER_WORKER = outputPerWorkerDay(BREAD, CITY.unitsPerWorkerDay);

function startedGoods(seed: number, params: EconomyParams = GOODS_CITY): World {
  const world = createWorld(seed, 'phone', undefined, params.households);
  startEconomy(world, params);
  return world;
}

// Each blob's links, and the good of the firm each names.
function goodsLinked(world: World, blob: number): number[] {
  const links = Array.from(world.agents.suppliers.subarray(blob * SUPPLIERS, (blob + 1) * SUPPLIERS));
  return links.map((firm) => world.goods.good[firm]);
}

function blobsWithWrongLinks(world: World): number[] {
  const wrong: number[] = [];
  for (let blob = 0; blob < world.agents.count[0]; blob++) {
    if (goodsLinked(world, blob).some((good, link) => good !== goodOfLink(link))) wrong.push(blob);
  }
  return wrong;
}

describe('a goods world at start', () => {
  it("gives each good its exact share of the rows, and link k of every blob a firm of good k + 1", () => {
    for (const seed of [1, 2]) {
      const world = startedGoods(seed);
      expect(world.globals[GOODS]).toBe(1);
      expect(Array.from(world.goods.rowCount.subarray(BREAD))).toEqual([5, 5, 5, 4, 27, 27, 27]);
      expect(blobsWithWrongLinks(world), `seed ${seed}`).toEqual([]);
      expect(checkCash(world.cash)).toBe(OK);
    }
  });

  it('opens a food shop at a sixth of the unit price, with a day of food made the day before', () => {
    const { firms, goods } = startedGoods(1);
    const foodRows = goods.firstRow[CLOTH];
    expect(foodRows).toBe(19);
    for (let f = 0; f < 100; f++) {
      const workers = firms.employees[f];
      const ring = Array.from(goods.ring.subarray(f * FOOD_RING, (f + 1) * FOOD_RING));
      if (f < foodRows) {
        expect([firms.price[f], firms.stock[f], firms.lastDemand[f]], `food row ${f}`).toEqual([
          533,
          FOOD_PER_WORKER * workers,
          DAYS_PER_MONTH * FOOD_PER_WORKER * workers,
        ]);
        expect(ring.reduce((total, portions) => total + portions, 0), `food row ${f}`).toBe(firms.stock[f]);
        expect(ring[ringSlot(0, -1)], `food row ${f}`).toBe(firms.stock[f]);
      } else {
        expect([firms.price[f], firms.stock[f], firms.lastDemand[f]], `goods row ${f}`).toEqual([3_200, 3 * workers, 63 * workers]);
        expect(ring.every((portions) => portions === 0), `goods row ${f}`).toBe(true);
      }
    }
  });

  it('is as startEconomy always was with goods 0, which leaves the store and the flag at zero', () => {
    const world = startedGoods(1, { ...CITY, goods: 0 });
    expect(world.globals[GOODS]).toBe(0);
    expect(world.goods.good.every((good) => good === 0)).toBe(true);
    expect(world.goods.ring.every((portions) => portions === 0)).toBe(true);
    expect(new Set(world.firms.price.subarray(0, 100))).toEqual(new Set([CITY.openingPrice]));
  });

  it('puts one of each good in 7 firms, and every blob links to them all', () => {
    const world = createWorld(3, 'phone', undefined, 7);
    startEconomy(world, { ...GOODS_CITY, households: 7, firms: 7 });
    expect(Array.from(world.goods.good.subarray(0, 7))).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (let blob = 0; blob < 7; blob++) {
      expect(Array.from(world.agents.suppliers.subarray(blob * SUPPLIERS, (blob + 1) * SUPPLIERS)), `blob ${blob}`).toEqual([0, 1, 2, 3, 4, 5, 6]);
    }
  });

  it('replays to one hash for a seed, and another for a seed or a goods flag that differs', () => {
    const hash = stateHash(startedGoods(1));
    expect(stateHash(startedGoods(1))).toBe(hash);
    expect(stateHash(startedGoods(2))).not.toBe(hash);
    expect(stateHash(startedGoods(1, { ...CITY, goods: 0 }))).not.toBe(hash);
  });
});

const SMALL_AGENTS = 1_500;
const SMALL_BYTES = 1 << 20;
const SMALL_HOMES = createStandInHomes(standInGround(), 500);

function recordAt(index: number): Float64Array {
  const record = new Float64Array(LEDGER_FIELDS);
  randomRecord(2026, index, record);
  return record;
}

function spawnedGoods(record: Float64Array, seed: number, day: number): World {
  const world = layoutWorld(seed, 'phone', SMALL_AGENTS, SMALL_BYTES);
  spawnFromLedger(world, record, SMALL_HOMES, GOODS_CITY, seed % 4, day);
  return world;
}

function folded(world: World): number[] {
  const record = new Float64Array(LEDGER_FIELDS);
  foldToLedger(world, record);
  return Array.from(record);
}

// 20 one-person households, 14 of them at work, in the 7 firms the fewest a record may hold.
function sevenFirms(): Float64Array {
  const record = new Float64Array(LEDGER_FIELDS);
  record.set([20, 0, 0, 0, 0, 0, 14, 6, 7, 1_000_000, 70_000, 3_200, 142_800, 90]);
  return record;
}

describe('a goods world spawned from a record', () => {
  it('folds back into each of 100 random records field for field, the money exact', () => {
    for (let index = 0; index < 100; index++) {
      const record = recordAt(index);
      const world = spawnedGoods(record, index + 1, index);
      expect(folded(world), `record ${index}`).toEqual(Array.from(record));
      expect(checkCash(world.cash), `record ${index}`).toBe(OK);
      expect(world.cash.balance[MINT], `record ${index}`).toBe(-(record[LEDGER_HOUSEHOLD_CASH] + record[LEDGER_FIRM_CASH]));
    }
  });

  it('links every blob at firms of good k + 1, and splits the jobs over the goods by the same shares', () => {
    for (let index = 0; index < 20; index++) {
      const record = recordAt(index);
      const world = spawnedGoods(record, index + 1, index);
      const { agents, firms, goods } = world;
      expect(blobsWithWrongLinks(world), `record ${index}`).toEqual([]);
      const rows = new Int32Array(GOOD_COUNT);
      splitByGood(record[LEDGER_FIRMS], 1, rows);
      const jobs = new Int32Array(GOOD_COUNT);
      splitByGood(record[LEDGER_EMPLOYED], 0, jobs);
      const staff = new Int32Array(firms.count[0]);
      for (let p = 0; p < agents.count[0]; p++) if (agents.employer[p] >= 0) staff[agents.employer[p]]++;
      expect(Array.from(firms.employees.subarray(0, firms.count[0])), `record ${index}`).toEqual(Array.from(staff));
      for (let good = BREAD; good <= FUEL; good++) {
        const first = goods.firstRow[good];
        expect(goods.rowCount[good], `record ${index}, good ${good}`).toBe(rows[good]);
        const workers = staff.subarray(first, first + rows[good]).reduce((total, count) => total + count, 0);
        expect(workers, `record ${index}, good ${good}`).toBe(jobs[good]);
      }
    }
  });

  it('opens food fresh, a day of output made the day before the spawn, and the goods firms at the record price', () => {
    const record = recordAt(5);
    const day = 40;
    const { firms, goods } = spawnedGoods(record, 6, day);
    const foodRows = goods.firstRow[CLOTH];
    for (let f = 0; f < firms.count[0]; f++) {
      const ring = Array.from(goods.ring.subarray(f * FOOD_RING, (f + 1) * FOOD_RING));
      if (f < foodRows) {
        const made = FOOD_PER_WORKER * firms.employees[f];
        expect([firms.price[f], firms.stock[f], ring[ringSlot(0, day - 1)]], `food row ${f}`).toEqual([
          openingPriceOf(BREAD, record[LEDGER_PRICE]),
          made,
          made,
        ]);
        expect(firms.lastDemand[f], `food row ${f}`).toBe(DAYS_PER_MONTH * made);
      } else {
        expect(ring.every((portions) => portions === 0), `goods row ${f}`).toBe(true);
        expect(firms.lastDemand[f], `goods row ${f}`).toBe(DAYS_PER_MONTH * 3 * firms.employees[f]);
      }
    }
  });

  it('holds one firm of each good in the fewest firms a record may have, and folds back exactly', () => {
    const record = sevenFirms();
    const world = spawnedGoods(record, 1, 0);
    expect(Array.from(world.goods.good.subarray(0, 7))).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(blobsWithWrongLinks(world)).toEqual([]);
    expect(folded(world)).toEqual(Array.from(record));
    // The 3 goods firms hold the record's 90 units.
    expect(Array.from(world.firms.stock.subarray(4, 7)).reduce((total, units) => total + units, 0)).toBe(90);
  });

  it('replays to one hash for the same inputs, and another with goods off', () => {
    const record = recordAt(7);
    const hash = stateHash(spawnedGoods(record, 9, 40));
    expect(stateHash(spawnedGoods(record, 9, 40))).toBe(hash);
    expect(stateHash(spawnedGoods(record, 9, 41))).not.toBe(hash);
    const plain = layoutWorld(9, 'phone', SMALL_AGENTS, SMALL_BYTES);
    spawnFromLedger(plain, record, SMALL_HOMES, { ...CITY, goods: 0 }, 1, 40);
    expect(stateHash(plain)).not.toBe(hash);
  });
});
