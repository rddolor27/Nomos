import { describe, expect, it } from 'vitest';
import { placeBuffers } from '@nomos/sim-protocol/place';
import { crowdBuffers } from '@nomos/sim-protocol/world-map';
import { buildSite, layoutOf, placeWalks, worldFingerprint } from '@nomos/worldgen';
import { answerGenerate, answerPlace } from '../src/map/generate.ts';

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

  // Place p is settlement p, or wonder p minus the settlement count, as world.py's place_contexts orders them.
  it("answers place with a settlement's and a wonder's place after the world's columns are gone", () => {
    const world = answerGenerate({ type: 'generate', seed: 0x5eed0001, size: 'standard' }, () => 0);
    const settlements = world.reply.map.settlements.cell.length;
    expect(world.reply.map.wonders.kind.length).toBeGreaterThan(0);
    expect(world.contexts).toHaveLength(settlements + world.reply.map.wonders.kind.length);
    structuredClone(world.reply, { transfer: world.transfer });
    let now = 100;
    for (const [place, width] of [
      [0, 48],
      [settlements, 30],
    ]) {
      const { reply, transfer } = answerPlace({ type: 'place', place }, world.contexts, () => (now += 7));
      const site = buildSite(world.contexts[place]);
      expect(reply).toMatchObject({ type: 'place', place, ms: 7 });
      expect(reply.layout.width).toBe(width);
      expect(reply.layout).toEqual(layoutOf(site));
      expect(reply.walks).toEqual(placeWalks(site));
      expect(reply.walks.person.length).toBeGreaterThan(0);
      expect(transfer).toEqual(placeBuffers(reply.layout, reply.walks));
      expect(new Set(transfer).size).toBe(transfer.length);
      const moved = structuredClone(reply, { transfer });
      expect(reply.layout.tiles.byteLength).toBe(0);
      expect(moved.layout.frames).toEqual(layoutOf(site).frames);
    }
  });

  it('refuses a place the world does not have', () => {
    const world = answerGenerate({ type: 'generate', seed: 0x5eed0001, size: 'standard' }, () => 0);
    expect(() => answerPlace({ type: 'place', place: world.contexts.length }, world.contexts, () => 0)).toThrow(RangeError);
  });
});
