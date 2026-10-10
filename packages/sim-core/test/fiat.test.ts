import { describe, expect, it } from 'vitest';
import { LENGNICK } from '../src/economy/params.ts';
import { STAT_ISSUED } from '../src/economy/stats.ts';
import { issueFiat } from '../src/money/fiat.ts';
import { OK, checkCash } from '../src/money/invariants.ts';
import { MINT, firmAccount, issue, walletAccount } from '../src/money/ledger.ts';
import { mulPpm } from '../src/money/ppm.ts';
import { OPENING_CENTS, createWorld, type World } from '../src/world/world.ts';

const HOUSEHOLDS = 40;
const STOCK = HOUSEHOLDS * OPENING_CENTS;
const FIAT = { ...LENGNICK, fiatIssuePpm: 3_333 };

function wallets(world: World): number[] {
  return Array.from({ length: HOUSEHOLDS }, (_, i) => world.cash.balance[walletAccount(world.cash, i)]);
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

describe('fiat money', () => {
  it('moves nothing at 0 ppm', () => {
    const world = createWorld(42, 'phone', undefined, HOUSEHOLDS);
    const books = [...world.cash.balance];
    issueFiat(world, LENGNICK, 0);
    expect(LENGNICK.fiatIssuePpm).toBe(0);
    expect([...world.cash.balance]).toEqual(books);
    expect(world.economyScratch.stats[STAT_ISSUED]).toBe(0);
  });

  it('moves MINT by exactly the issue, and splits it evenly with one leftover cent each', () => {
    const world = createWorld(42, 'phone', undefined, HOUSEHOLDS);
    issueFiat(world, FIAT, 0);
    // 3,333 ppm of 4,000,000 cents is 13,332: 333 each and 12 cents over.
    expect(mulPpm(STOCK, 3_333)).toBe(13_332);
    expect(world.cash.balance[MINT]).toBe(-STOCK - 13_332);
    const held = wallets(world);
    expect(sum(held)).toBe(STOCK + 13_332);
    expect(held.filter((cents) => cents === OPENING_CENTS + 334)).toHaveLength(12);
    expect(held.filter((cents) => cents === OPENING_CENTS + 333)).toHaveLength(HOUSEHOLDS - 12);
    expect(checkCash(world.cash)).toBe(OK);
    expect(world.economyScratch.stats[STAT_ISSUED]).toBe(13_332);
  });

  it('takes a share of the whole money stock, firms included, and adds to the total issued', () => {
    const world = createWorld(42, 'phone', undefined, HOUSEHOLDS);
    issue(world.cash, firmAccount(world.cash, 0), 1_000_000);
    issueFiat(world, FIAT, 0);
    // 3,333 ppm of 5,000,000 cents is 16,665.
    const first = mulPpm(STOCK + 1_000_000, 3_333);
    expect(first).toBe(16_665);
    expect(world.cash.balance[MINT]).toBe(-(STOCK + 1_000_000) - first);
    issueFiat(world, FIAT, 1);
    const second = mulPpm(STOCK + 1_000_000 + first, 3_333);
    expect(world.economyScratch.stats[STAT_ISSUED]).toBe(first + second);
    expect(sum(wallets(world))).toBe(STOCK + first + second);
    expect(world.cash.balance[firmAccount(world.cash, 0)]).toBe(1_000_000);
    expect(checkCash(world.cash)).toBe(OK);
  });

  it('pays the largest issue the cap allows, 1% a month, in whole cents each', () => {
    const world = createWorld(42, 'phone', undefined, HOUSEHOLDS);
    issueFiat(world, { ...LENGNICK, fiatIssuePpm: 10_000 }, 0);
    expect(wallets(world).every((cents) => cents === OPENING_CENTS + 1_000)).toBe(true);
    expect(world.cash.balance[MINT]).toBe(-STOCK - 40_000);
  });

  it('sends the leftover cents by seed and month, and replays exactly', () => {
    const run = (month: number): number[] => {
      const world = createWorld(42, 'phone', undefined, HOUSEHOLDS);
      issueFiat(world, FIAT, month);
      return wallets(world);
    };
    expect(run(0)).toEqual(run(0));
    expect(run(1)).not.toEqual(run(0));
    expect(sum(run(1))).toBe(STOCK + 13_332);
  });
});
