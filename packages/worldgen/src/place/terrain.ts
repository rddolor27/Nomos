import { floorDiv, isqrt, value } from '@nomos/sim-core/kernels';
import { PLACE_TILE_PX as TILE } from '@nomos/sim-protocol/place';
import { xOf, yOf } from '../grid/grid.ts';
import { PLACE } from '../random/streams.ts';
import { GROUND, INLET, POND, RIDGE, RIVER, SEA } from './keys.ts';
import { CLIFFS, DIRS, line, OPEN, threshold, type Cell, type CellTest, type Site } from './site.ts';

export type River = readonly [from: Cell, to: Cell];

const SIDE_ORDER = 'nesw';
const OPPOSITE: Readonly<Record<string, string>> = { n: 's', s: 'n', e: 'w', w: 'e' };
const RIVER_WIDTH = 2;

export function edgeCell(site: Site, side: string, t: number, depth: number): Cell {
  if (side === 'n') return [t, depth];
  if (side === 's') return [t, site.h - 1 - depth];
  if (side === 'w') return [depth, t];
  return [site.w - 1 - depth, t];
}

// Sand for deserts, whose sparse grass grows as tufts; elsewhere grass with drifts of meadow.
export function layGround(site: Site): void {
  const ctx = site.ctx;
  if (site.desert()) {
    site.kind.fill('sand');
    return;
  }
  const noise = site.noiseGrid(GROUND, 96);
  const cut = threshold(noise, ctx.biome.startsWith('forest') ? 40 : 80 + floorDiv(ctx.moisture, 2));
  for (let c = 0; c < noise.length; c++) site.kind[c] = noise[c] >= cut ? 'meadow' : 'grass';
}

export function laySea(site: Site, sides: string, depth: number, cliffs: boolean): void {
  for (let i = 0; i < SIDE_ORDER.length; i++) {
    const side = SIDE_ORDER[i];
    if (sides.includes(side)) seaSide(site, side, i, depth, cliffs && side === 's');
  }
  if (cliffs && sides.includes('s')) {
    const top = site.h - depth - 3;
    carveBand(site, top, 1, 'cliff_foot-water', 0, site.w - 1);
    site.bands.push({ top, faces: 1, foot: 'cliff_foot-water' });
  }
}

function seaSide(site: Site, side: string, i: number, depth: number, straight: boolean): void {
  const span = 'ns'.includes(side) ? site.w : site.h;
  const seed = site.draw(SEA, i);
  for (let t = 0; t < span; t++) {
    const d = straight ? depth : depth + floorDiv(value(seed, PLACE, t * TILE, 0, 7 * TILE) * 5, 65536) - 2;
    for (let k = 0; k < Math.max(1, d); k++) {
      const c = site.at(...edgeCell(site, side, t, k));
      site.kind[c] = 'water';
      site.sea[c] = 1;
    }
  }
}

// A cliff from x0 to x1: rim, face rows and foot; ends inside the map taper with corners.
export function carveBand(site: Site, top: number, faces: number, foot: string, x0: number, x1: number): void {
  for (let x = x0; x <= x1; x++) {
    const left = x === x0 && x0 > 0;
    const right = x === x1 && x1 < site.w - 1;
    if (!(left || right)) site.kind[site.at(x, top)] = 'cliff_top';
    const face = faceOf(left, right);
    for (let r = top + 1; r < top + 1 + faces; r++) site.kind[site.at(x, r)] = face;
    site.kind[site.at(x, top + 1 + faces)] = foot;
  }
}

function faceOf(left: boolean, right: boolean): string {
  if (left) return 'cliff_corner-left';
  return right ? 'cliff_corner-right' : 'cliff_face';
}

// Where water cut a one-face cliff, step it back a tile and taper the new ends.
export function finishBands(site: Site): void {
  for (const { top, faces, foot } of site.bands) {
    if (faces !== 1) continue;
    const rows = [top, top + 1, top + 2];
    const near: number[] = [];
    for (let x = 0; x < site.w; x++) {
      if (nearWater(site, x, top, rows)) near.push(x);
    }
    for (const x of near) {
      for (const r of rows) {
        if (CLIFFS.includes(site.kind[site.at(x, r)])) uncliff(site, x, r);
      }
    }
    trimRuns(site, top, foot, rows);
  }
}

function nearWater(site: Site, x: number, top: number, rows: readonly number[]): boolean {
  for (const r of rows) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (site.water(x + dx, r + dy) && r + dy !== top + 3) return true;
      }
    }
  }
  return false;
}

function uncliff(site: Site, x: number, r: number): void {
  const c = site.at(x, r);
  site.kind[c] = site.kind[c] === 'cliff_foot-water' ? 'sand' : 'grass';
}

