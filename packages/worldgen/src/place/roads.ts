import { floorDiv } from '@nomos/sim-core/kernels';
import { PLACE_TILE_PX as TILE } from '@nomos/sim-protocol/place';
import { MinHeap } from '../grid/heap.ts';
import { xOf, yOf } from '../grid/grid.ts';
import { ROUTE } from './keys.ts';
import { DIRS, OPEN, RANK, type Cell, type CellTest, type Site } from './site.ts';
import { edgeCell } from './terrain.ts';

// The heading of a road that enters from each side.
export const INWARD: Readonly<Record<string, number>> = { n: 2, e: 3, s: 0, w: 1 };
const TURN_COST = 15;
// A road's width in tiles and its kind, by its role in the place (owner, 10 October 2026).
export const ROADS: Readonly<Record<string, readonly [width: number, kind: string]>> = {
  main: [3, 'stone'],
  street: [2, 'cobble'],
  country: [2, 'gravel'],
  track: [1, 'track'],
  lane: [1, 'path'],
};
const BRIDGE_ENDS: Readonly<Record<string, readonly [first: string, last: string]>> = {
  horizontal: ['end-left', 'end-right'],
  vertical: ['end-top', 'end-bottom'],
};

// A search state: a tile and the heading the road arrived on, as a cell index times four plus the heading.
function stateOf(site: Site, x: number, y: number, heading: number): number {
  return site.at(x, y) * 4 + heading;
}

function cellOf(site: Site, state: number): Cell {
  const cell = floorDiv(state, 4);
  return [xOf(cell, site.w), yOf(cell, site.w)];
}

// Cheapest road from start to a tile where goal holds. It never turns on, into or out of water, so every river
// crossing is straight and has a bank tile at each end for a bridge. The heap pops by cost, then by push order, as
// place.py's heapq does with its sequence number.
export function route(site: Site, start: Cell, heading: number, goal: CellTest): Cell[] | null {
  const [sx, sy] = start;
  const best = new Float64Array(site.w * site.h * 4).fill(Infinity);
  const prev = new Int32Array(best.length).fill(-1);
  const heap = new MinHeap(64);
  const first = stateOf(site, sx, sy, heading);
  best[first] = 0;
  heap.push(0, 0, first);
  const search = { best, prev, heap, seq: 0 };
  while (heap.size > 0) {
    heap.pop();
    const cost = heap.a;
    const state = heap.c;
    if (cost > best[state]) continue;
    const [x, y] = cellOf(site, state);
    if (goal(x, y) && !(x === sx && y === sy)) return pathTo(site, state, prev);
    relax(site, x, y, state & 3, cost, search);
  }
  return null;
}

interface Search {
  best: Float64Array;
  prev: Int32Array;
  heap: MinHeap;
  seq: number;
}

function relax(site: Site, x: number, y: number, d: number, cost: number, search: Search): void {
  const bx = x - DIRS[d][0];
  const by = y - DIRS[d][1];
  for (let nd = 0; nd < DIRS.length; nd++) {
    if (nd === ((d + 2) & 3)) continue;
    const nx = x + DIRS[nd][0];
    const ny = y + DIRS[nd][1];
    if (!site.inside(nx, ny)) continue;
    const step = site.step(nx, ny);
    if (step === null) continue;
    const turn = nd !== d;
    if (turn && wetTurn(site, x, y, bx, by, nx, ny)) continue;
    const c = cost + step + (turn ? TURN_COST : 0);
    const next = stateOf(site, nx, ny, nd);
    if (c >= search.best[next]) continue;
    search.best[next] = c;
    search.prev[next] = stateOf(site, x, y, d);
    search.heap.push(c, ++search.seq, next);
  }
}

// A turn on, into or out of water: the tile itself, the one behind or the one ahead.
function wetTurn(site: Site, x: number, y: number, bx: number, by: number, nx: number, ny: number): boolean {
  return site.water(x, y) || site.water(bx, by) || site.water(nx, ny);
}

function pathTo(site: Site, state: number, prev: Int32Array): Cell[] {
  const path = [cellOf(site, state)];
  for (let s = prev[state]; s >= 0; s = prev[s]) path.push(cellOf(site, s));
  return path.reverse();
}

// The tiles from a toward b in a line, stopping where a road may not go, before a long stretch of water, and short
// of the river where it does not cross.
export function straight(site: Site, a: Cell, b: Cell): Cell[] {
  let [x, y] = a;
  const [bx, by] = b;
  const dx = sign(bx - x);
  const dy = sign(by - y);
  const cells: Cell[] = [];
  while (site.inside(x, y) && site.step(x, y) !== null) {
    if (site.water(x, y) && !bridgeable(site, x, y, dx, dy)) break;
    cells.push([x, y]);
    if (x === bx && y === by) break;
    x += dx;
    y += dy;
  }
  while (cells.length > 0 && endsWet(site, cells[cells.length - 1])) cells.pop();
  return cells;
}

function sign(v: number): number {
  return (v > 0 ? 1 : 0) - (v < 0 ? 1 : 0);
}

