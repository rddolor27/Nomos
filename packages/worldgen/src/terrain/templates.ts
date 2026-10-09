import { below, floorDiv, floorMod, isqrt, value } from '@nomos/sim-core/kernels';
import { TEMPLATE_NAMES } from '@nomos/sim-protocol/world-map';
import { dist2 } from '../grid/grid.ts';
import { SHAPE } from '../random/streams.ts';

type TemplateName = (typeof TEMPLATE_NAMES)[number];
// An island's centre and its two radii, the last four arguments of blob.
type Spot = readonly [number, number, number, number];
type ShapeFn = (seed: number, width: number, height: number, landPermille: number) => Int32Array;

// terrain.py's own ONE, 1.0 in Q14: noise's is Q15.
export const ONE = 1 << 14;
export const PLATEAU = floorDiv(ONE * 2, 5);
export const RAMP = floorDiv(ONE, 4);
export const STRAIT = ONE;
export const RELIEF = 5;
export const SCALE = 520;
export const GRAIN_RAW = floorDiv(6 * ONE, SCALE);
export const TOP = 1000;
export const MIN_ISLAND = 10;
export const MIN_POND = 4;

// Sixteen compass bearings as integer vectors about 16 long, so lobes and chains need no trigonometry.
export const BEARINGS: readonly (readonly [number, number])[] = [
  [16, 0], [15, 6], [11, 11], [6, 15], [0, 16], [-6, 15], [-11, 11], [-15, 6],
  [-16, 0], [-15, -6], [-11, -11], [-6, -15], [0, -16], [6, -15], [11, -11], [15, -6],
];
export const JOINTS = 3;

// Sub-purposes: the template's sit inside SHAPE, the rest past the octave numbers noise uses. 0x107 is drainage's
// FLAT, which shares the ELEVATION stream with GRAIN.
export const PICK = 0;
export const LAND = 1;
export const CENTRE = 2;
export const RADIUS = 3;
export const LOBE = 4;
export const SIDE = 5;
export const ISLAND = 6;
export const CHAINS = 0x100;
export const CENTRE_AT = 0x101;
export const BEARING = 0x102;
export const LENGTH = 0x103;
export const TURN = 0x104;
export const WIDTH = 0x105;
export const LIFT = 0x106;
export const WIGGLE = 0x108;
export const GRAIN = 0x109;

export const CONTINENT = TEMPLATE_NAMES.indexOf('continent');
export const PENINSULA = TEMPLATE_NAMES.indexOf('peninsula');
export const COAST = TEMPLATE_NAMES.indexOf('coast');
export const ARCHIPELAGO = TEMPLATE_NAMES.indexOf('archipelago');
export const TWIN_ISLES = TEMPLATE_NAMES.indexOf('twin-isles');

const PERMILLE_OF: Record<TemplateName, readonly [number, number]> = {
  continent: [440, 540],
  peninsula: [420, 560],
  coast: [450, 600],
  archipelago: [400, 460],
  'twin-isles': [400, 500],
};
export const LAND_PERMILLE: readonly (readonly [number, number])[] = TEMPLATE_NAMES.map((name) => PERMILLE_OF[name]);

export function blob(width: number, height: number, cx: number, cy: number, rx: number, ry: number): Int32Array {
  const out = new Int32Array(width * height);
  let i = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      out[i++] = ONE - floorDiv((x - cx) * (x - cx) * ONE, rx * rx) - floorDiv((y - cy) * (y - cy) * ONE, ry * ry);
    }
  }
  return out;
}

// The distance from map edge `side`, in the order of (y, width - 1 - x, height - 1 - y, x): north, east, south, west.
function sideDistance(side: number, x: number, y: number, width: number, height: number): number {
  if (side === 0) return y;
  if (side === 1) return width - 1 - x;
  if (side === 2) return height - 1 - y;
  return x;
}

// _continent's `around`, which reads cx, cy, rx and ry from the enclosing function: a blob `size` percent of the body,
// pushed `reach` sixteenths of the body's radius out along bearing j.
function around(
  seed: number,
  width: number,
  height: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  j: number,
  reach: number,
  size: number,
): Int32Array {
  const [bx, by] = BEARINGS[below(16, seed, SHAPE, LOBE, j)];
  return blob(
    width,
    height,
    cx + floorDiv(bx * rx * reach, 1600),
    cy + floorDiv(by * ry * reach, 1600),
    Math.max(2, floorDiv(rx * size, 100)),
    Math.max(2, floorDiv(ry * size, 100)),
  );
}

