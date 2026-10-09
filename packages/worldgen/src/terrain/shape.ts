import { draw2, fbm, floorDiv } from '@nomos/sim-core/kernels';
import { type Adjacency, neighbours, parts } from '../grid/grid.ts';
import { ELEVATION } from '../random/streams.ts';
import { chains } from './chains.ts';
import {
  GRAIN,
  GRAIN_RAW,
  MIN_ISLAND,
  MIN_POND,
  ONE,
  PLATEAU,
  RAMP,
  RELIEF,
  SCALE,
  TOP,
  falloffOf,
  landPermilleOf,
  templateOf,
} from './templates.ts';

export interface Shape {
  template: number;
  elevation: Int32Array;
  ocean: Uint8Array;
}

export function reliefOf(seed: number, width: number, height: number): Int32Array {
  const out = new Int32Array(width * height);
  let i = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      out[i++] = floorDiv((fbm(seed, ELEVATION, x, y, 24, 5) - 32768) * RELIEF, 16);
    }
  }
  return out;
}

// sorted(values)[n - n * landPermille // 1000]: the cut that leaves about landPermille thousandths of the cells above it.
export function cut(values: ArrayLike<number>, landPermille: number): number {
  const n = values.length;
  const sorted = Array.from(values).sort((a, b) => a - b);
  return sorted[n - floorDiv(n * landPermille, 1000)];
}

// The sea-level cut of falloff + relief, and each cell's falloff above it.
export function riseOf(
  falloff: Int32Array,
  relief: Int32Array,
  landPermille: number,
): { coastCut: number; rise: Int32Array } {
  const lifted = new Int32Array(falloff.length);
  for (let i = 0; i < lifted.length; i++) lifted[i] = falloff[i] + relief[i];
  const coastCut = cut(lifted, landPermille);
  const rise = new Int32Array(falloff.length);
  for (let i = 0; i < rise.length; i++) rise[i] = falloff[i] - coastCut;
  return { coastCut, rise };
}

// A short ramp up from the coast, then only a gentle rise, so inland relief comes from noise and chains while the land
// still drains towards the sea.
function ramp(u: number): number {
  if (u <= 0) return u;
  return floorDiv(PLATEAU * Math.min(u, RAMP), RAMP) + floorDiv(Math.max(0, u - RAMP), 16);
}

// The ramp with relief and chains on top, then a keyed grain per cell, so steepest descent never runs dead straight down
// a smooth slope.
export function rawOf(seed: number, rise: Int32Array, relief: Int32Array, ridges: Int32Array): Int32Array {
  const out = new Int32Array(rise.length);
  for (let i = 0; i < out.length; i++) {
    const grain = (draw2(seed, ELEVATION, GRAIN, i) >>> 0) % (2 * GRAIN_RAW + 1) - GRAIN_RAW;
    out[i] = ramp(rise[i]) + relief[i] + ridges[i] + grain;
  }
  return out;
}

// A missing neighbour counts as the cell's own value. It reads the old cells and writes a copy.
export function smooth(land: Uint8Array, nbrs: Adjacency): Uint8Array {
  const out = land.slice();
  for (let i = 0; i < land.length; i++) {
    let count = (8 - (nbrs.start[i + 1] - nbrs.start[i])) * land[i];
    for (let k = nbrs.start[i]; k < nbrs.start[i + 1]; k++) count += land[nbrs.cells[k]];
    if (count >= 5) out[i] = 1;
    else if (count <= 3) out[i] = 0;
  }
  return out;
}

export function border(width: number, height: number): number[] {
  const cells: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) cells.push(y * width + x);
    }
  }
  return cells;
}

function waterOf(land: Uint8Array): Uint8Array {
  const water = new Uint8Array(land.length);
  for (let i = 0; i < water.length; i++) water[i] = 1 - land[i];
  return water;
}

// A flag for each water part that reaches the map's edge: `set(label[i] for i in _border(...) if water[i])`.
function edgeParts(water: Uint8Array, label: Int32Array, count: number, width: number, height: number): Uint8Array {
  const edge = new Uint8Array(count);
  for (const i of border(width, height)) {
    if (water[i] !== 0) edge[label[i]] = 1;
  }
  return edge;
}

// Land parts of fewer than MIN_ISLAND cells sink. Parts join by their four sides.
function sinkIslands(land: Uint8Array, width: number, height: number): Uint8Array {
  const { label, sizes } = parts(neighbours(width, height, false), land);
  const kept = new Uint8Array(land.length);
  for (let i = 0; i < kept.length; i++) {
    if (land[i] !== 0 && sizes[label[i]] >= MIN_ISLAND) kept[i] = 1;
  }
  return kept;
}

// Water parts of fewer than MIN_POND cells that reach no map edge fill in. Parts join by all eight neighbours.
function fillPonds(land: Uint8Array, width: number, height: number): Uint8Array {
  const water = waterOf(land);
  const { label, sizes } = parts(neighbours(width, height), water);
  const edge = edgeParts(water, label, sizes.length, width, height);
  const filled = new Uint8Array(land.length);
  for (let i = 0; i < filled.length; i++) {
    if (land[i] !== 0 || (edge[label[i]] === 0 && sizes[label[i]] < MIN_POND)) filled[i] = 1;
  }
  return filled;
}

// No confetti: majority-smooth the coast twice, sink tiny islands and fill tiny enclosed ponds.
export function tidy(land: Uint8Array, width: number, height: number): Uint8Array {
  const nbrs8 = neighbours(width, height);
  const smoothed = smooth(smooth(land, nbrs8), nbrs8);
  return fillPonds(sinkIslands(smoothed, width, height), width, height);
}

export function landOf(raw: Int32Array, sea: number, width: number, height: number): Uint8Array {
  const above = new Uint8Array(raw.length);
  for (let i = 0; i < above.length; i++) above[i] = raw[i] > sea ? 1 : 0;
  return tidy(above, width, height);
}

// Land runs 1..TOP above sea level; water runs 0 down to -TOP.
export function elevationOf(raw: Int32Array, sea: number, land: Uint8Array): Int32Array {
  const out = new Int32Array(raw.length);
  for (let i = 0; i < out.length; i++) {
    const aboveSea = floorDiv((raw[i] - sea) * SCALE, ONE);
    out[i] = land[i] !== 0 ? Math.min(TOP, Math.max(1, 1 + aboveSea)) : Math.max(-TOP, Math.min(0, aboveSea));
  }
  return out;
}

// Water joined to the map's edge: the sea, as against lakes and ponds inland.
export function oceanOf(land: Uint8Array, width: number, height: number): Uint8Array {
  const water = waterOf(land);
  const { label, sizes } = parts(neighbours(width, height), water);
  const edge = edgeParts(water, label, sizes.length, width, height);
  const ocean = new Uint8Array(land.length);
  for (let i = 0; i < ocean.length; i++) {
    if (water[i] !== 0 && edge[label[i]] !== 0) ocean[i] = 1;
  }
  return ocean;
}

export function shape(seed: number, width: number, height: number): Shape {
  const template = templateOf(seed);
  const landPermille = landPermilleOf(seed, template);
  const falloff = falloffOf(seed, width, height, template, landPermille);
  const relief = reliefOf(seed, width, height);
  const { rise } = riseOf(falloff, relief, landPermille);
  const raw = rawOf(seed, rise, relief, chains(seed, width, height, rise));
  const sea = cut(raw, landPermille);
  const land = landOf(raw, sea, width, height);
  return { template, elevation: elevationOf(raw, sea, land), ocean: oceanOf(land, width, height) };
}