// Water ahead that a road may cross: at most four tiles of it, with road-worthy land beyond.
function bridgeable(site: Site, x: number, y: number, dx: number, dy: number): boolean {
  let run = 0;
  while (site.water(x + dx * run, y + dy * run)) run++;
  const fx = x + dx * run;
  const fy = y + dy * run;
  return run <= 4 && site.inside(fx, fy) && site.step(fx, fy) !== null;
}

function endsWet(site: Site, [x, y]: Cell): boolean {
  return site.water(x, y) || (site.wet4(x, y) && !site.road[site.at(x, y)]);
}

// Lays one road tile. A tile keeps the highest-ranked kind laid on it and water stays water, and a tile no road may cross
// is left alone unless it is a road already.
export function layRoad(site: Site, x: number, y: number, kind: string): void {
  if (!site.inside(x, y)) return;
  const c = site.at(x, y);
  if (site.step(x, y) === null && !site.road[c]) return;
  site.road[c] = 1;
  const rank = RANK.indexOf(site.kind[c]);
  if (OPEN.includes(site.kind[c]) || (rank >= 0 && rank < RANK.indexOf(kind))) site.kind[c] = kind;
}

// Lays a road of its role's width along cells in order, each cell the middle of the road. A lane or track crosses a
// river on footbridges or a paved causeway, a wider road on a stone bridge.
export function pave(site: Site, cells: readonly Cell[], role = 'lane'): void {
  const [width, kind] = ROADS[role];
  const spans = wetSpans(site, cells, width);
  if (width === 1) {
    layNarrow(site, cells, spans, kind);
    return;
  }
  for (const [x, y] of cells) laySquare(site, x, y, width, kind);
  for (const [a, b] of spans) bridge(site, cells.slice(a, b + 1), role);
}

function layNarrow(site: Site, cells: readonly Cell[], spans: readonly [number, number][], kind: string): void {
  const crossing = new Set<number>();
  for (const [a, b] of spans) {
    for (let k = a; k <= b; k++) crossing.add(k);
  }
  cells.forEach(([x, y], k) => {
    if (!crossing.has(k)) layRoad(site, x, y, kind);
  });
  for (const [a, b] of spans) {
    cross(site, cells.slice(a, b + 1), b + 1 < cells.length ? cells[b + 1] : null, a > 0 ? cells[a - 1] : null);
  }
}

// The square of road a wide road lays round one middle cell, leaving water to its bridges.
function laySquare(site: Site, x: number, y: number, width: number, kind: string): void {
  const back = floorDiv(width - 1, 2);
  for (let sy = y - back; sy < y - back + width; sy++) {
    for (let sx = x - back; sx < x - back + width; sx++) {
      if (!site.water(sx, sy)) layRoad(site, sx, sy, kind);
    }
  }
}

// A stone bridge where a wide road crosses water in a straight line, as route and straight keep it: a piece across the
// road at each cell, its ends on the shore either side and spans between. A piece makes the water under it road, and is
// left out where another piece lies (plan, Part 3, Ruling 6).
function bridge(site: Site, span: readonly Cell[], role: string): void {
  const [width, kind] = ROADS[role];
  const back = floorDiv(width - 1, 2);
  const horizontal = span[0][1] === span[span.length - 1][1];
  const axis = horizontal ? 'horizontal' : 'vertical';
  const along = span.map(([x, y]) => (horizontal ? x : y));
  const lo = Math.min(...along);
  const hi = Math.max(...along);
  span.forEach(([x, y], i) => {
    const tx = horizontal ? x : x - back;
    const ty = horizontal ? y - back : y;
    const tiles = pieceTiles(site, tx, ty, horizontal, width);
    if (tiles.some(([cx, cy]) => site.bridged[site.at(cx, cy)])) return;
    for (const [cx, cy] of tiles) {
      site.bridged[site.at(cx, cy)] = 1;
      layRoad(site, cx, cy, kind);
    }
    site.cover('scenery', `bridge_${role}_${axis}_${pieceOf(along[i], lo, hi, BRIDGE_ENDS[axis])}`, tx, ty, true);
  });
}

// The tiles a bridge piece lies over inside the place: down a column of a road along x, across a row of one along y.
function pieceTiles(site: Site, tx: number, ty: number, horizontal: boolean, width: number): Cell[] {
  const tiles: Cell[] = [];
  for (let k = 0; k < width; k++) {
    const x = horizontal ? tx : tx + k;
    const y = horizontal ? ty + k : ty;
    if (site.inside(x, y)) tiles.push([x, y]);
  }
  return tiles;
}

function pieceOf(t: number, lo: number, hi: number, [first, last]: readonly [string, string]): string {
  if (t === lo) return first;
  return t === hi ? last : 'span';
}