// One body with two lobes on keyed bearings and a bay bitten out of its rim.
export function continent(seed: number, width: number, height: number): Int32Array {
  const cx = floorDiv(width, 2) + below(floorDiv(width, 5) + 1, seed, SHAPE, CENTRE, 0) - floorDiv(width, 10);
  const cy = floorDiv(height, 2) + below(floorDiv(height, 5) + 1, seed, SHAPE, CENTRE, 1) - floorDiv(height, 10);
  const rx = floorDiv(width * (30 + below(8, seed, SHAPE, RADIUS, 0)), 100);
  const ry = floorDiv(height * (30 + below(8, seed, SHAPE, RADIUS, 1)), 100);
  const out = blob(width, height, cx, cy, rx, ry);
  for (let j = 0; j < 2; j++) {
    const reach = 55 + below(30, seed, SHAPE, LOBE, j, 0);
    const size = 40 + below(25, seed, SHAPE, LOBE, j, 1);
    const lobe = around(seed, width, height, cx, cy, rx, ry, j, reach, size);
    for (let i = 0; i < out.length; i++) out[i] = Math.max(out[i], lobe[i]);
  }
  const bayReach = 95 + below(20, seed, SHAPE, LOBE, 2, 0);
  const baySize = 22 + below(18, seed, SHAPE, LOBE, 2, 1);
  const bay = around(seed, width, height, cx, cy, rx, ry, 2, bayReach, baySize);
  for (let i = 0; i < out.length; i++) out[i] -= 2 * Math.max(0, bay[i]);
  return out;
}

export function peninsula(seed: number, width: number, height: number): Int32Array {
  const root = below(4, seed, SHAPE, SIDE);
  const rootIsNorthOrSouth = root === 0 || root === 2;
  const along = rootIsNorthOrSouth ? height : width;
  const across = rootIsNorthOrSouth ? width : height;
  const length = floorDiv(along * (68 + below(18, seed, SHAPE, RADIUS, 0)), 100);
  const base = floorDiv(across * (28 + below(10, seed, SHAPE, RADIUS, 1)), 100);
  const tip = Math.max(3, floorDiv(base * (30 + below(20, seed, SHAPE, RADIUS, 2)), 100));
  const mid = floorDiv(across, 2) + below(floorDiv(across, 4) + 1, seed, SHAPE, CENTRE, 0) - floorDiv(across, 8);
  const slant = below(floorDiv(across, 3) + 1, seed, SHAPE, CENTRE, 1) - floorDiv(across, 6);
  const out = new Int32Array(width * height);
  let i = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = sideDistance(root, x, y, width, height);
      const c = rootIsNorthOrSouth ? x : y;
      const t = Math.min(a, length);
      const half = base - floorDiv((base - tip) * t, length);
      const off = c - mid - floorDiv(slant * t, length);
      const over = Math.max(0, a - length);
      out[i++] = ONE - floorDiv(off * off * ONE, half * half) - floorDiv(over * over * ONE, tip * tip);
    }
  }
  return out;
}

function coastFalloff(seas: readonly number[], x: number, y: number, width: number, height: number): number {
  let f = 3 * ONE;
  for (const s of seas) {
    const span = s === 0 || s === 2 ? height : width;
    f = Math.min(f, floorDiv((sideDistance(s, x, y, width, height) * 2 - span) * ONE, span));
  }
  return f;
}

// _coast, renamed since `coasts` names the climate stage.
export function coastShape(seed: number, width: number, height: number): Int32Array {
  const mode = below(3, seed, SHAPE, SIDE, 0);
  const first = below(4, seed, SHAPE, SIDE, 1);
  const seas = mode === 0 ? [first] : [first, floorMod(first + 1 + floorMod(mode, 2), 4)];
  const out = new Int32Array(width * height);
  let i = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) out[i++] = coastFalloff(seas, x, y, width, height);
  }
  return out;
}

// The highest island blob at each cell, cut down along the line where two blobs meet so neighbouring islands keep a
// strait between them.
export function islands(width: number, height: number, spots: readonly Spot[]): Int32Array {
  const first = new Int32Array(width * height).fill(-4 * ONE);
  const second = first.slice();
  for (const [cx, cy, rx, ry] of spots) {
    const body = blob(width, height, cx, cy, rx, ry);
    for (let i = 0; i < body.length; i++) {
      const f = body[i];
      if (f > first[i]) {
        second[i] = first[i];
        first[i] = f;
      } else if (f > second[i]) {
        second[i] = f;
      }
    }
  }
  const out = new Int32Array(first.length);
  for (let i = 0; i < out.length; i++) out[i] = first[i] - Math.max(0, STRAIT - (first[i] - second[i]));
  return out;
}

// The smallest gap between a try and the islands placed so far, 0 while none is placed.
function nearestGap(x: number, y: number, rx: number, ry: number, spots: readonly Spot[]): number {
  let gap = 0;
  for (let s = 0; s < spots.length; s++) {
    const [sx, sy, sr, sq] = spots[s];
    const between = isqrt(dist2(x, y, sx, sy)) - floorDiv(rx + ry + sr + sq, 2);
    if (s === 0 || between < gap) gap = between;
  }
  return gap;
}

