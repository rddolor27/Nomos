import { firmAccount, walletAccount } from '../money/ledger.ts';
import type { World } from '../world/world.ts';

// The day's row of the flow log, in EconomyScratch.stats, which the state hash skips: levels first, which the economy day
// sets from state at the day's end, then every flow as that day's sum, which clearFlows zeroes each morning and each
// system adds to. STAT_NAMES names the slots in order. Any change to a column, its order or what it holds bumps
// FLOW_LOG_SCHEMA, because runs written under an older number are read by name.
export const FLOW_LOG_SCHEMA = 1;

export const STAT_UNEMPLOYED = 0;
export const STAT_VACANCIES = 1;
export const STAT_PRICE_MEAN = 2;
export const STAT_WAGE_MEAN = 3;
export const STAT_HOUSEHOLD_CASH = 4;
export const STAT_FIRM_CASH = 5;
// Over firms: units in stock, then employees squared and cubed, for the skewness of firm sizes.
export const STAT_STOCK = 6;
export const STAT_SIZE_SQUARES = 7;
export const STAT_SIZE_CUBES = 8;

// The flows follow, each group with the days a system writes it. Every day:
export const STAT_SALES_UNITS = 9;
export const STAT_SALES_CENTS = 10;
// A month's first day. STAT_PRICE_CHANGE_PPM adds up the sizes of the changes.
export const STAT_PRICE_CHANGES = 11;
export const STAT_PRICE_CHANGE_PPM = 12;
export const STAT_HIRES = 13;
export const STAT_SWITCHES = 14;
// A month's last day, and STAT_FIRINGS also the day of a layoff shock.
export const STAT_FIRINGS = 15;
export const STAT_WAGE_BILL = 16;
export const STAT_PROFITS_PAID = 17;
export const STAT_EXITS = 18;
export const STAT_ISSUED = 19;
// Every day: units made.
export const STAT_PRODUCED = 20;
// A month's last day: units of stock that exits write off.
export const STAT_WRITE_OFF = 21;
// A month's first day: visits by the unemployed, and firms priced above the markup ceiling once they have repriced.
export const STAT_JOB_VISITS = 22;
export const STAT_ABOVE_MARKUP = 23;
// A month's last day: months out so far, summed over the unemployed, and how many are out six months or more.
export const STAT_SPELL_MONTHS = 24;
export const STAT_LONG_SPELLS = 25;
// A year's last day: people at the same firm as a year before, and those whose firm's wage is lower.
export const STAT_STAYERS = 26;
export const STAT_STAYER_CUTS = 27;
// Nothing writes it until M5's treasury.
export const STAT_TAXES = 28;

export const STATS = 29;

export const STAT_NAMES: readonly string[] = [
  'unemployed', 'vacancies', 'price_mean', 'wage_mean', 'household_cash', 'firm_cash', 'stock', 'size_squares', 'size_cubes',
  'sales_units', 'sales_cents', 'price_changes', 'price_change_ppm', 'hires', 'switches', 'firings', 'wage_bill',
  'profits_paid', 'exits', 'issued', 'produced', 'write_off', 'job_visits', 'above_markup', 'spell_months', 'long_spells',
  'stayers', 'stayer_cuts', 'taxes',
];

const FIRST_FLOW = STAT_SALES_UNITS;
// spellMonths is a byte, and a spell that long is long whatever its exact length.
const MAX_SPELL_MONTHS = 255;
// 27 weeks is 6.2 months (R2 KQ2), and six whole months stands in for it.
const LONG_SPELL_MONTHS = 6;

export function clearFlows(stats: Float64Array): void {
  for (let slot = FIRST_FLOW; slot < STATS; slot++) stats[slot] = 0;
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
  let stock = 0;
  let squares = 0;
  let cubes = 0;
  for (let f = 0; f < count; f++) {
    const workers = firms.employees[f];
    vacancies += firms.vacancy[f];
    prices += firms.price[f];
    wages += firms.wage[f];
    cents += cash.balance[firmAccount(cash, f)];
    stock += firms.stock[f];
    squares += workers * workers;
    cubes += workers * workers * workers;
  }
  const stats = world.economyScratch.stats;
  stats[STAT_VACANCIES] = vacancies;
  stats[STAT_PRICE_MEAN] = prices / count;
  stats[STAT_WAGE_MEAN] = wages / count;
  stats[STAT_FIRM_CASH] = cents;
  stats[STAT_STOCK] = stock;
  stats[STAT_SIZE_SQUARES] = squares;
  stats[STAT_SIZE_CUBES] = cubes;
}

// After a month's last day. spellMonths counts the month ends a person has spent out of work in a row, so the whole months
// out so far are one fewer: the month end that opens a spell has no whole month behind it.
export function recordMonth(world: World): void {
  const { agents, economyScratch } = world;
  const { spellMonths, stats } = economyScratch;
  const people = agents.count[0];
  let months = 0;
  let long = 0;
  for (let h = 0; h < people; h++) {
    if (agents.employer[h] >= 0) {
      spellMonths[h] = 0;
      continue;
    }
    spellMonths[h] = Math.min(spellMonths[h] + 1, MAX_SPELL_MONTHS);
    const out = spellMonths[h] - 1;
    months += out;
    if (out >= LONG_SPELL_MONTHS) long++;
  }
  stats[STAT_SPELL_MONTHS] += months;
  stats[STAT_LONG_SPELLS] += long;
}

// After a year's last day. A stayer works at the firm row they worked at a year ago, and a cut is a lower wage than that
// firm paid then. Both columns are read before they are overwritten with this year's.
export function recordYear(world: World): void {
  const { agents, firms, economyScratch } = world;
  const { yearEmployer, yearWage, stats } = economyScratch;
  const people = agents.count[0];
  let stayers = 0;
  let cuts = 0;
  for (let h = 0; h < people; h++) {
    const employer = agents.employer[h];
    if (employer >= 0 && employer === yearEmployer[h]) {
      stayers++;
      if (firms.wage[employer] < yearWage[employer]) cuts++;
    }
    yearEmployer[h] = employer;
  }
  const count = firms.count[0];
  for (let f = 0; f < count; f++) yearWage[f] = firms.wage[f];
  stats[STAT_STAYERS] += stayers;
  stats[STAT_STAYER_CUTS] += cuts;
}
