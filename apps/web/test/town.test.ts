import { readFileSync } from 'node:fs';
import { WALK_ROAD, parseMap } from '@nomos/sim-protocol';
import { buildPlace } from '@nomos/worldgen';
import { describe, expect, it } from 'vitest';
import { TOWN } from '../src/map/town.ts';

const TOWN_MAP = new URL('../../../assets/maps/town.nmap', import.meta.url);
const PAVED = 'nature/terrain_paving';

describe("Highcourt's town map", { timeout: 60_000 }, () => {
  // So the Town skin draws the ground the sim walks on. The exported map paves a footbridge's water cells, which the
  // place draws as water under the bridge's sprite.
  it('lays out the committed town map tile for tile', () => {
    const map = parseMap(new Uint8Array(readFileSync(TOWN_MAP)).buffer);
    const { layout } = buildPlace(TOWN);
    const differ = [...layout.tiles.keys()].filter((i) => layout.frames[layout.tiles[i]] !== map.frames[map.tiles[i]]);

    expect([layout.width, layout.height]).toEqual([map.width, map.height]);
    expect(differ.filter((i) => map.frames[map.tiles[i]] !== PAVED || map.walk[i] !== WALK_ROAD)).toEqual([]);
    expect(differ.length).toBeLessThan(layout.tiles.length / 100);
  });
});
