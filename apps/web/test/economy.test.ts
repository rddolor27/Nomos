import { createEconomyFeed } from '@nomos/sim-protocol';
import { describe, expect, it } from 'vitest';
import { MEASURES, fillSeries, tradeRows } from '../src/panels/economy.ts';

const SLOTS = 112;

// Days 19 to 21 of a town whose first month has just ended: the price and wage step up and unemployment falls.
function threeDays() {
  const feed = createEconomyFeed();
  feed.day = 21;
  feed.days = 3;
  feed.meanPriceCents.set([3159, 3159, 3159.906565656566]);
  feed.meanWageCents.set([133_887, 133_887, 133_931.6893939394]);
  feed.unemploymentPpm.set([83_228, 83_480, 48_171]);
  return feed;
}

describe('the economy panel', () => {
  it('gives each series in the unit on screen, newest day first', () => {
    const feed = threeDays();
    const rows = MEASURES.map((measure) => fillSeries(feed, measure, new Float64Array(SLOTS)));

    expect(rows).toEqual([
      [['21', '31.60'], ['20', '31.59'], ['19', '31.59']],
      [['21', '1,339.32'], ['20', '1,338.87'], ['19', '1,338.87']],
      [['21', '4.82'], ['20', '8.35'], ['19', '8.32']],
    ]);
  });

  it('fills the chart oldest first, and only the days held', () => {
    const values = new Float64Array(SLOTS);
    fillSeries(threeDays(), MEASURES[0], values);

    expect([...values.subarray(0, 4)]).toEqual([31.59, 31.59, 3159.906565656566 / 100, 0]);
  });

  it('lists the last trades newest first, counting shops from 1 and naming no buyer', () => {
    const feed = createEconomyFeed();
    feed.trades = 3;
    feed.tradeShop.set([4, 0, 17]);
    feed.tradeUnits.set([2, 3, 2]);
    feed.tradeCents.set([6174, 9312, 6298]);

    expect(tradeRows(feed)).toEqual([
      ['Shop 18', '2', '62.98'],
      ['Shop 1', '3', '93.12'],
      ['Shop 5', '2', '61.74'],
    ]);
  });

  it('has no row before the first day ends, or for a day nobody shopped', () => {
    const fresh = createEconomyFeed();
    expect(fresh.days).toBe(0);
    for (const measure of MEASURES) expect(fillSeries(fresh, measure, new Float64Array(SLOTS))).toEqual([]);
    expect(tradeRows(fresh)).toEqual([]);

    const quiet = threeDays();
    expect(quiet.trades).toBe(0);
    expect(tradeRows(quiet)).toEqual([]);
  });
});
