import { floorDiv } from '@nomos/sim-core/kernels';
import { PLAN } from './keys.ts';
import { layLane, layStreet } from './roads.ts';
import { line, type Cell, type Rect, type Site } from './site.ts';
import type { Wall } from './walls.ts';

type Pair = readonly [number, number];

// The knobs of a ring town: the tiles between rings it aims at, how far each ring's half-sizes move off the even
// spacing, and how many extra shallow radials it has, in the quadrants from `quadrant` on.
export interface RingKnobs {
  readonly gap: number;
  readonly jitter: readonly number[];
  readonly radials: number;
  readonly quadrant: number;
}

// Keys of the PLAN draws, after plan.ts's from 0 and before grid.ts's from 20.
const GAP = 10;
const JITTER = 11;
const RADIALS = 12;
const QUADRANT = 13;
const MAX_RINGS = 8;
// A ring is a band of streets this many tiles thick.
const BAND = 2;
// The last ring lies this many tiles inside the ring line on the axes.
const INSIDE_LINE = 4;
// The first ring's inner edge keeps this many tiles across and down from the plaza's corners.
const CLEAR_X = 2;
const CLEAR_Y = 3;
// Rows from one east-west lane to the next: an apartment is 4 rows tall, and the lane it faces takes one more.
const LANE_GAP = 5;
// Far enough along a radial to leave any ring line.
const REACH = 80;
const DIAGONALS: readonly Cell[] = [
  [1, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
];
const SHALLOW: readonly Cell[] = [
  [2, -1],
  [2, 1],
  [-2, 1],
  [-2, -1],
];
const AXES: Readonly<Record<string, Cell>> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };

export function ringKnobs(site: Site): RingKnobs {
  const jitter: number[] = [];
  for (let k = 0; k < 2 * MAX_RINGS; k++) jitter.push(site.below(3, PLAN, JITTER, k) - 1);
  return {
    gap: 6 + site.below(3, PLAN, GAP),
    jitter,
    radials: site.below(5, PLAN, RADIALS),
    quadrant: site.below(4, PLAN, QUADRANT),
  };
}

// Whether (dx, dy) from the centre lies inside the ellipse of half-sizes (a, b), in integers.
function within(dx: number, dy: number, a: number, b: number): boolean {
  return dx * dx * b * b + dy * dy * a * a <= a * a * b * b;
}

function inBand(dx: number, dy: number, [a, b]: Pair): boolean {
  return within(dx, dy, a, b) && !within(dx, dy, a - BAND, b - BAND);
}

function inAnyBand(dx: number, dy: number, sizes: readonly Pair[]): boolean {
  for (const size of sizes) {
    if (inBand(dx, dy, size)) return true;
  }
  return false;
}

// The streets of a ring town: ellipse bands round the plaza out to the ring line, four diagonal radials and some
// shallow ones, east-west lanes through the east and west quarters, and a plain street along each axis in `bare`, which
// no main road takes. `half` is the ring line's half-sizes. Houses face south, so only a street that runs east to west
// gives them frontage, and the lanes make up for the rings' upright stretches in the east and west.
export function layRings(
  site: Site,
  wall: Wall,
  plaza: Rect,
  half: Pair,
  knobs: RingKnobs,
  bare: readonly string[],
): void {
  const sizes = ringSizes(half, plaza, knobs);
  const first = sizes[0];
  layBands(site, wall, sizes);
  for (const [dx, dy] of DIAGONALS) layRadial(site, wall, dx, dy, first);
  for (let k = 0; k < knobs.radials; k++) {
    const [dx, dy] = SHALLOW[(knobs.quadrant + k) & 3];
    layRadial(site, wall, dx, dy, first);
  }
  for (let off = LANE_GAP; off <= half[1] - BAND; off += LANE_GAP) {
    layLaneRow(site, wall, -off, first);
    layLaneRow(site, wall, off, first);
  }
  for (const side of bare) layAxis(site, wall, plaza, side, sizes[sizes.length - 1]);
}