// Runs of cliff shorter than three tiles go; longer runs are carved again with tapered ends.
function trimRuns(site: Site, top: number, foot: string, rows: readonly number[]): void {
  const cliff = (x: number): boolean => CLIFFS.includes(site.kind[site.at(x, top + 1)]);
  let x = 0;
  while (x < site.w) {
    if (!cliff(x)) {
      x++;
      continue;
    }
    let end = x;
    while (end + 1 < site.w && cliff(end + 1)) end++;
    if (end - x < 2) {
      for (let cx = x; cx <= end; cx++) {
        for (const r of rows) uncliff(site, cx, r);
      }
    } else {
      carveBand(site, top, 1, foot, x, end);
    }
    x = end + 1;
  }
}

// Pairs of river ends, leaning away from the centre, where the place itself sits.
export function riverPoints(site: Site, sides: readonly string[]): River[] {
  const { w, h } = site;
  const point = (side: string, high: boolean, salt: number): Cell => {
    const span = 'ns'.includes(side) ? w : h;
    const t = floorDiv(span * (high ? 3 : 1), 4) + site.below(3, RIVER, salt, side.charCodeAt(0)) - 1;
    return edgeCell(site, side, t, 0);
  };
  let ends = sides;
  if (ends.length === 1) {
    const seas = [...SIDE_ORDER].filter((s) => site.ctx.sea.includes(s) && s !== ends[0]);
    ends = [ends[0], seas.length > 0 ? seas[0] : OPPOSITE[ends[0]]];
  }
  if (ends.length === 2) {
    const [a, b] = ends;
    if (OPPOSITE[a] === b) {
      const high = site.chance(500, RIVER, 1);
      return [[point(a, high, 2), point(b, high, 3)]];
    }
    return [[point(a, leans(a, ends), 2), point(b, leans(b, ends), 3)]];
  }
  const qx = site.chance(500, RIVER, 4);
  const qy = site.chance(500, RIVER, 5);
  const meet: Cell = [floorDiv(w * (1 + 2 * Number(qx)), 4), floorDiv(h * (1 + 2 * Number(qy)), 4)];
  return ends.map((s, i) => [point(s, 'ns'.includes(s) ? qx : qy, 6 + i), meet]);
}

function leans(side: string, pair: readonly string[]): boolean {
  return 'ns'.includes(side) ? pair.includes('e') : pair.includes('s');
}

export function carveRiver(site: Site, a: Cell, b: Cell, salt: number, avoid: CellTest | null): void {
  const [ax, ay] = a;
  const dx = b[0] - ax;
  const dy = b[1] - ay;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const norm = isqrt(dx * dx + dy * dy) || 1;
  const seed = site.draw(RIVER, 100 + salt);
  let prev: Cell | null = null;
  for (let i = 0; i <= steps; i++) {
    const envelope = floorDiv(4 * i * (steps - i) * 64, steps * steps);
    const off = floorDiv((value(seed, PLACE, i * TILE, 0, 7 * TILE) - 32768) * 3 * envelope, 32768 * 64);
    const point: Cell = [
      ax + floorDiv(dx * i, steps) - floorDiv(dy * off, norm),
      ay + floorDiv(dy * i, steps) + floorDiv(dx * off, norm),
    ];
    for (const [cx, cy] of prev ? line(prev, point) : [point]) wetSquare(site, cx, cy, avoid);
    prev = point;
  }
}

function wetSquare(site: Site, cx: number, cy: number, avoid: CellTest | null): void {
  for (let x = cx; x < cx + RIVER_WIDTH; x++) {
    for (let y = cy; y < cy + RIVER_WIDTH; y++) {
      if (site.inside(x, y) && !(avoid && avoid(x, y))) site.kind[site.at(x, y)] = 'water';
    }
  }
}

export function layPonds(site: Site, spare: CellTest): void {
  const noise = site.noiseGrid(POND, 48, 2);
  const cut = threshold(noise, 60);
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) {
      const c = site.at(x, y);
      if (noise[c] >= cut && !spare(x, y) && OPEN.includes(site.kind[c])) site.kind[c] = 'water';
    }
  }
}

// Floods land too thin for the shore tiles: water on opposite sides or on opposite corners only. Each pass judges
// every cell on the same grid before flooding any, so the result never depends on the order cells are visited in.
export function tidyWater(site: Site): void {
  for (;;) {
    const thinCells: number[] = [];
    for (let y = 0; y < site.h; y++) {
      for (let x = 0; x < site.w; x++) {
        if (OPEN.includes(site.kind[site.at(x, y)]) && thin(site, x, y)) thinCells.push(site.at(x, y));
      }
    }
    if (thinCells.length === 0) return;
    for (const c of thinCells) site.kind[c] = 'water';
    joinSea(site, thinCells);
  }
}

// Flooded cells that touch the sea join it, ring by ring.
function joinSea(site: Site, flooded: number[]): void {
  let left = flooded;
  for (;;) {
    const joined = left.filter((c) => touchesSea(site, c));
    if (joined.length === 0) return;
    for (const c of joined) site.sea[c] = 1;
    const taken = new Set(joined);
    left = left.filter((c) => !taken.has(c));
  }
}

