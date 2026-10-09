import { below, fbm, floorDiv } from '@nomos/sim-core/kernels';
import { SIDE_NAMES } from '@nomos/sim-protocol/world-map';
import { anyAround, distances, neighbours, unionCells } from '../grid/grid.ts';
import { MOISTURE, TEMPERATURE } from '../random/streams.ts';
import { BEACH, CLIFFS, CLIFF_AT, INLAND } from './biomes.ts';

// Sub-purposes on the TEMPERATURE stream; rain.ts holds WIND and WET (0x100, 0x101), which sit on MOISTURE.
export const EDGE = 0x102;
export const COLD = 0x103;
export const SPAN = 0x104;

const NORTH = SIDE_NAMES.indexOf('n');
const SOUTH = SIDE_NAMES.indexOf('s');

// Warm to cold towards a keyed edge, colder with height. Returns the temperature, 0..255 a cell, and the cold side, an
// index into SIDE_NAMES.
export function temperature(
  seed: number,
  width: number,
  height: number,
  elevation: Int32Array,
): { temperature: Uint8Array; cold: number } {
  const coldSide = below(2, seed, TEMPERATURE, EDGE) !== 0 ? SOUTH : NORTH;
  const cold = 40 + below(60, seed, TEMPERATURE, COLD);
  const warm = Math.min(250, cold + 90 + below(60, seed, TEMPERATURE, SPAN));
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const reach = coldSide === SOUTH ? height - 1 - y : y;
    const base = cold + floorDiv((warm - cold) * reach, height - 1);
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const lapse = floorDiv(Math.max(0, elevation[i]) * 110, 1000);
      const wobble = floorDiv(fbm(seed, TEMPERATURE, x, y, 32, 2) - 32768, 1024);
      out[i] = Math.max(0, Math.min(255, base - lapse + wobble));
    }
  }
  return { temperature: out, cold: coldSide };
}

// Rain, a keyed wobble, and a bonus that fades to nothing four steps from water or a river. Water is the ocean with the
// lakes.
export function moisture(
  seed: number,
  width: number,
  height: number,
  rain: Int32Array,
  water: Uint8Array,
  river: Uint8Array,
): Uint8Array {
  const near = distances(neighbours(width, height), unionCells(water, river), null, 4);
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const wobble = floorDiv(fbm(seed, MOISTURE, x, y, 16, 3) - 32768, 150);
      out[i] = Math.max(0, Math.min(255, floorDiv(rain[i] * 7, 8) + wobble + (4 - near[i]) * 12));
    }
  }
  return out;
}

// Beach or cliffs for each land cell beside the ocean: cliffs where high ground meets it.
export function coasts(width: number, height: number, elevation: Int32Array, ocean: Uint8Array): Uint8Array {
  const nbrs = neighbours(width, height);
  const out = new Uint8Array(width * height);
  for (let i = 0; i < out.length; i++) {
    if (ocean[i] !== 0 || !anyAround(ocean, nbrs, i)) out[i] = INLAND;
    else out[i] = elevation[i] >= CLIFF_AT ? CLIFFS : BEACH;
  }
  return out;
}

// The steepest drop or climb to a neighbour, where a neighbour below sea level counts as sea level; water has none.
export function slopes(width: number, height: number, elevation: Int32Array, water: Uint8Array): Int32Array {
  const nbrs = neighbours(width, height);
  const out = new Int32Array(width * height);
  for (let i = 0; i < out.length; i++) {
    if (water[i] !== 0) continue;
    for (let k = nbrs.start[i]; k < nbrs.start[i + 1]; k++) {
      out[i] = Math.max(out[i], Math.abs(elevation[i] - Math.max(0, elevation[nbrs.cells[k]])));
    }
  }
  return out;
}
