import { describe, expect, it } from 'vitest';
import { CITY } from '../src/economy/city.ts';
import type { EconomyParams } from '../src/economy/params.ts';
import { startEconomy } from '../src/economy/start.ts';
import {
  STAT_EXITS,
  STAT_GOOD_PRICE,
  STAT_GOOD_STOCK,
  STAT_MADE,
  STAT_PRICE_MEAN,
  STAT_PRODUCED,
  STAT_SPOILED,
  STAT_STOCK,
  STAT_WRITE_OFF,
  recordDay,
} from '../src/economy/stats.ts';
import { decideFirms } from '../src/firms/decide.ts';
import { produce } from '../src/firms/produce.ts';
import { closeFirmMonth } from '../src/firms/renew.ts';
import { addFood, spoilFood, takeFood } from '../src/goods/food.ts';
import { BREAD, CLOTH, FISH, GOOD_COUNT, MILK, VEGETABLES, isFood } from '../src/goods/goods.ts';
import { FOOD_RING, ringSlot } from '../src/goods/store.ts';
import { stateHash } from '../src/world/checkpoint.ts';
import { createWorld, type World } from '../src/world/world.ts';

const GOODS_CITY: EconomyParams = { ...CITY, goods: 1 };
// A town of one firm for each good and one worker each, where a column's whole sum is its one firm's.
const SEVEN: EconomyParams = { ...GOODS_CITY, households: 7, firms: 7 };
// Row 2 of the town of seven is the fish shop.
const FISH_SHOP = 2;

function started(params: EconomyParams): World {
  const world = createWorld(1, 'phone', undefined, params.households);
  startEconomy(world, params);
  return world;
}

// The shop with its shelf emptied and the given workers.
function bareShop(world: World, shop: number, workers: number): void {
  const { firms, goods } = world;
  goods.ring.fill(0, shop * FOOD_RING, (shop + 1) * FOOD_RING);
  firms.stock[shop] = 0;
  firms.employees[shop] = workers;
}

function shelf(world: World, shop: number): number[] {
  return Array.from(world.goods.ring.subarray(shop * FOOD_RING, (shop + 1) * FOOD_RING));
}

function stockOf(world: World, shop: number): number {
  return world.firms.stock[shop];
}

describe('a fish batch', () => {
  it('sells oldest first, and its rest spoils on its 4th morning, never before', () => {
    const world = started(SEVEN);
    const { firms, goods, economyScratch } = world;
    const stats = economyScratch.stats;
    expect(goods.good[FISH_SHOP]).toBe(FISH);
    bareShop(world, FISH_SHOP, 2);

    // Day 10's output is 2 workers x 18 portions, in slot 10, after the day's shopping.
    produce(world, SEVEN, 10);
    expect([stockOf(world, FISH_SHOP), shelf(world, FISH_SHOP)[10]]).toEqual([36, 36]);

    // The batch is on sale for 3 days: the 11th, 12th and 13th. Selling 10 on each leaves 6.
    for (const day of [11, 12, 13]) {
      spoilFood(world, day);
      expect(stats[STAT_SPOILED + FISH], `morning of day ${day}`).toBe(0);
      expect(takeFood(firms, goods, FISH_SHOP, day, 10), `day ${day}`).toBe(10);
    }
    expect([stockOf(world, FISH_SHOP), shelf(world, FISH_SHOP)[10]]).toEqual([6, 6]);

    spoilFood(world, 14);
    expect(stats[STAT_SPOILED + FISH]).toBe(6);
    expect([stockOf(world, FISH_SHOP), goods.wasted[FISH_SHOP]]).toEqual([0, 6]);
    expect(shelf(world, FISH_SHOP).every((portions) => portions === 0)).toBe(true);
    // Bread is on sale a day longer, and spoils a morning later.
    expect(stats[STAT_SPOILED + BREAD]).toBe(0);
    expect(goods.wasted[0]).toBe(0);
    spoilFood(world, 15);
    expect(stats[STAT_SPOILED + BREAD]).toBe(world.firms.employees[0] * 18);
  });

  it('is taken from the oldest batch before a newer one, and no more than the shelf holds', () => {
    const world = started(SEVEN);
    const { firms, goods } = world;
    bareShop(world, FISH_SHOP, 2);
    addFood(firms, goods, FISH_SHOP, 10, 36);
    addFood(firms, goods, FISH_SHOP, 11, 36);
    expect(stockOf(world, FISH_SHOP)).toBe(72);

    expect(takeFood(firms, goods, FISH_SHOP, 12, 40)).toBe(40);
    expect([shelf(world, FISH_SHOP)[10], shelf(world, FISH_SHOP)[11], stockOf(world, FISH_SHOP)]).toEqual([0, 32, 32]);
    expect(takeFood(firms, goods, FISH_SHOP, 12, 100)).toBe(32);
    expect(stockOf(world, FISH_SHOP)).toBe(0);
    expect(takeFood(firms, goods, 4, 12, 5)).toBe(0);
    expect(firms.stock[4]).toBe(3);
  });

  it("keeps a milk batch for 14 days, so its slot is free again by the day a new batch needs it", () => {
    const world = started(SEVEN);
    const milkShop = 3;
    bareShop(world, milkShop, 1);
    addFood(world.firms, world.goods, milkShop, 10, 18);
    spoilFood(world, 24);
    expect(stockOf(world, milkShop)).toBe(18);
    spoilFood(world, 25);
    expect(stockOf(world, milkShop)).toBe(0);
    addFood(world.firms, world.goods, milkShop, 26, 18);
    expect(shelf(world, milkShop)[ringSlot(0, 26)]).toBe(18);
  });

  it('replays to one hash for the same days, and another for a different sale', () => {
    function days(sold: number): number {
      const world = started(SEVEN);
      bareShop(world, FISH_SHOP, 2);
      produce(world, SEVEN, 10);
      takeFood(world.firms, world.goods, FISH_SHOP, 11, sold);
      spoilFood(world, 14);
      return stateHash(world);
    }
    expect(days(10)).toBe(days(10));
    expect(days(11)).not.toBe(days(10));
  });
});

