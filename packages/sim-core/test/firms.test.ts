import { describe, expect, it } from 'vitest';
import { CITY } from '../src/economy/city.ts';
import { LENGNICK, type EconomyParams } from '../src/economy/params.ts';
import {
  STAT_ABOVE_MARKUP,
  STAT_EXITS,
  STAT_FIRINGS,
  STAT_PRICE_CHANGES,
  STAT_PRICE_CHANGE_PPM,
  STAT_PRODUCED,
  STAT_WRITE_OFF,
} from '../src/economy/stats.ts';
import { decideFirms } from '../src/firms/decide.ts';
import { produce } from '../src/firms/produce.ts';
import { closeFirmMonth } from '../src/firms/renew.ts';
import { layOffExiting } from '../src/labour/layoffs.ts';
import { OK, checkCash } from '../src/money/invariants.ts';
import { firmAccount, issue } from '../src/money/ledger.ts';
import { mulPpm } from '../src/money/ppm.ts';
import { draw2 } from '../src/random/draw.ts';
import { createWorld, type World } from '../src/world/world.ts';

const FIRMS = 1_000;
const ROWS_STREAM = 0x7f4;
// A step chance of 0 holds every price still, so a test of the band reads the flags alone.
const STILL: EconomyParams = { ...LENGNICK, priceChancePpm: 0 };
const SURE: EconomyParams = { ...LENGNICK, priceChancePpm: 1_000_000 };

type Column =
  | 'price'
  | 'wage'
  | 'stock'
  | 'employees'
  | 'demand'
  | 'lastDemand'
  | 'vacancy'
  | 'notice'
  | 'monthsFull'
  | 'idleMonths';
type Row = Partial<Record<Column, number>>;

// At the preset's wage of 142,800 a month of one worker's output costs 142,800, and 63 x price must sit under 164,220 for
// a price to rise and over 146,370 for it to fall: 2,606 is the highest price that rises and 2,324 the lowest that falls.
// The cost floor is ceil(142,800 / 63) = 2,267.
const BASE = { price: 2_500, wage: 142_800 };
// A price of 1,000,000 cents makes a step of eta ppm exactly eta cents, so a change reads off as its size.
const WHOLE = { price: 1_000_000, wage: 60_000_000, employees: 5 };

function writeRow(world: World, f: number, row: Row): void {
  for (const column of Object.keys(row) as Column[]) world.firms[column][f] = row[column] as number;
}

function worldWith(rows: readonly Row[]): World {
  const world = createWorld(42, 'phone', undefined, 40);
  world.firms.count[0] = rows.length;
  rows.forEach((row, f) => writeRow(world, f, row));
  return world;
}

function crowd(count: number, row: Row): World {
  return worldWith(Array.from({ length: count }, () => row));
}

function rowOf(world: World, f: number): Record<Column, number> {
  const firms = world.firms;
  return {
    price: firms.price[f],
    wage: firms.wage[f],
    stock: firms.stock[f],
    employees: firms.employees[f],
    demand: firms.demand[f],
    lastDemand: firms.lastDemand[f],
    vacancy: firms.vacancy[f],
    notice: firms.notice[f],
    monthsFull: firms.monthsFull[f],
    idleMonths: firms.idleMonths[f],
  };
}

function flagsOf(world: World): number[][] {
  const { vacancy, notice, count } = world.firms;
  return Array.from({ length: count[0] }, (_, f) => [vacancy[f], notice[f]]);
}

function pricesOf(world: World): number[] {
  return Array.from(world.firms.price.subarray(0, world.firms.count[0]));
}

function priceDeltas(world: World, was: number): number[] {
  return pricesOf(world).map((price) => price - was);
}

