import { describe, expect, it } from 'vitest';
import { crowdBuffers } from '@nomos/sim-protocol/world-map';
import { worldFingerprint } from '@nomos/worldgen';
import { answerGenerate } from '../src/map/generate.ts';

describe('the map worker', { timeout: 60_000 }, () => {
  it('answers generate with the world, its names and its timings, every buffer listed', () => {
    let now = 0;
    const { reply, transfer } = answerGenerate({ type: 'generate', seed: 0x5eed0001, size: 'standard' }, () => (now += 2));
    expect(reply.type).toBe('world');
    expect(worldFingerprint(reply.map)).toBe(0x1ec8f880);
    expect(reply.names).toHaveLength(reply.map.countries.capital.length + reply.map.settlements.cell.length);
    expect(reply.names.slice(0, 2)).toEqual(['country-1', 'country-2']);
    expect(reply.crowd.hue.length).toBeGreaterThan(0);
    expect(Object.keys(reply.stageMs)).toEqual([
      'shape', 'rain', 'drain', 'climate', 'biomes', 'settle', 'countries', 'regions', 'farm', 'roads', 'lanes', 'features', 'names', 'crowd',
    ]);
    expect(Object.values(reply.stageMs).every((ms) => ms === 2)).toBe(true);
    expect(new Set(transfer).size).toBe(transfer.length);
    const moved = structuredClone(reply, { transfer });
    expect(crowdBuffers(reply.crowd).every((b) => b.byteLength === 0)).toBe(true);
    expect(worldFingerprint(moved.map)).toBe(0x1ec8f880);
  });
});
