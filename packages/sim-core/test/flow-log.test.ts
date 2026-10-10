import { describe, expect, it } from 'vitest';
import { CITY } from '../src/economy/city.ts';
import { economyDay } from '../src/economy/economy.ts';
import { LENGNICK, type EconomyParams } from '../src/economy/params.ts';
import { startEconomy } from '../src/economy/start.ts';
import {
  STAT_LONG_SPELLS,
  STAT_NAMES,
  STAT_SPELL_MONTHS,
  STAT_STAYERS,
  STAT_STAYER_CUTS,
  clearFlows,
  recordMonth,
  recordYear,
} from '../src/economy/stats.ts';
import { DAYS_PER_MONTH, DAYS_PER_YEAR, dayOfMonth, dayOfYear } from '../src/time/calendar.ts';
import { createWorld, type World } from '../src/world/world.ts';

type Row = Record<string, number>;

const SEEDS = [1, 2, 3];
const DAYS = 2_500;
const SHOCKS: Readonly<Record<number, number>> = { 1_000: 50, 1_050: 30 };
const LAST_DAY_OF_MONTH = DAYS_PER_MONTH - 1;
const LAST_DAY_OF_YEAR = DAYS_PER_YEAR - 1;
const NO_FIRM = -1;

function startedWorld(seed: number, params: EconomyParams): World {
  const world = createWorld(seed, 'phone', undefined, params.households);
  startEconomy(world, params);
  return world;
}

// The day's stats row, each column by its name in the flow log.
function rowOf(world: World): Row {
  const row: Row = {};
  STAT_NAMES.forEach((name, slot) => {
    row[name] = world.economyScratch.stats[slot];
  });
  return row;
}

// What one day moves, against the levels the day before left (the flow log's reason for being).
function expectBalanced(was: Row, now: Row, label: string): void {
  expect(was.unemployed - now.unemployed, `${label}: jobs`).toBe(now.hires - now.firings);
  expect(now.household_cash - was.household_cash, `${label}: household cash`).toBe(
    now.wage_bill + now.profits_paid + now.issued - now.sales_cents,
  );
  expect(now.firm_cash - was.firm_cash, `${label}: firm cash`).toBe(now.sales_cents - now.wage_bill - now.profits_paid);
  expect(now.stock - was.stock, `${label}: stock`).toBe(now.produced - now.sales_units - now.write_off);
  expect(now.taxes, `${label}: taxes`).toBe(0);
}

// Every firm's headcount against the people who name it as their employer.
function expectHeadcounts(world: World, label: string): void {
  const counts = new Array<number>(world.firms.count[0]).fill(0);
  for (let h = 0; h < world.agents.count[0]; h++) {
    const employer = world.agents.employer[h];
    if (employer >= 0) counts[employer]++;
  }
  expect(Array.from(world.firms.employees.subarray(0, counts.length)), `${label}: headcounts`).toEqual(counts);
}

// Runs the days, with the layoffs a scenario asks for on its days, and checks every day from day 1 against the day before.
// Returns the rows, so a test can tell its identities were not met by zeros.
function runBalanced(params: EconomyParams, seed: number, days: number, shocks: Readonly<Record<number, number>> = {}): Row[] {
  const world = startedWorld(seed, params);
  const rows: Row[] = [];
  for (let day = 0; day < days; day++) {
    economyDay(world, params, day, shocks[day] ?? 0);
    rows.push(rowOf(world));
    expectHeadcounts(world, `seed ${seed}, day ${day}`);
    if (day > 0) expectBalanced(rows[day - 1], rows[day], `seed ${seed}, day ${day}`);
  }
  return rows;
}

function totalOf(rows: readonly Row[], name: string): number {
  return rows.reduce((sum, row) => sum + row[name], 0);
}

