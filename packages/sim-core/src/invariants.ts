import type { Ledger } from './ledger.ts';

export const OK = 0;
export const CASH_NOT_ZERO = 1;
export const CENTS_NOT_EXACT = 2;

export const MAX_SAFE_CENTS = 9_007_199_254_740_991;

const SPLIT = 1 << 26;

// Each balance splits at 2^26 so both partial sums stay exact below 2^26 accounts. A plain float sum rounds once
// balances near 2^53 meet, and can hide a lost cent.
export function checkCash(cash: Ledger): number {
  const balance = cash.balance;
  let hiSum = 0;
  let loSum = 0;
  for (let account = 0; account < cash.accounts; account++) {
    const cents = balance[account];
    if (cents !== Math.floor(cents) || Math.abs(cents) > MAX_SAFE_CENTS) return CENTS_NOT_EXACT;
    const hi = Math.floor(cents / SPLIT);
    hiSum += hi;
    loSum += cents - hi * SPLIT;
  }
  return hiSum * SPLIT + loSum === 0 ? OK : CASH_NOT_ZERO;
}
