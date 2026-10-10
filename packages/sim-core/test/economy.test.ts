import { describe, expect, it } from 'vitest';
import { SUPPLIERS } from '../src/agents/store.ts';
import { economyDay, endMonth } from '../src/economy/economy.ts';
import { LENGNICK, type EconomyParams } from '../src/economy/params.ts';
import { startEconomy } from '../src/economy/start.ts';
import {
  STAT_EXITS,
  STAT_FIRINGS,
  STAT_FIRM_CASH,
  STAT_HIRES,
  STAT_HOUSEHOLD_CASH,
  STAT_ISSUED,
  STAT_PRICE_CHANGES,
  STAT_PRICE_MEAN,
  STAT_PRICE_CHANGE_PPM,
  STAT_PROFITS_PAID,
  STAT_SALES_CENTS,
  STAT_SALES_UNITS,
  STAT_SIZE_CUBES,
  STAT_SIZE_SQUARES,
  STAT_STOCK,
  STAT_SWITCHES,
  STAT_UNEMPLOYED,
  STAT_VACANCIES,
  STAT_WAGE_BILL,
  STAT_WAGE_MEAN,
} from '../src/economy/stats.ts';
import { OK, checkCash } from '../src/money/invariants.ts';
import { MINT, PROFITS, firmAccount, issue, walletAccount } from '../src/money/ledger.ts';
import { mulPpm, mulPpmUp } from '../src/money/ppm.ts';
import { DAYS_PER_MONTH, dayOfMonth } from '../src/time/calendar.ts';
import { stateHash } from '../src/world/checkpoint.ts';
import { createWorld, type World } from '../src/world/world.ts';

const SEEDS = [1, 2, 3, 4, 5];
const LONG_SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);
const LAST_DAY = DAYS_PER_MONTH - 1;
const { households: HOUSEHOLDS, firms: FIRMS } = LENGNICK;
const LONG = process.env.ECONOMY_LONG === '1';

interface Books {
  readonly mint: number;
  households: number;
  firms: number;
}

function startedWorld(seed: number, params: EconomyParams = LENGNICK): World {
  const world = createWorld(seed, 'phone', undefined, params.households);
  startEconomy(world, params);
  return world;
}

function runDays(world: World, params: EconomyParams, from: number, to: number): void {
  for (let day = from; day < to; day++) economyDay(world, params, day);
}

function householdCash(world: World): number {
  let total = 0;
  for (let h = 0; h < world.agents.count[0]; h++) total += world.cash.balance[walletAccount(world.cash, h)];
  return total;
}

function firmCash(world: World): number {
  let total = 0;
  for (let f = 0; f < world.firms.count[0]; f++) total += world.cash.balance[firmAccount(world.cash, f)];
  return total;
}

function employedHouseholds(world: World): number {
  let employed = 0;
  for (let h = 0; h < world.agents.count[0]; h++) if (world.agents.employer[h] >= 0) employed++;
  return employed;
}

function workers(world: World): number {
  let total = 0;
  for (let f = 0; f < world.firms.count[0]; f++) total += world.firms.employees[f];
  return total;
}

function linksOf(world: World, household: number): number[] {
  return Array.from(world.agents.suppliers.subarray(household * SUPPLIERS, (household + 1) * SUPPLIERS));
}

// Every Float64Array column and balance in the books, named, that holds a NaN or an infinity.
function nonFinite(world: World): string[] {
  const parts = { agents: world.agents, firms: world.firms, cash: world.cash, claims: world.claims };
  const bad: string[] = [];
  for (const [part, store] of Object.entries(parts)) {
    for (const [name, column] of Object.entries(store)) {
      if (column instanceof Float64Array && !column.every(Number.isFinite)) bad.push(`${part}.${name}`);
    }
  }
  return bad;
}

function openBooks(world: World): Books {
  return { mint: world.cash.balance[MINT], households: householdCash(world), firms: firmCash(world) };
}

// In closed money MINT never moves after the start, so what households gain over a month, firms lose (Ruling 10).
function expectCleanMonthEnd(world: World, books: Books, where: string): void {
  expect(nonFinite(world), where).toEqual([]);
  expect(world.cash.balance[MINT], where).toBe(books.mint);
  expect(world.cash.balance[PROFITS], where).toBe(0);
  const households = householdCash(world);
  const firms = firmCash(world);
  expect(households - books.households + (firms - books.firms), where).toBe(0);
  expect(workers(world), where).toBe(employedHouseholds(world));
  books.households = households;
  books.firms = firms;
}