describe('the flow log', () => {
  it('balances jobs, money and goods every day', { timeout: 120_000 }, () => {
    for (const seed of SEEDS) {
      const rows = runBalanced(LENGNICK, seed, DAYS);
      for (const name of ['hires', 'firings', 'wage_bill', 'profits_paid', 'sales_cents', 'sales_units', 'produced']) {
        expect(totalOf(rows, name), `seed ${seed}: ${name}`).toBeGreaterThan(0);
      }
    }
  });

  it('balances the money an issue adds to households', { timeout: 60_000 }, () => {
    const rows = runBalanced({ ...LENGNICK, fiatIssuePpm: 10_000 }, 4, 1_000);
    expect(totalOf(rows, 'issued')).toBeGreaterThan(0);
  });

  it('balances the city through two layoff shocks, short-pay exits and slow searchers', { timeout: 120_000 }, () => {
    // Day 1,000 is a day 13 of its month and day 1,050 a day 0, so the shock comes alone and then before a search.
    for (const seed of SEEDS) {
      const rows = runBalanced(CITY, seed, DAYS, SHOCKS);
      expect([rows[1_000].firings, rows[1_050].firings], `seed ${seed}`).toEqual([50, 30]);
      for (const name of ['hires', 'job_visits', 'exits', 'write_off', 'spell_months']) {
        expect(totalOf(rows, name), `seed ${seed}: ${name}`).toBeGreaterThan(0);
      }
    }
  });

  it('sets the spell and year columns on the days that close a month and a year, and on no others', () => {
    const world = startedWorld(5, LENGNICK);
    const stats = world.economyScratch.stats;
    for (let day = 0; day < 2 * DAYS_PER_YEAR; day++) {
      economyDay(world, LENGNICK, day);
      if (dayOfMonth(day) !== LAST_DAY_OF_MONTH) {
        expect([stats[STAT_SPELL_MONTHS], stats[STAT_LONG_SPELLS]], `day ${day}`).toEqual([0, 0]);
      }
      if (dayOfYear(day) !== LAST_DAY_OF_YEAR) {
        expect([stats[STAT_STAYERS], stats[STAT_STAYER_CUTS]], `day ${day}`).toEqual([0, 0]);
      }
    }
  });

  it("counts a year's stayers and their pay cuts from the employers and wages the last year end left", () => {
    const world = startedWorld(6, LENGNICK);
    const { agents, firms, economyScratch } = world;
    const stats = economyScratch.stats;
    let employers = new Int32Array(agents.count[0]).fill(NO_FIRM);
    let wages = new Float64Array(firms.count[0]);
    for (let day = 0; day < 2 * DAYS_PER_YEAR; day++) {
      economyDay(world, LENGNICK, day);
      if (dayOfYear(day) !== LAST_DAY_OF_YEAR) continue;
      let stayers = 0;
      let cuts = 0;
      for (let h = 0; h < agents.count[0]; h++) {
        const employer = agents.employer[h];
        if (employer < 0 || employer !== employers[h]) continue;
        stayers++;
        if (firms.wage[employer] < wages[employer]) cuts++;
      }
      expect([stats[STAT_STAYERS], stats[STAT_STAYER_CUTS]], `day ${day}`).toEqual([stayers, cuts]);
      employers = agents.employer.slice(0, agents.count[0]);
      wages = firms.wage.slice(0, firms.count[0]);
    }
    // The first year end knows no earlier one and counts nobody, and the second counts most of the city.
    expect(stats[STAT_STAYERS]).toBeGreaterThan(LENGNICK.households / 2);
  });
});

function smallWorld(people: number): World {
  const world = createWorld(42, 'phone', undefined, people);
  world.firms.count[0] = 2;
  return world;
}

