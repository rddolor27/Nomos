import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import {
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  LENGNICK,
  STATS,
  STAT_FIRM_CASH,
  STAT_HOUSEHOLD_CASH,
  STAT_NAMES,
  STAT_PRICE_MEAN,
  STAT_SALES_CENTS,
  STAT_UNEMPLOYED,
  createWorld,
  economyDay,
  mser5,
  startEconomy,
  type EconomyParams,
} from '@nomos/sim-core';

const MAX_SEED = 0xffff_ffff;
const MAX_INT32 = 0x7fff_ffff;
const MAX_SEEDS = 1_000;
// Ruling 9: the burn-in is the larger MSER-5 truncation, with half again as a margin.
const BURN_IN_MARGIN = 1.5;

interface EconomyOptions {
  readonly seed: number;
  readonly days: number;
  readonly params: EconomyParams;
  readonly out: string | undefined;
  readonly burnIn: boolean;
  readonly seeds: number;
}

function wholeNumber(flag: string, text: string, min: number, max: number): number {
  const n = Number(text);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new RangeError(`--${flag} must be a whole number from ${min} to ${max}, not ${text}`);
  }
  return n;
}

// startEconomy's checkParams bounds the fiat rate, so the flag only needs to be a whole number here.
function parseEconomyArgs(args: readonly string[]): EconomyOptions {
  const { values } = parseArgs({
    args: [...args],
    options: {
      seed: { type: 'string', default: '42' },
      days: { type: 'string', default: '20000' },
      'fiat-ppm': { type: 'string', default: '0' },
      out: { type: 'string' },
      'burn-in': { type: 'boolean', default: false },
      seeds: { type: 'string', default: '5' },
    },
  });
  const fiatIssuePpm = wholeNumber('fiat-ppm', values['fiat-ppm'], 0, MAX_INT32);
  return {
    seed: wholeNumber('seed', values.seed, 0, MAX_SEED),
    days: wholeNumber('days', values.days, 1, MAX_INT32),
    params: { ...LENGNICK, fiatIssuePpm },
    out: values.out,
    burnIn: values['burn-in'],
    seeds: wholeNumber('seeds', values.seeds, 1, MAX_SEEDS),
  };
}

// Copies each day's stats into rows, STATS to a day, and returns the milliseconds the sim days took.
function runSeed(seed: number, params: EconomyParams, days: number, rows: Float64Array): number {
  const world = createWorld(seed, 'phone', undefined, params.households);
  startEconomy(world, params);
  const stats = world.economyScratch.stats;
  const start = performance.now();
  for (let day = 0; day < days; day++) {
    economyDay(world, params, day);
    rows.set(stats, day * STATS);
  }
  return performance.now() - start;
}

// Ruling 11: the last month's sales over the cash of households and firms, per 112-day year. The first month's days
// average over the days run so far.
function velocityPerYear(rows: Float64Array, day: number): number {
  const first = Math.max(0, day - DAYS_PER_MONTH + 1);
  let salesCents = 0;
  for (let d = first; d <= day; d++) salesCents += rows[d * STATS + STAT_SALES_CENTS];
  const moneyCents = rows[day * STATS + STAT_HOUSEHOLD_CASH] + rows[day * STATS + STAT_FIRM_CASH];
  return (salesCents * DAYS_PER_YEAR) / (day - first + 1) / moneyCents;
}

// Counts and cents are whole; only the means carry a fraction.
function cell(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function toCsv(rows: Float64Array, days: number): string {
  const lines = [['day', ...STAT_NAMES, 'velocity'].join(',')];
  for (let day = 0; day < days; day++) {
    const cells = [String(day)];
    for (let slot = 0; slot < STATS; slot++) cells.push(cell(rows[day * STATS + slot]));
    cells.push(velocityPerYear(rows, day).toFixed(4));
    lines.push(cells.join(','));
  }
  return `${lines.join('\n')}\n`;
}

function reportSpeed(days: number, milliseconds: number): void {
  const perSecond = Math.round((days * 1_000) / milliseconds);
  process.stderr.write(`sim days per second: ${perSecond} (${days} days in ${milliseconds.toFixed(0)} ms, Node ${process.version})\n`);
}

function writeSeries(options: EconomyOptions): void {
  const rows = new Float64Array(options.days * STATS);
  const milliseconds = runSeed(options.seed, options.params, options.days, rows);
  const csv = toCsv(rows, options.days);
  if (options.out === undefined) {
    process.stdout.write(csv);
  } else {
    mkdirSync(dirname(options.out), { recursive: true });
    writeFileSync(options.out, csv);
  }
  reportSpeed(options.days, milliseconds);
}

// Ruling 9 (R2's validation notes, part 5): MSER-5 on the seeds' mean daily price and unemployment share. Seeds run
// from --seed up.
function measureBurnIn(options: EconomyOptions): void {
  const { days, seeds, params } = options;
  const rows = new Float64Array(days * STATS);
  const price = new Float64Array(days);
  const unemployment = new Float64Array(days);
  let milliseconds = 0;
  for (let s = 0; s < seeds; s++) {
    milliseconds += runSeed(options.seed + s, params, days, rows);
    for (let day = 0; day < days; day++) {
      price[day] += rows[day * STATS + STAT_PRICE_MEAN] / seeds;
      unemployment[day] += rows[day * STATS + STAT_UNEMPLOYED] / params.households / seeds;
    }
  }
  const priceDays = mser5(price, days);
  const unemploymentDays = mser5(unemployment, days);
  console.log(`price_mean truncation=${priceDays}`);
  console.log(`unemployment truncation=${unemploymentDays}`);
  if (priceDays < 0 || unemploymentDays < 0) {
    console.log('no MSER-5 minimum in the first half of the run: run longer, or start from a spun-up snapshot');
    process.exitCode = 1;
  } else {
    console.log(`burnInDays=${Math.ceil(BURN_IN_MARGIN * Math.max(priceDays, unemploymentDays))}`);
  }
  reportSpeed(days * seeds, milliseconds);
}

export function runEconomy(args: readonly string[]): void {
  const options = parseEconomyArgs(args);
  if (options.burnIn) measureBurnIn(options);
  else writeSeries(options);
}