describe('the stock band', () => {
  it('opens a vacancy below low and a notice above high, and neither inside', () => {
    // With no demand last month the floor of 63 sets the band: low is 16 (15.75 rounded up) and high is 63.
    const world = worldWith([
      { ...BASE, stock: 15, employees: 3 },
      { ...BASE, stock: 16, employees: 3 },
      { ...BASE, stock: 63, employees: 3 },
      { ...BASE, stock: 64, employees: 3 },
      { ...BASE, stock: 64, employees: 0 },
      { ...BASE, stock: 0, employees: 0 },
    ]);
    decideFirms(world, STILL, 0);
    expect(flagsOf(world)).toEqual([[1, 0], [0, 0], [0, 0], [0, 1], [0, 0], [1, 0]]);
  });

  it("scales with last month's demand, and never sits under the floor", () => {
    const world = worldWith([
      { ...BASE, lastDemand: 400, stock: 99, employees: 2 },
      { ...BASE, lastDemand: 400, stock: 100, employees: 2 },
      { ...BASE, lastDemand: 400, stock: 400, employees: 2 },
      { ...BASE, lastDemand: 400, stock: 401, employees: 2 },
      { ...BASE, lastDemand: 10, stock: 15, employees: 2 },
      { ...BASE, lastDemand: 10, stock: 16, employees: 2 },
      { ...BASE, lastDemand: 10, stock: 64, employees: 2 },
    ]);
    decideFirms(world, STILL, 0);
    expect(flagsOf(world)).toEqual([[1, 0], [0, 0], [0, 0], [0, 1], [1, 0], [0, 0], [0, 1]]);
  });

  it("tops out at one month's demand for the replication, and at 1.6 months for the city", () => {
    expect(LENGNICK.stockHighPpm).toBe(0);
    // A month's demand of 1,000 puts the replication's band at 250 to 1,000 and the city's at 800 to 1,600.
    const rows = [799, 800, 1_000, 1_600, 1_601].map((stock) => ({ ...BASE, lastDemand: 1_000, stock, employees: 3 }));
    const replication = worldWith(rows);
    decideFirms(replication, STILL, 0);
    expect(flagsOf(replication)).toEqual([[0, 0], [0, 0], [0, 0], [0, 1], [0, 1]]);
    const city = worldWith(rows);
    decideFirms(city, { ...CITY, priceChancePpm: 0 }, 0);
    expect(flagsOf(city)).toEqual([[1, 0], [0, 0], [0, 0], [0, 0], [0, 1]]);
  });

  it('leaves the band to last month alone when the floor is off', () => {
    const world = worldWith([
      { ...BASE, stock: 0, employees: 1 },
      { ...BASE, stock: 1, employees: 1 },
    ]);
    decideFirms(world, { ...STILL, demandFloor: 0 }, 0);
    expect(flagsOf(world)).toEqual([[0, 0], [0, 1]]);
  });

  it("clears last month's flags", () => {
    const world = worldWith([{ ...BASE, stock: 30, employees: 3, vacancy: 1, notice: 1 }]);
    decideFirms(world, STILL, 0);
    expect(flagsOf(world)).toEqual([[0, 0]]);
  });

  it('visits only the firms the store counts', () => {
    const world = worldWith([{ ...BASE, stock: 0 }]);
    writeRow(world, 1, { ...BASE, stock: 0 });
    decideFirms(world, STILL, 0);
    expect(world.firms.vacancy[1]).toBe(0);
  });
});

