import { describe, expect, it } from 'vitest';
import { apportion, apportionByStride, createApportionScratch } from '../src/maths/apportion.ts';
import { draw2 } from '../src/random/draw.ts';
import { reserveArena } from '../src/memory/arena.ts';

const STREAM = 0x7f3;
const CASES = 10_000;
const MAX_WEIGHTS = 64;
const TWO_32 = 2 ** 32;
const TWO_45 = 2 ** 45;
const TWO_53 = 2 ** 53;
const BIG_PATH_FLOOR = Math.ceil(TWO_53 / 4_095);

function hamilton(total: number, weights: number[]): { floors: number[]; seats: number[] } {
  const bigTotal = BigInt(total);
  const sum = weights.reduce((acc, w) => acc + BigInt(w), 0n);
  const floors = weights.map((w) => (bigTotal * BigInt(w)) / sum);
  const remainders = weights.map((w) => (bigTotal * BigInt(w)) % sum);
  const seats = [...floors];
  let leftover = bigTotal - floors.reduce((acc, f) => acc + f, 0n);
  const byRemainder = weights.map((_, i) => i).sort((a, b) => compareRemainders(remainders, a, b));
  for (let r = 0; leftover > 0n; r++, leftover--) seats[byRemainder[r]] += 1n;
  return { floors: floors.map(Number), seats: seats.map(Number) };
}

function compareRemainders(remainders: bigint[], a: number, b: number): number {
  if (remainders[a] !== remainders[b]) return remainders[a] > remainders[b] ? -1 : 1;
  return a - b;
}

// Totals by c % 4: below 2^20, below 2^40, in [2^53 / 4,095, 2^45) or in [2^45, 2^53).
function totalFor(c: number): number {
  const below53 = (draw2(42, STREAM, c, 1) >>> 11) * TWO_32 + draw2(42, STREAM, c, 2);
  switch (c % 4) {
    case 0:
      return below53 % 2 ** 20;
    case 1:
      return below53 % 2 ** 40;
    case 2:
      return BIG_PATH_FLOOR + (below53 % (TWO_45 - BIG_PATH_FLOOR));
    default:
      return TWO_45 + (below53 % (TWO_53 - TWO_45));
  }
}

function weightsFor(c: number): number[] {
  const count = 1 + (draw2(42, STREAM, c, 3) % MAX_WEIGHTS);
  return Array.from({ length: count }, (_, i) => 1 + (draw2(42, STREAM, c, 100 + i) % 4_095));
}

function sumOf(values: Float64Array, n: number): number {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += values[i];
  return sum;
}

describe('exact apportionment', () => {
  it('matches a BigInt reference over 10,000 random cases', () => {
    const scratch = createApportionScratch(reserveArena(65_536), MAX_WEIGHTS);
    const seats = new Float64Array(MAX_WEIGHTS);
    const strided = new Float64Array(MAX_WEIGHTS);
    let bigPathCases = 0;
    for (let c = 0; c < CASES; c++) {
      const total = totalFor(c);
      const weights = weightsFor(c);
      const n = weights.length;
      const reference = hamilton(total, weights);
      apportion(total, weights, n, seats, scratch);
      apportionByStride(total, weights, n, strided, draw2(42, STREAM, c, 4));
      expect(Array.from(seats.subarray(0, n)), `case ${c}`).toEqual(reference.seats);
      const extras = Array.from(strided.subarray(0, n), (cents, i) => cents - reference.floors[i]);
      expect(extras.every((extra) => extra === 0 || extra === 1), `case ${c}`).toBe(true);
      expect([sumOf(seats, n), sumOf(strided, n)], `case ${c}`).toEqual([total, total]);
      if (BigInt(total) * BigInt(Math.max(...weights)) >= 2n ** 53n) bigPathCases++;
    }
    expect(bigPathCases).toBeGreaterThanOrEqual(2_000);
  });

  it('breaks ties toward the lower index', () => {
    const scratch = createApportionScratch(reserveArena(65_536), 4);
    const cases: [number, number[], number[]][] = [
      [1, [1, 1, 1], [1, 0, 0]],
      [10, [1, 1, 1], [4, 3, 3]],
      [7, [0, 5, 0, 5], [0, 4, 0, 3]],
      [0, [3, 4], [0, 0]],
    ];
    for (const [total, weights, expected] of cases) {
      const seats = new Float64Array(weights.length);
      apportion(total, weights, weights.length, seats, scratch);
      expect(Array.from(seats), `${total} over ${weights}`).toEqual(expected);
    }
  });

  it('spreads leftover cents along a keyed stride', () => {
    const weights = new Array<number>(1_000).fill(1);
    const cents = new Float64Array(1_000);
    apportionByStride(999, weights, 1_000, cents, 12_345);
    expect(cents.filter((c) => c === 1)).toHaveLength(999);
    expect(sumOf(cents, 1_000)).toBe(999);
    const again = new Float64Array(1_000);
    apportionByStride(999, weights, 1_000, again, 12_345);
    expect(again).toEqual(cents);
    const emptyEntries = new Set<number>();
    for (let word = 0; word < 100; word++) {
      apportionByStride(999, weights, 1_000, cents, word);
      expect(cents.filter((c) => c === 1), `word ${word}`).toHaveLength(999);
      emptyEntries.add(cents.indexOf(0));
    }
    expect(emptyEntries.size).toBeGreaterThanOrEqual(50);
  });

  it('refuses fewer than one weight, where the stride would search forever', () => {
    const cents = new Float64Array(1);
    expect(() => apportionByStride(5, [], 0, cents, 7)).toThrow(RangeError);
    expect(() => apportionByStride(0, [], 0, cents, 7)).toThrow(RangeError);
    expect(() => apportionByStride(5, [1], -1, cents, 7)).toThrow(RangeError);
  });

  it('never strides a leftover cent onto a zero weight', () => {
    const cents = new Float64Array(4);
    for (let word = 0; word < 100; word++) {
      apportionByStride(7, [0, 5, 0, 5], 4, cents, word);
      expect([cents[0], cents[2], cents[1] + cents[3]], `word ${word}`).toEqual([0, 0, 7]);
    }
  });
});
