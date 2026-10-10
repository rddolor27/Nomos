import { describe, expect, it } from 'vitest';
import { LENGNICK } from '../src/economy/params.ts';
import { STAT_WAGE_BILL } from '../src/economy/stats.ts';
import { OK, checkCash } from '../src/money/invariants.ts';
import { MINT, firmAccount, issue, walletAccount } from '../src/money/ledger.ts';
import { mulPpm } from '../src/money/ppm.ts';
import { draw3 } from '../src/random/draw.ts';
import { WAGE_DRAW } from '../src/random/streams.ts';
import { payWages } from '../src/wages/payroll.ts';
import { stepWages } from '../src/wages/wage-step.ts';
import { createWorld, OPENING_CENTS, type World } from '../src/world/world.ts';

const FIRMS = 400;
const WAGE_CENTS = 142_800;
// floor(142,800 x 19,000 ppm / 1,000,000), the most one step can move this wage.
const MOST_STEP_CENTS = 2_713;
const NO_FIRM = -1;

function stepWorld(): World {
  const world = createWorld(42, 'phone', undefined, 1);
  world.firms.count[0] = FIRMS;
  world.firms.wage.fill(WAGE_CENTS, 0, FIRMS);
  return world;
}

function wagesOf(world: World): number[] {
  return Array.from(world.firms.wage.subarray(0, FIRMS));
}

function countersOf(world: World): number[] {
  return Array.from(world.firms.monthsFull.subarray(0, FIRMS));
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

describe('stepWages', () => {
  it('raises the wage of a firm whose vacancy went unfilled by up to 1.9%', () => {
    const world = stepWorld();
    world.firms.vacancy.fill(1, 0, FIRMS);
    world.firms.monthsFull.fill(9, 0, FIRMS);

    stepWages(world, LENGNICK, 0);

    const raises = wagesOf(world).map((wage) => wage - WAGE_CENTS);
    expect(Math.min(...raises)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...raises)).toBeLessThanOrEqual(MOST_STEP_CENTS);
    expect(Math.max(...raises)).toBeGreaterThan(MOST_STEP_CENTS * 0.95);
    // Uniform over 0 to 2,713: mean 1,356 and SD 783, so the mean of 400 firms sits within five SDs (196) of 1,356.
    expect(Math.abs(mean(raises) - 1_356)).toBeLessThan(196);
    expect(new Set(raises).size).toBeGreaterThan(300);
    expect(countersOf(world).every((months) => months === 0)).toBe(true);
    // decideFirms reads and clears the vacancy next, so the wage step leaves it be.
    expect(world.firms.vacancy.subarray(0, FIRMS).every((open) => open === 1)).toBe(true);
  });

  it("counts a month with no vacancy and leaves that firm's wage alone", () => {
    const world = stepWorld();
    for (let f = 0; f < FIRMS; f += 2) world.firms.vacancy[f] = 1;
    world.firms.monthsFull.fill(9, 0, FIRMS);

    stepWages(world, LENGNICK, 0);

    for (let f = 0; f < FIRMS; f++) {
      const open = f % 2 === 0;
      expect(world.firms.wage[f], `firm ${f}`).toBeGreaterThanOrEqual(WAGE_CENTS);
      expect(world.firms.monthsFull[f], `firm ${f}`).toBe(open ? 0 : 10);
      if (!open) expect(world.firms.wage[f], `firm ${f}`).toBe(WAGE_CENTS);
    }
  });

  it('cuts a wage after 24 months without a vacancy, once, and counts again from 0', () => {
    const world = stepWorld();
    for (let month = 0; month < 23; month++) stepWages(world, LENGNICK, month);
    expect(new Set(wagesOf(world))).toEqual(new Set([WAGE_CENTS]));
    expect(new Set(countersOf(world))).toEqual(new Set([23]));

    stepWages(world, LENGNICK, 23);
    const firstCut = wagesOf(world).map((wage) => WAGE_CENTS - wage);
    expect(Math.min(...firstCut)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...firstCut)).toBeLessThanOrEqual(MOST_STEP_CENTS);
    // A step of 7 ppm or less is under a cent on this wage and moves nothing, 8 draws in 19,001.
    expect(firstCut.filter((cut) => cut > 0).length).toBeGreaterThan(FIRMS - 10);
    expect(new Set(countersOf(world))).toEqual(new Set([0]));

    const afterFirstCut = wagesOf(world);
    for (let month = 24; month < 47; month++) stepWages(world, LENGNICK, month);
    expect(wagesOf(world)).toEqual(afterFirstCut);
    stepWages(world, LENGNICK, 47);
    expect(wagesOf(world).filter((wage, f) => wage < afterFirstCut[f]).length).toBeGreaterThan(FIRMS - 10);
  });

  it('cuts at the parameter, not at 24', () => {
    const world = stepWorld();
    const params = { ...LENGNICK, wageCutMonths: 3 };
    for (let month = 0; month < 2; month++) stepWages(world, params, month);
    expect(new Set(wagesOf(world))).toEqual(new Set([WAGE_CENTS]));
    stepWages(world, params, 2);
    expect(wagesOf(world).filter((wage) => wage < WAGE_CENTS).length).toBeGreaterThan(FIRMS - 10);
  });

  it('holds every wage at one cent or more through a cut', () => {
    const world = stepWorld();
    world.firms.wage.fill(0, 0, FIRMS / 2);
    world.firms.wage.fill(1, FIRMS / 2, FIRMS);

    stepWages(world, { ...LENGNICK, wageCutMonths: 1, wageStepPpm: 1_000_000 }, 0);

    expect(new Set(wagesOf(world))).toEqual(new Set([1]));
  });

  it("draws each firm's step from its own month and firm keys", () => {
    const world = stepWorld();
    world.firms.vacancy.fill(1, 0, FIRMS);
    stepWages(world, LENGNICK, 5);
    // The key layout is what a replay depends on, so the test states it: (month, firm, purpose 0) on WAGE_DRAW.
    const expected = Array.from({ length: FIRMS }, (_, f) => {
      return WAGE_CENTS + mulPpm(WAGE_CENTS, draw3(42, WAGE_DRAW, 5, f, 0) % 19_001);
    });
    expect(wagesOf(world)).toEqual(expected);

    const nextMonth = stepWorld();
    nextMonth.firms.vacancy.fill(1, 0, FIRMS);
    stepWages(nextMonth, LENGNICK, 6);
    expect(wagesOf(nextMonth)).not.toEqual(expected);
  });
});

