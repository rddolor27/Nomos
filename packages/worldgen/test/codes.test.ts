import { readFileSync } from 'node:fs';
import {
  BIOME_NAMES,
  LANDMARK_NAMES,
  TEMPLATE_NAMES,
  TIER_NAMES,
  WONDER_NAMES,
  WORLD_SIZES,
} from '@nomos/sim-protocol/world-map';
import { describe, expect, it } from 'vitest';
import * as streams from '../src/random/streams.ts';

interface Fixture {
  streams: Record<string, number>;
  names: Record<string, string[]>;
  sizes: Record<string, number[]>;
}

const fixture: Fixture = JSON.parse(readFileSync(new URL('./fixtures/goldens-v1.json', import.meta.url), 'utf8'));

describe('the codes the port shares with tools/worldgen', () => {
  it("keeps model.py's tables and world.py's sizes", () => {
    expect([...BIOME_NAMES]).toEqual(fixture.names.biomes);
    expect([...TIER_NAMES]).toEqual(fixture.names.tiers);
    expect([...WONDER_NAMES]).toEqual(fixture.names.wonders);
    expect([...LANDMARK_NAMES]).toEqual(fixture.names.landmarks);
    expect([...TEMPLATE_NAMES]).toEqual(fixture.names.templates);
    expect({ standard: [...WORLD_SIZES.standard], large: [...WORLD_SIZES.large] }).toEqual(fixture.sizes);
  });

  it("keeps rng.py's world streams", () => {
    expect({ ...streams }).toEqual(fixture.streams);
  });
});
