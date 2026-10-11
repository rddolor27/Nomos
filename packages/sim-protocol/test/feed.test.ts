import {
  BREAD,
  CITY,
  CLOTH,
  ECONOMY_TICKS,
  FISH,
  FUEL,
  MILK,
  PPM,
  STAT_EATEN,
  STAT_GOOD_PRICE,
  STAT_GOOD_STOCK,
  STAT_PRICE_MEAN,
  STAT_SALES_CENTS,
  STAT_SOLD,
  STAT_SOLD_CENTS,
  STAT_SPOILED,
  STAT_UNEMPLOYED,
  STAT_UNMET,
  STAT_WAGE_MEAN,
  FOOD_TRADES,
  GOODS_TRADES,
  TICK,
  TICKS_PER_DAY,
  TRADE_RING,
  clearPurchases,
  createTown,
  createWorld,
  economyDay,
  isFood,
  logPurchase,
  runEconomySystem,
  standInGround,
  step,
  type World,
} from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import {
  FEED_DAYS,
  FEED_GOODS,
  FEED_TRADES,
  createEconomyFeed,
  economyDayEnded,
  writeEconomyFeed,
} from '../src/index.ts';

const SEED = 42;
const PEOPLE = 300;
// Economy system 0 opens the day with both rings of purchases empty (interfaces.md, The economy on screen).
const OPEN_DAY = 0;

function town(): World {
  return createTown(SEED, 'phone', standInGround(), PEOPLE);
}

// The tick right after the step that runs a day's last economy tick.
function dayEndTick(day: number): number {
  return day * TICKS_PER_DAY + ECONOMY_TICKS;
}

function unemploymentPpm(world: World): number {
  return Math.floor((world.economyScratch.stats[STAT_UNEMPLOYED] * PPM) / world.agents.count[0]);
}

function counting(length: number, from: number): number[] {
  return Array.from({ length }, (_, i) => from + i);
}

