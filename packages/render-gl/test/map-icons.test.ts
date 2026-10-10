import { readFileSync } from 'node:fs';
import { BIOME_NAMES, LANDMARK_NAMES, NO_LANDMARK, TIER_NAMES, WONDER_NAMES, type WorldMap } from '@nomos/sim-protocol/world-map';
import { describe, expect, it } from 'vitest';
import { SPRITE_SHORTS, iconSprites } from '../src/map/icons.ts';
import { settlementFrame, type AtlasFrame, type AtlasPage, type MapView } from '../src/map.ts';
import { tinyWorld } from './tiny-world.ts';

// The real frames' sizes and anchors, each at its own place on a pretend page.
const frames: Record<string, AtlasFrame> = {};
for (const sheet of ['map', 'wonders', 'landmarks']) {
  const manifest = JSON.parse(readFileSync(new URL(`../../../assets/sprites/${sheet}.json`, import.meta.url), 'utf8'));
  for (const [name, frame] of Object.entries<AtlasFrame>(manifest.frames)) {
    frames[`${sheet}/${name}`] = { x: Object.keys(frames).length, y: 0, w: frame.w, h: frame.h, anchor: frame.anchor };
  }
}
const page = { frames } as AtlasPage;
const VIEWS: MapView[] = ['country', 'region'];

// Each sprite as [x, y, width, height, peak] in art pixels, with the frame it shows.
function placed(sprites: Int16Array): [string, number, number, number, number, number][] {
  const names = Object.keys(frames);
  const out: [string, number, number, number, number, number][] = [];
  for (let at = 0; at < sprites.length; at += SPRITE_SHORTS) {
    out.push([names[sprites[at + 2]], sprites[at], sprites[at + 1], sprites[at + 4], sprites[at + 5], sprites[at + 6]]);
  }
  return out;
}

function settled(cell: number, tier: number, landmarks: number[]): WorldMap['settlements'] {
  return {
    cell: Int32Array.from([cell]),
    tier: Uint8Array.from([tier]),
    population: Int32Array.from([100_000]),
    country: Uint8Array.from([1]),
    region: Uint16Array.from([1]),
    landmarks: Uint8Array.from([...landmarks, NO_LANDMARK, NO_LANDMARK, NO_LANDMARK].slice(0, 3)),
  };
}

describe('the map icons', () => {
  it("walls a capital's and a city's icon and palisades a town's, in each view, all on the map page", () => {
    const icons = Object.fromEntries(TIER_NAMES.map((name, tier) => [name, VIEWS.map((view) => settlementFrame(tier, view))]));
    expect(icons).toEqual({
      capital: ['map/map8_settlement_capital-walled', 'map/map16_settlement_capital-walled'],
      city: ['map/map8_settlement_city-walled', 'map/map16_settlement_city-walled'],
      town: ['map/map8_settlement_town-palisade', 'map/map16_settlement_town-palisade'],
      village: ['map/settlement_village', 'map/settlement_village'],
      hamlet: ['map/settlement_hamlet', 'map/settlement_hamlet'],
    });
    expect(Object.values(icons).flat().filter((name) => !(name in frames))).toEqual([]);
  });

  it('anchors each sprite on its cell, in row, layer and column order', () => {
    const biome = new Uint8Array(12).fill(BIOME_NAMES.indexOf('grassland'));
    biome[1] = BIOME_NAMES.indexOf('peak');
    const map = tinyWorld(4, 3, {
      biome,
      wonders: { kind: Uint8Array.from([WONDER_NAMES.indexOf('waterfall')]), cell: Int32Array.from([6]) },
      settlements: settled(5, 2, []),
    });
    expect(placed(iconSprites(map, page, 'country'))).toEqual([
      ['map/map8_peak', 8, -2, 8, 10, 1],
      ['wonders/map8_wonder_waterfall', 16, 8, 8, 8, 0],
      ['map/map8_settlement_town-palisade', -2, -7, 29, 23, 0],
    ]);
  });

  it("puts a settlement's landmarks beside it in the Region view only", () => {
    const kinds = [LANDMARK_NAMES.indexOf('clock-tower'), LANDMARK_NAMES.indexOf('library')];
    const map = tinyWorld(12, 6, { settlements: settled(2 * 12 + 5, 0, kinds) });
    expect(placed(iconSprites(map, page, 'region'))).toEqual([
      ['landmarks/map16_landmark_library', 32, 32, 16, 16, 0],
      ['landmarks/map16_landmark_clock-tower', 128, 25, 16, 23, 0],
      ['map/map16_settlement_capital-walled', 62, 2, 52, 46, 0],
    ]);
    expect(placed(iconSprites(map, page, 'country'))).toEqual([['map/map8_settlement_capital-walled', 28, -7, 32, 31, 0]]);
  });

  it('skips a lighthouse, and a spot on water', () => {
    const biome = new Uint8Array(72).fill(BIOME_NAMES.indexOf('grassland'));
    biome[2 * 12 + 8] = BIOME_NAMES.indexOf('ocean');
    const kinds = [LANDMARK_NAMES.indexOf('lighthouse'), LANDMARK_NAMES.indexOf('fountain')];
    const map = tinyWorld(12, 6, { biome, settlements: settled(2 * 12 + 5, 0, kinds) });
    expect(placed(iconSprites(map, page, 'region')).map(([name, x, y]) => [name, x, y])).toEqual([
      ['landmarks/map16_landmark_fountain', 32, 32],
      ['map/map16_settlement_capital-walled', 62, 2],
    ]);
  });
});
