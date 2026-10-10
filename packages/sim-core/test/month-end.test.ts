import { describe, expect, it } from 'vitest';
import { endMonth } from '../src/economy/economy.ts';
import { LENGNICK, type EconomyParams } from '../src/economy/params.ts';
import { STAT_ISSUED } from '../src/economy/stats.ts';
import { OK, checkCash } from '../src/money/invariants.ts';
import { MINT, PROFITS, firmAccount, transfer, walletAccount, type Ledger } from '../src/money/ledger.ts';
import { draw3 } from '../src/random/draw.ts';
import { layoutWorld, populate, type World } from '../src/world/world.ts';

const SEED = 42;
const STREAM = 0x7e1;
const CASES = 10_000;
const MAX_HOUSEHOLDS = 40;
const MAX_FIRMS = 8;
const ARENA_BYTES = 1_048_576;

// Purposes of the case draws, keyed (case, entity, purpose).
const HOUSEHOLDS = 0;
const FIRMS = 1;
const FIAT = 2;
const BUFFER = 3;
const WAGE = 4;
const PRICE = 5;
const DEMAND = 6;
const NOTICE = 7;
const IDLE = 8;
const FIRM_CASH = 9;
const EMPLOYER = 10;
const RESERVATION = 11;
const WALLET = 12;
const DEMAND_UNITS = 13;
const BROKE = 14;

function pick(c: number, entity: number, purpose: number, n: number): number {
  return draw3(SEED, STREAM, c, entity, purpose) % n;
}

function setBalance(cash: Ledger, account: number, cents: number): void {
  transfer(cash, MINT, account, cents - cash.balance[account]);
}

// Half the cases issue fiat money; the buffer runs from none to a whole wage bill.
function paramsFor(c: number): EconomyParams {
  const fiatIssuePpm = c % 2 === 0 ? 0 : pick(c, 0, FIAT, 10_001);
  return { ...LENGNICK, fiatIssuePpm, bufferPpm: pick(c, 0, BUFFER, 1_000_001) };
}

// Firms may be short of their wage bill, idle, on notice or about to exit.
function randomFirms(world: World, c: number, count: number): void {
  const { firms, cash } = world;
  firms.count[0] = count;
  for (let f = 0; f < count; f++) {
    firms.wage[f] = 1 + pick(c, f, WAGE, 300_000);
    firms.price[f] = 1 + pick(c, f, PRICE, 10_000);
    firms.demand[f] = pick(c, f, DEMAND, 2) === 0 ? 0 : pick(c, f, DEMAND_UNITS, 2_000);
    firms.notice[f] = pick(c, f, NOTICE, 2);
    firms.idleMonths[f] = pick(c, f, IDLE, 3);
    setBalance(cash, firmAccount(cash, f), pick(c, f, FIRM_CASH, 20_000_000));
  }
}

// About one household in nine is out of work, and some hold no cash at all.
function randomHouseholds(world: World, c: number, count: number, firmCount: number): void {
  const { agents, firms, cash } = world;
  for (let h = 0; h < count; h++) {
    const employer = pick(c, h, EMPLOYER, firmCount + 1) - 1;
    agents.employer[h] = employer;
    if (employer >= 0) firms.employees[employer]++;
    agents.reservationWage[h] = pick(c, h, RESERVATION, 300_000);
    setBalance(cash, walletAccount(cash, h), pick(c, h, BROKE, 4) === 0 ? 0 : pick(c, h, WALLET, 1_000_000));
  }
}

function randomWorld(c: number): World {
  const households = 1 + pick(c, 0, HOUSEHOLDS, MAX_HOUSEHOLDS);
  const firmCount = 1 + pick(c, 0, FIRMS, MAX_FIRMS);
  const world = layoutWorld(SEED, 'phone', MAX_HOUSEHOLDS, ARENA_BYTES);
  populate(world, households);
  randomFirms(world, c, firmCount);
  randomHouseholds(world, c, households, firmCount);
  return world;
}

function heldCash(world: World): number {
  const { cash } = world;
  let total = 0;
  for (let h = 0; h < world.agents.count[0]; h++) total += cash.balance[walletAccount(cash, h)];
  for (let f = 0; f < world.firms.count[0]; f++) total += cash.balance[firmAccount(cash, f)];
  return total;
}

function negativeBalances(world: World): number {
  const { cash } = world;
  let negative = cash.balance[PROFITS] < 0 ? 1 : 0;
  for (let h = 0; h < world.agents.count[0]; h++) if (cash.balance[walletAccount(cash, h)] < 0) negative++;
  for (let f = 0; f < world.firms.count[0]; f++) if (cash.balance[firmAccount(cash, f)] < 0) negative++;
  return negative;
}

function workersMatchJobs(world: World): boolean {
  let employed = 0;
  let workers = 0;
  for (let h = 0; h < world.agents.count[0]; h++) if (world.agents.employer[h] >= 0) employed++;
  for (let f = 0; f < world.firms.count[0]; f++) workers += world.firms.employees[f];
  return employed === workers;
}

describe('endMonth', () => {
  it('10,000 random month-ends conserve cents exactly', { timeout: 60_000 }, () => {
    let issuing = 0;
    for (let c = 0; c < CASES; c++) {
      const world = randomWorld(c);
      const held = heldCash(world);
      endMonth(world, paramsFor(c), c);
      const issued = world.economyScratch.stats[STAT_ISSUED];
      if (issued > 0) issuing++;
      const where = `case ${c}`;
      expect(checkCash(world.cash), where).toBe(OK);
      expect(heldCash(world), where).toBe(held + issued);
      expect(world.cash.balance[PROFITS], where).toBe(0);
      expect(negativeBalances(world), where).toBe(0);
      expect(workersMatchJobs(world), where).toBe(true);
    }
    expect(issuing).toBeGreaterThan(CASES / 3);
  });
});
