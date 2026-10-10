import { describe, expect, it } from 'vitest';
import { CITY } from '../src/economy/city.ts';
import { LENGNICK, checkParams, type EconomyParams } from '../src/economy/params.ts';
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
import { checkpoint, restoreWorld, stateHash, stateHashExcept } from '../src/world/checkpoint.ts';
import { DAY_LAYOFFS, GOODS, createWorld, type World } from '../src/world/world.ts';

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
