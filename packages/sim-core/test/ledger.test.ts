import { describe, expect, it } from 'vitest';
import { draw3 } from '../src/random/draw.ts';
import { CASH_NOT_ZERO, CENTS_NOT_EXACT, MAX_SAFE_CENTS, OK, checkCash } from '../src/money/invariants.ts';
import {
  FIRMS,
  HOUSEHOLDS,
  LOCAL_GOVERNMENT,
  MINT,
  NATIONAL_ACCOUNTS,
  POLICE_BUDGET,
  PROFITS,
  ROUNDING,
  TREASURY,
  createLedger,
  firmAccount,
  issue,
  retire,
  sectorAccount,
  transfer,
  walletAccount,
} from '../src/money/ledger.ts';
import { reserveArena } from '../src/memory/arena.ts';

const TRILLION = 1_000_000_000_000;

function newLedger(settlements: number) {
  return createLedger(reserveArena(65_536), settlements, 0);
}

// A keyed amount in 0..10^12 - 1 cents, built from two 32-bit draws.
function keyedCents(tick: number, op: number): number {
  return (draw3(42, 1, tick, op, 3) % 1_000) * 1_000_000_000 + (draw3(42, 1, tick, op, 4) % 1_000_000_000);
}

describe('the cash ledger', () => {
  it('lays out national accounts, then four sectors per settlement, then one wallet per slot', () => {
    expect([MINT, TREASURY, ROUNDING, PROFITS, NATIONAL_ACCOUNTS]).toEqual([0, 1, 2, 3, 16]);
    expect([HOUSEHOLDS, FIRMS, LOCAL_GOVERNMENT, POLICE_BUDGET]).toEqual([0, 1, 2, 3]);
    const cash = createLedger(reserveArena(65_536), 3, 5);
    expect([cash.accounts, cash.firstWallet, walletAccount(cash, 0), walletAccount(cash, 4)]).toEqual([33, 28, 28, 32]);
    expect(cash.balance).toHaveLength(33);
    expect(sectorAccount(0, HOUSEHOLDS)).toBe(16);
    expect(sectorAccount(2, POLICE_BUDGET)).toBe(27);
  });

  it('puts one account per firm after the wallets, and none unless asked', () => {
    const cash = createLedger(reserveArena(65_536), 3, 5, 2);
    expect([cash.accounts, cash.firstWallet, cash.firstFirm, firmAccount(cash, 0), firmAccount(cash, 1)]).toEqual([
      35, 28, 33, 33, 34,
    ]);
    expect(cash.balance).toHaveLength(35);
    const unasked = createLedger(reserveArena(65_536), 3, 5);
    expect([unasked.accounts, unasked.firstFirm]).toEqual([33, 33]);
  });

  it('keeps firm cash inside the sum to zero', () => {
    const cash = createLedger(reserveArena(65_536), 3, 5, 2);
    issue(cash, firmAccount(cash, 1), 500);
    transfer(cash, firmAccount(cash, 1), walletAccount(cash, 4), 200);
    transfer(cash, walletAccount(cash, 4), firmAccount(cash, 0), 50);
    expect([cash.balance[34], cash.balance[32], cash.balance[33], cash.balance[MINT]]).toEqual([300, 150, 50, -500]);
    expect(checkCash(cash)).toBe(OK);
    cash.balance[firmAccount(cash, 0)] += 1;
    expect(checkCash(cash)).toBe(CASH_NOT_ZERO);
  });

  it('lists the balances as canonical', () => {
    const arena = reserveArena(65_536);
    const cash = createLedger(arena, 3, 0);
    expect(arena.canonical).toEqual([cash.balance.byteOffset, cash.balance.byteLength]);
  });

  it('sums to zero after every tick of random transfers', () => {
    const cash = newLedger(10);
    for (let tick = 0; tick < 1_000; tick++) {
      for (let op = 0; op < 100; op++) {
        const kind = draw3(42, 1, tick, op, 0) % 3;
        const from = draw3(42, 1, tick, op, 1) % cash.accounts;
        const to = draw3(42, 1, tick, op, 2) % cash.accounts;
        const cents = keyedCents(tick, op);
        if (kind === 0) issue(cash, to, cents);
        else if (kind === 1) retire(cash, from, cents);
        else transfer(cash, from, to, cents);
      }
      expect(checkCash(cash), `tick ${tick}`).toBe(OK);
    }
    expect(Math.abs(cash.balance[MINT])).toBeGreaterThan(TRILLION);
    expect(Array.from(cash.balance).reduce((sum, cents) => sum + BigInt(cents), 0n)).toBe(0n);
  });

  it('catches money made outside MINT and inexact cents', () => {
    const outsideMint = newLedger(1);
    outsideMint.balance[16] += 1;
    expect(checkCash(outsideMint)).toBe(CASH_NOT_ZERO);

    const halfCent = newLedger(1);
    transfer(halfCent, 16, 17, 0.5);
    expect(checkCash(halfCent)).toBe(CENTS_NOT_EXACT);

    const notANumber = newLedger(1);
    notANumber.balance[17] = NaN;
    expect(checkCash(notANumber)).toBe(CENTS_NOT_EXACT);

    for (const beyond of [MAX_SAFE_CENTS + 1, Infinity]) {
      const pair = newLedger(1);
      pair.balance[16] = beyond;
      pair.balance[17] = -beyond;
      expect(checkCash(pair), `${beyond}`).toBe(CENTS_NOT_EXACT);
    }
  });

  it('sums without rounding near 2^53', () => {
    const oneCentOff = newLedger(1);
    oneCentOff.balance.set([MAX_SAFE_CENTS, 2, -MAX_SAFE_CENTS, -1], MINT);
    expect(Array.from(oneCentOff.balance).reduce((sum, cents) => sum + cents, 0)).toBe(0);
    expect(checkCash(oneCentOff)).toBe(CASH_NOT_ZERO);

    const balanced = newLedger(1);
    balanced.balance.set([MAX_SAFE_CENTS, 1, -MAX_SAFE_CENTS, -1], MINT);
    expect(checkCash(balanced)).toBe(OK);
  });
});
