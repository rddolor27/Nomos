import { worldMapBuffers } from '@nomos/sim-protocol/world-map';
import { describe, expect, it } from 'vitest';
import { generateWorld, worldFingerprint } from '../src/index.ts';

describe('generateWorld', { timeout: 60_000 }, () => {
  it("makes Python's world for each size", () => {
    expect(worldFingerprint(generateWorld(0x5eed0001, 'standard'))).toBe(0x4a765ce2);
    expect(worldFingerprint(generateWorld(0x5eed0001, 'large'))).toBe(0x88b0bdac);
  });

  // The fingerprint leaves the variant column out, so pin it on its own: mapdraw.py's draw & 3 gives the same values.
  it("makes Python's tile variants", () => {
    const { variant } = generateWorld(0x5eed0001, 'standard');
    expect([0, 1, 2, 3, 1000, 6143].map((cell) => variant[cell])).toEqual([3, 3, 0, 2, 1, 0]);
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
