import { DAYS_PER_MONTH } from '@nomos/sim-core';
import { mean, sampleSd } from './judge.ts';
import type { TargetId } from './targets.ts';

// The flow-log columns (schema 2) that the targets read.
export const SUMMARY_COLUMNS = [
  'unemployed', 'vacancies', 'price_mean', 'wage_mean', 'stock', 'size_squares', 'size_cubes', 'sales_units',
  'sales_cents', 'price_changes', 'price_change_ppm', 'hires', 'switches', 'firings', 'wage_bill', 'exits', 'produced',
  'job_visits', 'above_markup', 'spell_months', 'long_spells', 'stayers', 'stayer_cuts',
  'sold_cents_bread', 'sold_cents_vegetables', 'sold_cents_fish', 'sold_cents_milk',
  'made_bread', 'made_vegetables', 'made_fish', 'made_milk',
  'spoiled_bread', 'spoiled_vegetables', 'spoiled_fish', 'spoiled_milk',
  'eaten', 'unmet',
] as const;

export type SummaryColumn = (typeof SUMMARY_COLUMNS)[number];
export type SummaryColumns = Readonly<Record<SummaryColumn, Float64Array>>;
export type TargetValues = Readonly<Record<TargetId, number>>;

export interface SummaryMeta {
  readonly size: number;
  readonly days: number;
  readonly warmUpDays: number;
  readonly params: { readonly firms: number; readonly openingPrice: number };
}

// The targets table's crisis test: unemployment_sd at most 0.10 and unemployment_mean below 0.90.
const CRISIS_SD = 0.1;
const CRISIS_MEAN = 0.9;
const LAST_DAY = DAYS_PER_MONTH - 1;

// Months first up to last, exclusive. A window month needs the month before it, for its start levels and its prior
// sales, so month 0 never counts.
interface Window {
  readonly first: number;
  readonly last: number;
}

// Every whole month that starts on or after warmUpDays and ends before days.
function windowOf(meta: SummaryMeta): Window {
  const first = Math.max(Math.ceil(meta.warmUpDays / DAYS_PER_MONTH), 1);
  return { first, last: Math.max(first, Math.floor(meta.days / DAYS_PER_MONTH)) };
}

function perMonth(w: Window, read: (month: number) => number): number[] {
  const values: number[] = [];
  for (let month = w.first; month < w.last; month++) values.push(read(month));
  return values;
}

function sumOfMonth(column: Float64Array, month: number): number {
  let total = 0;
  for (let day = month * DAYS_PER_MONTH; day < (month + 1) * DAYS_PER_MONTH; day++) total += column[day];
  return total;
}

function sums(column: Float64Array, w: Window): number[] {
  return perMonth(w, (month) => sumOfMonth(column, month));
}

function priorSums(column: Float64Array, w: Window): number[] {
  return perMonth(w, (month) => sumOfMonth(column, month - 1));
}

// A level at a month's end is its last day's, and at its start the day before its day 0 (the previous month's last).
function endLevels(column: Float64Array, w: Window): number[] {
  return perMonth(w, (month) => column[month * DAYS_PER_MONTH + LAST_DAY]);
}

function startLevels(column: Float64Array, w: Window): number[] {
  return perMonth(w, (month) => column[month * DAYS_PER_MONTH - 1]);
}

function total(values: readonly number[]): number {
  let sum = 0;
  for (const value of values) sum += value;
  return sum;
}

// An undefined rate is NaN, which no band holds.
function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? NaN : numerator / denominator;
}

function growth(now: readonly number[], before: readonly number[]): number[] {
  return now.map((value, i) => value / before[i] - 1);
}

function correlation(x: readonly number[], y: readonly number[]): number {
  const centerX = mean(x);
  const centerY = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - centerX) * (y[i] - centerY);
    sxx += (x[i] - centerX) * (x[i] - centerX);
    syy += (y[i] - centerY) * (y[i] - centerY);
  }
  return sxy / Math.sqrt(sxx * syy);
}