// Sixteen keyed tries; the widest gap wins, and the first of equal gaps.
function placeIsland(
  seed: number,
  width: number,
  height: number,
  j: number,
  rx: number,
  ry: number,
  spots: readonly Spot[],
): Spot {
  let bestX = 0;
  let bestY = 0;
  let bestGap = 0;
  for (let t = 0; t < 16; t++) {
    const x = rx + 2 + below(Math.max(1, width - 2 * rx - 4), seed, SHAPE, ISLAND, j, t, 0);
    const y = ry + 2 + below(Math.max(1, height - 2 * ry - 4), seed, SHAPE, ISLAND, j, t, 1);
    const gap = nearestGap(x, y, rx, ry, spots);
    if (t === 0 || gap > bestGap) {
      bestX = x;
      bestY = y;
      bestGap = gap;
    }
  }
  return [bestX, bestY, rx, ry];
}

export function archipelago(seed: number, width: number, height: number, landPermille: number): Int32Array {
  const count = 3 + below(4, seed, SHAPE, ISLAND);
  const area = floorDiv(floorDiv(width * height * landPermille * 5, 4000), count);
  const spots: Spot[] = [];
  for (let j = 0; j < count; j++) {
    const r = floorDiv(isqrt(floorDiv(area * 113, 355)) * (85 + below(31, seed, SHAPE, RADIUS, j)), 100);
    const rx = Math.max(3, floorDiv(r * (85 + below(31, seed, SHAPE, LOBE, j)), 100));
    const ry = Math.max(3, Math.min(floorDiv(height, 2) - 3, floorDiv(r * r, rx)));
    spots.push(placeIsland(seed, width, height, j, rx, ry, spots));
  }
  return islands(width, height, spots);
}

// The two islands' centres in percent of the map, one pair for each layout.
const TWIN_ENDS: readonly (readonly (readonly [number, number])[])[] = [
  [[26, 50], [74, 50]],
  [[28, 36], [72, 64]],
  [[28, 64], [72, 36]],
];

export function twinIsles(seed: number, width: number, height: number, landPermille: number): Int32Array {
  const r = isqrt(floorDiv(floorDiv(width * height * landPermille * 5, 8000) * 113, 355));
  const big = 90 + below(21, seed, SHAPE, RADIUS);
  const ends = TWIN_ENDS[below(3, seed, SHAPE, CENTRE)];
  const sizes = [big, 200 - big];
  const spots: Spot[] = [];
  for (let j = 0; j < 2; j++) {
    const [px, py] = ends[j];
    const rr = floorDiv(r * sizes[j], 100);
    const x = floorDiv(width * px, 100) + below(7, seed, SHAPE, CENTRE, j, 0) - 3;
    const y = floorDiv(height * py, 100) + below(7, seed, SHAPE, CENTRE, j, 1) - 3;
    spots.push([x, y, floorDiv(rr * 6, 5), Math.min(floorDiv(height, 2) - 3, floorDiv(rr * 5, 6))]);
  }
  return islands(width, height, spots);
}

const SHAPE_OF: Record<TemplateName, ShapeFn> = {
  continent,
  peninsula,
  coast: coastShape,
  archipelago,
  'twin-isles': twinIsles,
};
export const SHAPES: readonly ShapeFn[] = TEMPLATE_NAMES.map((name) => SHAPE_OF[name]);

function edgeReach(skip: number, x: number, y: number, width: number, height: number): number {
  let reach = Math.max(width, height);
  for (let s = 0; s < 4; s++) {
    if (s !== skip) reach = Math.min(reach, sideDistance(s, x, y, width, height));
  }
  return reach;
}

function seaRim(root: number, x: number, y: number, width: number, height: number): number {
  return Math.min(0, floorDiv((edgeReach(root, x, y, width, height) - 4) * ONE, 2));
}

// Coast wiggle from one octave of value noise, and sea along the map edges a template keeps clear: all of them for
// islands, all but the root for a peninsula.
export function edges(seed: number, width: number, height: number, template: number): Int32Array {
  const root = template === PENINSULA ? below(4, seed, SHAPE, SIDE) : -1;
  const out = new Int32Array(width * height);
  let i = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wiggle = floorDiv(floorDiv((value(seed, SHAPE, x, y, 7, WIGGLE) - 32768) * ONE * 3, 32768), 8);
      out[i++] = template === COAST ? wiggle : wiggle + seaRim(root, x, y, width, height);
    }
  }
  return out;
}

export function templateOf(seed: number): number {
  return below(TEMPLATE_NAMES.length, seed, SHAPE, PICK);
}

export function landPermilleOf(seed: number, template: number): number {
  const [lo, hi] = LAND_PERMILLE[template];
  return lo + below(hi - lo + 1, seed, SHAPE, LAND);
}

export function falloffOf(
  seed: number,
  width: number,
  height: number,
  template: number,
  landPermille: number,
): Int32Array {
  const body = SHAPES[template](seed, width, height, landPermille);
  const rim = edges(seed, width, height, template);
  const out = new Int32Array(body.length);
  for (let i = 0; i < out.length; i++) out[i] = Math.max(-4 * ONE, Math.min(3 * ONE, body[i] + rim[i]));
  return out;
}
