import { worldMapBuffers } from '@nomos/sim-protocol/world-map';
import { describe, expect, it } from 'vitest';
import { generateWorld, worldFingerprint } from '../src/index.ts';

describe('generateWorld', { timeout: 60_000 }, () => {
  it("makes Python's world for each size", () => {
    expect(worldFingerprint(generateWorld(0x5eed0001, 'standard'))).toBe(0x1ec8f880);
    expect(worldFingerprint(generateWorld(0x5eed0001, 'large'))).toBe(0x867cd479);
  });

  it('times every stage in order', () => {
    const laps: string[] = [];
    generateWorld(0x5eed0002, 'standard', { lap: (stage) => laps.push(stage) });
    expect(laps).toEqual([
      'shape', 'rain', 'drain', 'climate', 'biomes', 'settle', 'countries', 'regions', 'farm', 'roads', 'lanes', 'features',
    ]);
  });

  it('gives every column a buffer of its own', () => {
    const buffers = worldMapBuffers(generateWorld(0x5eed0003, 'standard'));
    expect(new Set(buffers).size).toBe(buffers.length);
  });
});
