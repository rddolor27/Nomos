import { readFileSync } from 'node:fs';
import { landmarkFrame, peakFrame, settlementFrame, tileFrame, wonderFrame, type MapView } from '@nomos/render-gl/map';
import { NO_LANDMARK, type WorldMap } from '@nomos/sim-protocol/world-map';
import { generateWorld } from '@nomos/worldgen';
import { describe, expect, it } from 'vitest';
import { labelSet, placeLabels } from '../src/map/labels.ts';

// The map page holds every map-scale frame (tools/atlas/test_atlas.py), so the manifests stand in for it here.
const known = new Set(
  ['map', 'wonders', 'landmarks'].flatMap((sheet) => {
    const manifest = JSON.parse(readFileSync(new URL(`../../../assets/sprites/${sheet}.json`, import.meta.url), 'utf8'));
    return Object.keys(manifest.frames).map((name) => `${sheet}/${name}`);
  }),
);
const VIEWS: MapView[] = ['country', 'region'];
const WORLDS: [number, 'standard' | 'large'][] = [
  ...Array.from({ length: 10 }, (_, k): [number, 'standard'] => [0x5eed0001 + k, 'standard']),
  [0x5eed0001, 'large'],
  [0x5eed0002, 'large'],
];

function framesOf(map: WorldMap, view: MapView): string[] {
  const names: string[] = [];
  for (let cell = 0; cell < map.biome.length; cell++) {
    names.push(tileFrame(map.biome[cell], map.variant[cell], view));
    const peak = peakFrame(map.biome[cell], map.variant[cell], view);
    if (peak) names.push(peak);
  }
  map.settlements.tier.forEach((tier) => names.push(settlementFrame(tier, view)));
  map.wonders.kind.forEach((kind) => names.push(wonderFrame(kind, view)));
  map.landmarks.kind.forEach((kind) => names.push(landmarkFrame(kind, view)));
  for (const kind of map.settlements.landmarks) {
    if (kind !== NO_LANDMARK) names.push(landmarkFrame(kind, view));
  }
  return names;
}

function apart(x: Float64Array, y: Float64Array, i: number, j: number): boolean {
  return x[i] >= x[j] + 60 || x[j] >= x[i] + 60 || y[i] >= y[j] + 14 || y[j] >= y[i] + 14;
}

function checkLabels(map: WorldMap, where: string): void {
  const set = labelSet(map);
  set.width.fill(60);
  set.height.fill(14);
  const x = new Float64Array(set.count);
  const y = new Float64Array(set.count);
  const countries = map.countries.capital.length;
  for (const [view, cellPx] of [['country', 8], ['region', 32]] as const) {
    placeLabels(set, view, { x: 0, y: 0, cellPx }, 1, map.width * cellPx, map.height * cellPx, x, y);
    for (let i = 0; i < set.count; i++) {
      if (Number.isNaN(x[i])) continue;
      const settlement = set.name[i] - countries;
      if (view === 'region') expect(settlement, `${where}: a country in the Region view`).toBeGreaterThanOrEqual(0);
      else expect(settlement < 0 || map.settlements.tier[settlement] <= 1, `${where}: label ${i}`).toBe(true);
      for (let j = 0; j < i; j++) {
        if (Number.isNaN(x[j])) continue;
        expect(apart(x, y, i, j), `${where}: labels ${j} and ${i} overlap`).toBe(true);
      }
    }
  }
}

describe('the map exit checks', { timeout: 120_000 }, () => {
  it('has a frame for every tile, icon and landmark the generator makes', () => {
    for (const [seed, size] of WORLDS) {
      const map = generateWorld(seed, size);
      for (const view of VIEWS) expect(framesOf(map, view).filter((name) => !known.has(name)), `${size} ${seed}`).toEqual([]);
    }
  });

  it('labels by band, with no two labels overlapping', () => {
    for (const [seed, size] of WORLDS) checkLabels(generateWorld(seed, size), `${size} ${seed}`);
  });
});
