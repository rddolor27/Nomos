import { describe, expect, it } from 'vitest';
import {
  LEDGER_EMPLOYED,
  LEDGER_FIELDS,
  LEDGER_FIRMS,
  LEDGER_HOUSEHOLDS,
  LEDGER_UNEMPLOYED,
  populationOf,
  scaleRecord,
} from '../src/spawn/record.ts';

// Households of 1 to 6, employed, unemployed, firms, the two cash fields, price, wage and stock: CITY's settled record when
// this was written, kept here so a new CITY_RECORD moves no figure below.
const SETTLED = Float64Array.of(1_000, 0, 0, 0, 0, 0, 917, 83, 100, 298_274_833, 11_725_167, 3_159, 133_887, 53_562);
// 2,310 people in households of 1 to 6, as in the town-homes test.
const MIXED = Float64Array.of(200, 200, 150, 150, 60, 60, 2_000, 310, 231, 700_000_000, 20_000_000, 3_000, 140_000, 9_000);

function scaled(record: Float64Array, people: number): Float64Array {
  const out = new Float64Array(LEDGER_FIELDS);
  scaleRecord(record, people, out);
  return out;
}

describe('scaleRecord', () => {
  it('multiplies every count and total at a multiple of 1,000, and leaves price and wage, as the design runner did', () => {
    expect(Array.from(scaled(SETTLED, 3_000))).toEqual([
      3_000, 0, 0, 0, 0, 0, 2_751, 249, 300, 894_824_499, 35_175_501, 3_159, 133_887, 160_686,
    ]);
    expect(Array.from(scaled(SETTLED, 100_000))).toEqual([
      100_000, 0, 0, 0, 0, 0, 91_700, 8_300, 10_000, 29_827_483_300, 1_172_516_700, 3_159, 133_887, 5_356_200,
    ]);
  });

  it('rounds down, and gives the person it drops to the unemployed', () => {
    // 917 x 3.965 is 3,635.9: the 3,635 employed leave 330 unemployed, where 83 x 3.965 alone would give 329.
    expect(Array.from(scaled(SETTLED, 3_965))).toEqual([
      3_965, 0, 0, 0, 0, 0, 3_635, 330, 396, 1_182_659_712, 46_490_287, 3_159, 133_887, 212_373,
    ]);
  });

  it('adds one-person households until the people add up, whatever the household sizes', () => {
    const out = scaled(MIXED, 1_000);
    // 981 people stand in the rounded households, so 19 more households of 1 make 1,000.
    expect(Array.from(out.subarray(LEDGER_HOUSEHOLDS, LEDGER_EMPLOYED))).toEqual([105, 86, 64, 64, 25, 25]);
    expect([populationOf(out), out[LEDGER_EMPLOYED] + out[LEDGER_UNEMPLOYED]]).toEqual([1_000, 1_000]);
  });

  it('keeps 7 firms for 69 people, where 100 x 69 / 1,000 rounds down to 6', () => {
    const out = scaled(SETTLED, 69);
    expect([out[LEDGER_FIRMS], populationOf(out), out[LEDGER_EMPLOYED] + out[LEDGER_UNEMPLOYED]]).toEqual([7, 69, 69]);
  });
});
