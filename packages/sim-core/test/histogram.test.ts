import { describe, expect, it } from 'vitest';
import { draw2 } from '../src/random/draw.ts';
import {
  BINS_PER_OCTAVE,
  HISTOGRAM_BINS,
  addValue,
  binOf,
  clearHistogram,
  createHistogram,
  giniPpm,
  topShare,
} from '../src/money/histogram.ts';
import { reserveArena } from '../src/memory/arena.ts';

const TOP_TENTH_PPM = 100_000;
const SAMPLES = 100_000;

// A keyed uniform in (0, 1).
function uniform(stream: number, i: number, k: number): number {
  return (draw2(42, stream, i, k) + 0.5) / 4_294_967_296;
}

// Box-Muller, with a median of 10^6 cents.
function lognormalCents(i: number): number {
  const z = Math.sqrt(-2 * Math.log(uniform(1, i, 0))) * Math.cos(2 * Math.PI * uniform(1, i, 1));
  return Math.round(1_000_000 * Math.exp(1.2 * z));
}

function paretoCents(i: number): number {
  return Math.floor(1_000_000 * Math.exp(-Math.log(uniform(2, i, 0)) / 1.5));
}

function sortedSharePpm(values: number[], topPpm: number): number {
  const sorted = [...values].sort((a, b) => b - a);
  const topCount = Math.floor((values.length * topPpm) / 1_000_000);
  const sum = (part: number[]) => part.reduce((total, v) => total + v, 0);
  return (sum(sorted.slice(0, topCount)) / sum(sorted)) * 1_000_000;
}

function giniOf(values: number[]): number {
  const histogram = createHistogram(reserveArena(65_536));
  for (const v of values) addValue(histogram, v);
  return giniPpm(histogram);
}

// One holder among N, padded with N - 1 zeros.
function oneHolderAmong(n: number): number[] {
  const values = new Array<number>(n).fill(0);
  values[n - 1] = 100_000;
  return values;
}

// The bin read straight from the binary digits: the leading one's place, then the four digits below it.
function binByDigits(v: number): number {
  if (v === 0) return 0;
  const digits = BigInt(v).toString(2);
  return 1 + (digits.length - 1) * 16 + parseInt(digits.slice(1, 5).padEnd(4, '0'), 2);
}

describe('the log2 histogram', () => {
  it('bins 16 steps per octave', () => {
    expect(BINS_PER_OCTAVE).toBe(16);
    expect(HISTOGRAM_BINS).toBe(849);
    expect([0, 1, 2, 3, Number.MAX_SAFE_INTEGER].map(binOf)).toEqual([0, 1, 17, 25, 848]);
  });

  it('bins like the binary digits at every step edge and across the 32-bit split', () => {
    const values = [0, Number.MAX_SAFE_INTEGER, 2 ** 32 - 1, 2 ** 32, 2 ** 32 + 1];
    for (let octave = 0; octave < 53; octave++) {
      for (let step = 0; step < 16; step++) {
        const edge = Math.ceil(2 ** octave * (1 + step / 16));
        values.push(edge - 1, edge, edge + 1);
      }
    }
    for (let i = 0; i < 2_000; i++) {
      const wide = (draw2(7, 1, i, 0) % 2_097_152) * 4_294_967_296 + draw2(7, 1, i, 1);
      values.push(Math.floor(wide / 2 ** (draw2(7, 1, i, 2) % 53)));
    }
    for (const v of values) expect(binOf(v), `${v}`).toBe(binByDigits(v));
  });

  it('tallies count and sum per bin, keeps zeros in bin 0 and clears', () => {
    const arena = reserveArena(65_536);
    const histogram = createHistogram(arena);
    expect(arena.canonical).toEqual([]);
    for (const v of [0, 0, 1, 3, 3]) addValue(histogram, v);
    expect([histogram.count[0], histogram.count[1], histogram.count[25]]).toEqual([2, 1, 2]);
    expect([histogram.sum[0], histogram.sum[1], histogram.sum[25]]).toEqual([0, 1, 6]);
    clearHistogram(histogram);
    expect(histogram.count.every((n) => n === 0) && histogram.sum.every((s) => s === 0)).toBe(true);
  });

  it('splits the cut bin pro rata and handles the empty and whole ranges', () => {
    const histogram = createHistogram(reserveArena(65_536));
    expect(topShare(histogram, TOP_TENTH_PPM)).toBe(0);
    for (const v of [100, 100, 100, 100, 100, 100, 100, 100, 1_000, 1_010]) addValue(histogram, v);
    // 1,000 and 1,010 share a bin, so the one top entry is half their 2,010 and the share is 1,005 / 2,810.
    expect(topShare(histogram, TOP_TENTH_PPM)).toBe(357_651);
    expect(topShare(histogram, 0)).toBe(0);
    expect(topShare(histogram, 1_000_000)).toBe(1_000_000);
  });

  it('takes the top-10% share within 0.03 points of a sort', () => {
    for (const make of [lognormalCents, paretoCents]) {
      const values = Array.from({ length: SAMPLES }, (_, i) => make(i));
      const histogram = createHistogram(reserveArena(65_536));
      for (const v of values) addValue(histogram, v);
      const gap = Math.abs(topShare(histogram, TOP_TENTH_PPM) - sortedSharePpm(values, TOP_TENTH_PPM));
      expect(gap, make.name).toBeLessThanOrEqual(300);
    }
  });

  it('gives a Gini of 0 for no holdings, all zeros or equal holdings', () => {
    expect(giniOf([])).toBe(0);
    expect(giniOf([0, 0, 0])).toBe(0);
    expect(giniOf(new Array<number>(1_000).fill(12_345))).toBe(0);
  });

  it('gives (N - 1) / N when one holder among N has everything', () => {
    expect(giniOf(oneHolderAmong(2))).toBe(500_000);
    expect(giniOf(oneHolderAmong(10))).toBe(900_000);
    expect(giniOf(oneHolderAmong(10_000))).toBe(999_900);
  });

  it('gives the exact Gini, to the nearest ppm, when no two holdings share a bin', () => {
    // 2 and 3 give 1 - 9/10, which floats put at 0.09999999999999998.
    expect(giniOf([2, 3])).toBe(100_000);
    expect(giniOf([0, 1, 2, 4, 8])).toBe(506_667);
  });
});