// The outer half-sizes of every ring, innermost first. The first clears the plaza and the last lies INSIDE_LINE tiles
// inside the ring line, and the rest are spread between them about `gap` tiles apart, each moved by its jitter. Every
// ring is as much wider than tall as the ring line, so the gap between rings is the same all round.
function ringSizes([hx, hy]: Pair, [, , pw, ph]: Rect, knobs: RingKnobs): Pair[] {
  const lean = hx - hy;
  const last = hy - INSIDE_LINE;
  const first = firstRing(lean, floorDiv(pw + 1, 2) + CLEAR_X, floorDiv(ph + 1, 2) + CLEAR_Y);
  const steps = Math.min(MAX_RINGS - 1, Math.max(1, floorDiv(2 * (last - first) + knobs.gap, 2 * knobs.gap)));
  const sizes: Pair[] = [];
  for (let k = 0; k <= steps; k++) {
    const b = first + floorDiv(k * (last - first), steps);
    const moves = k > 0 && k < steps;
    sizes.push([b + lean + (moves ? knobs.jitter[2 * k] : 0), b + (moves ? knobs.jitter[2 * k + 1] : 0)]);
  }
  return sizes;
}

// The half-height of the smallest ring whose inner edge keeps a corner of the plaza inside it.
function firstRing(lean: number, cornerX: number, cornerY: number): number {
  let b = BAND + 1;
  while (!within(cornerX, cornerY, b + lean - BAND, b - BAND)) b++;
  return b;
}

// Streets clip 2 tiles inside the ring line, as the grid's do.
function layBands(site: Site, wall: Wall, sizes: readonly Pair[]): void {
  const [reachX, reachY] = sizes[sizes.length - 1];
  for (let y = site.cy - reachY; y <= site.cy + reachY; y++) {
    for (let x = site.cx - reachX; x <= site.cx + reachX; x++) {
      if (wall.inset(x, y) >= BAND && inAnyBand(x - site.cx, y - site.cy, sizes)) layStreet(site, x, y);
    }
  }
}

// A street out of the first ring along (dx, dy) up to the ring line. It is 2 tiles thick: each cell of its line takes
// the one below it where the street runs across more than up, and the one beside it where it runs up more.
function layRadial(site: Site, wall: Wall, dx: number, dy: number, first: Pair): void {
  const acrossMore = Math.abs(dx) >= Math.abs(dy);
  for (const [x, y] of line([site.cx, site.cy], [site.cx + dx * REACH, site.cy + dy * REACH])) {
    if (!within(x - site.cx, y - site.cy, first[0] - BAND, first[1] - BAND)) layBroad(site, wall, x, y, acrossMore);
  }
}

// A lane along the row `dy` from the centre, through the quarter that lies east or west between the diagonals, from
// outside the first ring to the ring line.
function layLaneRow(site: Site, wall: Wall, dy: number, first: Pair): void {
  const y = site.cy + dy;
  for (let x = wall.x0 + BAND; x <= wall.x1 - BAND; x++) {
    const dx = x - site.cx;
    if (Math.abs(dx) < Math.abs(dy) || within(dx, dy, first[0] - BAND, first[1] - BAND)) continue;
    if (wall.inset(x, y) >= BAND) layLane(site, x, y);
  }
}

// A street out of the plaza's edge along an axis, as far as the outermost ring.
function layAxis(site: Site, wall: Wall, plaza: Rect, side: string, last: Pair): void {
  const [dx, dy] = AXES[side];
  const [sx, sy] = axisStart(site, plaza, side);
  for (let x = sx, y = sy; within(x - site.cx, y - site.cy, last[0], last[1]); x += dx, y += dy) {
    layBroad(site, wall, x, y, dx !== 0);
  }
}

function axisStart(site: Site, [px, py, pw, ph]: Rect, side: string): Cell {
  if (side === 'n') return [site.cx, py - 1];
  if (side === 's') return [site.cx, py + ph];
  return side === 'w' ? [px - 1, site.cy] : [px + pw, site.cy];
}

// The street tile at (x, y) and the one below it, or the one beside it, when both lie 2 tiles inside the ring line.
function layBroad(site: Site, wall: Wall, x: number, y: number, below: boolean): void {
  const nx = below ? x : x + 1;
  const ny = below ? y + 1 : y;
  if (wall.inset(x, y) < BAND || wall.inset(nx, ny) < BAND) return;
  layStreet(site, x, y);
  layStreet(site, nx, ny);
}
