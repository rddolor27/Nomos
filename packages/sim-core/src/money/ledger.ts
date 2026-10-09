import { take, type Arena } from '../memory/arena.ts';

// Accounts 3-15 stay reserved, so adding a national account never moves a settlement's accounts.
export const MINT = 0;
export const TREASURY = 1;
export const ROUNDING = 2;
export const NATIONAL_ACCOUNTS = 16;

export const SECTORS = 4;
export const HOUSEHOLDS = 0;
export const FIRMS = 1;
export const LOCAL_GOVERNMENT = 2;
export const POLICE_BUDGET = 3;

export interface Ledger {
  readonly accounts: number;
  readonly firstWallet: number;
  readonly balance: Float64Array;
}

export function createLedger(arena: Arena, settlements: number, wallets: number): Ledger {
  const firstWallet = NATIONAL_ACCOUNTS + settlements * SECTORS;
  const accounts = firstWallet + wallets;
  return { accounts, firstWallet, balance: take(arena, Float64Array, accounts, true) };
}

export function sectorAccount(settlement: number, sector: number): number {
  return NATIONAL_ACCOUNTS + settlement * SECTORS + sector;
}

export function walletAccount(ledger: Ledger, slot: number): number {
  return ledger.firstWallet + slot;
}

// No checks: a bad account, fractional cents or a lost cent all surface in checkCash.
export function transfer(ledger: Ledger, from: number, to: number, cents: number): void {
  ledger.balance[from] -= cents;
  ledger.balance[to] += cents;
}

export function issue(ledger: Ledger, to: number, cents: number): void {
  transfer(ledger, MINT, to, cents);
}

export function retire(ledger: Ledger, from: number, cents: number): void {
  transfer(ledger, from, MINT, cents);
}
