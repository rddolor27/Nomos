import { describe, expect, it } from 'vitest';
import { apportion, createApportionScratch } from '../src/maths/apportion.ts';
import { draw2 } from '../src/random/draw.ts';
import { reserveArena } from '../src/memory/arena.ts';
import { splitByCounts } from '../src/maths/split.ts';

const STREAM = 0x7f4;

function countsFor(c: number): number[] {
  const k = 1 + (draw2(42, STREAM, c, 0) % 8);
  const counts = Array.from({ length: k }, (_, j) => draw2(42, STREAM, c, 1 + j) % 1_001);
  if (!counts.some((count) => count > 0)) counts[0] = 1;
  return counts;
}

// Every group gets its floor of n * count / people or one more, never more than it holds.
function isExactSplit(n: number, counts: number[], out: Int32Array): boolean {
  const people = counts.reduce((sum, count) => sum + count, 0);
  let moved = 0;
  for (let j = 0; j < counts.length; j++) {
    const floor = Math.floor((n * counts[j]) / people);
    if (out[j] !== floor && out[j] !== floor + 1) return false;
    if (out[j] > counts[j]) return false;
    moved += out[j];
  }
  return moved === n;
}

describe('splitting people by counts', () => {
  it('splits people exactly and without bias', () => {
    const out = new Int32Array(8);
    for (let c = 0; c < 10_000; c++) {
      const counts = countsFor(c);
      const people = counts.reduce((sum, count) => sum + count, 0);
      const n = draw2(42, STREAM, c, 9) % (people + 1);
      splitByCounts(n, counts, counts.length, out, draw2(42, STREAM, c, 10));
      expect(isExactSplit(n, counts, out), `case ${c}: ${n} of ${counts}`).toBe(true);
    }
    const sums = [0, 0, 0];
    for (let t = 0; t < 30_000; t++) {
      splitByCounts(7, [5, 3, 2], 3, out, draw2(42, STREAM + 1, t, 0));
      for (let j = 0; j < 3; j++) sums[j] += out[j];
    }
    const quotas = [3.5, 2.1, 1.4];
    for (let j = 0; j < 3; j++) expect(Math.abs(sums[j] / 30_000 - quotas[j]), `group ${j}`).toBeLessThan(0.03);
  });

  // R8 customs §e: flooring and plain largest remainder never move a 2% minority in flows of 1 to 3 people.
  it('moves small minorities that largest remainder never moves', () => {
    const out = new Int32Array(2);
    const seats = new Float64Array(2);
    const scratch = createApportionScratch(reserveArena(65_536), 2);
    let sampledMinority = 0;
    let largestRemainderMinority = 0;
    for (let month = 0; month < 360; month++) {
      const flow = 1 + (month % 3);
      splitByCounts(flow, [98, 2], 2, out, draw2(42, STREAM + 2, month, 0));
      apportion(flow, [98, 2], 2, seats, scratch);
      sampledMinority += out[1];
      largestRemainderMinority += seats[1];
    }
    expect(sampledMinority).toBeGreaterThanOrEqual(5);
    expect(sampledMinority).toBeLessThanOrEqual(25);
    expect(largestRemainderMinority).toBe(0);
  });
});
