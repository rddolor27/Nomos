import { floorDiv } from '@nomos/sim-core/kernels';
import { BIOME_NAMES } from '@nomos/sim-protocol/world-map';
import { BEACH, CLIFFS, CONIFER, DECIDUOUS, GRASSLAND, HILLS, LAKE, MARSH, MOUNTAIN, SAND } from '../climate/biomes.ts';
import { type Adjacency, anyAround, neighbours, xOf, yOf } from '../grid/grid.ts';

// Settlement icons rise up to four rows above their cell, so keep them clear of the top edge.
export const MARGIN = 2;
export const TOP_MARGIN = 4;

// Python's BASE dict as an array by biome code. -1 stands for a missing entry, and a cell of that cover scores 0.
function baseScores(): number[] {
  const scores = new Array<number>(BIOME_NAMES.length).fill(-1);
  scores[GRASSLAND] = 100;
  scores[DECIDUOUS] = 75;
  scores[CONIFER] = 55;
  scores[HILLS] = 55;
  scores[MARSH] = 25;
  scores[SAND] = 20;
  scores[MOUNTAIN] = 5;
  return scores;
}

export const BASE: readonly number[] = baseScores();

function insideMargins(x: number, y: number, width: number, height: number): boolean {
  return MARGIN <= x && x < width - MARGIN && TOP_MARGIN <= y && y < height - MARGIN;
}

function besideLake(biome: Uint8Array, nbrs: Adjacency, i: number): boolean {
  for (let k = nbrs.start[i]; k < nbrs.start[i + 1]; k++) {
    if (biome[nbrs.cells[k]] === LAKE) return true;
  }
  return false;
}

function shoreBonus(shore: number): number {
  if (shore === BEACH) return 35;
  if (shore === CLIFFS) return 15;
  return 0;
}

// How good a cell is to settle: its cover, water, slope and height. Cells of a cover with no BASE, or outside the
// margins, score 0.
export function habitability(
  width: number,
  height: number,
  biome: Uint8Array,
  elevation: Int32Array,
  river: Uint8Array,
  coast: Uint8Array,
  temperature: Uint8Array,
  moisture: Uint8Array,
  slope: Int32Array,
): Int32Array {
  const nbrs = neighbours(width, height);
  const out = new Int32Array(width * height);
  for (let i = 0; i < biome.length; i++) {
    const b = biome[i];
    if (BASE[b] < 0 || !insideMargins(xOf(i, width), yOf(i, width), width, height)) continue;
    let h = BASE[b];
    if (river[i] !== 0) h += 30 + 10 * river[i];
    else if (anyAround(river, nbrs, i)) h += 20;
    h += shoreBonus(coast[i]);
    if (besideLake(biome, nbrs, i)) h += 25;
    const t = temperature[i];
    h -=
      floorDiv(slope[i], 3) +
      floorDiv(elevation[i], 12) +
      floorDiv(Math.max(0, 60 - t), 2) +
      floorDiv(Math.max(0, t - 200), 2);
    h -= floorDiv(Math.max(0, 50 - moisture[i]), 2);
    out[i] = Math.max(0, h);
  }
  return out;
}
