import { DAYS_PER_YEAR } from '@nomos/sim-core/kernels';
import { describe, expect, it } from 'vitest';
import { STAND_IN_FESTIVAL_DAYS, festivalToday } from '../src/index.ts';

const SEED = 42;
const YEARS = 20;
const UIDS = [1, 2, 3, 4];

function festivalDays(uid: number, years: number): number[] {
  const days: number[] = [];
  for (let day = 0; day < years * DAYS_PER_YEAR; day++) if (festivalToday(SEED, uid, day)) days.push(day);
  return days;
}

describe('the stand-in festival calendar', () => {
  it('holds about ten festival days a year', () => {
    let total = 0;
    for (const uid of UIDS) total += festivalDays(uid, YEARS).length;
    const mean = total / (UIDS.length * YEARS);
    expect(STAND_IN_FESTIVAL_DAYS).toBe(10);
    expect(mean).toBeGreaterThanOrEqual(8);
    expect(mean).toBeLessThanOrEqual(12);
    expect(festivalDays(1, YEARS)).toEqual(festivalDays(1, YEARS));
    expect(festivalDays(2, YEARS)).not.toEqual(festivalDays(1, YEARS));
  });

  it("matches rng.py's draw for uid 1's first year", () => {
    // [d for d in range(112) if draw(42, 0x105, 1, d) % 112 < 10], from tools/worldgen/rng.py
    expect(festivalDays(1, 1)).toEqual([0, 7, 16, 20, 27, 58, 63, 64, 71, 75, 84, 97, 100]);
  });
});
