import { readFileSync } from 'node:fs';
import { BIOME_NAMES, LANDMARK_NAMES, TIER_NAMES, WONDER_NAMES } from '@nomos/sim-protocol/world-map';
import { describe, expect, it } from 'vitest';
import { landmarkFrame, peakFrame, settlementFrame, tileFrame, wonderFrame, type MapView } from '../src/map.ts';

const known = new Set(
  ['map', 'wonders', 'landmarks'].flatMap((sheet) => {
    const manifest = JSON.parse(readFileSync(new URL(`../../../assets/sprites/${sheet}.json`, import.meta.url), 'utf8'));
    return Object.keys(manifest.frames).map((name) => `${sheet}/${name}`);
  }),
);
const VIEWS: MapView[] = ['country', 'region'];

function everyName(): string[] {
  const names: string[] = [];
  for (const view of VIEWS) {
    TIER_NAMES.forEach((_, tier) => names.push(settlementFrame(tier, view)));
    for (let biome = 0; biome < BIOME_NAMES.length; biome++) {
      for (let variant = 0; variant < 4; variant++) {
        names.push(tileFrame(biome, variant, view));
        names.push(peakFrame(biome, variant, view) ?? tileFrame(biome, variant, view));
      }
    }
    WONDER_NAMES.forEach((_, kind) => names.push(wonderFrame(kind, view)));
    LANDMARK_NAMES.forEach((_, kind) => names.push(landmarkFrame(kind, view)));
  }
  return names;
}

describe('the map frames', () => {
  it('names a frame the sprite manifests hold, for every code in both views', () => {
    expect(everyName().filter((name) => !known.has(name))).toEqual([]);
  });

  it('picks tiles and peaks as mapdraw.py does', () => {
    expect(tileFrame(BIOME_NAMES.indexOf('lake'), 3, 'region')).toBe('map/map16_water_0');
    expect(tileFrame(BIOME_NAMES.indexOf('grassland'), 3, 'country')).toBe('map/map8_grassland_1');
    expect(tileFrame(BIOME_NAMES.indexOf('peak'), 0, 'country')).toBe('map/map8_mountain');
    expect(peakFrame(BIOME_NAMES.indexOf('peak'), 0, 'country')).toBe('map/map8_peak');
    expect(peakFrame(BIOME_NAMES.indexOf('mountain'), 2, 'country')).toBeNull();
    expect(peakFrame(BIOME_NAMES.indexOf('mountain'), 2, 'region')).toBe('map/map16_peak-low');
    expect(peakFrame(BIOME_NAMES.indexOf('mountain'), 1, 'region')).toBeNull();
  });
});
