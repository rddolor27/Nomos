import { CITY_RECORD } from '../economy/city-record.ts';
import { MAX_HOUSEHOLD } from '../households/store.ts';
import { floorDiv } from '../maths/int.ts';
import { PPM, mulPpm } from '../money/ppm.ts';
import { drawBelow4 } from '../random/draw.ts';
import { AWAY_DRAW } from '../random/streams.ts';
import { AWAY_FIT_PEOPLE, AWAY_NOISE_PPM, AWAY_SHARE_PPM } from './away-rates.ts';
import {
  LEDGER_EMPLOYED,
  LEDGER_FIELDS,
  LEDGER_FIRM_CASH,
  LEDGER_HOUSEHOLDS,
  LEDGER_HOUSEHOLD_CASH,
  LEDGER_PRICE,
  LEDGER_STOCK,
  LEDGER_UNEMPLOYED,
  LEDGER_WAGE,
  scaleRecord,
} from './record.ts';

// The summary month (M2.2c Ruling 8): a town off screen advances its ledger row once a month and never runs its economy.
// Employed, price and wage close a fitted share of their distance to the town's first record, scaleRecord(CITY_RECORD,
// people), and take zero-mean keyed noise. Stock and the split of cash between households and firms return to that
// record. People, households, firms and the cash total never change, since this cut moves no person or money between towns.
// A row reads only itself, so no town's step depends on another's.

// The fields that drift, in the order away-rates.ts lists their shares and noise.
export const AWAY_FIELDS = /* @__PURE__ */ Uint8Array.of(LEDGER_EMPLOYED, LEDGER_PRICE, LEDGER_WAGE);

// checkRecord's floor on a posted price and wage.
const MIN_POSTED_CENTS = 100;
// Steps are worked in thousandths of a person or cent. The noise then dithers the rounding, so a pull under one whole unit
// still acts on average, where rounding the pull alone would stall a slow field.
const MILLI = 1_000;
const HALF_MILLI = 500;

// A step of the table's row `town` in place. `anchor` is the caller's scratch row, where the first record is rebuilt each
// call. A row with no people is unvisited, and stays as it is.
export function stepAwayTown(rows: Float64Array, town: number, seed: number, month: number, anchor: Float64Array): void {
  const first = town * LEDGER_FIELDS;
  const people = peopleAt(rows, first);
  if (people === 0) return;
  scaleRecord(CITY_RECORD, people, anchor);
  for (let drift = 0; drift < AWAY_FIELDS.length; drift++) {
    const field = AWAY_FIELDS[drift];
    rows[first + field] = driftedLevel(rows[first + field], anchor[field], drift, people, seed, town, month, field);
  }
  keepWithinRecord(rows, first, people);
  rows[first + LEDGER_STOCK] = anchor[LEDGER_STOCK];
  resetCashSplit(rows, first, anchor);
}

// Every row with people but the live town's, whose economy runs. `live` is -1 when no town is.
export function stepAwayTowns(rows: Float64Array, live: number, seed: number, month: number, anchor: Float64Array): void {
  const towns = floorDiv(rows.length, LEDGER_FIELDS);
  for (let town = 0; town < towns; town++) {
    if (town !== live) stepAwayTown(rows, town, seed, month, anchor);
  }
}

function peopleAt(rows: Float64Array, first: number): number {
  let people = 0;
  for (let size = 1; size <= MAX_HOUSEHOLD; size++) people += size * rows[first + LEDGER_HOUSEHOLDS + size - 1];
  return people;
}

// AR(1) about the first record: the part of the gap the fit keeps, plus the month's noise, rounded to a whole unit.
function driftedLevel(
  current: number,
  level: number,
  drift: number,
  people: number,
  seed: number,
  town: number,
  month: number,
  field: number,
): number {
  const gap = current - level;
  const keptMilli = mulPpm(Math.abs(gap) * MILLI, PPM - AWAY_SHARE_PPM[drift]);
  const width = noiseWidth(level, drift, people);
  const noiseMilli =
    drawBelow4(seed, AWAY_DRAW, town, month, field, 0, width) +
    drawBelow4(seed, AWAY_DRAW, town, month, field, 1, width) -
    (width - 1);
  return level + floorDiv((gap < 0 ? -keptMilli : keptMilli) + noiseMilli + HALF_MILLI, MILLI);
}

// Two draws below n sum, less n - 1, to a zero-mean triangle of variance (n^2 - 1) / 6 thousandths, so n is the root of 6
// sigma^2 + 1. Sigma is the fitted deviation of a town of AWAY_FIT_PEOPLE, in thousandths, and a town's month sums many
// small choices, so it shrinks with the square root of the town's size (inference).
function noiseWidth(level: number, drift: number, people: number): number {
  const sigmaMilli = mulPpm(level * MILLI, AWAY_NOISE_PPM[drift]);
  return Math.round(Math.sqrt(1 + (6 * AWAY_FIT_PEOPLE * sigmaMilli * sigmaMilli) / people));
}

// Noise on a small town can pass either end of employed, or take a price or wage under checkRecord's floor.
function keepWithinRecord(rows: Float64Array, first: number, people: number): void {
  const employed = Math.min(people, Math.max(0, rows[first + LEDGER_EMPLOYED]));
  rows[first + LEDGER_EMPLOYED] = employed;
  rows[first + LEDGER_UNEMPLOYED] = people - employed;
  rows[first + LEDGER_PRICE] = Math.max(MIN_POSTED_CENTS, rows[first + LEDGER_PRICE]);
  rows[first + LEDGER_WAGE] = Math.max(MIN_POSTED_CENTS, rows[first + LEDGER_WAGE]);
}

// Firms hold the first record's cash, or all of it if the total is smaller, and households the rest, so the total is exact.
function resetCashSplit(rows: Float64Array, first: number, anchor: Float64Array): void {
  const total = rows[first + LEDGER_HOUSEHOLD_CASH] + rows[first + LEDGER_FIRM_CASH];
  const firms = Math.min(total, anchor[LEDGER_FIRM_CASH]);
  rows[first + LEDGER_FIRM_CASH] = firms;
  rows[first + LEDGER_HOUSEHOLD_CASH] = total - firms;
}
