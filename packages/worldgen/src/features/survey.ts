import { below, draw2 } from '@nomos/sim-core/kernels';
import { CONIFER, DECIDUOUS, HILLS, MOUNTAIN, wetCells } from '../climate/biomes.ts';
import { slopes } from '../climate/climate.ts';
import { type Adjacency, dist2, distances, neighbours, unionCells, xOf, yOf } from '../grid/grid.ts';
import { WONDER } from '../random/streams.ts';
import { CAPITAL, CITY } from '../settle/settle.ts';
import type { FeatureWorld } from '../world/draft.ts';

// features.py's sub-purposes of the WONDER stream, by value. wonders.ts draws on COUNT, ORDER, TIE and CAVE.
export const COUNT = 0;
export const ORDER = 1;
export const TIE = 2;
const HOTSPOT = 3;
const HOT_REACH = 4;
export const CAVE = 5;

// Fields the site rules share, computed once per world by survey.
export interface Land {
  nbrs: Adjacency;
  water: Uint8Array;
  slope: Int32Array;
  forestDepth: Uint8Array;
  town: Uint8Array;
  big: Uint8Array;
  wet: Uint8Array;
  hotspot: number;
  hotReach: number;
}

// The hills or mountain cell with the largest (draw, cell), or -1 when there is none. Cells ascend, so a tied draw goes
// to the later cell.
function hotspotOf(world: FeatureWorld): number {
  let best = -1;
  let bestDraw = -1;
  for (let i = 0; i < world.biome.length; i++) {
    if (world.biome[i] !== HILLS && world.biome[i] !== MOUNTAIN) continue;
    const d = draw2(world.seed, WONDER, HOTSPOT, i);
    if (d >= bestDraw) {
      best = i;
      bestDraw = d;
    }
  }
  return best;
}

export function survey(world: FeatureWorld): Land {
  const { width, height, biome, settlements } = world;
  const nbrs = neighbours(width, height);
  const water = wetCells(biome);
  const forest = new Uint8Array(biome.length);
  const unforested: number[] = [];
  for (let i = 0; i < biome.length; i++) {
    if (biome[i] === DECIDUOUS || biome[i] === CONIFER) forest[i] = 1;
    else unforested.push(i);
  }
  const homes = settlements.map((s) => s.y * width + s.x);
  const big = settlements.filter((s) => s.tier === CAPITAL || s.tier === CITY).map((s) => s.y * width + s.x);
  return {
    nbrs,
    water,
    slope: slopes(width, height, world.elevation, water),
    forestDepth: distances(nbrs, unforested, forest, 8),
    town: distances(nbrs, homes, null, 12),
    big: distances(nbrs, big, null, 12),
    wet: distances(nbrs, unionCells(water, world.river), null, 8),
    hotspot: hotspotOf(world),
    hotReach: 6 + below(5, world.seed, WONDER, HOT_REACH),
  };
}

export function at(world: FeatureWorld, x: number, y: number): number {
  return x >= 0 && x < world.width && y >= 0 && y < world.height ? y * world.width + x : -1;
}

// Far enough inside the map for an icon that rises into the row above.
export function framed(world: FeatureWorld, cell: number): boolean {
  const x = xOf(cell, world.width);
  const y = yOf(cell, world.width);
  return x >= 1 && x < world.width - 1 && y >= 2 && y < world.height - 1;
}

export function heated(world: FeatureWorld, land: Land, cell: number): boolean {
  if (land.hotspot < 0) return false;
  const x = xOf(cell, world.width);
  const y = yOf(cell, world.width);
  const near = dist2(x, y, xOf(land.hotspot, world.width), yOf(land.hotspot, world.width));
  return near <= land.hotReach * land.hotReach;
}

export function countAround(world: FeatureWorld, land: Land, cell: number, biomes: readonly number[]): number {
  let count = 0;
  for (let k = land.nbrs.start[cell]; k < land.nbrs.start[cell + 1]; k++) {
    if (biomes.includes(world.biome[land.nbrs.cells[k]])) count++;
  }
  return count;
}