describe('a day of output', () => {
  it('puts food in the ring and goods in stock, and counts made for every good but produced for the goods alone', () => {
    const world = started(GOODS_CITY);
    const { firms, goods, economyScratch } = world;
    const stats = economyScratch.stats;
    const before = Array.from(firms.stock.subarray(0, 100));
    produce(world, GOODS_CITY, 3);
    let foodMade = 0;
    let goodsMade = 0;
    for (let f = 0; f < 100; f++) {
      const made = (isFood(goods.good[f]) ? 18 : 3) * firms.employees[f];
      expect(firms.stock[f] - before[f], `row ${f}`).toBe(made);
      if (isFood(goods.good[f])) {
        expect(goods.ring[ringSlot(f, 3)], `row ${f}`).toBe(made);
        foodMade += made;
      } else {
        goodsMade += made;
      }
    }
    expect(stats[STAT_PRODUCED]).toBe(goodsMade);
    expect(Array.from({ length: GOOD_COUNT }, (_, good) => stats[STAT_MADE + good]).reduce((total, made) => total + made, 0)).toBe(
      foodMade + goodsMade,
    );
    expect([stats[STAT_MADE + BREAD], stats[STAT_MADE + CLOTH]]).toEqual([5 * 10 * 18, 27 * 10 * 3]);
  });

  it('is a plain add to stock in a world with goods off', () => {
    const world = started({ ...CITY, goods: 0 });
    const before = world.firms.stock[0];
    produce(world, CITY, 3);
    expect(world.firms.stock[0] - before).toBe(30);
    expect(world.economyScratch.stats[STAT_MADE]).toBe(world.economyScratch.stats[STAT_PRODUCED]);
  });
});

