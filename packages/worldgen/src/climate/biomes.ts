import { value } from '@nomos/sim-core/kernels';
import { BIOME_NAMES } from '@nomos/sim-protocol/world-map';
import { type Adjacency, anyAround, distances, neighbours, unionCells, xOf, yOf } from '../grid/grid.ts';
import { MOISTURE } from '../random/streams.ts';

export const OCEAN = BIOME_NAMES.indexOf('ocean');
export const LAKE = BIOME_NAMES.indexOf('lake');
export const GRASSLAND = BIOME_NAMES.indexOf('grassland');
export const FARMLAND = BIOME_NAMES.indexOf('farmland');
export const DECIDUOUS = BIOME_NAMES.indexOf('forest-deciduous');
export const CONIFER = BIOME_NAMES.indexOf('forest-conifer');
export const MARSH = BIOME_NAMES.indexOf('marsh');
export const SAND = BIOME_NAMES.indexOf('sand');
export const HILLS = BIOME_NAMES.indexOf('hills');
export const MOUNTAIN = BIOME_NAMES.indexOf('mountain');
export const PEAK = BIOME_NAMES.indexOf('peak');
export const SNOW = BIOME_NAMES.indexOf('snow');

export const INLAND = 0;
export const BEACH = 1;
export const CLIFFS = 2;

export const HILLS_AT = 380;
export const MOUNTAIN_AT = 500;
export const PEAK_AT = 700;
// Round 9's threshold for cold lowland: high cold ground stays hills, mountain or peak.
export const SNOW_BELOW = 40;
export const CLIFF_AT = 100;
export const BEACH_BELOW = 70;
export const MARSH_BELOW = 140;

// A sub-purpose on the MOISTURE stream, after rain.ts's WIND and WET (0x100, 0x101).
export const BEACHES = 0x105;

// No cover claims the cell yet: a code can be 0 (the ocean), so a helper cannot signal it by falsiness.
const NONE = -1;

// The covers a lone cell gives up. A tie between neighbouring covers goes to the earliest here.
const SOFT = [GRASSLAND, DECIDUOUS, CONIFER, MARSH, SAND, SNOW];

// Low warm shores take sand in long stretches, not as a ring round every coast.
function sandy(seed: number, width: number, i: number, ocean: Uint8Array, nbrs4: Adjacency): boolean {
  return anyAround(ocean, nbrs4, i) && value(seed, MOISTURE, xOf(i, width), yOf(i, width), 10, BEACHES) >= 30000;
}

// Higher than its neighbours on average: a summit or ridge line, not a flank or a plateau.
function crest(elevation: Int32Array, nbrs: Adjacency, i: number): boolean {
  const count = nbrs.start[i + 1] - nbrs.start[i];
  let around = 0;
  for (let k = nbrs.start[i]; k < nbrs.start[i + 1]; k++) around += elevation[nbrs.cells[k]];
  return count * elevation[i] - around >= 15 * count;
}

// The chain's first branches, the water and then the high ground; NONE passes the cell on.
function waterOrHeight(
  elevation: Int32Array,
  i: number,
  t: number,
  ocean: Uint8Array,
  lake: Uint8Array,
  nbrs8: Adjacency,
): number {
  const e = elevation[i];
  if (ocean[i] !== 0) return OCEAN;
  if (lake[i] !== 0) return LAKE;
  if ((e >= PEAK_AT || (e >= MOUNTAIN_AT && t < 30)) && crest(elevation, nbrs8, i)) return PEAK;
  if (e >= MOUNTAIN_AT) return MOUNTAIN;
  if (e >= HILLS_AT) return HILLS;
  return NONE;
}

// Cold lowland is snow and hot dry ground is sand; NONE passes the cell on.
function coldOrDry(t: number, m: number): number {
  if (t < SNOW_BELOW) return SNOW;
  if (t >= 165 && m < 85) return SAND;
  return NONE;
}

function beachSand(
  seed: number,
  width: number,
  i: number,
  e: number,
  t: number,
  shore: number,
  ocean: Uint8Array,
  nbrs4: Adjacency,
): boolean {
  return shore === BEACH && e < BEACH_BELOW && t >= 70 && sandy(seed, width, i, ocean, nbrs4);
}

// The wet and green covers, down to grassland. freshSteps is the distance to the nearest lake or river, capped at 4.
function greenCover(e: number, t: number, m: number, freshSteps: number): number {
  if (e < MARSH_BELOW && m >= 185 && freshSteps <= 1) return MARSH;
  if (m >= 130 && (t < 90 || e >= 280)) return CONIFER;
  if (m >= 140) return DECIDUOUS;
  return GRASSLAND;
}

function countAround(biome: Uint8Array, nbrs: Adjacency, i: number, cover: number): number {
  let count = 0;
  for (let k = nbrs.start[i]; k < nbrs.start[i + 1]; k++) {
    if (biome[nbrs.cells[k]] === cover) count++;
  }
  return count;
}

// A lone cell of a lowland cover takes its neighbours' most common cover. Every cell reads the covers as they were
// before any cell changed.
function despeckle(biome: Uint8Array, nbrs: Adjacency): Uint8Array {
  const out = biome.slice();
  for (let i = 0; i < biome.length; i++) {
    if (!SOFT.includes(biome[i]) || countAround(biome, nbrs, i, biome[i]) > 0) continue;
    let most = 0;
    for (const cover of SOFT) {
      const count = countAround(biome, nbrs, i, cover);
      if (count > most) {
        most = count;
        out[i] = cover;
      }
    }
  }
  return out;
}

// The first branch that holds wins, so each helper asks in the chain's order and answers NONE to pass the cell on.
export function biomes(
  seed: number,
  width: number,
  height: number,
  elevation: Int32Array,
  temperature: Uint8Array,
  moisture: Uint8Array,
  ocean: Uint8Array,
  lake: Uint8Array,
  river: Uint8Array,
  coast: Uint8Array,
): Uint8Array {
  const nbrs4 = neighbours(width, height, false);
  const nbrs8 = neighbours(width, height);
  const fresh = distances(nbrs8, unionCells(lake, river), null, 4);
  const out = new Uint8Array(width * height);
  for (let i = 0; i < elevation.length; i++) {
    const e = elevation[i];
    const t = temperature[i];
    const m = moisture[i];
    let b = waterOrHeight(elevation, i, t, ocean, lake, nbrs8);
    if (b === NONE) b = coldOrDry(t, m);
    if (b === NONE && beachSand(seed, width, i, e, t, coast[i], ocean, nbrs4)) b = SAND;
    if (b === NONE) b = greenCover(e, t, m, fresh[i]);
    out[i] = b;
  }
  return despeckle(out, nbrs8);
}
