import { createEconomyFeed } from '@nomos/sim-protocol';
import { describe, expect, it } from 'vitest';
import { MEASURES, goodsRows, fillSeries, tradeLines, type Measure } from '../src/panels/economy.ts';

const SLOTS = 112;
const BREAD_SERIES = 0;
const FISH_SERIES = 2;
const [FOOD, SALES, WAGE, UNEMPLOYMENT] = MEASURES;

function valuesFor(measure: Measure): Float64Array[] {
  return measure.labels.map(() => new Float64Array(SLOTS));
}

// Days 19 to 21 of a town whose first month has just ended: the wage steps up and unemployment falls. Bread and fish sell,
// and the other goods sell nothing.
function threeDays() {
  const feed = createEconomyFeed();
  feed.day = 21;
  feed.days = 3;
  feed.meanWageCents.set([133_887, 133_887, 133_931.6893939394]);
  feed.unemploymentPpm.set([83_228, 83_480, 48_171]);
  feed.eaten.set([29_000, 29_400, 29_700]);
  feed.spoiled.set([310, 0, 85]);
  feed.unmet.set([0, 12, 40]);
  feed.soldUnits[BREAD_SERIES].set([9_000, 9_150, 9_300]);
  feed.soldUnits[FISH_SERIES].set([7_000, 7_200, 7_000]);
  feed.stockUnits[BREAD_SERIES].set([4_000, 3_800, 3_900]);
  feed.paidCents[BREAD_SERIES].set([555, 555, 556.5]);
  return feed;
}

describe('the economy panel', () => {
  it('gives each series in the unit on screen, newest day first', () => {
    const feed = threeDays();
    const rows = MEASURES.map((measure) => fillSeries(feed, measure, valuesFor(measure)));

    expect(rows[0]).toEqual([
      ['21', '29,700', '85', '40'],
      ['20', '29,400', '0', '12'],
      ['19', '29,000', '310', '0'],
    ]);
    expect(rows[1].map((row) => [row[0], row[1], row[3]])).toEqual([
      ['21', '9,300', '7,000'],
      ['20', '9,150', '7,200'],
      ['19', '9,000', '7,000'],
    ]);
    expect(rows[1][0]).toHaveLength(1 + 7);
    expect(rows[2]).toEqual([['21', '1,339.32'], ['20', '1,338.87'], ['19', '1,338.87']]);
    expect(rows[3]).toEqual([['21', '4.82'], ['20', '8.35'], ['19', '8.32']]);
  });

  it('fills the chart oldest first, and only the days held', () => {
    const values = valuesFor(WAGE);
    fillSeries(threeDays(), WAGE, values);
    expect([...values[0].subarray(0, 4)]).toEqual([1338.87, 1338.87, 133_931.6893939394 / 100, 0]);

    const food = valuesFor(FOOD);
    fillSeries(threeDays(), FOOD, food);
    expect(food.map((series) => [...series.subarray(0, 4)])).toEqual([
      [29_000, 29_400, 29_700, 0],
      [310, 0, 85, 0],
      [0, 12, 40, 0],
    ]);
    expect([SALES, UNEMPLOYMENT].map((measure) => measure.labels.length)).toEqual([7, 1]);
  });

  it("tables the day's goods: sold, in stock and the price paid, and a good nobody bought at its posted price", () => {
    const rows = goodsRows(threeDays());

    expect(rows).toHaveLength(7);
    expect(rows[0]).toEqual(['Bread', '9,300', '3,900', '5.57']);
    expect(rows.map((row) => row[0])).toEqual(['Bread', 'Vegetables', 'Fish', 'Milk', 'Cloth', 'Tools', 'Fuel']);

    const quiet = threeDays();
    quiet.soldUnits[FISH_SERIES][2] = 0;
    quiet.stockUnits[FISH_SERIES][2] = 120;
    quiet.paidCents[FISH_SERIES][2] = 1_234;
    expect(goodsRows(quiet)[FISH_SERIES]).toEqual(['Fish', '0', '120', '12.34']);
  });

  it('lists the last trades newest first, counting shops from 1 and naming no buyer', () => {
    const feed = createEconomyFeed();
    feed.trades = 3;
    feed.tradeShop.set([4, 0, 17]);
    feed.tradeGood.set([3, 1, 4]);
    feed.tradeUnits.set([2, 3, 2]);
    feed.tradeCents.set([6174, 9312, 6298]);

    expect(tradeLines(feed)).toEqual([
      '2 milk at Dairy 18, 62.98',
      '3 bread at Bakery 1, 93.12',
      '2 fish at Fishmonger 5, 61.74',
    ]);
  });

  it('has no row before the first day ends, or for a day nobody shopped', () => {
    const fresh = createEconomyFeed();
    expect(fresh.days).toBe(0);
    for (const measure of MEASURES) expect(fillSeries(fresh, measure, valuesFor(measure))).toEqual([]);
    expect(goodsRows(fresh)).toEqual([]);
    expect(tradeLines(fresh)).toEqual([]);

    const quiet = threeDays();
    expect(quiet.trades).toBe(0);
    expect(tradeLines(quiet)).toEqual([]);
  });
});