describe('recordMonth', () => {
  it('sums the whole months out so far, counts those out six or more, and zeroes the employed', () => {
    const world = smallWorld(6);
    const { agents, economyScratch } = world;
    const stats = economyScratch.stats;
    agents.employer.fill(NO_FIRM);
    agents.employer[5] = 1;
    // Months ended out of work so far for five people, the last at the byte's end, and a worker with a spell behind them.
    economyScratch.spellMonths.set([0, 6, 7, 254, 255, 9]);
    recordMonth(world);
    expect(Array.from(economyScratch.spellMonths.subarray(0, 6))).toEqual([1, 7, 8, 255, 255, 0]);
    expect(stats[STAT_SPELL_MONTHS]).toBe(0 + 6 + 7 + 254 + 254);
    expect(stats[STAT_LONG_SPELLS]).toBe(4);
  });

  it('walks one spell through its months, then ends it with a job', () => {
    const world = smallWorld(3);
    const { agents, economyScratch } = world;
    const stats = economyScratch.stats;
    agents.employer.fill(1);
    agents.employer[0] = NO_FIRM;
    for (let monthEnd = 1; monthEnd <= 8; monthEnd++) {
      clearFlows(stats);
      recordMonth(world);
      const out = monthEnd - 1;
      expect([stats[STAT_SPELL_MONTHS], stats[STAT_LONG_SPELLS]], `month end ${monthEnd}`).toEqual([out, out >= 6 ? 1 : 0]);
    }
    agents.employer[0] = 0;
    clearFlows(stats);
    recordMonth(world);
    expect([stats[STAT_SPELL_MONTHS], stats[STAT_LONG_SPELLS], economyScratch.spellMonths[0]]).toEqual([0, 0, 0]);
  });
});

describe('recordYear', () => {
  it('counts nobody at the first year end, then those who kept an employer, and those whose wage fell', () => {
    const world = smallWorld(5);
    const { agents, firms, economyScratch } = world;
    const stats = economyScratch.stats;
    agents.employer.set([0, 0, 1, NO_FIRM, 1]);
    firms.wage.set([100, 200]);

    recordYear(world);
    expect([stats[STAT_STAYERS], stats[STAT_STAYER_CUTS]]).toEqual([0, 0]);
    expect(Array.from(economyScratch.yearEmployer.subarray(0, 5))).toEqual([0, 0, 1, NO_FIRM, 1]);
    expect(Array.from(economyScratch.yearWage.subarray(0, 2))).toEqual([100, 200]);

    // Person 1 changes firm, person 3 is hired, and firm 0 cuts its wage while firm 1 raises it.
    agents.employer.set([0, 1, 1, 1, 1]);
    firms.wage.set([90, 250]);
    clearFlows(stats);
    recordYear(world);
    expect([stats[STAT_STAYERS], stats[STAT_STAYER_CUTS]]).toEqual([3, 1]);
    expect(Array.from(economyScratch.yearEmployer.subarray(0, 5))).toEqual([0, 1, 1, 1, 1]);
    expect(Array.from(economyScratch.yearWage.subarray(0, 2))).toEqual([90, 250]);

    // Nothing changes, and a wage that holds is not a cut.
    clearFlows(stats);
    recordYear(world);
    expect([stats[STAT_STAYERS], stats[STAT_STAYER_CUTS]]).toEqual([5, 0]);
  });

  it('drops a worker who lost the job from the count, though the same firm hires them again later', () => {
    const world = smallWorld(5);
    const { agents, firms, economyScratch } = world;
    const stats = economyScratch.stats;
    agents.employer.fill(0);
    firms.wage.set([100, 100]);
    recordYear(world);
    agents.employer[0] = NO_FIRM;
    firms.wage[0] = 50;
    clearFlows(stats);
    recordYear(world);
    expect([stats[STAT_STAYERS], stats[STAT_STAYER_CUTS]]).toEqual([4, 4]);
    agents.employer[0] = 0;
    clearFlows(stats);
    recordYear(world);
    expect([stats[STAT_STAYERS], stats[STAT_STAYER_CUTS]]).toEqual([4, 0]);
  });
});
