import { below, fbm, floorDiv, floorMod, isqrt } from '@nomos/sim-core/kernels';
import { dist2, xOf, yOf } from '../grid/grid.ts';
import { RIDGES } from '../random/streams.ts';
import { BEARING, BEARINGS, CENTRE_AT, CHAINS, JOINTS, LENGTH, LIFT, ONE, TURN, WIDTH } from './templates.ts';

// One keyed mountain range: its bent line, how far its feet reach in sixteenths of a cell, and its height in Q14.
interface ChainRange {
  readonly points: Int32Array;
  readonly reach: number;
  readonly lift: number;
}

// A bent polyline in 1/16 cells, walked both ways from an inland centre: the x and y of its 2 * JOINTS + 1 points, the
// far end of the second half first and the far end of the first half last.
export function chain(seed: number, j: number, cx: number, cy: number): Int32Array {
  const bearing = below(16, seed, RIDGES, BEARING, j);
  const step = floorDiv((16 + below(26, seed, RIDGES, LENGTH, j)) * 16, 2 * JOINTS);
  const centreX = cx * 16 + 8;
  const centreY = cy * 16 + 8;
  const points = new Int32Array(2 * (2 * JOINTS + 1));
  points[2 * JOINTS] = centreX;
  points[2 * JOINTS + 1] = centreY;
  for (let half = 0; half < 2; half++) {
    let b = floorMod(bearing + 8 * half, 16);
    let x = centreX;
    let y = centreY;
    for (let k = 0; k < JOINTS; k++) {
      b = floorMod(b + below(3, seed, RIDGES, TURN, j, half, k) - 1, 16);
      x += floorDiv(BEARINGS[b][0] * step, 16);
      y += floorDiv(BEARINGS[b][1] * step, 16);
      const slot = half === 0 ? JOINTS + 1 + k : JOINTS - 1 - k;
      points[2 * slot] = x;
      points[2 * slot + 1] = y;
    }
  }
  return points;
}

// (squared distance in 1/256 cells, position along the chain 0..ONE) at the nearest segment; the first of equal
// distances wins.
export function nearChain(points: Int32Array, px: number, py: number): [number, number] {
  const last = floorDiv(points.length, 2) - 1;
  let bestD2 = 0;
  let bestAt = 0;
  for (let k = 0; k < last; k++) {
    const ax = points[2 * k];
    const ay = points[2 * k + 1];
    const bx = points[2 * k + 2];
    const by = points[2 * k + 3];
    const ux = bx - ax;
    const uy = by - ay;
    const wx = px - ax;
    const wy = py - ay;
    const den = ux * ux + uy * uy;
    const dot = wx * ux + wy * uy;
    let d2: number;
    let t: number;
    if (dot <= 0) {
      d2 = wx * wx + wy * wy;
      t = 0;
    } else if (dot >= den) {
      d2 = dist2(px, py, bx, by);
      t = ONE;
    } else {
      // cross * cross reaches about 6e11: exact in a double, so it never meets a bitwise operator.
      const cross = wx * uy - wy * ux;
      d2 = floorDiv(cross * cross, den);
      t = floorDiv(dot * ONE, den);
    }
    if (k === 0 || d2 < bestD2) {
      bestD2 = d2;
      bestAt = floorDiv(k * ONE + t, last);
    }
  }
  return [bestD2, bestAt];
}

// The distance to the nearest centre placed so far, 24 while none is placed.
function roomFrom(centres: readonly number[], x: number, y: number, width: number): number {
  let room = 24;
  for (let c = 0; c < centres.length; c++) {
    const d = isqrt(dist2(x, y, xOf(centres[c], width), yOf(centres[c], width)));
    if (c === 0 || d < room) room = d;
  }
  return room;
}

function centreScore(
  width: number,
  height: number,
  rise: Int32Array,
  i: number,
  centres: readonly number[],
): number {
  const x = xOf(i, width);
  const y = yOf(i, width);
  const room = roomFrom(centres, x, y, width);
  const inset = Math.min(x, y, width - 1 - x, height - 1 - y, 12);
  return Math.min(rise[i], ONE) + floorDiv(Math.min(room, 24) * ONE, 24) + floorDiv(inset * ONE, 12);
}

// Sixteen keyed tries; the best score wins, and the first of equal scores.
function pickCentre(
  seed: number,
  width: number,
  height: number,
  rise: Int32Array,
  j: number,
  centres: readonly number[],
): number {
  let best = 0;
  let bestScore = 0;
  for (let t = 0; t < 16; t++) {
    const i = below(width * height, seed, RIDGES, CENTRE_AT, j, t);
    const score = centreScore(width, height, rise, i, centres);
    if (t === 0 || score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  return best;
}

function chainRanges(seed: number, width: number, height: number, rise: Int32Array): ChainRange[] {
  const centres: number[] = [];
  const ranges: ChainRange[] = [];
  const count = 1 + below(3, seed, RIDGES, CHAINS);
  for (let j = 0; j < count; j++) {
    const centre = pickCentre(seed, width, height, rise, j, centres);
    centres.push(centre);
    const reach = (3 + below(4, seed, RIDGES, WIDTH, j)) * 16;
    const lift = floorDiv((85 + below(51, seed, RIDGES, LIFT, j)) * ONE, 100);
    ranges.push({ points: chain(seed, j, xOf(centre, width), yOf(centre, width)), reach, lift });
  }
  return ranges;
}

// The tallest tent over a cell: each range lifts it by its height, falling to nothing at its reach and tapering to
// nothing at both ends.
function tentHeight(ranges: readonly ChainRange[], x: number, y: number): number {
  let h = 0;
  for (let r = 0; r < ranges.length; r++) {
    const { points, reach, lift } = ranges[r];
    const [d2, s] = nearChain(points, x * 16 + 8, y * 16 + 8);
    const d = isqrt(d2);
    if (d < reach) {
      const taper = Math.min(ONE, floorDiv(8 * s * (ONE - s), ONE));
      h = Math.max(h, floorDiv(floorDiv(lift * (reach - d), reach) * taper, ONE));
    }
  }
  return h;
}

// A tent broken into peaks and passes by noise, and faded out towards the coast by land.
function crested(seed: number, x: number, y: number, h: number, land: number): number {
  const crest = floorDiv(ONE * 4, 5) + floorDiv((fbm(seed, RIDGES, x, y, 8, 3) - 32768) * 4, 3);
  return floorDiv(floorDiv(h * Math.min(ONE, Math.max(floorDiv(ONE * 9, 20), crest)), ONE) * land, ONE);
}

// Mountain chains: 1-3 keyed ranges with a tent-shaped cross-section, tapered at both ends and broken into peaks and
// passes by noise. Open lines, so they never ring a basin.
export function chains(seed: number, width: number, height: number, rise: Int32Array): Int32Array {
  const ranges = chainRanges(seed, width, height, rise);
  const quarter = floorDiv(ONE, 4);
  const out = new Int32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const land = Math.min(ONE, Math.max(0, (rise[i] + quarter) * 2));
      if (land === 0) continue;
      const h = tentHeight(ranges, x, y);
      if (h !== 0) out[i] = crested(seed, x, y, h, land);
    }
  }
  return out;
}