function monthIncome(world: World): number {
  const stats = world.economyScratch.stats;
  return stats[STAT_WAGE_BILL] + stats[STAT_PROFITS_PAID] + stats[STAT_ISSUED];
}

// economyDay checks the invariants every day while world.checks is on, and throws on the first that fails. Returns
// household saving over household income from the first month end after the burn-in, or NaN for a run inside it.
function runCleanly(seed: number, days: number): number {
  const world = startedWorld(seed);
  expect(world.checks).toBe(true);
  const books = openBooks(world);
  let savedFrom = Number.NaN;
  let income = 0;
  for (let day = 0; day < days; day++) {
    economyDay(world, LENGNICK, day);
    if (dayOfMonth(day) !== LAST_DAY) continue;
    expectCleanMonthEnd(world, books, `seed ${seed}, day ${day}`);
    if (day < LENGNICK.burnInDays) continue;
    if (Number.isNaN(savedFrom)) savedFrom = books.households;
    else income += monthIncome(world);
  }
  return (books.households - savedFrom) / income;
}

describe('startEconomy', () => {
  it('starts every firm inside the price band', () => {
    const { firms } = startedWorld(1);
    const unitsPerMonth = DAYS_PER_MONTH * LENGNICK.unitsPerWorkerDay;
    expect(firms.count[0]).toBe(FIRMS);
    for (let f = 0; f < FIRMS; f++) {
      const wage = firms.wage[f];
      const monthPrice = unitsPerMonth * firms.price[f];
      expect(monthPrice, `firm ${f}`).toBeGreaterThanOrEqual(wage + mulPpmUp(wage, LENGNICK.markupLowPpm));
      expect(monthPrice, `firm ${f}`).toBeLessThanOrEqual(wage + mulPpm(wage, LENGNICK.markupHighPpm));
    }
  });

  it('employs every household, ten to a firm in a keyed order, at a reservation wage of the wage', () => {
    const world = startedWorld(1);
    const { agents, firms } = world;
    expect(Array.from(firms.employees.subarray(0, FIRMS))).toEqual(new Array(FIRMS).fill(10));
    expect(employedHouseholds(world)).toBe(HOUSEHOLDS);
    expect(agents.reservationWage.subarray(0, HOUSEHOLDS).every((wage) => wage === 142_800)).toBe(true);
    const inIndexOrder = Array.from({ length: HOUSEHOLDS }, (_, h) => h % FIRMS);
    const employers = Array.from(agents.employer.subarray(0, HOUSEHOLDS));
    expect(employers).not.toEqual(inIndexOrder);
    expect(Array.from(startedWorld(2).agents.employer.subarray(0, HOUSEHOLDS))).not.toEqual(employers);
  });

  it('links each household to seven distinct firms, spread evenly', () => {
    const world = startedWorld(1);
    const holders = new Array<number>(FIRMS).fill(0);
    for (let h = 0; h < HOUSEHOLDS; h++) {
      const links = linksOf(world, h);
      expect(new Set(links).size, `household ${h}`).toBe(SUPPLIERS);
      for (const firm of links) {
        expect(firm >= 0 && firm < FIRMS, `household ${h} links ${firm}`).toBe(true);
        holders[firm]++;
      }
    }
    // 7,000 links over 100 firms average 70, with a binomial spread of about 8; five spreads either side.
    expect(Math.min(...holders)).toBeGreaterThanOrEqual(30);
    expect(Math.max(...holders)).toBeLessThanOrEqual(110);
  });

  it('stocks a day of output, expects a month of demand, and leaves all the money with households', () => {
    const world = startedWorld(1);
    const { firms, cash } = world;
    for (let f = 0; f < FIRMS; f++) {
      const row = [firms.stock[f], firms.lastDemand[f], firms.demand[f], cash.balance[firmAccount(cash, f)]];
      expect(row, `firm ${f}`).toEqual([30, 630, 0, 0]);
    }
    expect(firms.price[FIRMS]).toBe(0);
    for (let h = 0; h < HOUSEHOLDS; h++) expect(cash.balance[walletAccount(cash, h)], `household ${h}`).toBe(310_000);
    expect(cash.balance[MINT]).toBe(-310_000_000);
    expect(checkCash(cash)).toBe(OK);
  });

  it('refuses a world that does not hold exactly the preset households, and bad parameters', () => {
    const short = createWorld(1, 'phone', undefined, HOUSEHOLDS - 1);
    expect(() => startEconomy(short, LENGNICK)).toThrow(RangeError);
    expect(() => startEconomy(short, LENGNICK)).toThrow('1000 households');
    expect(() => startEconomy(createWorld(1, 'phone', undefined, HOUSEHOLDS), { ...LENGNICK, firms: 6 })).toThrow(
      RangeError,
    );
  });

  it('replays from the seed alone', () => {
    expect(stateHash(startedWorld(7))).toBe(stateHash(startedWorld(7)));
    expect(stateHash(startedWorld(7))).not.toBe(stateHash(startedWorld(8)));
  });
});