// Each run of cells whose square of road holds water a road may cross, widened by a cell at either end, as its first
// and last index: where the road crosses water. A lane's square is its own tile.
function wetSpans(site: Site, cells: readonly Cell[], width: number): [number, number][] {
  const spans: [number, number][] = [];
  let i = 0;
  while (i < cells.length) {
    if (!wetSquare(site, cells[i], width)) {
      i++;
      continue;
    }
    let j = i;
    while (j < cells.length && wetSquare(site, cells[j], width)) j++;
    spans.push([Math.max(i - 1, 0), Math.min(j, cells.length - 1)]);
    i = j;
  }
  return spans;
}

function wetSquare(site: Site, [x, y]: Cell, width: number): boolean {
  const back = floorDiv(width - 1, 2);
  for (let sy = y - back; sy < y - back + width; sy++) {
    for (let sx = x - back; sx < x - back + width; sx++) {
      if (site.water(sx, sy) && site.step(sx, sy) !== null) return true;
    }
  }
  return false;
}

export function cross(site: Site, span: readonly Cell[], after: Cell | null, before: Cell | null): void {
  for (const [x, y] of span) site.road[site.at(x, y)] = 1;
  const [x0, y0] = span[0];
  const [x1, y1] = span[span.length - 1];
  if (y0 !== y1) {
    for (const [x, y] of span) site.kind[site.at(x, y)] = 'paving';
    return;
  }
  let a = Math.min(x0, x1);
  let b = Math.max(x0, x1);
  if ((b - a + 1) & 1) {
    const extra = [after, before].find((c) => c !== null && c[1] === y0) ?? null;
    if (extra === null) {
      for (const [x, y] of span) {
        if (site.water(x, y)) site.kind[site.at(x, y)] = 'paving';
      }
      return;
    }
    a = Math.min(a, extra[0]);
    b = Math.max(b, extra[0]);
  }
  for (let x = a; x <= b; x += 2) site.put('scenery', 'prop_footbridge', x * TILE + TILE, y0 * TILE + TILE - 1, true);
}

export function roadEntry(site: Site, side: string, salt: number): Cell | null {
  const span = 'ns'.includes(side) ? site.w : site.h;
  const mid = floorDiv(span, 2) + site.below(floorDiv(span, 3) + 1, ROUTE, salt) - floorDiv(span, 6);
  for (const off of nearestFirst(floorDiv(-span, 2), floorDiv(span, 2))) {
    const t = mid + off;
    if (t < 2 || t >= span - 2) continue;
    const [x, y] = edgeCell(site, side, t, 0);
    if (site.step(x, y) !== null && !site.water(x, y) && !site.bank(x, y)) return [x, y];
  }
  return null;
}

// The offsets from lo up to hi, nearest zero first and the lower of a tie first.
function nearestFirst(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let off = lo; off < hi; off++) out.push(off);
  return out.sort((p, q) => Math.abs(p) - Math.abs(q) || p - q);
}

// The sides the map's roads come in by, off the sea, or one keyed side where none do.
export function roadSides(site: Site): string[] {
  const ctx = site.ctx;
  const sides = [...'nesw'].filter((s) => ctx.roads.includes(s) && !ctx.sea.includes(s));
  if (sides.length > 0) return sides;
  const dry = [...'nesw'].filter((s) => !ctx.sea.includes(s));
  return [site.pick(dry.length > 0 ? dry : ['n'], ROUTE, 0)];
}

// A country road in from each road side to the nearest road; past a wall's ring that is a main road's end.
export function layRoads(site: Site): void {
  roadSides(site).forEach((side, i) => {
    const start = roadEntry(site, side, i + 1);
    if (start === null) return;
    const path = route(site, start, INWARD[side], (x, y) => site.road[site.at(x, y)] === 1);
    if (path === null) return;
    pave(site, path, 'country');
    site.entries.push({ side, x: start[0], y: start[1] });
  });
}

// Top-left of a cw x ch centre whose surroundings are dry land, nearest the middle.
export function centreSpot(site: Site, cw: number, ch: number, above: number, under: number, side: number): Cell {
  const ideal: Cell = [floorDiv(site.w - cw, 2), floorDiv(site.h - ch, 2)];
  let best: [gap: number, x: number, y: number] | null = null;
  for (let y = above; y < site.h - ch - under + 1; y++) {
    for (let x = side; x < site.w - cw - side + 1; x++) {
      const gap = Math.abs(x - ideal[0]) * 2 + Math.abs(y - ideal[1]) * 3;
      if (best !== null && gap >= best[0]) continue;
      if (allDry(site, x - side, y - above, x + cw + side, y + ch + under)) best = [gap, x, y];
    }
  }
  return best ? [best[1], best[2]] : ideal;
}

function allDry(site: Site, x0: number, y0: number, x1: number, y1: number): boolean {
  for (let cy = y0; cy < y1; cy++) {
    for (let cx = x0; cx < x1; cx++) {
      if (!dry(site, cx, cy)) return false;
    }
  }
  return true;
}

function dry(site: Site, x: number, y: number): boolean {
  if (!site.inside(x, y)) return false;
  const kind = site.kind[site.at(x, y)];
  return OPEN.includes(kind) && !site.bank(x, y) && (kind !== 'sand' || site.desert());
}
