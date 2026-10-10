import { SUPPLIERS } from '../agents/store.ts';
import { MAX_HOUSEHOLD } from '../households/store.ts';
import { MAX_SAFE_CENTS } from '../money/invariants.ts';
import type { World } from '../world/world.ts';

// A city's ledger record (M2.2 Ruling 4): whole numbers in a Float64Array, so cents stay exact below 2^53. Households of
// s people sit at LEDGER_HOUSEHOLDS + s - 1, and price and wage are means over firms, in cents, rounded down.
export const LEDGER_HOUSEHOLDS = 0;
export const LEDGER_EMPLOYED = 6;
export const LEDGER_UNEMPLOYED = 7;
export const LEDGER_FIRMS = 8;
export const LEDGER_HOUSEHOLD_CASH = 9;
export const LEDGER_FIRM_CASH = 10;
export const LEDGER_PRICE = 11;
export const LEDGER_WAGE = 12;
export const LEDGER_STOCK = 13;
export const LEDGER_FIELDS = 14;

const FIELD_NAMES = [
  'householdsOf1',
  'householdsOf2',
  'householdsOf3',
  'householdsOf4',
  'householdsOf5',
  'householdsOf6',
  'employed',
  'unemployed',
  'firms',
  'householdCash',
  'firmCash',
  'price',
  'wage',
  'stock',
];
// Spawn spreads prices around the mean, and a floor of 100 cents keeps every price it draws above 0.
const MIN_POSTED_CENTS = 100;
// Firm stock is an Int32Array.
const MAX_STOCK = 2_147_483_647;

export function populationOf(record: Float64Array): number {
  let people = 0;
  for (let size = 1; size <= MAX_HOUSEHOLD; size++) people += size * record[LEDGER_HOUSEHOLDS + size - 1];
  return people;
}

// What spawn needs of a record to build a city that folds back into it. The world gives the room: agent and firm slots.
export function checkRecord(record: Float64Array, world: World): void {
  for (let field = 0; field < LEDGER_FIELDS; field++) requireWhole(record, field);
  const people = populationOf(record);
  requirePopulation(record, people, world.agents.capacity);
  requireFirms(record[LEDGER_FIRMS], Math.min(people, world.firms.capacity));
  requireAtLeast(record, LEDGER_PRICE, MIN_POSTED_CENTS);
  requireAtLeast(record, LEDGER_WAGE, MIN_POSTED_CENTS);
  requireAtMost(record, LEDGER_STOCK, MAX_STOCK);
  requireCashTotal(record);
  requireTotalOverFirms(record, LEDGER_PRICE);
  requireTotalOverFirms(record, LEDGER_WAGE);
}

function requireWhole(record: Float64Array, field: number): void {
  const value = record[field];
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${FIELD_NAMES[field]} must be a whole number of 0 or more, not ${value}`);
  }
}

function requirePopulation(record: Float64Array, people: number, capacity: number): void {
  if (people < 1 || people > capacity) throw new RangeError(`population must be 1 to ${capacity}, not ${people}`);
  const counted = record[LEDGER_EMPLOYED] + record[LEDGER_UNEMPLOYED];
  if (counted !== people) {
    throw new RangeError(`employed + unemployed must equal the population ${people}, not ${counted}`);
  }
}

function requireFirms(firms: number, most: number): void {
  if (firms < SUPPLIERS || firms > most) throw new RangeError(`firms must be ${SUPPLIERS} to ${most}, not ${firms}`);
}

function requireAtLeast(record: Float64Array, field: number, least: number): void {
  if (record[field] < least) throw new RangeError(`${FIELD_NAMES[field]} must be ${least} or more, not ${record[field]}`);
}

function requireAtMost(record: Float64Array, field: number, most: number): void {
  if (record[field] > most) throw new RangeError(`${FIELD_NAMES[field]} must be ${most} or less, not ${record[field]}`);
}

// MINT holds minus the two cash fields' sum, so the sum must be exact cents. A true sum past 2^53 - 1 rounds to 2^53 or
// more, so the float comparison still catches it.
function requireCashTotal(record: Float64Array): void {
  const households = record[LEDGER_HOUSEHOLD_CASH];
  const firms = record[LEDGER_FIRM_CASH];
  if (households + firms > MAX_SAFE_CENTS) {
    throw new RangeError(`householdCash + firmCash must be ${MAX_SAFE_CENTS} or less, not ${households} + ${firms}`);
  }
}

// Spawn spreads price x firms over the firms in exact cents, and every firm takes the wage, so fold's sum over the
// firms is wage x firms; each product rounds as the sum above does.
function requireTotalOverFirms(record: Float64Array, field: number): void {
  const cents = record[field];
  const firms = record[LEDGER_FIRMS];
  if (cents * firms > MAX_SAFE_CENTS) {
    throw new RangeError(`${FIELD_NAMES[field]} x firms must be ${MAX_SAFE_CENTS} or less, not ${cents} x ${firms}`);
  }
}