function touchesSea(site: Site, c: number): boolean {
  const x = xOf(c, site.w);
  const y = yOf(c, site.w);
  for (const [dx, dy] of DIRS) {
    if (site.inside(x + dx, y + dy) && site.sea[site.at(x + dx, y + dy)]) return true;
  }
  return false;
}

export function thin(site: Site, x: number, y: number): boolean {
  const n = site.water(x, y - 1);
  const e = site.water(x + 1, y);
  const s = site.water(x, y + 1);
  const w = site.water(x - 1, y);
  if ((n && s) || (e && w)) return true;
  return !(n || e || s || w) && thinCorners(site, x, y);
}

function thinCorners(site: Site, x: number, y: number): boolean {
  const ne = site.water(x + 1, y - 1);
  const se = site.water(x + 1, y + 1);
  const sw = site.water(x - 1, y + 1);
  const nw = site.water(x - 1, y - 1);
  return (ne && sw) || (nw && se);
}

export function layBeach(site: Site, width: number): void {
  const dist = new Int32Array(site.w * site.h).fill(99);
  let frontier: Cell[] = [];
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) {
      if (!site.sea[site.at(x, y)]) continue;
      dist[site.at(x, y)] = 0;
      frontier.push([x, y]);
    }
  }
  while (frontier.length > 0) frontier = beachRing(site, frontier, dist);
  const noise = site.noiseGrid(SEA, 64, 2);
  const wide = threshold(noise, 500);
  for (let c = 0; c < dist.length; c++) {
    const kind = site.kind[c];
    if ((kind === 'grass' || kind === 'meadow') && dist[c] <= width + (noise[c] >= wide ? 1 : 0)) site.kind[c] = 'sand';
  }
}

function beachRing(site: Site, frontier: readonly Cell[], dist: Int32Array): Cell[] {
  const next: Cell[] = [];
  for (const [x, y] of frontier) {
    const d = dist[site.at(x, y)] + 1;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!site.inside(nx, ny) || dist[site.at(nx, ny)] <= d || site.water(nx, ny)) continue;
        dist[site.at(nx, ny)] = d;
        next.push([nx, ny]);
      }
    }
  }
  return next;
}

// Short cliffs with tapered ends on hills and mountains, kept off the middle of the place.
export function layRidges(site: Site, count: number, spare: CellTest): void {
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const length = 6 + site.below(7, RIDGE, i, attempt, 0);
      const x0 = 1 + site.below(Math.max(1, site.w - length - 2), RIDGE, i, attempt, 1);
      const top = 1 + site.below(Math.max(1, site.h - 5), RIDGE, i, attempt, 2);
      if (ridgeFits(site, x0, length, top, spare)) {
        carveBand(site, top, 1, 'cliff_foot', x0, x0 + length - 1);
        break;
      }
    }
  }
}

function ridgeFits(site: Site, x0: number, length: number, top: number, spare: CellTest): boolean {
  for (let x = x0 - 1; x < x0 + length + 1; x++) {
    for (let y = top - 1; y < top + 4; y++) {
      if (!site.inside(x, y) || !OPEN.includes(site.kind[site.at(x, y)]) || site.bank(x, y) || spare(x, y)) return false;
    }
  }
  return true;
}

export function layWater(
  site: Site,
  sea: string,
  cliffs: boolean,
  depth: number,
  rivers: readonly River[],
  spare: CellTest,
  dry: CellTest | null = null,
): void {
  if (sea) {
    laySea(site, sea, depth, cliffs);
    if (!cliffs && !site.ctx.wonder) carveInlet(site);
  }
  rivers.forEach(([a, b], i) => carveRiver(site, a, b, i, dry));
  if (site.ctx.biome === 'marsh') layPonds(site, spare);
  tidyWater(site);
  finishBands(site);
  if (sea && !cliffs) layBeach(site, 2);
}

// A harbour cut into an east or west coast, so a dock can face south onto it.
export function carveInlet(site: Site): void {
  const sea = site.ctx.sea;
  const side = [...'ew'].find((s) => sea.includes(s));
  if (side === undefined || sea.includes('s')) return;
  const y0 = floorDiv(site.h * 2, 3) + site.below(3, INLET, 0) - 1;
  for (let y = y0; y < Math.min(site.h - 1, y0 + 3); y++) {
    const coast = coastOf(site, side, y);
    if (coast === null) continue;
    for (let k = 0; k < 7; k++) {
      const x = coast + (side === 'w' ? k : -k);
      if (!site.inside(x, y)) continue;
      site.kind[site.at(x, y)] = 'water';
      site.sea[site.at(x, y)] = 1;
    }
  }
}

// The first tile from the sea's edge, west or east, that is not sea.
function coastOf(site: Site, side: string, y: number): number | null {
  for (let k = 0; k < site.w; k++) {
    const x = side === 'w' ? k : site.w - 1 - k;
    if (!site.sea[site.at(x, y)]) return x;
  }
  return null;
}
