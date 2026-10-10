import { readFileSync } from 'node:fs';
import { PLACE_TILE_PX as TILE, type PlaceLayout, type PlaceWalks } from '@nomos/sim-protocol/place';
import { describe, expect, it } from 'vitest';
import { buildPlace, generateWorld, placeContexts } from '../src/index.ts';
import { FRAMES } from '../src/place/frames.ts';
import { frame } from '../src/place/site.ts';

// place-walks.test.ts judges loops by the site's own grids. This judges them by the picture the town view draws, so a
// grid that forgets a building, or a road laid over water with no bridge, still shows (M3.1's plan, Task 3).
const SCENERY = new URL('../../../assets/sprites/scenery.json', import.meta.url);
const FOOTBRIDGE: { w: number; anchor: [number, number] } = JSON.parse(readFileSync(SCENERY, 'utf8')).frames.prop_footbridge;
const WORLDS = 2;
const FIRST_SEED = 0x5eed0001;

// The tiles a bridge lies over: a footbridge's picture span on the row of its anchor, or a stone bridge piece's
// footprint.
function bridgedTiles(layout: PlaceLayout): Set<number> {
  const tiles = new Set<number>();
  for (let at = 0; at < layout.ground.length; at += 3) {
    const drawn = layout.frames[layout.ground[at]];
    const x = layout.ground[at + 1];
    const y = layout.ground[at + 2];
    if (drawn.startsWith('scenery/bridge_')) {
      for (const tile of footprintOf(layout, drawn, x, y)) tiles.add(tile);
    }
    if (drawn !== 'scenery/prop_footbridge') continue;
    const left = x - FOOTBRIDGE.anchor[0];
    for (let fx = left; fx < left + FOOTBRIDGE.w; fx += TILE) tiles.add(Math.floor(y / TILE) * layout.width + Math.floor(fx / TILE));
  }
  return tiles;
}

// A footprinted sprite's tiles, from its anchor at the footprint's bottom middle.
function footprintOf(layout: PlaceLayout, drawn: string, x: number, y: number): number[] {
  const [category, name] = drawn.split('/');
  const f = frame(category, name);
  const left = (x - Math.floor((f.footprintW * TILE) / 2)) / TILE;
  const top = (y + 1) / TILE - f.footprintH;
  const tiles: number[] = [];
  for (let ty = top; ty < top + f.footprintH; ty++) {
    for (let tx = left; tx < left + f.footprintW; tx++) tiles.push(ty * layout.width + tx);
  }
  return tiles;
}

// A building's footprint, or else the one tile a sprite's anchor is on.
function heldBy(layout: PlaceLayout, at: number): number[] {
  const drawn = layout.frames[layout.standing[at]];
  const [category, name] = drawn.split('/');
  const x = layout.standing[at + 1];
  const y = layout.standing[at + 2];
  const sized = category === 'houses' || drawn in FRAMES;
  if (!sized || frame(category, name).footprintW === 0) return [Math.floor(y / TILE) * layout.width + Math.floor(x / TILE)];
  return footprintOf(layout, drawn, x, y);
}

function heldTiles(layout: PlaceLayout): Map<number, string> {
  const held = new Map<number, string>();
  for (let at = 0; at < layout.standing.length; at += 3) {
    for (const tile of heldBy(layout, at)) held.set(tile, layout.frames[layout.standing[at]]);
  }
  return held;
}

function crossings(label: string, layout: PlaceLayout, walks: PlaceWalks): string[] {
  const bridged = bridgedTiles(layout);
  const held = heldTiles(layout);
  const problems: string[] = [];
  for (const cell of walks.cells) {
    const where = `${label} tile ${cell % layout.width},${Math.floor(cell / layout.width)}`;
    const drawn = layout.frames[layout.tiles[cell]];
    if (drawn.includes('water') && !bridged.has(cell)) problems.push(`${where}: walks on ${drawn}`);
    if (drawn.includes('cliff')) problems.push(`${where}: walks on ${drawn}`);
    if (held.has(cell)) problems.push(`${where}: walks through ${held.get(cell)}`);
  }
  return problems;
}

describe('walk loops, judged by what the town view draws', { timeout: 300_000 }, () => {
  it(`never cross water without a bridge, a cliff or a standing sprite, in every place of the first ${WORLDS} standard worlds`, () => {
    const problems: string[] = [];
    let cells = 0;
    for (let k = 0; k < WORLDS; k++) {
      const seed = FIRST_SEED + k;
      placeContexts(generateWorld(seed, 'standard')).forEach((ctx, i) => {
        const { layout, walks } = buildPlace(ctx);
        problems.push(...crossings(`${seed.toString(16)} place ${i}`, layout, walks));
        cells += walks.cells.length;
      });
    }
    expect(problems.slice(0, 20)).toEqual([]);
    expect(cells).toBeGreaterThan(10_000);
  });
});
