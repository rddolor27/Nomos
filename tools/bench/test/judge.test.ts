import { describe, expect, it } from 'vitest';
import { MIN_SAMPLES, type BudgetRow } from '../src/budgets.ts';
import { judge } from '../src/judge.ts';

const ROW: BudgetRow = { system: 'move', reduce: 'mean', rmMs: { phone: 0.1 } };

// The fastest comes last, so the judge must read every sample.
function samplesWithFastest(fastestMs: number, count = MIN_SAMPLES): Float64Array {
  const values = new Float64Array(count).fill(fastestMs * 2);
  values[count - 1] = fastestMs;
  return values;
}

describe('the budget judge', () => {
  it('judges the fastest sample', () => {
    expect(judge([ROW], 'phone', { move: samplesWithFastest(0.109) })).toEqual([
      {
        system: 'move',
        scale: 'phone',
        budgetMs: 0.1,
        limitMs: expect.closeTo(0.11, 12),
        fastestMs: 0.109,
        samples: MIN_SAMPLES,
        pass: true,
      },
    ]);
    expect(judge([ROW], 'phone', { move: samplesWithFastest(0.111) })[0].pass).toBe(false);
  });

  it('refuses fewer than 9 samples', () => {
    expect(MIN_SAMPLES).toBe(9);
    expect(judge([ROW], 'phone', { move: samplesWithFastest(0.01, MIN_SAMPLES - 1) })[0].pass).toBe(false);
  });
});