interface Shop {
  wage: number;
  cash: number;
  workers: number[];
}

// Wallets start at OPENING_CENTS each. Firm cash is issued from MINT, so the ledger sums to zero before the first pay.
function payrollWorld(households: number, shops: Shop[]): World {
  const world = createWorld(42, 'phone', undefined, households);
  world.firms.count[0] = shops.length;
  shops.forEach((shop, f) => {
    world.firms.wage[f] = shop.wage;
    issue(world.cash, firmAccount(world.cash, f), shop.cash);
    for (const household of shop.workers) {
      world.agents.employer[household] = f;
      world.firms.employees[f]++;
    }
  });
  return world;
}

function walletOf(world: World, household: number): number {
  return world.cash.balance[walletAccount(world.cash, household)];
}

function firmCashOf(world: World, firm: number): number {
  return world.cash.balance[firmAccount(world.cash, firm)];
}

describe('payWages', () => {
  const SHOPS: Shop[] = [
    { wage: 1_000, cash: 5_000, workers: [0, 1, 2] },
    { wage: 400, cash: 1_000, workers: [3, 4, 5] },
    { wage: 700, cash: 700, workers: [6] },
    { wage: 900, cash: 50, workers: [] },
  ];

  it('pays the wage where the cash covers the payroll, and an equal share of the cash where it does not', () => {
    const world = payrollWorld(8, SHOPS);
    const mintBefore = world.cash.balance[MINT];

    payWages(world);

    expect([0, 1, 2].map((h) => walletOf(world, h))).toEqual([OPENING_CENTS + 1_000, OPENING_CENTS + 1_000, OPENING_CENTS + 1_000]);
    // 1,000 cents over 3 workers is 333 each, and the firm keeps the 1 cent over.
    expect([3, 4, 5].map((h) => walletOf(world, h))).toEqual([OPENING_CENTS + 333, OPENING_CENTS + 333, OPENING_CENTS + 333]);
    // Exactly enough cash still pays the wage in full.
    expect(walletOf(world, 6)).toBe(OPENING_CENTS + 700);
    expect(walletOf(world, 7)).toBe(OPENING_CENTS);
    expect([0, 1, 2, 3].map((f) => firmCashOf(world, f))).toEqual([2_000, 1, 0, 50]);
    expect(Array.from(world.economyScratch.pay.subarray(0, 3))).toEqual([1_000, 333, 700]);
    expect(world.economyScratch.stats[STAT_WAGE_BILL]).toBe(3_000 + 999 + 700);
    expect(world.cash.balance[MINT]).toBe(mintBefore);
    expect(checkCash(world.cash)).toBe(OK);
  });

  it("adds each call to the month's wage bill", () => {
    const world = payrollWorld(8, SHOPS);
    payWages(world);
    // Firm 0 holds 2,000 for a 3,000 payroll now, so it pays 666 each; firms 1 and 2 are down to 1 and 0 cents.
    payWages(world);
    expect(world.economyScratch.stats[STAT_WAGE_BILL]).toBe(4_699 + 1_998);
    expect([0, 3, 6].map((h) => walletOf(world, h))).toEqual([OPENING_CENTS + 1_666, OPENING_CENTS + 333, OPENING_CENTS + 700]);
    expect(checkCash(world.cash)).toBe(OK);
  });

  it('pays nothing from a firm with no cash', () => {
    const world = payrollWorld(2, [{ wage: 500, cash: 0, workers: [0, 1] }]);
    payWages(world);
    expect([walletOf(world, 0), walletOf(world, 1)]).toEqual([OPENING_CENTS, OPENING_CENTS]);
    expect(world.economyScratch.pay[0]).toBe(0);
    expect(Object.is(world.economyScratch.pay[0], 0)).toBe(true);
    expect(world.economyScratch.stats[STAT_WAGE_BILL]).toBe(0);
  });

  it('moves exactly the pay it works out, whatever the firms hold', () => {
    const world = createWorld(42, 'phone', undefined, TRIAL_HOUSEHOLDS);
    world.firms.count[0] = TRIAL_FIRMS;
    for (let trial = 0; trial < 200; trial++) {
      scatterPayroll(world, trial);
      const before = holdings(world);

      payWages(world);

      const bill = expectFirmsPaid(world, before.firmCash, trial);
      expectWorkersPaid(world, before.wallets, trial);
      expect(world.economyScratch.stats[STAT_WAGE_BILL], `trial ${trial}`).toBe(bill);
      expect(checkCash(world.cash), `trial ${trial}`).toBe(OK);
    }
  });
});

