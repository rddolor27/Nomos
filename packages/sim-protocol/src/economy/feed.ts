import {
  BREAD,
  DAYS_PER_YEAR,
  ECONOMY_TICKS,
  FUEL,
  MILK,
  PPM,
  PURCHASE_RING,
  STAT_EATEN,
  STAT_GOOD_PRICE,
  STAT_GOOD_STOCK,
  STAT_SOLD,
  STAT_SOLD_CENTS,
  STAT_SPOILED,
  STAT_UNEMPLOYED,
  STAT_UNMET,
  STAT_WAGE_MEAN,
  TICK,
  TICKS_PER_DAY,
  TOWN,
  copyPurchases,
  dayOf,
  type World,
} from '@nomos/sim-core';
import type { EconomyMessage } from '../messages/messages.ts';

export { BREAD, FUEL, GOOD_NAMES, SHOP_NAMES } from '@nomos/sim-core';

export const FEED_DAYS = DAYS_PER_YEAR;
export const FEED_TRADES = PURCHASE_RING;
// The goods a town sells, BREAD to FUEL: series g of a per-good array is good BREAD + g.
export const FEED_GOODS = FUEL - BREAD + 1;

function createGoodSeries(): Float64Array[] {
  return Array.from({ length: FEED_GOODS }, () => new Float64Array(FEED_DAYS));
}

// Made once for a run; the loop writes it each day and posts it, so its arrays are the only ones a day allocates.
export function createEconomyFeed(): EconomyMessage {
  return {
    type: 'economy',
    day: -1,
    days: 0,
    meanWageCents: new Float64Array(FEED_DAYS),
    unemploymentPpm: new Float64Array(FEED_DAYS),
    soldUnits: createGoodSeries(),
    stockUnits: createGoodSeries(),
    paidCents: createGoodSeries(),
    eaten: new Float64Array(FEED_DAYS),
    spoiled: new Float64Array(FEED_DAYS),
    unmet: new Float64Array(FEED_DAYS),
    trades: 0,
    tradeShop: new Int32Array(FEED_TRADES),
    tradeGood: new Uint8Array(FEED_TRADES),
    tradeUnits: new Int32Array(FEED_TRADES),
    tradeCents: new Float64Array(FEED_TRADES),
  };
}

// True right after the step that runs a town's last economy tick, when the day's row of stats is whole.
export function economyDayEnded(world: World): boolean {
  const globals = world.globals;
  return globals[TOWN] === 1 && globals[TICK] % TICKS_PER_DAY === ECONOMY_TICKS;
}

function dropOldestDay(feed: EconomyMessage): void {
  feed.meanWageCents.copyWithin(0, 1);
  feed.unemploymentPpm.copyWithin(0, 1);
  feed.eaten.copyWithin(0, 1);
  feed.spoiled.copyWithin(0, 1);
  feed.unmet.copyWithin(0, 1);
  for (let g = 0; g < FEED_GOODS; g++) {
    feed.soldUnits[g].copyWithin(0, 1);
    feed.stockUnits[g].copyWithin(0, 1);
    feed.paidCents[g].copyWithin(0, 1);
  }
}

// Sold, in stock and the price paid, which is the day's sales cents over its units, or the posted mean on a day nothing sells.
function writeGoods(stats: Float64Array, feed: EconomyMessage, newest: number): void {
  for (let g = 0; g < FEED_GOODS; g++) {
    const good = BREAD + g;
    const sold = stats[STAT_SOLD + good];
    feed.soldUnits[g][newest] = sold;
    feed.stockUnits[g][newest] = stats[STAT_GOOD_STOCK + good];
    feed.paidCents[g][newest] = sold > 0 ? stats[STAT_SOLD_CENTS + good] / sold : stats[STAT_GOOD_PRICE + good];
  }
}

function writeFood(stats: Float64Array, feed: EconomyMessage, newest: number): void {
  let spoiled = 0;
  for (let good = BREAD; good <= MILK; good++) spoiled += stats[STAT_SPOILED + good];
  feed.eaten[newest] = stats[STAT_EATEN];
  feed.spoiled[newest] = spoiled;
  feed.unmet[newest] = stats[STAT_UNMET];
}

// The ring names a shop and its good is the firm row's, which never changes.
function writeTrades(world: World, feed: EconomyMessage): void {
  feed.trades = copyPurchases(world.economyScratch, feed.tradeShop, feed.tradeUnits, feed.tradeCents);
  for (let i = 0; i < FEED_TRADES; i++) feed.tradeGood[i] = i < feed.trades ? world.goods.good[feed.tradeShop[i]] : 0;
}

// Adds the day that just ended: its levels from the stats row, which the state hash skips, and its last trades. Called
// once a day, so the days are consecutive and a full feed drops its oldest.
export function writeEconomyFeed(world: World, feed: EconomyMessage): void {
  const stats = world.economyScratch.stats;
  if (feed.days === FEED_DAYS) dropOldestDay(feed);
  else feed.days++;
  const newest = feed.days - 1;
  feed.day = dayOf(world.globals[TICK] - 1);
  feed.meanWageCents[newest] = stats[STAT_WAGE_MEAN];
  feed.unemploymentPpm[newest] = Math.floor((stats[STAT_UNEMPLOYED] * PPM) / world.agents.count[0]);
  writeGoods(stats, feed, newest);
  writeFood(stats, feed, newest);
  writeTrades(world, feed);
}