describe('the price rule', () => {
  it('raises a price only from below the top of the markup band', () => {
    const eligible = crowd(FIRMS, { ...BASE, price: 2_606, stock: 0, employees: 3 });
    decideFirms(eligible, LENGNICK, 0);
    const rises = priceDeltas(eligible, 2_606);
    expect(Math.min(...rises)).toBe(0);
    expect(Math.max(...rises)).toBeGreaterThan(0);
    expect(Math.max(...rises)).toBeLessThanOrEqual(mulPpm(2_606, LENGNICK.priceStepPpm));

    const overTop = crowd(FIRMS, { ...BASE, price: 2_607, stock: 0, employees: 3 });
    decideFirms(overTop, LENGNICK, 0);
    expect(priceDeltas(overTop, 2_607).every((delta) => delta === 0)).toBe(true);
  });

  it('cuts a price only from above the bottom of the markup band', () => {
    const eligible = crowd(FIRMS, { ...BASE, price: 2_324, stock: 100, employees: 3 });
    decideFirms(eligible, LENGNICK, 0);
    const cuts = priceDeltas(eligible, 2_324);
    expect(Math.max(...cuts)).toBe(0);
    expect(Math.min(...cuts)).toBeLessThan(0);
    expect(Math.min(...cuts)).toBeGreaterThanOrEqual(-mulPpm(2_324, LENGNICK.priceStepPpm));

    const underBottom = crowd(FIRMS, { ...BASE, price: 2_323, stock: 100, employees: 3 });
    decideFirms(underBottom, LENGNICK, 0);
    expect(priceDeltas(underBottom, 2_323).every((delta) => delta === 0)).toBe(true);
  });

  it('treats the band edges as outside: a price rises only strictly under the top and falls only strictly over the bottom', () => {
    // At a wage of 63,000 the edges are 63 x 1,150 and 63 x 1,025 exactly.
    const cases = [
      { price: 1_150, stock: 0, moves: false },
      { price: 1_149, stock: 0, moves: true },
      { price: 1_025, stock: 100, moves: false },
      { price: 1_026, stock: 100, moves: true },
    ];
    for (const { price, stock, moves } of cases) {
      const world = crowd(FIRMS, { wage: 63_000, price, stock, employees: 3 });
      decideFirms(world, LENGNICK, 0);
      expect(priceDeltas(world, price).some((delta) => delta !== 0), `price ${price}`).toBe(moves);
    }
  });

  it('holds a price still while stock sits inside the band', () => {
    const world = crowd(FIRMS, { ...BASE, price: 2_400, stock: 30, employees: 3 });
    decideFirms(world, LENGNICK, 0);
    expect(priceDeltas(world, 2_400).every((delta) => delta === 0)).toBe(true);
  });

  it('never ends a price below its cost floor or under 1 cent', () => {
    const world = worldWith(
      Array.from({ length: FIRMS }, (_, f) => ({
        wage: 1 + (draw2(42, ROWS_STREAM, f, 0) % 400_000),
        price: 1 + (draw2(42, ROWS_STREAM, f, 1) % 8_000),
        stock: draw2(42, ROWS_STREAM, f, 2) % 130,
        employees: draw2(42, ROWS_STREAM, f, 3) % 4,
      })),
    );
    const below = pricesOf(world).filter((price, f) => price < Math.floor((world.firms.wage[f] + 62) / 63)).length;
    decideFirms(world, LENGNICK, 0);
    expect(below).toBeGreaterThan(100);
    for (let f = 0; f < FIRMS; f++) {
      expect(world.firms.price[f], `firm ${f}`).toBeGreaterThanOrEqual(Math.floor((world.firms.wage[f] + 62) / 63));
    }
  });

  it('lifts a price to the floor even inside the band, and a free firm to 1 cent', () => {
    const world = worldWith([
      { price: 2_000, wage: 142_800, stock: 30 },
      { price: 2_266, wage: 142_800, stock: 30 },
      { price: 2_267, wage: 142_800, stock: 30 },
      { price: 999, wage: 63_000, stock: 30 },
      { price: 1_000, wage: 63_000, stock: 30 },
      { price: 0, wage: 0, stock: 30 },
    ]);
    decideFirms(world, STILL, 0);
    // 63,000 over 63 is exactly 1,000, which needs no rounding up.
    expect(pricesOf(world)).toEqual([2_267, 2_267, 2_267, 1_000, 1_000, 1]);
  });

  it('moves 75% of the firms that can move, give or take 5 points, by up to the step', () => {
    for (const [stock, sign] of [[0, 1], [100, -1]]) {
      const world = crowd(FIRMS, { ...WHOLE, stock });
      decideFirms(world, LENGNICK, 0);
      const steps = priceDeltas(world, WHOLE.price).map((delta) => delta * sign);
      const moved = steps.filter((step) => step !== 0).length;
      expect(moved, `stock ${stock}`).toBeGreaterThanOrEqual(700);
      expect(moved, `stock ${stock}`).toBeLessThanOrEqual(800);
      expect(steps.every((step) => step >= 0 && step <= LENGNICK.priceStepPpm)).toBe(true);
    }
  });

  it('draws the chance and the size apart, so the chance never reshuffles the sizes', () => {
    const sometimes = crowd(FIRMS, { ...WHOLE, stock: 0 });
    const always = crowd(FIRMS, { ...WHOLE, stock: 0 });
    decideFirms(sometimes, LENGNICK, 0);
    decideFirms(always, SURE, 0);
    const [few, all] = [pricesOf(sometimes), pricesOf(always)];
    expect(few.every((price, f) => price === WHOLE.price || price === all[f])).toBe(true);
    expect(few.filter((price) => price !== WHOLE.price).length).toBeLessThan(
      all.filter((price) => price !== WHOLE.price).length,
    );
  });

  it("counts each change and adds up its size in ppm to the month's statistics", () => {
    const world = crowd(FIRMS, { ...WHOLE, stock: 0 });
    const stats = world.economyScratch.stats;
    stats[STAT_PRICE_CHANGES] = 5;
    stats[STAT_PRICE_CHANGE_PPM] = 7;
    decideFirms(world, LENGNICK, 0);
    const steps = priceDeltas(world, WHOLE.price).filter((step) => step !== 0);
    expect(stats[STAT_PRICE_CHANGES]).toBe(5 + steps.length);
    expect(stats[STAT_PRICE_CHANGE_PPM]).toBe(7 + steps.reduce((sum, step) => sum + step, 0));
    const mean = (stats[STAT_PRICE_CHANGE_PPM] - 7) / steps.length;
    expect(mean).toBeGreaterThan(9_000);
    expect(mean).toBeLessThan(11_000);
  });

  it('counts no change for a step too small to move a whole cent', () => {
    // 63 x 10 is over 600 + 15, so the price may fall, but 2% of 10 cents is under a cent.
    const world = worldWith([{ price: 10, wage: 600, stock: 100 }]);
    decideFirms(world, SURE, 0);
    expect(pricesOf(world)).toEqual([10]);
    expect(world.economyScratch.stats[STAT_PRICE_CHANGES]).toBe(0);
    expect(world.economyScratch.stats[STAT_PRICE_CHANGE_PPM]).toBe(0);
  });

  it('stops a rise at the markup ceiling and a cut at its floor when the clamp is on, and overshoots when it is off', () => {
    // At the preset's wage the band is 146,370 to 164,220: the highest price inside it is 2,606 and the lowest 2,324.
    const rising = { ...BASE, price: 2_600, stock: 0, employees: 3 };
    const falling = { ...BASE, price: 2_330, stock: 100, employees: 3 };
    const repriced = (row: Row, params: EconomyParams): World => {
      const world = crowd(FIRMS, row);
      decideFirms(world, params, 0);
      return world;
    };
    const clamped = { ...SURE, markupClamp: 1 };

    expect(Math.max(...pricesOf(repriced(rising, SURE)))).toBeGreaterThan(2_606);
    expect(Math.min(...pricesOf(repriced(falling, SURE)))).toBeLessThan(2_324);
    expect(repriced(rising, SURE).economyScratch.stats[STAT_ABOVE_MARKUP]).toBeGreaterThan(0);

    const up = repriced(rising, clamped);
    expect([Math.min(...pricesOf(up)), Math.max(...pricesOf(up))]).toEqual([2_600, 2_606]);
    expect(up.economyScratch.stats[STAT_ABOVE_MARKUP]).toBe(0);
    const down = repriced(falling, clamped);
    expect([Math.min(...pricesOf(down)), Math.max(...pricesOf(down))]).toEqual([2_324, 2_330]);
  });

  it('reaches the band edge exactly when a wage divides it, and lets the cost floor lift a price past the ceiling', () => {
    // At a wage of 63,000 the edges are 63 x 1,150 and 63 x 1,025, so a clamped step reaches them and stops.
    const clamped = { ...SURE, markupClamp: 1 };
    const up = crowd(FIRMS, { wage: 63_000, price: 1_149, stock: 0, employees: 3 });
    decideFirms(up, clamped, 0);
    expect(Math.max(...pricesOf(up))).toBe(1_150);
    const down = crowd(FIRMS, { wage: 63_000, price: 1_026, stock: 100, employees: 3 });
    decideFirms(down, clamped, 0);
    expect(Math.min(...pricesOf(down))).toBe(1_025);
    // A wage of 64 puts the ceiling at floor(73 / 63) = 1 cent, under the cost floor of 2: the clamp comes first.
    const tiny = worldWith([{ wage: 64, price: 1, stock: 0, employees: 3 }]);
    decideFirms(tiny, clamped, 0);
    expect(pricesOf(tiny)).toEqual([2]);
    expect(tiny.economyScratch.stats[STAT_ABOVE_MARKUP]).toBe(1);
  });

  it('counts the firms left above the markup ceiling once they have repriced', () => {
    // At the preset's wage the ceiling is 164,220 cents a worker's month, which 63 x price passes from a price of 2,607.
    const still = worldWith([2_500, 2_606, 2_607, 2_608, 3_000].map((price) => ({ ...BASE, price, stock: 30, employees: 3 })));
    decideFirms(still, STILL, 0);
    expect(still.economyScratch.stats[STAT_ABOVE_MARKUP]).toBe(3);

    // A firm at 2,606 with no stock may rise past the ceiling, and counts from the price it ends on.
    const rising = crowd(FIRMS, { ...BASE, price: 2_606, stock: 0, employees: 3 });
    decideFirms(rising, SURE, 0);
    const above = pricesOf(rising).filter((price) => 63 * price > 164_220).length;
    expect(above).toBeGreaterThan(900);
    expect(rising.economyScratch.stats[STAT_ABOVE_MARKUP]).toBe(above);
  });

  it('replays from the seed, month by month', () => {
    const [first, again, next] = [0, 0, 1].map((month) => {
      const world = crowd(FIRMS, { ...WHOLE, stock: 0 });
      decideFirms(world, LENGNICK, month);
      return pricesOf(world);
    });
    expect(again).toEqual(first);
    expect(next).not.toEqual(first);
  });
});

