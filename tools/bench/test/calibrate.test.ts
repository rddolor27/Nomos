import { describe, expect, it } from 'vitest';
import { cpuRate } from '../src/calibrate.ts';

describe('the CPU calibration', () => {
  it('calibrates the CPU rate', () => {
    expect([1_500, 1_700, 375, 100, 5_000].map((index) => cpuRate(index))).toEqual([4, 4.5, 1, 1, 10]);
  });
});
