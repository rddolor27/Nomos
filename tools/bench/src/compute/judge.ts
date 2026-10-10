import { MIN_SAMPLES, TOLERANCE, type BudgetRow } from './budgets.ts';

export interface Verdict {
  readonly system: string;
  readonly scale: string;
  readonly budgetMs: number;
  readonly limitMs: number;
  readonly fastestMs: number;
  readonly samples: number;
  readonly pass: boolean;
}

export function judge(
  rows: readonly BudgetRow[],
  scale: string,
  samples: Readonly<Record<string, ArrayLike<number>>>,
): Verdict[] {
  return rows.map((row) => {
    const values = samples[row.system];
    const budgetMs = row.rmMs[scale];
    const limitMs = budgetMs * (1 + TOLERANCE);
    const fastestMs = fastest(values);
    const pass = values.length >= MIN_SAMPLES && fastestMs <= limitMs;
    return { system: row.system, scale, budgetMs, limitMs, fastestMs, samples: values.length, pass };
  });
}

function fastest(values: ArrayLike<number>): number {
  let ms = Infinity;
  for (let i = 0; i < values.length; i++) ms = Math.min(ms, values[i]);
  return ms;
}

// A system timed without a budget, such as the economy: its worst tick on the best of the days sampled, which is how a max
// row is judged.
export function formatReported(scale: string, system: string, samples: ArrayLike<number>): string {
  return `${scale} ${system}: worst tick ${fastest(samples).toFixed(3)} ms on the best of ${samples.length} days, no budget`;
}

export function formatVerdict(verdict: Verdict): string {
  const { scale, system, fastestMs, samples, limitMs, budgetMs, pass } = verdict;
  const result = pass ? 'pass' : 'FAIL';
  return `${scale} ${system}: fastest ${fastestMs.toFixed(3)} ms of ${samples}, limit ${limitMs.toFixed(3)} ms (budget ${budgetMs} ms): ${result}`;
}
