import {
  DAYS_PER_YEAR,
  ECONOMY_TICKS,
  PPM,
  PURCHASE_RING,
  STAT_PRICE_MEAN,
  STAT_UNEMPLOYED,
  STAT_WAGE_MEAN,
  TICK,
  TICKS_PER_DAY,
  TOWN,
  copyPurchases,
  dayOf,
  type World,
} from '@nomos/sim-core';
import type { EconomyMessage } from '../messages/messages.ts';

export const FEED_DAYS = DAYS_PER_YEAR;
export const FEED_TRADES = PURCHASE_RING;

// Made once for a run; the loop writes it each day and posts it, so its arrays are the only ones a day allocates.
export function createEconomyFeed(): EconomyMessage {
  return {
    type: 'economy',
    day: -1,
    days: 0,
    meanPriceCents: new Float64Array(FEED_DAYS),
    meanWageCents: new Float64Array(FEED_DAYS),
    unemploymentPpm: new Float64Array(FEED_DAYS),
    trades: 0,
    tradeShop: new Int32Array(FEED_TRADES),
    tradeUnits: new Int32Array(FEED_TRADES),
    tradeCents: new Float64Array(FEED_TRADES),
  };
}

// True right after the step that runs a town's last economy tick, when the day's row of stats is whole.
export function economyDayEnded(world: World): boolean {
  const globals = world.globals;
  return globals[TOWN] === 1 && globals[TICK] % TICKS_PER_DAY === ECONOMY_TICKS;
}

// Adds the day that just ended: its levels from the stats row, which the state hash skips, and its last trades. Called
// once a day, so the days are consecutive and a full feed drops its oldest.
export function writeEconomyFeed(world: World, feed: EconomyMessage): void {
  const stats = world.economyScratch.stats;
  if (feed.days === FEED_DAYS) {
    feed.meanPriceCents.copyWithin(0, 1);
    feed.meanWageCents.copyWithin(0, 1);
    feed.unemploymentPpm.copyWithin(0, 1);
  } else {
    feed.days++;
  }
  const newest = feed.days - 1;
  feed.day = dayOf(world.globals[TICK] - 1);
  feed.meanPriceCents[newest] = stats[STAT_PRICE_MEAN];
  feed.meanWageCents[newest] = stats[STAT_WAGE_MEAN];
  feed.unemploymentPpm[newest] = Math.floor((stats[STAT_UNEMPLOYED] * PPM) / world.agents.count[0]);
  feed.trades = copyPurchases(world.economyScratch, feed.tradeShop, feed.tradeUnits, feed.tradeCents);
}
