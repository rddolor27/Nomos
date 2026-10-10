import { firmAccount, walletAccount } from '../money/ledger.ts';
import type { World } from '../world/world.ts';

// Slots of the Float64Array in EconomyScratch.stats, which the state hash skips. The economy day sets the day-end slots from
// state, and each system adds to its own sums.
export const STAT_UNEMPLOYED = 0;
export const STAT_VACANCIES = 1;
export const STAT_PRICE_MEAN = 2;
export const STAT_WAGE_MEAN = 3;
export const STAT_HOUSEHOLD_CASH = 4;
export const STAT_FIRM_CASH = 5;

// Summed over the day.
export const STAT_SALES_UNITS = 6;
export const STAT_SALES_CENTS = 7;

// Summed over the month. STAT_PRICE_CHANGE_PPM adds up the sizes of the changes.
export const STAT_PRICE_CHANGES = 8;
export const STAT_PRICE_CHANGE_PPM = 9;
export const STAT_HIRES = 10;
export const STAT_SWITCHES = 11;
export const STAT_FIRINGS = 12;
export const STAT_WAGE_BILL = 13;
export const STAT_PROFITS_PAID = 14;
export const STAT_EXITS = 15;
export const STAT_ISSUED = 16;

export const STATS = 17;

// shopDay only adds to the day's sums, so the economy day clears them each morning, and the month's on its first day.
export function clearDaySums(stats: Float64Array): void {
  for (let slot = STAT_SALES_UNITS; slot < STAT_PRICE_CHANGES; slot++) stats[slot] = 0;
}

export function clearMonthSums(stats: Float64Array): void {
  for (let slot = STAT_PRICE_CHANGES; slot < STATS; slot++) stats[slot] = 0;
}

export function recordDay(world: World): void {
  recordHouseholds(world);
  recordFirms(world);
}

function recordHouseholds(world: World): void {
  const { agents, cash } = world;
  const households = agents.count[0];
  let unemployed = 0;
  let cents = 0;
  for (let h = 0; h < households; h++) {
    if (agents.employer[h] < 0) unemployed++;
    cents += cash.balance[walletAccount(cash, h)];
  }
  const stats = world.economyScratch.stats;
  stats[STAT_UNEMPLOYED] = unemployed;
  stats[STAT_HOUSEHOLD_CASH] = cents;
}

function recordFirms(world: World): void {
  const { firms, cash } = world;
  const count = firms.count[0];
  let vacancies = 0;
  let prices = 0;
  let wages = 0;
  let cents = 0;
  for (let f = 0; f < count; f++) {
    vacancies += firms.vacancy[f];
    prices += firms.price[f];
    wages += firms.wage[f];
    cents += cash.balance[firmAccount(cash, f)];
  }
  const stats = world.economyScratch.stats;
  stats[STAT_VACANCIES] = vacancies;
  stats[STAT_PRICE_MEAN] = prices / count;
  stats[STAT_WAGE_MEAN] = wages / count;
  stats[STAT_FIRM_CASH] = cents;
}