describe('the economy feed', () => {
  it("takes a day's figures from the stats row and its last 16 trades from the ring", () => {
    const world = town();
    const feed = createEconomyFeed();
    expect(feed).toMatchObject({ type: 'economy', day: -1, days: 0, trades: 0 });

    while (!economyDayEnded(world)) step(world);
    writeEconomyFeed(world, feed);

    const { firms, economyScratch } = world;
    const stats = economyScratch.stats;
    expect([feed.day, feed.days]).toEqual([0, 1]);
    expect(stats[STAT_PRICE_MEAN]).toBeGreaterThan(0);
    expect(feed.meanPriceCents[0]).toBe(stats[STAT_PRICE_MEAN]);
    expect(feed.meanWageCents[0]).toBe(stats[STAT_WAGE_MEAN]);
    expect(unemploymentPpm(world)).toBeGreaterThan(0);
    expect(feed.unemploymentPpm[0]).toBe(unemploymentPpm(world));

    // Day 0 opens a month and ends no month, so no price moves between the shopping and the feed. The town buys food and
    // goods, and each ring is full.
    expect(feed.trades).toBe(FEED_TRADES);
    let tradedCents = 0;
    for (let i = 0; i < feed.trades; i++) {
      expect(feed.tradeShop[i]).toBeLessThan(firms.count[0]);
      expect(feed.tradeUnits[i]).toBeGreaterThan(0);
      expect(feed.tradeCents[i]).toBe(feed.tradeUnits[i] * firms.price[feed.tradeShop[i]]);
      tradedCents += feed.tradeCents[i];
    }
    expect(tradedCents).toBeLessThan(stats[STAT_SALES_CENTS]);
  });

  it("takes a day's figure of each good and of the food from the stats row", () => {
    const world = town();
    const feed = createEconomyFeed();
    while (!economyDayEnded(world)) step(world);
    writeEconomyFeed(world, feed);
    const stats = world.economyScratch.stats;

    expect(FEED_GOODS).toBe(7);
    let foodSold = 0;
    let foodSpoiled = 0;
    for (let g = 0; g < FEED_GOODS; g++) {
      const good = BREAD + g;
      const sold = stats[STAT_SOLD + good];
      expect(feed.soldUnits[g][0]).toBe(sold);
      expect(feed.stockUnits[g][0]).toBe(stats[STAT_GOOD_STOCK + good]);
      expect(feed.paidCents[g][0]).toBeGreaterThan(0);
      if (sold > 0) expect(feed.paidCents[g][0] * sold).toBeCloseTo(stats[STAT_SOLD_CENTS + good], 6);
      else expect(feed.paidCents[g][0]).toBe(stats[STAT_GOOD_PRICE + good]);
      if (isFood(good)) {
        foodSold += sold;
        foodSpoiled += stats[STAT_SPOILED + good];
      }
    }
    // Every portion eaten was sold that day.
    expect(feed.soldUnits[0][0]).toBeGreaterThan(0);
    expect(feed.eaten[0]).toBe(foodSold);
    expect(feed.eaten[0]).toBe(stats[STAT_EATEN]);
    expect(feed.spoiled[0]).toBe(foodSpoiled);
    expect(feed.unmet[0]).toBe(stats[STAT_UNMET]);
  });

  it('prices a good nobody bought at its posted mean, and shows its 0 sold', () => {
    const world = town();
    const feed = createEconomyFeed();
    while (!economyDayEnded(world)) step(world);
    const stats = world.economyScratch.stats;
    stats[STAT_SOLD + FISH] = 0;
    stats[STAT_SOLD_CENTS + FISH] = 0;
    stats[STAT_GOOD_PRICE + FISH] = 1_234.5;
    // A good that sold is priced at its sales cents over its units, not at its posted mean.
    stats[STAT_SOLD + BREAD] = 4;
    stats[STAT_SOLD_CENTS + BREAD] = 2_222;
    stats[STAT_GOOD_PRICE + BREAD] = 999;
    writeEconomyFeed(world, feed);

    const fish = FISH - BREAD;
    expect([feed.soldUnits[fish][0], feed.paidCents[fish][0]]).toEqual([0, 1_234.5]);
    expect([feed.soldUnits[0][0], feed.paidCents[0][0]]).toEqual([4, 555.5]);
  });

  it('keeps the last 112 of 113 days, oldest first', () => {
    const world = town();
    const feed = createEconomyFeed();
    const stats = world.economyScratch.stats;
    const price: number[] = [];
    const wage: number[] = [];
    const unemployment: number[] = [];
    const bread: number[] = [];
    const cloth: number[] = [];
    const eaten: number[] = [];

    for (let day = 0; day <= FEED_DAYS; day++) {
      economyDay(world, CITY, day);
      price.push(stats[STAT_PRICE_MEAN]);
      wage.push(stats[STAT_WAGE_MEAN]);
      unemployment.push(unemploymentPpm(world));
      bread.push(stats[STAT_SOLD + BREAD]);
      cloth.push(stats[STAT_GOOD_STOCK + CLOTH]);
      eaten.push(stats[STAT_EATEN]);
      world.globals[TICK] = dayEndTick(day);
      writeEconomyFeed(world, feed);
    }

    expect(FEED_DAYS).toBe(112);
    expect([feed.day, feed.days]).toEqual([FEED_DAYS, FEED_DAYS]);
    expect(Array.from(feed.meanPriceCents)).toEqual(price.slice(1));
    expect(Array.from(feed.meanWageCents)).toEqual(wage.slice(1));
    expect(Array.from(feed.unemploymentPpm)).toEqual(unemployment.slice(1));
    expect(Array.from(feed.soldUnits[BREAD - BREAD])).toEqual(bread.slice(1));
    expect(Array.from(feed.stockUnits[CLOTH - BREAD])).toEqual(cloth.slice(1));
    expect(Array.from(feed.eaten)).toEqual(eaten.slice(1));
    // The series move, so a feed in another order or a day off would not match.
    expect(new Set(price).size).toBeGreaterThan(1);
    expect(new Set(wage).size).toBeGreaterThan(1);
    expect(new Set(bread).size).toBeGreaterThan(1);
    expect(new Set(cloth).size).toBeGreaterThan(1);
  });

  it("gives each trade the good of its shop's firm row, foods first", () => {
    const world = town();
    const feed = createEconomyFeed();
    const scratch = world.economyScratch;
    const { firstRow } = world.goods;

    world.globals[TICK] = dayEndTick(0);
    clearPurchases(scratch);
    logPurchase(scratch, FOOD_TRADES, firstRow[MILK], 2, 3_000);
    logPurchase(scratch, FOOD_TRADES, firstRow[BREAD], 1, 500);
    logPurchase(scratch, FOOD_TRADES, firstRow[FISH], 3, 1_500);
    logPurchase(scratch, GOODS_TRADES, firstRow[CLOTH], 1, 4_000);
    logPurchase(scratch, GOODS_TRADES, firstRow[FUEL], 2, 6_000);
    writeEconomyFeed(world, feed);

    expect(feed.trades).toBe(5);
    expect(Array.from(feed.tradeGood)).toEqual([MILK, BREAD, FISH, CLOTH, FUEL, ...Array(FEED_TRADES - 5).fill(0)]);
    expect(Array.from(feed.tradeShop.subarray(0, 5))).toEqual(
      [MILK, BREAD, FISH, CLOTH, FUEL].map((good) => firstRow[good]),
    );
  });

  it("holds a busy day's last 8 food and last 8 goods purchases oldest first, and nothing of it on a quiet day", () => {
    const world = town();
    const scratch = world.economyScratch;
    const feed = createEconomyFeed();

    world.globals[TICK] = dayEndTick(0);
    clearPurchases(scratch);
    for (let n = 0; n < 20; n++) {
      logPurchase(scratch, FOOD_TRADES, n, n + 1, 250 * (n + 1));
      logPurchase(scratch, GOODS_TRADES, 100 + n, n + 1, 250 * (n + 1));
    }
    writeEconomyFeed(world, feed);
    expect(feed.trades).toBe(FEED_TRADES);
    expect(Array.from(feed.tradeShop)).toEqual([...counting(TRADE_RING, 12), ...counting(TRADE_RING, 112)]);
    expect(Array.from(feed.tradeUnits)).toEqual([...counting(TRADE_RING, 13), ...counting(TRADE_RING, 13)]);
    expect(Array.from(feed.tradeCents)).toEqual(
      [...counting(TRADE_RING, 13), ...counting(TRADE_RING, 13)].map((units) => 250 * units),
    );

    world.globals[TICK] = dayEndTick(1);
    clearPurchases(scratch);
    for (let n = 0; n < 3; n++) logPurchase(scratch, GOODS_TRADES, 30 + n, 1, 2_500);
    writeEconomyFeed(world, feed);
    expect(feed.trades).toBe(3);
    expect(Array.from(feed.tradeShop)).toEqual([30, 31, 32, ...Array(FEED_TRADES - 3).fill(0)]);
    expect(Array.from(feed.tradeUnits)).toEqual([1, 1, 1, ...Array(FEED_TRADES - 3).fill(0)]);
    expect(Array.from(feed.tradeCents)).toEqual([2_500, 2_500, 2_500, ...Array(FEED_TRADES - 3).fill(0)]);

    // The day opens with both rings empty, so a day nobody shops leaves none of the quiet day's trades behind.
    runEconomySystem(world, CITY, 2, OPEN_DAY, 0);
    world.globals[TICK] = dayEndTick(2);
    writeEconomyFeed(world, feed);
    expect(feed.trades).toBe(0);
    expect(feed.tradeShop.every((shop) => shop === 0)).toBe(true);
    expect(feed.tradeGood.every((good) => good === 0)).toBe(true);
  });

  it("is due right after a town day's 20th tick, and never in a world that is not a town", () => {
    const grown = town();
    const plain = createWorld(SEED, 'phone', undefined, 10);
    const dueAt = (world: World, tick: number): boolean => {
      world.globals[TICK] = tick;
      return economyDayEnded(world);
    };

    const ticks = [ECONOMY_TICKS - 1, ECONOMY_TICKS, ECONOMY_TICKS + 1, dayEndTick(2)];
    expect(ticks.map((tick) => dueAt(grown, tick))).toEqual([false, true, false, true]);
    expect(dueAt(plain, ECONOMY_TICKS)).toBe(false);
  });
});
