import { describe, expect, it } from 'vitest';
import { buildTables } from '../scripts/tables.ts';
import { draw2 } from '../src/random/draw.ts';
import { log2Q16 } from '../src/maths/log2.ts';
import * as tables from '../src/maths/tables.ts';

const {
  BAND_SHARE_PPM,
  CASH_WEIGHTS,
  COPULA_Q16,
  EXP2_Q30,
  FADE_0_35Y,
  FADE_1Y,
  FADE_2_6Y,
  FIRM_SIZE_WEIGHTS,
  INV_NORMAL_Q16,
  LOG2_Q16,
  PRICE_WEIGHTS,
  WALK_SINE_Q8,
} = tables;

function ranks(values: ArrayLike<number>): number[] {
  const order = Array.from(values, (_, k) => k).sort((a, b) => values[a] - values[b]);
  const ranked = new Array<number>(order.length);
  let first = 0;
  while (first < order.length) {
    let last = first;
    while (last + 1 < order.length && values[order[last + 1]] === values[order[first]]) last++;
    for (let k = first; k <= last; k++) ranked[order[k]] = (first + last) / 2;
    first = last + 1;
  }
  return ranked;
}

function pearson(x: number[], y: number[]): number {
  const meanX = x.reduce((sum, v) => sum + v, 0) / x.length;
  const meanY = y.reduce((sum, v) => sum + v, 0) / y.length;
  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;
  for (let k = 0; k < x.length; k++) {
    covariance += (x[k] - meanX) * (y[k] - meanY);
    varianceX += (x[k] - meanX) ** 2;
    varianceY += (y[k] - meanY) ** 2;
  }
  return covariance / Math.sqrt(varianceX * varianceY);
}

function spearman(x: ArrayLike<number>, y: ArrayLike<number>): number {
  return pearson(ranks(x), ranks(y));
}

function sdOfLogs(values: ArrayLike<number>): number {
  const logs = Array.from(values, (value) => Math.log(value));
  const mean = logs.reduce((sum, v) => sum + v, 0) / logs.length;
  return Math.sqrt(logs.reduce((sum, v) => sum + (v - mean) ** 2, 0) / logs.length);
}