const TRIAL_HOUSEHOLDS = 40;
const TRIAL_FIRMS = 8;

// Keyed random employers, wages and firm cash for one trial, on a ledger that sums to zero.
function scatterPayroll(world: World, trial: number): void {
  world.cash.balance.fill(0);
  world.firms.employees.fill(0);
  world.economyScratch.stats.fill(0);
  for (let h = 0; h < TRIAL_HOUSEHOLDS; h++) {
    issue(world.cash, walletAccount(world.cash, h), OPENING_CENTS);
    const employer = (draw3(9, 1, trial, h, 0) % (TRIAL_FIRMS + 1)) + NO_FIRM;
    world.agents.employer[h] = employer;
    if (employer >= 0) world.firms.employees[employer]++;
  }
  for (let f = 0; f < TRIAL_FIRMS; f++) {
    world.firms.wage[f] = 1 + (draw3(9, 2, trial, f, 0) % 5_000);
    issue(world.cash, firmAccount(world.cash, f), draw3(9, 3, trial, f, 0) % 20_000);
  }
}

function holdings(world: World): { wallets: number[]; firmCash: number[] } {
  return {
    wallets: Array.from({ length: TRIAL_HOUSEHOLDS }, (_, h) => walletOf(world, h)),
    firmCash: Array.from({ length: TRIAL_FIRMS }, (_, f) => firmCashOf(world, f)),
  };
}

// A15 in the test's own words: the wage if the cash covers the payroll, else an equal share of the cash, rounded down.
function expectedPay(wage: number, cash: number, workers: number): number {
  return cash >= wage * workers ? wage : Math.floor(cash / workers);
}

function expectFirmsPaid(world: World, cashBefore: number[], trial: number): number {
  let bill = 0;
  for (let f = 0; f < TRIAL_FIRMS; f++) {
    const workers = world.firms.employees[f];
    const pay = expectedPay(world.firms.wage[f], cashBefore[f], workers);
    if (workers > 0) expect(world.economyScratch.pay[f], `trial ${trial} firm ${f}`).toBe(pay);
    expect(firmCashOf(world, f), `trial ${trial} firm ${f}`).toBe(cashBefore[f] - pay * workers);
    // A short firm keeps less than one cent a worker.
    if (workers > 0 && pay < world.firms.wage[f]) expect(firmCashOf(world, f)).toBeLessThan(workers);
    bill += pay * workers;
  }
  return bill;
}

function expectWorkersPaid(world: World, walletsBefore: number[], trial: number): void {
  for (let h = 0; h < TRIAL_HOUSEHOLDS; h++) {
    const employer = world.agents.employer[h];
    const received = employer >= 0 ? world.economyScratch.pay[employer] : 0;
    expect(walletOf(world, h), `trial ${trial} household ${h}`).toBe(walletsBefore[h] + received);
  }
}
