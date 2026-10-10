import type { Target } from './targets.ts';

// Ruling 10: the estimate claim needs 20 seeds or more; with fewer the judge reports medians only.
export const MIN_SEEDS = 20;
const Z_95 = 1.6448536;

export type Verdict = 'holds' | 'fails' | 'inconclusive' | 'medians only' | 'reported';

export interface SampleStats {
  readonly n: number;
  readonly mean: number;
  readonly median: number;
  readonly min: number;
  readonly max: number;
}

export interface Judgement extends SampleStats {
  readonly interval: readonly [number, number];
  readonly verdict: Verdict;
}

export function mean(values: ArrayLike<number>): number {
  let total = 0;
  for (let i = 0; i < values.length; i++) total += values[i];
  return total / values.length;
}

export function sampleSd(values: ArrayLike<number>): number {
  const center = mean(values);
  let squares = 0;
  for (let i = 0; i < values.length; i++) squares += (values[i] - center) * (values[i] - center);
  return Math.sqrt(squares / (values.length - 1));
}

// A sample with an undefined value has no median, so it can never sit in a band.
export function median(values: readonly number[]): number {
  if (values.some(Number.isNaN)) return NaN;
  const sorted = Float64Array.from(values).sort();
  const middle = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function sampleStats(values: readonly number[]): SampleStats {
  return { n: values.length, mean: mean(values), median: median(values), min: Math.min(...values), max: Math.max(...values) };
}

// The Cornish-Fisher series for the 95th percentile of Student's t (Abramowitz and Stegun 26.7.5). From 19 degrees of
// freedom it is within 0.0001 of the exact value (computed), and judge never asks for fewer.
export function tQuantile95(degreesOfFreedom: number): number {
  const z = Z_95;
  const z3 = z * z * z;
  const z5 = z3 * z * z;
  const nu = degreesOfFreedom;
  return z + (z3 + z) / (4 * nu) + (5 * z5 + 16 * z3 + 3 * z) / (96 * nu * nu);
}

function confidenceInterval(values: readonly number[], center: number): readonly [number, number] {
  if (values.length < MIN_SEEDS) return [NaN, NaN];
  const half = (tQuantile95(values.length - 1) * sampleSd(values)) / Math.sqrt(values.length);
  return [center - half, center + half];
}

function verdictOf(stats: SampleStats, [lower, upper]: readonly [number, number], low: number, high: number): Verdict {
  if (stats.n < MIN_SEEDS) return 'medians only';
  if (!Number.isFinite(stats.mean)) return 'fails';
  if (low <= lower && upper <= high) return 'holds';
  if (upper < low || lower > high) return 'fails';
  return 'inconclusive';
}

// Two one-sided tests at 5%: the claim holds when the 90% t-interval of the mean lies inside the band, fails when it
// lies wholly outside, and is otherwise inconclusive.
export function judge(values: readonly number[], low: number, high: number): Judgement {
  const stats = sampleStats(values);
  const interval = confidenceInterval(values, stats.mean);
  return { ...stats, interval, verdict: verdictOf(stats, interval, low, high) };
}

export function judgeEverySeed(values: readonly number[]): Judgement {
  const stats = sampleStats(values);
  return { ...stats, interval: [NaN, NaN], verdict: stats.min === 1 ? 'holds' : 'fails' };
}

export function judgeTarget(target: Target, values: readonly number[]): Judgement {
  switch (target.rule) {
    case 'band':
      return judge(values, target.low, target.high);
    case 'every seed':
      return judgeEverySeed(values);
    case 'reported':
      return { ...sampleStats(values), interval: [NaN, NaN], verdict: 'reported' };
  }
}

// Ruling 12's filter checks each point's median against the band, and the tier-2 score counts how far outside it falls.
export function inBand(value: number, low: number, high: number): boolean {
  return low <= value && value <= high;
}

export function bandMiss(value: number, low: number, high: number): number {
  const outside = Math.max(low - value, value - high, 0);
  return Number.isNaN(outside) ? Infinity : outside / (high - low);
}