describe('the build-time tables', () => {
  it('matches its generator', () => {
    const built = buildTables();
    expect(Object.keys(tables).sort()).toEqual(Object.keys(built).sort());
    for (const [name, values] of Object.entries(built)) {
      expect(Array.from(tables[name as keyof typeof tables]), name).toEqual(values);
    }
  });

  it('has the planned types and sizes', () => {
    expect(LOG2_Q16).toBeInstanceOf(Uint16Array);
    expect(LOG2_Q16).toHaveLength(256);
    expect(INV_NORMAL_Q16).toBeInstanceOf(Int32Array);
    expect(INV_NORMAL_Q16).toHaveLength(4096);
    expect(BAND_SHARE_PPM).toBeInstanceOf(Int32Array);
    expect(BAND_SHARE_PPM).toHaveLength(201 * 5);
    expect(COPULA_Q16).toBeInstanceOf(Uint16Array);
    expect(COPULA_Q16).toHaveLength(64 * 64);
    for (const fade of [FADE_0_35Y, FADE_1Y, FADE_2_6Y]) expect(fade).toBeInstanceOf(Uint16Array);
    expect(WALK_SINE_Q8).toBeInstanceOf(Uint16Array);
    expect(WALK_SINE_Q8).toHaveLength(65);
    // 2^31 is its last entry, one past Int32Array.
    expect(EXP2_Q30).toBeInstanceOf(Uint32Array);
    expect(EXP2_Q30).toHaveLength(65);
    for (const weights of [CASH_WEIGHTS, PRICE_WEIGHTS, FIRM_SIZE_WEIGHTS]) {
      expect(weights).toBeInstanceOf(Uint16Array);
      expect(weights).toHaveLength(256);
    }
  });

  it("holds exp2's 2^(k / 64) in Q30, from 1 to 2", () => {
    expect([EXP2_Q30[0], EXP2_Q30[32], EXP2_Q30[64]]).toEqual([1_073_741_824, 1_518_500_250, 2_147_483_648]);
    expect(EXP2_Q30.every((value, k) => k === 0 || value > EXP2_Q30[k - 1])).toBe(true);
  });

  it("holds the walking step's sine over a quarter turn", () => {
    expect([WALK_SINE_Q8[0], WALK_SINE_Q8[1], WALK_SINE_Q8[32], WALK_SINE_Q8[64]]).toEqual([0, 25, 724, 1_024]);
    expect(WALK_SINE_Q8.every((value, k) => k === 0 || value >= WALK_SINE_Q8[k - 1])).toBe(true);
  });

  it('spreads each weight table as a lognormal of its sigma, from 1 to 4,095', () => {
    const sigmas = { CASH_WEIGHTS: 0.07, PRICE_WEIGHTS: 0.025, FIRM_SIZE_WEIGHTS: 0.5 };
    for (const [name, sigma] of Object.entries(sigmas)) {
      const weights = tables[name as keyof typeof sigmas];
      expect(weights[0], `${name} starts at 1 or more`).toBeGreaterThanOrEqual(1);
      expect(weights[255], `${name} ends at 4,095`).toBe(4_095);
      expect(
        weights.every((value, i) => i === 0 || value >= weights[i - 1]),
        `${name} never falls`,
      ).toBe(true);
      expect(Math.abs(sdOfLogs(weights) / sigma - 1), `${name}'s SD of ln within 3% of sigma`).toBeLessThanOrEqual(0.03);
    }
  });

  it("pins each weight table's ends and middle to Python's NormalDist", () => {
    // round(K * exp(sigma * z)), where z = NormalDist().inv_cdf((i + 0.5) / 256) and K puts entry 255 at 4,095.
    const at = [0, 127, 128, 255];
    expect(at.map((i) => CASH_WEIGHTS[i])).toEqual([2_734, 3_345, 3_347, 4_095]);
    expect(at.map((i) => PRICE_WEIGHTS[i])).toEqual([3_545, 3_810, 3_810, 4_095]);
    expect(at.map((i) => FIRM_SIZE_WEIGHTS[i])).toEqual([229, 965, 970, 4_095]);
  });

  it('gives log2 in Q16 within the 8-bit mantissa bound', () => {
    expect(LOG2_Q16[128]).toBe(38_336);
    expect([1, 2, 3].map((x) => log2Q16(x))).toEqual([0, 65_536, 103_872]);
    const outside: string[] = [];
    for (let i = 0; i < 10_000; i++) {
      const bits = 1 + (draw2(42, 0x7a, i, 0) % 32);
      const x = Math.max(1, draw2(42, 0x7a, i, 1) >>> (32 - bits));
      const exact = 65_536 * Math.log2(x);
      const got = log2Q16(x);
      if (got < exact - 370 || got > exact + 1) outside.push(`x ${x}: got ${got}, exact ${exact}`);
    }
    expect(outside).toEqual([]);
  });

  it('halves each fade table at its half-life', () => {
    const fades = { FADE_0_35Y, FADE_1Y, FADE_2_6Y };
    for (const [name, fade] of Object.entries(fades)) {
      expect(fade[0], name).toBe(32_768);
      expect(
        fade.every((value, day) => day === 0 || value <= fade[day - 1]),
        `${name} never rises`,
      ).toBe(true);
      expect(fade.indexOf(0), `${name} ends with its only 0`).toBe(fade.length - 1);
    }
    expect(FADE_1Y[112]).toBe(16_384);
    expect(FADE_0_35Y[196]).toBe(1_024);
    expect(FADE_2_6Y[1_456]).toBe(1_024);
    // 16 half-lives leave exactly 0.5, and half rounds up.
    expect(FADE_1Y[1_792]).toBe(1);
    expect(FADE_1Y).toHaveLength(1_794);
  });

  it('centres the inverse-normal table', () => {
    const lopsided: number[] = [];
    for (let i = 0; i < 4096; i++) {
      if (Math.abs(INV_NORMAL_Q16[i] + INV_NORMAL_Q16[4095 - i]) > 1) lopsided.push(i);
    }
    expect(lopsided).toEqual([]);
    expect(INV_NORMAL_Q16[0]).toBeGreaterThan(-3.7 * 65_536);
    expect(INV_NORMAL_Q16[0]).toBeLessThan(-3.6 * 65_536);
    const mean = INV_NORMAL_Q16.reduce((sum, v) => sum + v, 0) / 4096;
    const variance = INV_NORMAL_Q16.reduce((sum, v) => sum + (v - mean) ** 2, 0) / 4096;
    expect(Math.sqrt(variance) / 65_536).toBeGreaterThanOrEqual(0.99);
    expect(Math.sqrt(variance) / 65_536).toBeLessThanOrEqual(1.0);
  });

  it('sums every band-share row to a million ppm', () => {
    const band = (row: number, k: number): number => BAND_SHARE_PPM[row * 5 + k];
    const badSums: number[] = [];
    const wobbling: number[] = [];
    for (let row = 0; row <= 200; row++) {
      if ([0, 1, 2, 3, 4].reduce((sum, k) => sum + band(row, k), 0) !== 1_000_000) badSums.push(row);
      // Rounding can move a share by at most 1 ppm between neighbouring means.
      if (row < 200 && (band(row + 1, 4) < band(row, 4) - 1 || band(row + 1, 0) > band(row, 0) + 1)) wobbling.push(row);
    }
    expect(badSums).toEqual([]);
    expect(wobbling).toEqual([]);
    expect(Math.abs(band(140, 2) - band(140, 3))).toBeLessThanOrEqual(1);
    // 285,082.4 ppm is N(7, 1.9) between 5.5 and 7.0, from Python's statistics.NormalDist; it pins the SD.
    expect(Math.abs(band(140, 2) - 285_082.4)).toBeLessThanOrEqual(1);
  });

  it('correlates wealth with income rank at Spearman 0.6', () => {
    const falling: string[] = [];
    for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 64; j++) {
        const here = COPULA_Q16[i * 64 + j];
        if (i < 63 && COPULA_Q16[(i + 1) * 64 + j] < here) falling.push(`income ${i} wealth ${j}`);
        if (j < 63 && COPULA_Q16[i * 64 + j + 1] < here) falling.push(`wealth ${j} income ${i}`);
      }
    }
    expect(falling).toEqual([]);
    const incomeBin = Array.from(COPULA_Q16, (_, cell) => Math.floor(cell / 64));
    expect(Math.abs(spearman(incomeBin, COPULA_Q16) - 0.6)).toBeLessThanOrEqual(0.02);
  });
});
