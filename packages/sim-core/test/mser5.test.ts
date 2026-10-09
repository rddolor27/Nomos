import { describe, expect, it } from 'vitest';
import { mser5 } from '../src/economy/mser5.ts';
import { draw2 } from '../src/random/draw.ts';

const LENGTH = 2_000;
const RAMP_DAYS = 500;
const TWO_POW_32 = 4_294_967_296;

// Uniform noise of +-5 around 100, keyed by day.
function noise(day: number): number {
  return 10 * (draw2(5, 0x50, day, 0) / TWO_POW_32 - 0.5);
}

// Climbs from 0 to 100 over the first 500 days, then holds at 100.
function rampThenNoise(length: number): Float64Array {
  const series = new Float64Array(length);
  for (let day = 0; day < length; day++) {
    series[day] = (day < RAMP_DAYS ? (100 * day) / RAMP_DAYS : 100) + noise(day);
  }
  return series;
}

describe('mser5', () => {
  it('truncates a ramp within 10% of where it ends', () => {
    const truncation = mser5(rampThenNoise(LENGTH), LENGTH);
    expect(truncation % 5).toBe(0);
    expect(truncation).toBeGreaterThanOrEqual(450);
    expect(truncation).toBeLessThanOrEqual(550);
  });

  it('truncates a flat series at 0', () => {
    expect(mser5(new Float64Array(LENGTH), LENGTH)).toBe(0);
    expect(mser5(new Float64Array(LENGTH).fill(2_500.3), LENGTH)).toBe(0);
  });

  it('returns -1 for a series still trending, or too short for one batch', () => {
    const trending = new Float64Array(1_000);
    for (let day = 0; day < trending.length; day++) trending[day] = day;
    expect(mser5(trending, trending.length)).toBe(-1);
    expect(mser5(new Float64Array(4), 4)).toBe(-1);
  });

  it('reads only the whole batches inside length', () => {
    const padded = new Float64Array(5_000).fill(1e9);
    padded.set(rampThenNoise(LENGTH));
    const clean = mser5(rampThenNoise(LENGTH), LENGTH);
    expect(mser5(padded, LENGTH)).toBe(clean);
    expect(mser5(padded, LENGTH + 3)).toBe(clean);
  });
});