// Counts per firm-month and per person-month, pooled over the window. The flow columns are zero outside the days that
// write them, so a window's total takes the year ends inside it and nothing else.
function flowRates(c: SummaryColumns, w: Window, meta: SummaryMeta) {
  const flow = (column: Float64Array): number => total(sums(column, w));
  const firmMonths = (w.last - w.first) * meta.params.firms;
  const unemployedAtStart = total(startLevels(c.unemployed, w));
  const employedAtStart = (w.last - w.first) * meta.size - unemployedAtStart;
  const unemployedAtEnd = total(endLevels(c.unemployed, w));
  return {
    price_change_share: ratio(flow(c.price_changes), firmMonths),
    stayer_cut_share: ratio(flow(c.stayer_cuts), flow(c.stayers)),
    job_finding: ratio(flow(c.hires), unemployedAtStart),
    markup: ratio(flow(c.sales_cents), flow(c.wage_bill)),
    hires_rate: ratio(flow(c.hires) + flow(c.switches), employedAtStart),
    layoff_rate: ratio(flow(c.firings), employedAtStart),
    job_to_job: ratio(flow(c.switches), employedAtStart),
    exit_rate: ratio(flow(c.exits), firmMonths),
    long_spell_share: ratio(flow(c.long_spells), unemployedAtEnd),
    mean_spell_months: ratio(flow(c.spell_months), unemployedAtEnd),
    price_change_size: ratio(flow(c.price_change_ppm), flow(c.price_changes)),
    above_markup_share: ratio(flow(c.above_markup), firmMonths),
    visit_success: ratio(flow(c.hires), flow(c.job_visits)),
  };
}

const FOODS = ['bread', 'vegetables', 'fish', 'milk'] as const;

// A window's total of one flow over the four foods.
function foodFlow(c: SummaryColumns, w: Window, flow: 'sold_cents' | 'made' | 'spoiled'): number {
  let sum = 0;
  for (const food of FOODS) sum += total(sums(c[`${flow}_${food}`], w));
  return sum;
}

// M2.4's reported shares: food's part of all spending in cents, the part of the food made that spoiled, and the part of the
// portions wanted that went short. A world with goods off has no food, so the last two are undefined.
function foodShares(c: SummaryColumns, w: Window) {
  const eaten = total(sums(c.eaten, w));
  const unmet = total(sums(c.unmet, w));
  return {
    food_share: ratio(foodFlow(c, w, 'sold_cents'), total(sums(c.sales_cents, w))),
    spoil_share: ratio(foodFlow(c, w, 'spoiled'), foodFlow(c, w, 'made')),
    unmet_share: ratio(unmet, eaten + unmet),
  };
}

function stockAndPrice(c: SummaryColumns, w: Window, meta: SummaryMeta) {
  const stock = endLevels(c.stock, w);
  const monthlySales = sums(c.sales_units, w);
  return {
    stock_months: mean(stock.map((units, i) => ratio(units, monthlySales[i]))),
    price_ratio: mean(endLevels(c.price_mean, w)) / meta.params.openingPrice,
  };
}

function cycleMeasures(c: SummaryColumns, w: Window, people: number) {
  const unemployed = endLevels(c.unemployed, w);
  const u = unemployed.map((n) => n / people);
  const priorU = startLevels(c.unemployed, w).map((n) => n / people);
  const vacancyRate = endLevels(c.vacancies, w).map((open, i) => open / (people - unemployed[i] + open));
  return {
    unemployment_mean: mean(u),
    unemployment_sd: sampleSd(u),
    phillips: correlation(growth(endLevels(c.wage_mean, w), startLevels(c.wage_mean, w)), u),
    // Output is the units made. Sales follow demand and stock, and measured on them Okun's sign came out positive (M2.3 review).
    okun: correlation(growth(sums(c.produced, w), priorSums(c.produced, w)), u.map((value, i) => value - priorU[i])),
    beveridge: correlation(vacancyRate, u),
  };
}

// From the raw moments of firm size: with mu the mean size, m2 = E[x^2] - mu^2 and m3 = E[x^3] - 3 mu E[x^2] + 2 mu^3.
function skewness(meanSize: number, meanSquares: number, meanCubes: number): number {
  const m2 = meanSquares - meanSize * meanSize;
  const m3 = meanCubes - 3 * meanSize * meanSquares + 2 * meanSize * meanSize * meanSize;
  return m2 > 0 ? m3 / (m2 * Math.sqrt(m2)) : NaN;
}

function sizeSkew(c: SummaryColumns, w: Window, meta: SummaryMeta): number {
  const firms = meta.params.firms;
  const squares = endLevels(c.size_squares, w);
  const cubes = endLevels(c.size_cubes, w);
  const skews = endLevels(c.unemployed, w).map((unemployed, i) =>
    skewness((meta.size - unemployed) / firms, squares[i] / firms, cubes[i] / firms),
  );
  return mean(skews);
}

export function summarize(columns: SummaryColumns, meta: SummaryMeta): TargetValues {
  const w = windowOf(meta);
  const cycle = cycleMeasures(columns, w, meta.size);
  return {
    ...flowRates(columns, w, meta),
    ...foodShares(columns, w),
    ...stockAndPrice(columns, w, meta),
    ...cycle,
    size_skew: sizeSkew(columns, w, meta),
    no_crisis: cycle.unemployment_sd <= CRISIS_SD && cycle.unemployment_mean < CRISIS_MEAN ? 1 : 0,
  };
}
