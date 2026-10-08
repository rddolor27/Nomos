import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fade, fbm, value } from '../src/noise.ts';

interface NoiseCase {
  seed: number;
  stream: number;
  x: number;
  y: number;
  cell: number;
  out: number;
}

interface ValueCase extends NoiseCase {
  octave: number;
}

interface FbmCase extends NoiseCase {
  octaves: number;
}

interface Vectors {
  fade: [number, number][];
  value: ValueCase[];
  fbm: FbmCase[];
}

const vectors: Vectors = JSON.parse(readFileSync(new URL('./fixtures/kernels.json', import.meta.url), 'utf8'));

describe('integer value noise', () => {
  it('matches the Python vectors for fade, value and fbm', () => {
    for (const [t, out] of vectors.fade) expect(fade(t), `fade(${t})`).toBe(out);
    for (const c of vectors.value) {
      expect(value(c.seed, c.stream, c.x, c.y, c.cell, c.octave), JSON.stringify(c)).toBe(c.out);
    }
    for (const c of vectors.fbm) {
      expect(fbm(c.seed, c.stream, c.x, c.y, c.cell, c.octaves), JSON.stringify(c)).toBe(c.out);
    }
  });

  it('defaults to octave 0 and five octaves', () => {
    for (const c of vectors.value.filter(({ octave }) => octave === 0)) {
      expect(value(c.seed, c.stream, c.x, c.y, c.cell), JSON.stringify(c)).toBe(c.out);
    }
    for (const c of vectors.fbm.filter(({ octaves }) => octaves === 5)) {
      expect(fbm(c.seed, c.stream, c.x, c.y, c.cell), JSON.stringify(c)).toBe(c.out);
    }
  });
});