describe('economyDay', () => {
  it("keeps the day's sales to the day", () => {
    const world = startedWorld(3);
    runDays(world, LENGNICK, 0, 5);
    const { firms, economyScratch } = world;
    const stocks = Array.from(firms.stock.subarray(0, FIRMS));
    const households = householdCash(world);
    const firmsCash = firmCash(world);
    economyDay(world, LENGNICK, 5);
    let sold = 0;
    for (let f = 0; f < FIRMS; f++) sold += stocks[f] + LENGNICK.unitsPerWorkerDay * firms.employees[f] - firms.stock[f];
    expect(sold).toBeGreaterThan(0);
    expect(economyScratch.stats[STAT_SALES_UNITS]).toBe(sold);
    expect(economyScratch.stats[STAT_SALES_CENTS]).toBe(households - householdCash(world));
    expect(economyScratch.stats[STAT_SALES_CENTS]).toBe(firmCash(world) - firmsCash);
  });

  it('clears every flow each morning, and leaves the levels', () => {
    const world = startedWorld(3);
    const stats = world.economyScratch.stats;
    runDays(world, LENGNICK, 0, DAYS_PER_MONTH);
    expect(stats[STAT_WAGE_BILL]).toBeGreaterThan(0);
    expect(stats[STAT_PROFITS_PAID]).toBeGreaterThan(0);
    economyDay(world, LENGNICK, DAYS_PER_MONTH);
    const monthEnd = [STAT_WAGE_BILL, STAT_PROFITS_PAID, STAT_FIRINGS, STAT_EXITS, STAT_ISSUED];
    expect(monthEnd.map((slot) => stats[slot])).toEqual([0, 0, 0, 0, 0]);
    // A month's first day searches and reprices, and the next morning those sums are gone.
    const searches = [STAT_HIRES, STAT_SWITCHES, STAT_PRICE_CHANGES, STAT_PRICE_CHANGE_PPM];
    expect(stats[STAT_PRICE_CHANGES]).toBeGreaterThan(0);
    expect(stats[STAT_PRICE_CHANGE_PPM]).toBeGreaterThan(0);
    economyDay(world, LENGNICK, DAYS_PER_MONTH + 1);
    expect(searches.map((slot) => stats[slot])).toEqual([0, 0, 0, 0]);
    // Sales are the day's own, and the levels still read the state.
    expect(stats[STAT_SALES_UNITS]).toBeGreaterThan(0);
    expect(stats[STAT_HOUSEHOLD_CASH]).toBe(householdCash(world));
    expect(stats[STAT_FIRM_CASH]).toBe(firmCash(world));
  });

  it("records the day's end from the state", () => {
    const world = startedWorld(4);
    runDays(world, LENGNICK, 0, 50);
    const { agents, firms, economyScratch } = world;
    let vacancies = 0;
    let prices = 0;
    let wages = 0;
    let stock = 0;
    let squares = 0;
    let cubes = 0;
    for (let f = 0; f < FIRMS; f++) {
      vacancies += firms.vacancy[f];
      prices += firms.price[f];
      wages += firms.wage[f];
      stock += firms.stock[f];
      squares += firms.employees[f] * firms.employees[f];
      cubes += firms.employees[f] * firms.employees[f] * firms.employees[f];
    }
    const stats = economyScratch.stats;
    expect(stats[STAT_UNEMPLOYED]).toBe(HOUSEHOLDS - employedHouseholds(world));
    expect(stats[STAT_VACANCIES]).toBe(vacancies);
    expect(stats[STAT_PRICE_MEAN]).toBe(prices / FIRMS);
    expect(stats[STAT_WAGE_MEAN]).toBe(wages / FIRMS);
    expect(stats[STAT_HOUSEHOLD_CASH]).toBe(householdCash(world));
    expect(stats[STAT_FIRM_CASH]).toBe(firmCash(world));
    expect(stats[STAT_STOCK]).toBe(stock);
    expect(stats[STAT_SIZE_SQUARES]).toBe(squares);
    expect(stats[STAT_SIZE_CUBES]).toBe(cubes);
    expect(stats[STAT_SIZE_SQUARES]).toBeGreaterThan(0);
    expect(agents.count[0]).toBe(HOUSEHOLDS);
  });

  it('fails a day whose books do not balance, unless checks are off', () => {
    const world = startedWorld(5);
    world.cash.balance[walletAccount(world.cash, 0)] += 1;
    expect(() => economyDay(world, LENGNICK, 0)).toThrow('a money invariant failed');
    const unchecked = startedWorld(5);
    unchecked.checks = false;
    unchecked.cash.balance[walletAccount(unchecked.cash, 0)] += 1;
    expect(() => economyDay(unchecked, LENGNICK, 0)).not.toThrow();
  });

  it('runs 5 seeds × 2,000 days cleanly', { timeout: 120_000 }, () => {
    for (const seed of SEEDS) runCleanly(seed, 2_000);
  });

  it('replays', () => {
    const run = (seed: number): number => {
      const world = startedWorld(seed);
      runDays(world, LENGNICK, 0, 20 * DAYS_PER_MONTH);
      return stateHash(world);
    };
    expect(run(42)).toBe(run(42));
    expect(run(42)).not.toBe(run(43));
  });

  it('issues fiat money exactly', () => {
    const fiat = { ...LENGNICK, fiatIssuePpm: 5_000 };
    const world = startedWorld(6, fiat);
    const opening = world.cash.balance[MINT];
    let issued = 0;
    for (let day = 0; day < 20 * DAYS_PER_MONTH; day++) {
      economyDay(world, fiat, day);
      if (dayOfMonth(day) === LAST_DAY) issued += world.economyScratch.stats[STAT_ISSUED];
    }
    // The stock only grows, so every month issues at least the first month's 0.5% of 310,000,000 cents.
    expect(issued).toBeGreaterThanOrEqual(20 * mulPpm(310_000_000, 5_000));
    expect(opening - world.cash.balance[MINT]).toBe(issued);
    expect(checkCash(world.cash)).toBe(OK);
  });
});