describe('production', () => {
  it('adds the units a worker makes in a day for each worker, to every firm', () => {
    const world = worldWith([
      { stock: 5, employees: 0 },
      { stock: 0, employees: 1 },
      { stock: 10, employees: 7 },
      { stock: 0, employees: 100 },
    ]);
    world.firms.employees[4] = 9;
    produce(world, LENGNICK);
    expect(Array.from(world.firms.stock.subarray(0, 5))).toEqual([5, 3, 31, 300, 0]);
    expect(world.economyScratch.stats[STAT_PRODUCED]).toBe(3 + 21 + 300);
    produce(world, { ...LENGNICK, unitsPerWorkerDay: 5 });
    expect(Array.from(world.firms.stock.subarray(0, 4))).toEqual([5, 8, 66, 800]);
    expect(world.economyScratch.stats[STAT_PRODUCED]).toBe(3 + 21 + 300 + 5 + 35 + 500);
  });
});

describe('firm turnover', () => {
  // The first firm is idle for good. The others are not: one has workers and sells nothing, one has no workers and sells.
  const ROWS: Row[] = [
    { price: 1_000, wage: 50_000, stock: 9, lastDemand: 7, vacancy: 1, notice: 1, monthsFull: 5 },
    { price: 3_000, wage: 150_001, stock: 20, employees: 2 },
    { price: 2_000, wage: 90_000, stock: 5, employees: 4 },
    { price: 2_501, wage: 140_000, stock: 3 },
  ];

  // Shopping refills these every month.
  function sell(world: World): void {
    world.firms.demand[1] = 40;
    world.firms.demand[3] = 10;
  }

  it("moves the month's demand to last month's and starts a new count", () => {
    const world = worldWith(ROWS);
    sell(world);
    closeFirmMonth(world, LENGNICK);
    expect(Array.from(world.firms.lastDemand.subarray(0, 4))).toEqual([0, 40, 0, 10]);
    expect(Array.from(world.firms.demand.subarray(0, 4))).toEqual([0, 0, 0, 0]);
  });

  it('counts months running with no workers and no demand, and re-enters a firm on exactly its third', () => {
    const world = worldWith(ROWS);
    const stats = world.economyScratch.stats;
    issue(world.cash, firmAccount(world.cash, 0), 777);
    const idle = { price: 1_000, wage: 50_000, stock: 9, employees: 0, demand: 0, lastDemand: 0, vacancy: 1, notice: 1, monthsFull: 5 };
    for (const count of [1, 2]) {
      sell(world);
      closeFirmMonth(world, LENGNICK);
      expect(rowOf(world, 0), `month ${count}`).toEqual({ ...idle, idleMonths: count });
      expect(stats[STAT_EXITS]).toBe(0);
      expect(stats[STAT_WRITE_OFF]).toBe(0);
    }
    sell(world);
    closeFirmMonth(world, LENGNICK);
    // The means of 1,000, 3,000, 2,000 and 2,501 and of 50,000, 150,001, 90,000 and 140,000, rounded down.
    expect(rowOf(world, 0)).toEqual({
      price: 2_125,
      wage: 107_500,
      stock: 0,
      employees: 0,
      demand: 0,
      lastDemand: 63,
      vacancy: 0,
      notice: 0,
      monthsFull: 0,
      idleMonths: 0,
    });
    expect(stats[STAT_EXITS]).toBe(1);
    // The 9 units it held are written off, and stay out of the other firms' stock.
    expect(stats[STAT_WRITE_OFF]).toBe(9);
    expect(world.cash.balance[firmAccount(world.cash, 0)]).toBe(777);
    expect(checkCash(world.cash)).toBe(OK);
    for (const f of [1, 2, 3]) expect(world.firms.idleMonths[f], `firm ${f}`).toBe(0);
    expect(rowOf(world, 1).stock).toBe(20);
  });

  it('starts counting again after a re-entry', () => {
    const world = worldWith(ROWS);
    for (let month = 0; month < 4; month++) {
      sell(world);
      closeFirmMonth(world, LENGNICK);
    }
    expect(world.firms.idleMonths[0]).toBe(1);
    expect(world.economyScratch.stats[STAT_EXITS]).toBe(1);
  });

  it('resets the count in a month with a worker or a sale, so the idle months must run together', () => {
    const world = worldWith(ROWS);
    for (const month of [1, 2]) {
      sell(world);
      closeFirmMonth(world, LENGNICK);
      expect(world.firms.idleMonths[0], `month ${month}`).toBe(month);
    }
    sell(world);
    world.firms.demand[0] = 5;
    closeFirmMonth(world, LENGNICK);
    expect(world.firms.idleMonths[0]).toBe(0);
    expect(world.firms.lastDemand[0]).toBe(5);
    for (let month = 0; month < 2; month++) {
      sell(world);
      closeFirmMonth(world, LENGNICK);
    }
    expect(world.firms.idleMonths[0]).toBe(2);
    expect(world.firms.price[0]).toBe(1_000);
    sell(world);
    world.firms.employees[0] = 1;
    closeFirmMonth(world, LENGNICK);
    expect(world.firms.idleMonths[0]).toBe(0);
  });

  it('gives every exit in a month the means of the firms as they stood before any exit', () => {
    const world = worldWith([
      { price: 1_000, wage: 10_000, idleMonths: 2 },
      { price: 5_000, wage: 50_000, idleMonths: 2 },
      { price: 2_000, wage: 20_000, employees: 1 },
      { price: 2_000, wage: 20_000, employees: 1 },
    ]);
    world.economyScratch.stats[STAT_EXITS] = 4;
    closeFirmMonth(world, LENGNICK);
    expect([world.firms.price[0], world.firms.price[1]]).toEqual([2_500, 2_500]);
    expect([world.firms.wage[0], world.firms.wage[1]]).toEqual([25_000, 25_000]);
    expect(world.economyScratch.stats[STAT_EXITS]).toBe(6);
  });

  it('never exits a firm when the exit is off, and stops counting at the byte it is kept in', () => {
    const world = worldWith(ROWS);
    for (let month = 0; month < 300; month++) {
      sell(world);
      closeFirmMonth(world, { ...LENGNICK, idleMonthsToExit: 0 });
    }
    expect(world.firms.idleMonths[0]).toBe(255);
    expect(world.firms.price[0]).toBe(1_000);
    expect(world.economyScratch.stats[STAT_EXITS]).toBe(0);
  });

  describe('when a firm cannot pay its workers', () => {
    const WAGE = 100_000;
    const NO_FIRM = -1;
    const EXIT_AT_ALL = { ...LENGNICK, shortPayExitPpm: 1_000_000 };

    // Firm 0 has three workers (people 0-2), firm 1 two (people 3-4), and firm 2 none. Each of the first two has sold.
    function shortPayWorld(pay: readonly number[]): World {
      const world = worldWith([
        { price: 3_000, wage: WAGE, stock: 12, employees: 3, demand: 10 },
        { price: 2_000, wage: WAGE, stock: 7, employees: 2, demand: 10 },
        { price: 1_000, wage: WAGE, stock: 5 },
      ]);
      [0, 0, 0, 1, 1].forEach((firm, person) => {
        world.agents.employer[person] = firm;
      });
      world.economyScratch.pay.set(pay);
      return world;
    }

    it('exits a firm that paid under the share of its wage, lays its workers off and writes its stock off', () => {
      const world = shortPayWorld([WAGE - 1, WAGE, 0]);
      const before = Array.from(world.cash.balance);
      closeFirmMonth(world, EXIT_AT_ALL);
      const stats = world.economyScratch.stats;
      expect(Array.from(world.economyScratch.exiting.subarray(0, 3))).toEqual([1, 0, 0]);
      expect([stats[STAT_EXITS], stats[STAT_WRITE_OFF]]).toEqual([1, 12]);
      // The row re-enters as an entrant at the firms' means, with no stock and the demand floor for last month's demand.
      expect(rowOf(world, 0)).toMatchObject({ price: 2_000, wage: WAGE, stock: 0, demand: 0, lastDemand: 63, idleMonths: 0 });
      expect(rowOf(world, 1)).toMatchObject({ price: 2_000, stock: 7, lastDemand: 10 });

      layOffExiting(world);
      expect(Array.from(world.agents.employer.subarray(0, 5))).toEqual([NO_FIRM, NO_FIRM, NO_FIRM, 1, 1]);
      expect(Array.from(world.firms.employees.subarray(0, 3))).toEqual([0, 2, 0]);
      expect(stats[STAT_FIRINGS]).toBe(3);
      expect(Array.from(world.cash.balance)).toEqual(before);
      expect(checkCash(world.cash)).toBe(OK);
    });

    it('keeps every firm when the share is 0, whatever it paid', () => {
      const world = shortPayWorld([0, 0, 0]);
      closeFirmMonth(world, LENGNICK);
      layOffExiting(world);
      const stats = world.economyScratch.stats;
      expect(Array.from(world.economyScratch.exiting.subarray(0, 3))).toEqual([0, 0, 0]);
      expect([stats[STAT_EXITS], stats[STAT_WRITE_OFF], stats[STAT_FIRINGS]]).toEqual([0, 0, 0]);
      expect(Array.from(world.agents.employer.subarray(0, 5))).toEqual([0, 0, 0, 1, 1]);
      expect(Array.from(world.firms.employees.subarray(0, 3))).toEqual([3, 2, 0]);
      expect(rowOf(world, 0).stock).toBe(12);
    });

    it('exits only on pay strictly under the share, and never a firm with no workers', () => {
      const half = { ...LENGNICK, shortPayExitPpm: 500_000 };
      const exits = (pay: readonly number[]): number[] => {
        const world = shortPayWorld(pay);
        closeFirmMonth(world, half);
        return Array.from(world.economyScratch.exiting.subarray(0, 3));
      };
      expect(exits([WAGE / 2, WAGE / 2, 0])).toEqual([0, 0, 0]);
      expect(exits([WAGE / 2 - 1, WAGE / 2, 0])).toEqual([1, 0, 0]);
      expect(exits([WAGE / 2 - 1, WAGE / 2 - 1, 0])).toEqual([1, 1, 0]);
    });

    it("clears every firm's mark at each month end, so a stale one never lays anyone off", () => {
      const world = shortPayWorld([WAGE, WAGE, WAGE]);
      world.economyScratch.exiting.fill(1);
      closeFirmMonth(world, EXIT_AT_ALL);
      expect(Array.from(world.economyScratch.exiting.subarray(0, 3))).toEqual([0, 0, 0]);
      layOffExiting(world);
      expect(Array.from(world.agents.employer.subarray(0, 5))).toEqual([0, 0, 0, 1, 1]);
    });

    it('takes the exit and the idle exit together, each writing its stock off once', () => {
      const world = shortPayWorld([WAGE - 1, WAGE, 0]);
      world.firms.idleMonths[2] = 2;
      closeFirmMonth(world, EXIT_AT_ALL);
      const stats = world.economyScratch.stats;
      expect([stats[STAT_EXITS], stats[STAT_WRITE_OFF]]).toEqual([2, 12 + 5]);
    });
  });

  it('moves no money when firms exit, and does nothing with no firms', () => {
    const world = worldWith(ROWS);
    const before = Array.from(world.cash.balance);
    // Nothing sells, so the first and last firms are idle for three months and both exit.
    for (let month = 0; month < 3; month++) closeFirmMonth(world, LENGNICK);
    expect(world.economyScratch.stats[STAT_EXITS]).toBe(2);
    expect(world.economyScratch.stats[STAT_WRITE_OFF]).toBe(9 + 3);
    expect(Array.from(world.cash.balance)).toEqual(before);
    const empty = createWorld(42, 'phone', undefined, 40);
    expect(() => closeFirmMonth(empty, LENGNICK)).not.toThrow();
    expect(empty.economyScratch.stats[STAT_EXITS]).toBe(0);
  });
});
