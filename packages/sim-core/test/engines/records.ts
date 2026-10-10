// Free of Node imports, so the engine harness replays spawns from the same records in Node, Bun and each browser.
import { SUPPLIERS } from '../../src/agents/store.ts';
import { MAX_HOUSEHOLD } from '../../src/households/store.ts';
import { below, draw } from '../../src/random/draw.ts';
import {
  LEDGER_EMPLOYED,
  LEDGER_FIRMS,
  LEDGER_FIRM_CASH,
  LEDGER_HOUSEHOLDS,
  LEDGER_HOUSEHOLD_CASH,
  LEDGER_PRICE,
  LEDGER_STOCK,
  LEDGER_UNEMPLOYED,
  LEDGER_WAGE,
  populationOf,
} from '../../src/spawn/record.ts';

const RECORD_STREAM = 0x7f6;
const MOST_HOUSEHOLDS = 60;
const MOST_FIRMS = 120;
const LEAST_POSTED = 100;
const MOST_PRICE = 100_000;
const MOST_WAGE = 10_000_000;
const TWO_32 = 2 ** 32;

function pick(n: number, seed: number, index: number, field: number): number {
  return below(n, seed, RECORD_STREAM, index, field);
}

// Whole cents below 2^bits, for bits from 32 to 52: a draw for the high bits, then one for the low 32.
function centsBelow(bits: number, seed: number, index: number, field: number): number {
  const high = pick(2 ** (bits - 32), seed, index, field);
  return high * TWO_32 + draw(seed, RECORD_STREAM, index, field, 1);
}

// A record spawn can fill: 0-60 households of each size, topped up with households of 1 to the 7 people that 7 firms
// need, then employment, firms, cash, price, wage and stock drawn inside the ranges checkRecord allows.
export function randomRecord(seed: number, index: number, out: Float64Array): void {
  for (let s = 1; s <= MAX_HOUSEHOLD; s++) {
    out[LEDGER_HOUSEHOLDS + s - 1] = pick(MOST_HOUSEHOLDS + 1, seed, index, LEDGER_HOUSEHOLDS + s - 1);
  }
  out[LEDGER_HOUSEHOLDS] += Math.max(0, SUPPLIERS - populationOf(out));
  const people = populationOf(out);
  out[LEDGER_EMPLOYED] = pick(people + 1, seed, index, LEDGER_EMPLOYED);
  out[LEDGER_UNEMPLOYED] = people - out[LEDGER_EMPLOYED];
  out[LEDGER_FIRMS] = SUPPLIERS + pick(Math.min(MOST_FIRMS, people) - SUPPLIERS + 1, seed, index, LEDGER_FIRMS);
  out[LEDGER_HOUSEHOLD_CASH] = centsBelow(40, seed, index, LEDGER_HOUSEHOLD_CASH);
  out[LEDGER_FIRM_CASH] = centsBelow(34, seed, index, LEDGER_FIRM_CASH);
  out[LEDGER_PRICE] = LEAST_POSTED + pick(MOST_PRICE - LEAST_POSTED + 1, seed, index, LEDGER_PRICE);
  out[LEDGER_WAGE] = LEAST_POSTED + pick(MOST_WAGE - LEAST_POSTED + 1, seed, index, LEDGER_WAGE);
  out[LEDGER_STOCK] = pick(2 ** 24, seed, index, LEDGER_STOCK);
}