describe("the month's order", () => {
  it("steps wages on last month's vacancies before firms reset them", () => {
    const world = startedWorld(1);
    const { firms } = world;
    runDays(world, LENGNICK, 0, DAYS_PER_MONTH);
    // An unfilled vacancy, and stock far above the band, where decideFirms clears the vacancy and gives notice.
    firms.vacancy[0] = 1;
    firms.stock[0] = 100 * firms.lastDemand[0];
    const wage = firms.wage[0];
    economyDay(world, LENGNICK, DAYS_PER_MONTH);
    expect(firms.wage[0]).toBeGreaterThan(wage);
    expect([firms.vacancy[0], firms.notice[0]]).toEqual([0, 1]);
  });

  it('pays the month before it resets reservation wages or lays anyone off', () => {
    const world = startedWorld(1);
    const { agents, firms, cash } = world;
    runDays(world, LENGNICK, 0, LAST_DAY);
    firms.notice[0] = 1;
    firms.wage[0] = 150_000;
    issue(cash, firmAccount(cash, 0), 2_000_000);
    const staff = Array.from({ length: HOUSEHOLDS }, (_, h) => h).filter((h) => agents.employer[h] === 0);
    const before = staff.map((h) => cash.balance[walletAccount(cash, h)]);
    // Profits only add to the pay, so each of the staff gains at least the wage.
    endMonth(world, LENGNICK, 0);
    expect(staff).toHaveLength(10);
    expect(staff.filter((h) => agents.employer[h] === -1)).toHaveLength(1);
    staff.forEach((h, i) => {
      expect(cash.balance[walletAccount(cash, h)] - before[i], `household ${h}`).toBeGreaterThanOrEqual(150_000);
      expect(agents.reservationWage[h], `household ${h}`).toBe(150_000);
    });
  });
});

describe.runIf(LONG)('the long economy run (ECONOMY_LONG=1)', () => {
  // Ruling 10: in closed money, household saving after the burn-in averages zero within 0.1% of household income.
  it('runs 50 seeds × 20,000 days cleanly, and households save nothing after the burn-in', { timeout: 7_200_000 }, () => {
    for (const seed of LONG_SEEDS) {
      const savingRate = runCleanly(seed, 20_000);
      expect(Math.abs(savingRate), `seed ${seed}`).toBeLessThanOrEqual(0.001);
    }
  });
});
