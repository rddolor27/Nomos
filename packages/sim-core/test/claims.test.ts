import { describe, expect, it } from 'vitest';
import { accrue, createClaims, openLoan, payInstalment } from '../src/money/claims.ts';
import { draw3 } from '../src/random/draw.ts';
import { CENTS_NOT_EXACT, CLAIMS_UNBALANCED, MAX_SAFE_CENTS, OK, checkInvariants } from '../src/money/invariants.ts';
import { NATIONAL_ACCOUNTS, createLedger, issue } from '../src/money/ledger.ts';
import { reserveArena } from '../src/memory/arena.ts';

function exactSum(values: Float64Array): bigint {
  return values.reduce((total, cents) => total + BigInt(cents), 0n);
}

describe('the claims ledger', () => {
  it('books a loan on both sides and services it', () => {
    const arena = reserveArena(65_536);
    const cash = createLedger(arena, 1, 0);
    const claims = createClaims(arena, cash, 4);
    issue(cash, 16, 1_000_000);

    const loan = openLoan(claims, cash, 16, 17, 100_000, 1_000, 10_000);
    expect([loan, claims.count[0]]).toEqual([0, 1]);
    expect([cash.balance[16], cash.balance[17]]).toEqual([900_000, 100_000]);
    expect([claims.debt[17], claims.lent[16]]).toEqual([100_000, 100_000]);

    expect(accrue(claims, loan)).toBe(100);
    expect(payInstalment(claims, cash, loan)).toBe(10_000);
    expect(claims.principal[loan]).toBe(90_100);
    expect([claims.debt[17], claims.lent[16]]).toEqual([90_100, 90_100]);
    expect([cash.balance[16], cash.balance[17]]).toEqual([910_000, 90_000]);
    expect(checkInvariants(cash, claims)).toBe(OK);

    const small = openLoan(claims, cash, 16, 17, 5_000, 0, 10_000);
    expect(payInstalment(claims, cash, small)).toBe(5_000);
    expect(payInstalment(claims, cash, small)).toBe(0);
    expect(claims.principal[small]).toBe(0);
    expect(checkInvariants(cash, claims)).toBe(OK);
  });

  it('holds the claims and cash identities exactly every day', () => {
    const arena = reserveArena(131_072);
    const cash = createLedger(arena, 10, 0);
    const claims = createClaims(arena, cash, 2_000);
    const sectorAccounts = cash.accounts - NATIONAL_ACCOUNTS;

    for (let day = 0; day < 400; day++) {
      const opened = draw3(11, 1, day, 0, 0) % 6;
      for (let n = 0; n < opened; n++) {
        const lender = NATIONAL_ACCOUNTS + (draw3(11, 1, day, n, 1) % sectorAccounts);
        const other = 1 + (draw3(11, 1, day, n, 2) % (sectorAccounts - 1));
        const borrower = NATIONAL_ACCOUNTS + ((lender - NATIONAL_ACCOUNTS + other) % sectorAccounts);
        const principal = 1_000 + (draw3(11, 1, day, n, 3) % 1_000_000_000);
        const ratePpm = draw3(11, 1, day, n, 4) % 3_000;
        openLoan(claims, cash, lender, borrower, principal, ratePpm, Math.floor(principal / 30));
      }
      for (let loan = 0; loan < claims.count[0]; loan++) {
        accrue(claims, loan);
        payInstalment(claims, cash, loan);
      }
      expect(checkInvariants(cash, claims), `day ${day}`).toBe(OK);
    }

    const outstanding = exactSum(claims.principal.subarray(0, claims.count[0]));
    expect(claims.count[0]).toBeGreaterThan(800);
    expect(outstanding).toBeGreaterThan(0n);
    expect(exactSum(claims.debt)).toBe(outstanding);
    expect(exactSum(claims.lent)).toBe(outstanding);

    for (const [column, index] of [[claims.debt, 17], [claims.lent, 16], [claims.principal, 0]] as const) {
      column[index] += 1;
      expect(checkInvariants(cash, claims)).toBe(CLAIMS_UNBALANCED);
      column[index] -= 1;
    }
    expect(checkInvariants(cash, claims)).toBe(OK);
  });

  it('fails on NaN and on totals beyond exact cents', () => {
    const arena = reserveArena(65_536);
    const cash = createLedger(arena, 1, 0);
    const claims = createClaims(arena, cash, 2);
    openLoan(claims, cash, 16, 17, 100, 0, 10);

    claims.principal[0] = NaN;
    expect(checkInvariants(cash, claims)).toBe(CENTS_NOT_EXACT);
    for (const beyond of [MAX_SAFE_CENTS + 1, Infinity]) {
      claims.principal[0] = beyond;
      claims.debt[17] = beyond;
      claims.lent[16] = beyond;
      expect(checkInvariants(cash, claims), `${beyond}`).toBe(CENTS_NOT_EXACT);
    }
  });

  it('refuses full structures', () => {
    const arena = reserveArena(65_536);
    const cash = createLedger(arena, 1, 0);
    const claims = createClaims(arena, cash, 2);
    openLoan(claims, cash, 16, 17, 100, 0, 10);
    openLoan(claims, cash, 17, 16, 50, 0, 10);
    const balances = Array.from(cash.balance);

    expect(() => openLoan(claims, cash, 16, 17, 100, 0, 10)).toThrow(RangeError);
    expect(Array.from(cash.balance)).toEqual(balances);
    expect([claims.count[0], claims.debt[17], claims.lent[16]]).toEqual([2, 100, 100]);
    expect(checkInvariants(cash, claims)).toBe(OK);
  });

  it('lists every column, the count included, as canonical', () => {
    const arena = reserveArena(65_536);
    const claims = createClaims(arena, createLedger(arena, 2, 0), 10);
    const canonicalOffsets = arena.canonical.filter((_, i) => i % 2 === 0);
    for (const [name, column] of Object.entries(claims)) {
      if (ArrayBuffer.isView(column)) expect(canonicalOffsets, name).toContain(column.byteOffset);
    }
  });
});
