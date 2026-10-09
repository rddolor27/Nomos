import { describe, expect, it } from 'vitest';
import { keyedShuffle } from '../src/random/shuffle.ts';

const SEED = 42;
const STREAM = 0x77;
const PURPOSE = 3;

function shuffled(n: number, time: number, purpose = PURPOSE): number[] {
  const out = new Int32Array(n);
  keyedShuffle(out, n, SEED, STREAM, time, purpose);
  return Array.from(out);
}

function identity(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

describe('keyedShuffle', () => {
  it('writes a permutation of 0..n-1', () => {
    for (const n of [0, 1, 2, 7, 100, 1_000]) {
      expect(
        shuffled(n, 5).sort((a, b) => a - b),
        `n ${n}`,
      ).toEqual(identity(n));
    }
  });

  it('repeats for the same keys and changes with the time or the purpose', () => {
    expect(shuffled(100, 5)).toEqual(shuffled(100, 5));
    expect(shuffled(100, 6)).not.toEqual(shuffled(100, 5));
    expect(shuffled(100, 5, PURPOSE + 1)).not.toEqual(shuffled(100, 5));
  });

  it('ignores what the buffer held and leaves the entries past n alone', () => {
    const dirty = new Int32Array(12).fill(-7);
    keyedShuffle(dirty, 8, SEED, STREAM, 5, PURPOSE);
    expect(Array.from(dirty.subarray(0, 8))).toEqual(shuffled(8, 5));
    expect(Array.from(dirty.subarray(8))).toEqual([-7, -7, -7, -7]);
  });

  it('gives every order of three equally often', () => {
    const counts = new Map<string, number>();
    for (let time = 0; time < 12_000; time++) {
      const order = shuffled(3, time).join('');
      counts.set(order, (counts.get(order) ?? 0) + 1);
    }
    // A cyclic-only shuffle, the classic off-by-one, would leave 3 of the 6 orders empty.
    expect(counts.size).toBe(6);
    // 2,000 expected with an SD of 41, so five SDs either side.
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(1_795);
      expect(count).toBeLessThan(2_205);
    }
  });
});
