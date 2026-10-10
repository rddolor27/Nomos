import { describe, expect, it } from 'vitest';
import { LENGNICK } from '../src/economy/params.ts';
import { STAT_ISSUED, STAT_PROFITS_PAID } from '../src/economy/stats.ts';
import { issueFiat } from '../src/money/fiat.ts';
import { OK, checkCash } from '../src/money/invariants.ts';
import { MINT, PROFITS, firmAccount, issue, transfer, walletAccount } from '../src/money/ledger.ts';
import { mulPpmUp } from '../src/money/ppm.ts';
import { draw3 } from '../src/random/draw.ts';
import { distributeProfits } from '../src/wealth/profits.ts';
import { OPENING_CENTS, createWorld, type World } from '../src/world/world.ts';

const HOUSEHOLDS = 40;
const SOAK_STREAM = 0x7f5;
const TWO_20 = 1 << 20;
const TWO_33 = 8_589_934_592;
const TWO_40 = 1_099_511_627_776;
const TWO_50 = 1_125_899_906_842_624;
const TWO_52 = 4_503_599_627_370_496;
// The pool that stopped `economy --seed 42 --days 23000 --fiat-ppm 10000`.
const CLI_POOL = 8_601_460_509;

interface Firm {
  wage?: number;
  employees?: number;
  cash?: number;
}

// Each firm is funded from MINT, so the books stay balanced.
function worldWith(firms: readonly Firm[]): World {
  const world = createWorld(42, 'phone', undefined, HOUSEHOLDS);
  world.firms.count[0] = firms.length;
  firms.forEach((firm, f) => {
    world.firms.wage[f] = firm.wage ?? 0;
    world.firms.employees[f] = firm.employees ?? 0;
    issue(world.cash, firmAccount(world.cash, f), firm.cash ?? 0);
  });
  return world;
}

// Household 0 holds nothing, household 1 holds twice the rest, and a firm holds the pool to share.
function unevenWorld(pool: number): World {
  const world = worldWith([{ cash: pool }]);
  transfer(world.cash, walletAccount(world.cash, 0), walletAccount(world.cash, 1), OPENING_CENTS);
  return world;
}

function wallets(world: World): number[] {
  return Array.from({ length: HOUSEHOLDS }, (_, i) => world.cash.balance[walletAccount(world.cash, i)]);
}

function firmCash(world: World, f: number): number {
  return world.cash.balance[firmAccount(world.cash, f)];
}

