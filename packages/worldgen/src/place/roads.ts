import { floorDiv } from '@nomos/sim-core/kernels';
import { PLACE_TILE_PX as TILE } from '@nomos/sim-protocol/place';
import { MinHeap } from '../grid/heap.ts';
import { xOf, yOf } from '../grid/grid.ts';
import { ROUTE } from './keys.ts';
import { DIRS, OPEN, type Cell, type CellTest, type Site } from './site.ts';
import { edgeCell } from './terrain.ts';

// The heading of a road that enters from each side.
export const INWARD: Readonly<Record<string, number>> = { n: 2, e: 3, s: 0, w: 1 };
const TURN_COST = 15;

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

// Lays a road along cells in order; river crossings get footbridges or a paved causeway.
export function pave(site: Site, cells: readonly Cell[]): void {
  const spans = waterSpans(site, cells);
  const crossing = new Set<number>();
  for (const [a, b] of spans) {
    for (let k = a; k <= b; k++) crossing.add(k);
  }
  site.layPath(cells.filter((_, k) => !crossing.has(k)));
  for (const [a, b] of spans) {
    cross(site, cells.slice(a, b + 1), b + 1 < cells.length ? cells[b + 1] : null, a > 0 ? cells[a - 1] : null);
  }
}

// Each run of water along cells, widened by the land tile at either end.
function waterSpans(site: Site, cells: readonly Cell[]): [number, number][] {
  const spans: [number, number][] = [];
  let i = 0;
  while (i < cells.length) {
    if (!site.water(...cells[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j < cells.length && site.water(...cells[j])) j++;
    spans.push([Math.max(i - 1, 0), Math.min(j, cells.length - 1)]);
    i = j;
  }
  return spans;
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

export function layRoads(site: Site): void {
  const ctx = site.ctx;
  let sides = [...'nesw'].filter((s) => ctx.roads.includes(s) && !ctx.sea.includes(s));
  if (sides.length === 0) {
    const dry = [...'nesw'].filter((s) => !ctx.sea.includes(s));
    sides = [site.pick(dry.length > 0 ? dry : ['n'], ROUTE, 0)];
  }
  sides.forEach((side, i) => {
    const start = roadEntry(site, side, i + 1);
    if (start === null) return;
    const path = route(site, start, INWARD[side], (x, y) => site.road[site.at(x, y)] === 1);
    if (path === null) return;
    pave(site, path);
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
