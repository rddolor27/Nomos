import {
  CITY,
  ECONOMY_TICKS,
  PPM,
  STAT_PRICE_MEAN,
  STAT_SALES_CENTS,
  STAT_UNEMPLOYED,
  STAT_WAGE_MEAN,
  TICK,
  TICKS_PER_DAY,
  clearPurchases,
  createTown,
  createWorld,
  economyDay,
  logPurchase,
  runEconomySystem,
  standInGround,
  step,
  type World,
} from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import { FEED_DAYS, FEED_TRADES, createEconomyFeed, economyDayEnded, writeEconomyFeed } from '../src/index.ts';

const SEED = 42;
const PEOPLE = 300;
// Economy system 6 is shopDay (interfaces.md, The economy on screen).
const SHOP_DAY = 6;

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

    // Day 0 opens a month and ends no month, so no price moves between the shopping and the feed.
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

  it('keeps the last 112 of 113 days, oldest first', () => {
    const world = town();
    const feed = createEconomyFeed();
    const stats = world.economyScratch.stats;
    const price: number[] = [];
    const wage: number[] = [];
    const unemployment: number[] = [];

    for (let day = 0; day <= FEED_DAYS; day++) {
      economyDay(world, CITY, day);
      price.push(stats[STAT_PRICE_MEAN]);
      wage.push(stats[STAT_WAGE_MEAN]);
      unemployment.push(unemploymentPpm(world));
      world.globals[TICK] = dayEndTick(day);
      writeEconomyFeed(world, feed);
    }

    expect(FEED_DAYS).toBe(112);
    expect([feed.day, feed.days]).toEqual([FEED_DAYS, FEED_DAYS]);
    expect(Array.from(feed.meanPriceCents)).toEqual(price.slice(1));
    expect(Array.from(feed.meanWageCents)).toEqual(wage.slice(1));
    expect(Array.from(feed.unemploymentPpm)).toEqual(unemployment.slice(1));
    // The series move, so a feed in another order or a day off would not match.
    expect(new Set(price).size).toBeGreaterThan(1);
    expect(new Set(wage).size).toBeGreaterThan(1);
  });

  it("holds a busy day's last 16 purchases oldest first, and nothing of it on a quiet day", () => {
    const world = town();
    const scratch = world.economyScratch;
    const feed = createEconomyFeed();

    world.globals[TICK] = dayEndTick(0);
    clearPurchases(scratch);
    for (let n = 0; n < 20; n++) logPurchase(scratch, n, n + 1, 250 * (n + 1));
    writeEconomyFeed(world, feed);
    expect(feed.trades).toBe(FEED_TRADES);
    expect(Array.from(feed.tradeShop)).toEqual(counting(FEED_TRADES, 4));
    expect(Array.from(feed.tradeUnits)).toEqual(counting(FEED_TRADES, 5));
    expect(Array.from(feed.tradeCents)).toEqual(counting(FEED_TRADES, 5).map((units) => 250 * units));

    world.globals[TICK] = dayEndTick(1);
    clearPurchases(scratch);
    for (let n = 0; n < 3; n++) logPurchase(scratch, 30 + n, 1, 2_500);
    writeEconomyFeed(world, feed);
    expect(feed.trades).toBe(3);
    expect(Array.from(feed.tradeShop)).toEqual([30, 31, 32, ...Array(FEED_TRADES - 3).fill(0)]);
    expect(Array.from(feed.tradeUnits)).toEqual([1, 1, 1, ...Array(FEED_TRADES - 3).fill(0)]);
    expect(Array.from(feed.tradeCents)).toEqual([2_500, 2_500, 2_500, ...Array(FEED_TRADES - 3).fill(0)]);

    // shopDay opens its own day with the ring empty, so a day nobody shops leaves none of the quiet day's trades behind.
    world.agents.plannedUnits.fill(0);
    runEconomySystem(world, CITY, 2, SHOP_DAY, 0);
    world.globals[TICK] = dayEndTick(2);
    writeEconomyFeed(world, feed);
    expect(feed.trades).toBe(0);
    expect(feed.tradeShop.every((shop) => shop === 0)).toBe(true);
  });

  it("is due right after a town day's 18th tick, and never in a world that is not a town", () => {
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