function gainsOver(before: readonly number[], world: World): number[] {
  return wallets(world).map((cents, i) => cents - before[i]);
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

// The spec's weights: cash over the smallest power of two that brings the largest under the limit, rounded down, or 1 each
// when nobody holds cash. The limit is 2^20, or 2^53 over the pool when that is less.
function weightsOf(cash: readonly number[], limit: number): bigint[] {
  const largest = Math.max(...cash);
  if (largest === 0) return cash.map(() => 1n);
  let divisor = 1;
  while (Math.floor(largest / divisor) >= limit) divisor *= 2;
  return cash.map((cents) => BigInt(Math.floor(cents / divisor)));
}

// Each share is the floor of pool x weight / total weight, plus at most one cent, and only a household with weight gets it.
function expectApportioned(shares: readonly number[], pool: number, cash: readonly number[], limit = TWO_20): void {
  const weights = weightsOf(cash, limit);
  const total = weights.reduce((all, weight) => all + weight, 0n);
  shares.forEach((share, i) => {
    const floor = Number((BigInt(pool) * weights[i]) / total);
    const extra = share - floor;
    expect(extra === 0 || (extra === 1 && weights[i] > 0n), `household ${i} got ${share}, floor ${floor}`).toBe(true);
  });
  expect(sum(shares)).toBe(pool);
}

describe('profits', () => {
  it("keep each firm's buffer and move the rest into a pool that pays out to the cent", () => {
    const world = worldWith([
      { wage: 1_000, employees: 10, cash: 5_000 },
      { wage: 2_000, employees: 5, cash: 800 },
      { wage: 3_000, cash: 1_234 },
      { wage: 1_001, employees: 7, cash: 702 },
      { wage: 1_001, employees: 7, cash: 701 },
    ]);
    const before = wallets(world);
    distributeProfits(world, LENGNICK, 0);
    // Buffers are 10% of the wage bill, rounded up: 1,000, 1,000, 0, 701 (from 700.7) and 701.
    expect([0, 1, 2, 3, 4].map((f) => firmCash(world, f))).toEqual([1_000, 800, 0, 701, 701]);
    expect(world.cash.balance[PROFITS]).toBe(0);
    expect(checkCash(world.cash)).toBe(OK);
    expect(sum(gainsOver(before, world))).toBe(4_000 + 1_234 + 1);
    expect(world.economyScratch.stats[STAT_PROFITS_PAID]).toBe(5_235);
  });

  it("add to the month's total paid, and stop at a pool of nothing", () => {
    const world = worldWith([{ wage: 1_000, employees: 10, cash: 1_500 }]);
    world.economyScratch.stats[STAT_PROFITS_PAID] = 9;
    distributeProfits(world, LENGNICK, 0);
    expect(world.economyScratch.stats[STAT_PROFITS_PAID]).toBe(509);
    const quiet = [...world.cash.balance];
    distributeProfits(world, LENGNICK, 1);
    expect([...world.cash.balance]).toEqual(quiet);
    expect(world.economyScratch.stats[STAT_PROFITS_PAID]).toBe(509);
  });

  it('follow household cash after wages, and a household with none gets none', () => {
    const world = unevenWorld(5_234);
    const before = wallets(world);
    expect(before.slice(0, 3)).toEqual([0, 2 * OPENING_CENTS, OPENING_CENTS]);
    distributeProfits(world, LENGNICK, 0);
    const shares = gainsOver(before, world);
    expectApportioned(shares, 5_234, before);
    // Weights 0, 200,000 and 100,000 each, so the floors are 0, 261 and 130, and 33 cents are left over.
    expect(shares[0]).toBe(0);
    expect(shares[1]).toBeGreaterThanOrEqual(261);
    expect(Math.min(...shares.slice(2))).toBe(130);
    expect(Math.max(...shares.slice(2))).toBe(131);
    expect(checkCash(world.cash)).toBe(OK);
  });

  it('split evenly, leftover cents one each, when every household is out of cash', () => {
    const world = worldWith([{ cash: 13 }, {}]);
    for (let i = 0; i < HOUSEHOLDS; i++) {
      transfer(world.cash, walletAccount(world.cash, i), firmAccount(world.cash, 1), OPENING_CENTS);
    }
    const before = wallets(world);
    expect(before.every((cents) => cents === 0)).toBe(true);
    distributeProfits(world, LENGNICK, 0);
    const shares = gainsOver(before, world);
    expectApportioned(shares, 4_000_013, before);
    expect(shares.filter((share) => share === 100_001)).toHaveLength(13);
    expect(shares.filter((share) => share === 100_000)).toHaveLength(HOUSEHOLDS - 13);
  });

  it('scale the weights by a power of two, so cash finer than the scale is not paid for', () => {
    const world = worldWith([{ cash: 1_000_000_007 }]);
    issue(world.cash, walletAccount(world.cash, 0), 8_388_615 - OPENING_CENTS);
    issue(world.cash, walletAccount(world.cash, 1), 8_388_608 - OPENING_CENTS);
    const before = wallets(world);
    distributeProfits(world, LENGNICK, 0);
    const shares = gainsOver(before, world);
    expectApportioned(shares, 1_000_000_007, before);
    // 2^23 + 7 and 2^23 both weigh 524,288 once the largest is divided by 16.
    expect(Math.abs(shares[0] - shares[1])).toBeLessThanOrEqual(1);
  });

  it('stay exact at the widest pool and the widest weights', () => {
    const world = worldWith([{ cash: TWO_33 - 1 }]);
    // Five households hold 2^40 cents and its fractions, so the weights come from a scale of 2^21 and top 2^19.
    for (let i = 0; i < 5; i++) issue(world.cash, walletAccount(world.cash, i), Math.floor(TWO_40 / (i + 1)) + 7);
    const before = wallets(world);
    distributeProfits(world, LENGNICK, 0);
    const shares = gainsOver(before, world);
    expectApportioned(shares, TWO_33 - 1, before);
    expect(shares.slice(5).every((share) => share === 0)).toBe(true);
    expect(world.cash.balance[PROFITS]).toBe(0);
    expect(checkCash(world.cash)).toBe(OK);
  });

  // Weights stay under 2^53 over the pool, so pool x weight stays exact: the limit is that quotient, rounded down.
  it.each([
    { pool: TWO_33, limit: TWO_20 },
    { pool: CLI_POOL, limit: 1_047_170 },
    { pool: TWO_40 + 7, limit: 8_191 },
    { pool: TWO_50, limit: 8 },
    { pool: TWO_52, limit: 2 },
  ])('share a pool of $pool cents exactly, with weights under $limit', ({ pool, limit }) => {
    const world = worldWith([{ cash: pool }]);
    for (let i = 0; i < 5; i++) issue(world.cash, walletAccount(world.cash, i), Math.floor(TWO_40 / (i + 1)) + 7);
    const before = wallets(world);
    distributeProfits(world, LENGNICK, 0);
    expectApportioned(gainsOver(before, world), pool, before, limit);
    expect(firmCash(world, 0)).toBe(0);
    expect(world.cash.balance[PROFITS]).toBe(0);
    expect(world.economyScratch.stats[STAT_PROFITS_PAID]).toBe(pool);
    expect(checkCash(world.cash)).toBe(OK);
  });

  it('refuse a pool past 2^52 cents, which weights under 2 cannot split, and change nothing', () => {
    const world = worldWith([{ cash: TWO_52 + 1 }]);
    const books = [...world.cash.balance];
    expect(() => distributeProfits(world, LENGNICK, 0)).toThrow(RangeError);
    expect([...world.cash.balance]).toEqual(books);
    expect(world.economyScratch.stats[STAT_PROFITS_PAID]).toBe(0);
  });

  it('keep the books balanced for 500 months beside fiat issue, which shares their scratch arrays', () => {
    const firms = Array.from({ length: 10 }, (_, f) => ({ wage: 1_000 + 37 * f, employees: f % 4 }));
    const world = worldWith(firms);
    const fiat = { ...LENGNICK, fiatIssuePpm: 4_321 };
    const opening = wallets(world).reduce((total, cents) => total + cents, 0);
    for (let month = 0; month < 500; month++) {
      for (let k = 0; k < 6; k++) {
        const payer = walletAccount(world.cash, draw3(42, SOAK_STREAM, month, k, 0) % HOUSEHOLDS);
        const firm = firmAccount(world.cash, draw3(42, SOAK_STREAM, month, k, 1) % firms.length);
        transfer(world.cash, payer, firm, Math.min(world.cash.balance[payer], draw3(42, SOAK_STREAM, month, k, 2) % 5_000));
      }
      distributeProfits(world, fiat, month);
      issueFiat(world, fiat, month);
      expect(checkCash(world.cash), `month ${month}`).toBe(OK);
      expect(world.cash.balance[PROFITS], `month ${month}`).toBe(0);
      firms.forEach((firm, f) => {
        const buffer = mulPpmUp(firm.wage * firm.employees, fiat.bufferPpm);
        expect(firmCash(world, f), `month ${month}, firm ${f}`).toBeLessThanOrEqual(buffer);
      });
    }
    expect(-world.cash.balance[MINT]).toBe(opening + world.economyScratch.stats[STAT_ISSUED]);
    expect(world.economyScratch.stats[STAT_PROFITS_PAID]).toBeGreaterThan(0);
  });

  it('send the leftover cents by seed and month, and replay exactly', () => {
    const run = (month: number): number[] => {
      const world = unevenWorld(5_234);
      const before = wallets(world);
      distributeProfits(world, LENGNICK, month);
      return gainsOver(before, world);
    };
    expect(run(0)).toEqual(run(0));
    expect(run(1)).not.toEqual(run(0));
    expect(sum(run(1))).toBe(5_234);
  });
});
