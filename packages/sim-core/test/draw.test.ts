import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { below, draw, draw1, draw2, draw3, draw4, mix } from '../src/index.ts';

interface DrawCase {
  seed: number;
  stream: number;
  keys: number[];
  out: number;
}

interface BelowCase extends DrawCase {
  n: number;
}

interface Vectors {
  mix: [number, number][];
  draw: DrawCase[];
  below: BelowCase[];
}

const vectors: Vectors = JSON.parse(readFileSync(new URL('./fixtures/kernels.json', import.meta.url), 'utf8'));

const MILLION = 1_000_000;
const CHI2_CRITICAL = 37.7; // 15 degrees of freedom, p = 0.001

function fixedArityDraw({ seed, stream, keys }: DrawCase): number {
  switch (keys.length) {
    case 1:
      return draw1(seed, stream, keys[0]);
    case 2:
      return draw2(seed, stream, keys[0], keys[1]);
    case 3:
      return draw3(seed, stream, keys[0], keys[1], keys[2]);
    default:
      return draw4(seed, stream, keys[0], keys[1], keys[2], keys[3]);
  }
}

function chiSquared(counts: Uint32Array, total: number): number {
  const expected = total / counts.length;
  let sum = 0;
  for (const count of counts) {
    const diff = count - expected;
    sum += (diff * diff) / expected;
  }
  return sum;
}

describe('the keyed draw', () => {
  it('matches the Python vectors for mix, draw and below', () => {
    for (const [x, out] of vectors.mix) expect(mix(x), `mix(${x})`).toBe(out);
    for (const c of vectors.draw) expect(draw(c.seed, c.stream, ...c.keys), JSON.stringify(c)).toBe(c.out);
    for (const c of vectors.below) expect(below(c.n, c.seed, c.stream, ...c.keys), JSON.stringify(c)).toBe(c.out);
  });

  it('gives the fixed-arity draws the same values', () => {
    for (const c of vectors.draw.filter(({ keys }) => keys.length >= 1 && keys.length <= 4)) {
      expect(fixedArityDraw(c), JSON.stringify(c)).toBe(draw(c.seed, c.stream, ...c.keys));
    }
  });

  it('gives each entity the same draw in any visiting order', () => {
    const ids = Array.from({ length: 10_000 }, (_, id) => id);
    const forward = ids.map((id) => draw2(42, 7, id, 1000));
    const keyedOrder = [...ids].sort((a, b) => draw(1, 99, a) - draw(1, 99, b));
    const visited = new Array<number>(ids.length);
    for (const id of keyedOrder) visited[id] = draw2(42, 7, id, 1000);
    expect(visited).toEqual(forward);
  });

  it('spreads a million entities evenly over 16 buckets', () => {
    const counts = new Uint32Array(16);
    for (let id = 0; id < MILLION; id++) counts[draw2(42, 7, id, 1000) >>> 28]++;
    expect(chiSquared(counts, MILLION)).toBeLessThan(CHI2_CRITICAL);
  });

  it('keeps streams independent', () => {
    for (const [s1, s2] of [[1, 2], [2, 3], [7, 255]]) {
      const counts = new Uint32Array(16);
      for (let id = 0; id < MILLION; id++) counts[(draw2(42, s1, id, 0) >>> 30) * 4 + (draw2(42, s2, id, 0) >>> 30)]++;
      expect(chiSquared(counts, MILLION), `streams ${s1} and ${s2}`).toBeLessThan(CHI2_CRITICAL);
    }
  });

  // task.md, Verify first: the prototype's seed ^ entity only shuffled draws between seeds that differ in low bits.
  it('gives neighbouring seeds unrelated draws', () => {
    for (const [s1, s2] of [[0, 1], [42, 43], [0x7fffffff, 0x80000000]]) {
      const firstWorld = new Set<number>();
      for (let id = 0; id < 10_000; id++) firstWorld.add(draw1(s1, 7, id));
      let shared = 0;
      for (let id = 0; id < 10_000; id++) if (firstWorld.has(draw1(s2, 7, id))) shared++;
      expect(shared, `seeds ${s1} and ${s2}`).toBe(0);
    }
  });
});