describe('what a food firm decides', () => {
  const STILL: EconomyParams = { ...GOODS_CITY, priceChancePpm: 0 };

  function shop(world: World, good: number, nth = 0): number {
    return world.goods.firstRow[good] + nth;
  }

  it('gives notice once it has wasted a worker-month of food, and not a portion short of it', () => {
    const world = started(STILL);
    const { firms, goods } = world;
    const [wasteful, close, idle, short, cloth] = [shop(world, BREAD), shop(world, VEGETABLES), shop(world, FISH), shop(world, MILK), shop(world, CLOTH)];
    for (const row of [wasteful, close, idle]) {
      firms.stock[row] = 1_000;
      firms.lastDemand[row] = 0;
    }
    goods.wasted[wasteful] = 378;
    goods.wasted[close] = 377;
    goods.wasted[idle] = 400;
    firms.employees[idle] = 0;
    // Under a day's demand, which is 3 portions at the floor of 63 a month, a firm is short, wasteful or not.
    firms.stock[short] = 2;
    firms.lastDemand[short] = 0;
    goods.wasted[short] = 400;
    // A goods firm keeps the band, whatever its waste says.
    firms.stock[cloth] = 0;
    goods.wasted[cloth] = 999;

    decideFirms(world, STILL, 0);

    expect(Array.from([wasteful, close, idle, short], (row) => [firms.vacancy[row], firms.notice[row]])).toEqual([
      [0, 1],
      [0, 0],
      [0, 0],
      [1, 0],
    ]);
    expect(Array.from([wasteful, close, idle, short], (row) => goods.wasted[row])).toEqual([0, 0, 0, 0]);
    expect([firms.vacancy[cloth], firms.notice[cloth], goods.wasted[cloth]]).toEqual([1, 0, 999]);
  });

  it('prices a portion by the worker-month of 378 portions: a short shop may raise it and a long one cut it', () => {
    const world = started({ ...GOODS_CITY, priceChancePpm: 1_000_000 });
    const { firms, goods } = world;
    const [short, long] = [shop(world, BREAD), shop(world, VEGETABLES)];
    // 378 x 560 is 211,680 cents a month, inside the band of 194,208 to 214,200 over the wage of 142,800.
    for (const row of [short, long]) firms.price[row] = 560;
    firms.stock[short] = 0;
    firms.stock[long] = 1_000;
    firms.lastDemand[long] = 0;
    goods.wasted[long] = 400;
    for (let month = 0; month < 4; month++) decideFirms(world, { ...GOODS_CITY, priceChancePpm: 1_000_000 }, month);
    expect(firms.price[short]).toBeGreaterThan(560);
    expect(firms.price[short]).toBeLessThanOrEqual(566);
    expect(firms.price[long]).toBeLessThan(560);
    expect(firms.price[long]).toBeGreaterThanOrEqual(514);
  });
});

describe('a food firm that leaves', () => {
  const LEAVING: EconomyParams = { ...GOODS_CITY, shortPayExitPpm: 1_000_000 };

  it("spoils its whole shelf rather than writing it off, and re-enters at its kind's mean price", () => {
    const world = started(LEAVING);
    const { firms, goods, economyScratch } = world;
    const { pay, stats, exiting } = economyScratch;
    const fish = goods.firstRow[FISH];
    const cloth = goods.firstRow[CLOTH];
    for (let f = 0; f < 100; f++) pay[f] = firms.wage[f];
    pay[fish] = 0;
    pay[cloth] = 0;
    firms.price[fish] = 9_999;
    goods.wasted[fish] = 50;
    const shelfBefore = firms.stock[fish];
    const clothStock = firms.stock[cloth];
    expect([shelfBefore, clothStock]).toEqual([180, 30]);

    closeFirmMonth(world, LEAVING);

    expect(stats[STAT_EXITS]).toBe(2);
    expect([exiting[fish], exiting[cloth]]).toEqual([1, 1]);
    expect(stats[STAT_SPOILED + FISH]).toBe(180);
    expect(stats[STAT_WRITE_OFF]).toBe(30);
    expect([firms.stock[fish], firms.stock[cloth], goods.wasted[fish]]).toEqual([0, 0, 0]);
    expect(shelf(world, fish).every((portions) => portions === 0)).toBe(true);
    // The 18 other food firms post 533 and this one 9,999: floor(19,593 / 19). The goods firms all post 3,200.
    expect([firms.price[fish], firms.price[cloth]]).toEqual([1_031, 3_200]);
  });
});

describe('the day row of a goods world', () => {
  it('holds each good\'s stock and mean posted price, and the unit columns over the goods firms alone', () => {
    const world = started(GOODS_CITY);
    const stats = world.economyScratch.stats;
    recordDay(world);
    const { firms, goods } = world;
    let goodsStock = 0;
    for (let f = 0; f < 100; f++) if (!isFood(goods.good[f])) goodsStock += firms.stock[f];
    expect(stats[STAT_GOOD_STOCK + BREAD]).toBe(5 * 180);
    expect(stats[STAT_GOOD_PRICE + BREAD]).toBe(533);
    expect([stats[STAT_GOOD_PRICE + CLOTH], stats[STAT_GOOD_STOCK]]).toEqual([3_200, 0]);
    expect([stats[STAT_STOCK], stats[STAT_PRICE_MEAN]]).toEqual([goodsStock, 3_200]);
  });

  it('puts every firm in the generic good when goods are off, as the one column it was', () => {
    const world = started({ ...CITY, goods: 0 });
    const stats = world.economyScratch.stats;
    recordDay(world);
    expect([stats[STAT_GOOD_STOCK], stats[STAT_GOOD_PRICE]]).toEqual([stats[STAT_STOCK], stats[STAT_PRICE_MEAN]]);
    expect(stats[STAT_PRICE_MEAN]).toBe(CITY.openingPrice);
    expect(stats[STAT_GOOD_PRICE + BREAD]).toBe(0);
  });
});
