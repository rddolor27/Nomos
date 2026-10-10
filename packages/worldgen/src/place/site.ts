import { below as keyedBelow, draw, fbm, floorDiv } from '@nomos/sim-core/kernels';
import { PLACE_TILE_PX as TILE } from '@nomos/sim-protocol/place';
import { xOf, yOf } from '../grid/grid.ts';
import { chance as keyedChance } from '../random/keyed.ts';
import { PLACE } from '../random/streams.ts';
import type { PlaceContext } from './context.ts';
import { FRAMES } from './frames.ts';
import { LOT } from './keys.ts';
import type { Wall } from './walls.ts';

export type Cell = readonly [x: number, y: number];
export type Rect = readonly [tx: number, ty: number, fw: number, fh: number];
export type CellTest = (x: number, y: number) => boolean;

export interface Sprite {
  category: string;
  name: string;
  x: number;
  y: number;
}

// place.py's Person, with its stem split into pose, facing and step. lift raises a sitter onto a bench.
export interface Person {
  look: number;
  pose: string;
  facing: string;
  step: number;
  expression: string;
  job: string | null;
  emote: string | null;
  x: number;
  y: number;
  lift: number;
}

export interface Door {
  name: string;
  x: number;
  y: number;
}

export interface Lot {
  cost: number;
  tx: number;
  ty: number;
  spurs: Cell[][];
}

export interface LotOptions {
  spur?: number;
  groundOk?: CellTest;
  salt?: number;
}

// What one findLot call looks for, so that its rows can be searched apart.
interface LotSearch {
  fw: number;
  fh: number;
  up: number;
  doors: readonly number[];
  target: Cell;
  options: LotOptions;
  ok: CellTest;
  cols: number[];
  reach: Uint8Array;
}

export interface Frame {
  w: number;
  anchorX: number;
  anchorY: number;
  footprintW: number;
  footprintH: number;
  doorX: number;
}

export const OPEN: readonly string[] = ['grass', 'meadow', 'sand'];
export const CLIFFS: readonly string[] = [
  'cliff_top',
  'cliff_face',
  'cliff_corner-left',
  'cliff_corner-right',
  'cliff_foot',
  'cliff_foot-water',
];
// Road kinds, lowest first: a road tile keeps the highest-ranked kind laid on it.
export const RANK: readonly string[] = ['path', 'track', 'gravel', 'cobble', 'stone', 'paving'];
export const DIRS: readonly Cell[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
// Anchor rows in a tile: people draw in front of what shares it.
export const PROP_Y = 12;
export const BEAST_Y = 13;
export const PERSON_Y = 14;
// find_lot's and fits' margin: no footprint may touch another's.
const MARGIN = 1;
const SPUR_STEPS: readonly Cell[] = [
  [0, 1],
  [-1, 0],
  [1, 0],
  [0, -1],
];

export function frame(category: string, name: string): Frame {
  // Every house of a form shares one entry, keyed by its form (scripts/place-frames.ts).
  const key = category === 'houses' ? `houses/${name.split('_')[2]}` : `${category}/${name}`;
  const fields = FRAMES[key];
  if (!fields) throw new Error(`no sprite ${category}/${name} in the place frame table`);
  const [w, anchorX, anchorY, footprintW, footprintH, doorX] = fields;
  return { w, anchorX, anchorY, footprintW, footprintH, doorX };
}

// Tile rows a footprinted sprite's image rises above its footprint.
export function rise(f: Frame): number {
  return -floorDiv(f.footprintH * TILE - 1 - f.anchorY, TILE);
}

export function threshold(values: Int32Array, perMille: number): number {
  const ordered = Int32Array.from(values).sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, floorDiv(ordered.length * (1000 - perMille), 1000))];
}

export function line(a: Cell, b: Cell): Cell[] {
  let [x0, y0] = a;
  const [x1, y1] = b;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x1 > x0 ? 1 : -1;
  const sy = y1 > y0 ? 1 : -1;
  let err = dx + dy;
  const out: Cell[] = [];
  for (;;) {
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) return out;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

// The grids a place is built on: terrain kinds plus what stands where, a row-major cell per tile.
export class Site {
  readonly ctx: PlaceContext;
  readonly w: number;
  readonly h: number;
  readonly kind: string[];
  readonly sea: Uint8Array;
  readonly road: Uint8Array;
  // What stands on a tile: footprints, trunks, props and animals.
  readonly solid: (string | null)[];
  // Footprints of buildings, houses, landmarks and wonders.
  readonly big: Uint8Array;
  // Under a big sprite's image, above its footprint.
  readonly shade: Uint8Array;
  // Under a tree crown, above its trunk.
  readonly crown: Uint8Array;
  // Kept clear: plaza, green, fields, the view of a wonder, a wall's line.
  readonly keep: Uint8Array;
  // Under a stone bridge piece.
  readonly bridged: Uint8Array;
  ground: Sprite[] = [];
  readonly standing: Sprite[] = [];
  // Cliffs laid over water: top row, face rows and foot kind.
  readonly bands: { top: number; faces: number; foot: string }[] = [];
  cx: number;
  cy: number;
  plaza: Rect | null = null;
  wall: Wall | null = null;
  green: Cell[] = [];
  readonly entries: { side: string; x: number; y: number }[] = [];
  // Footprints by sprite name, in order of first building, as place.py's dict keeps them.
  readonly places = new Map<string, Rect[]>();
  readonly doors: Door[] = [];
  readonly fields: Rect[] = [];
  readonly pastures: Rect[] = [];
  people: Person[] = [];

  constructor(ctx: PlaceContext, w: number, h: number) {
    this.ctx = ctx;
    this.w = w;
    this.h = h;
    const n = w * h;
    this.kind = new Array<string>(n).fill('grass');
    this.sea = new Uint8Array(n);
    this.road = new Uint8Array(n);
    this.solid = new Array<string | null>(n).fill(null);
    this.big = new Uint8Array(n);
    this.shade = new Uint8Array(n);
    this.crown = new Uint8Array(n);
    this.keep = new Uint8Array(n);
    this.bridged = new Uint8Array(n);
    this.cx = floorDiv(w, 2);
    this.cy = floorDiv(h, 2);
  }

  at(x: number, y: number): number {
    return y * this.w + x;
  }

  draw(sub: number, ...key: number[]): number {
    return draw(this.ctx.seed, PLACE, sub, ...key);
  }

  below(n: number, sub: number, ...key: number[]): number {
    return keyedBelow(n, this.ctx.seed, PLACE, sub, ...key);
  }

  chance(perMille: number, sub: number, ...key: number[]): boolean {
    return keyedChance(perMille, this.ctx.seed, PLACE, sub, ...key);
  }

  pick<T>(items: readonly T[], sub: number, ...key: number[]): T {
    return items[this.below(items.length, sub, ...key)];
  }

  noise(sub: number, x: number, y: number, cell: number, octaves = 3): number {
    return fbm(this.draw(sub), PLACE, x * TILE, y * TILE, cell, octaves);
  }

  // site.noise over every tile, row by row.
  noiseGrid(sub: number, cell: number, octaves = 3): Int32Array {
    const out = new Int32Array(this.w * this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) out[this.at(x, y)] = this.noise(sub, x, y, cell, octaves);
    }
    return out;
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && x < this.w && y >= 0 && y < this.h;
  }

  water(x: number, y: number): boolean {
    return this.inside(x, y) && this.kind[this.at(x, y)] === 'water';
  }

  wet4(x: number, y: number): boolean {
    for (const [dx, dy] of DIRS) {
      if (this.water(x + dx, y + dy)) return true;
    }
    return false;
  }

  bank(x: number, y: number): boolean {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (this.water(x + dx, y + dy)) return true;
      }
    }
    return false;
  }

  free(x: number, y: number): boolean {
    if (!this.inside(x, y)) return false;
    const c = this.at(x, y);
    return !this.road[c] && this.solid[c] === null && this.clear(c) && OPEN.includes(this.kind[c]) && !this.bank(x, y);
  }

  buildable(x: number, y: number): boolean {
    return this.free(x, y) && !this.crown[this.at(x, y)] && (this.kind[this.at(x, y)] !== 'sand' || this.desert());
  }

  desert(): boolean {
    const ctx = this.ctx;
    return ctx.biome === 'sand' || ctx.wonder === 'dune' || (ctx.moisture < 70 && ctx.temperature > 165);
  }

  standable(x: number, y: number): boolean {
    const c = this.at(x, y);
    const k = this.kind[c];
    const ground = OPEN.includes(k) || RANK.includes(k);
    return ground && this.solid[c] === null && !this.shade[c] && !this.crown[c] && !this.bank(x, y);
  }

  // Cost of a road through a tile, or null where no road may go.
  step(x: number, y: number): number | null {
    const c = this.at(x, y);
    const k = this.kind[c];
    if (CLIFFS.includes(k) || this.sea[c] || this.solid[c] !== null || (this.keep[c] && !this.road[c])) return null;
    if (this.road[c]) return 4;
    if (k === 'water') return 30;
    return this.bank(x, y) ? 22 : 10;
  }

  put(category: string, name: string, x: number, y: number, ground = false): void {
    (ground ? this.ground : this.standing).push({ category, name, x, y });
  }

  // A footprinted sprite with its footprint's top-left tile at (tx, ty).
  build(category: string, name: string, tx: number, ty: number): void {
    const f = frame(category, name);
    const fw = f.footprintW;
    const fh = f.footprintH;
    for (let cy = ty; cy < ty + fh; cy++) {
      for (let cx = tx; cx < tx + fw; cx++) {
        this.solid[this.at(cx, cy)] = name;
        this.big[this.at(cx, cy)] = 1;
      }
    }
    for (let cy = Math.max(0, ty - rise(f)); cy < ty; cy++) {
      for (let cx = tx; cx < tx + fw; cx++) this.shade[this.at(cx, cy)] = 1;
    }
    const rects = this.places.get(name);
    if (rects) rects.push([tx, ty, fw, fh]);
    else this.places.set(name, [[tx, ty, fw, fh]]);
    this.cover(category, name, tx, ty);
  }

  // A footprinted sprite anchored as build anchors one, at its footprint's bottom middle, over tiles it leaves as they
  // are: a bridge, or a gate over a road.
  cover(category: string, name: string, tx: number, ty: number, ground = false): void {
    const f = frame(category, name);
    this.put(category, name, tx * TILE + floorDiv(f.footprintW * TILE, 2), (ty + f.footprintH) * TILE - 1, ground);
  }

  // A prop centred on one tile, or on two side by side when wide.
  prop(category: string, name: string, tx: number, ty: number, wide = false): void {
    const span = wide ? 2 : 1;
    for (let cx = tx; cx < tx + span; cx++) this.solid[this.at(cx, ty)] = name;
    const f = frame(category, name);
    this.put(category, name, tx * TILE + floorDiv(span * TILE - f.w, 2) + f.anchorX, ty * TILE + PROP_Y);
  }

  // Plants a tree with its trunk on (tx, ty), unless its crown would hide a building.
  tree(category: string, name: string, tx: number, ty: number): void {
    const f = frame(category, name);
    const x = tx * TILE + floorDiv(TILE, 2);
    const y = ty * TILE + PROP_Y;
    const crown = this.crownCells(x - f.anchorX, y - f.anchorY, f.w, ty);
    for (const c of crown) {
      if (this.big[c]) return;
    }
    this.solid[this.at(tx, ty)] = name;
    for (const c of crown) this.crown[c] = 1;
    this.put(category, name, x, y);
  }

  layPath(cells: readonly Cell[]): void {
    for (const [x, y] of cells) {
      const c = this.at(x, y);
      this.road[c] = 1;
      if (OPEN.includes(this.kind[c])) this.kind[c] = 'path';
    }
  }

  // place.py's order is ground, margin, then above. What stands nearby is checked first here, since most lots a search
  // tries are taken and the ground test costs most. Budget: a capital or city builds within twice Task 9's median.
  fits(tx: number, ty: number, fw: number, fh: number, up: number, groundOk: CellTest): boolean {
    if (tx < 0 || ty - up < 0 || tx + fw > this.w || ty + fh > this.h) return false;
    return this.clearAround(tx, ty, fw, fh) && this.clearAbove(tx, ty, fw, up) && this.groundFits(tx, ty, fw, fh, groundOk);
  }

  // Free tiles leading from (x, y) to a road, at most limit of them, or null.
  spur(x: number, y: number, limit: number, avoid: ReadonlySet<number>): Cell[] | null {
    if (!this.inside(x, y)) return null;
    if (this.road[this.at(x, y)]) return [];
    if (!this.free(x, y) || avoid.has(this.at(x, y))) return null;
    const parent = new Map<number, number>([[this.at(x, y), -1]]);
    let frontier = [this.at(x, y)];
    for (let i = 0; i < limit; i++) {
      const next: number[] = [];
      for (const c of frontier) {
        const path = this.spurFrom(c, parent, avoid, next);
        if (path) return path;
      }
      frontier = next;
    }
    return null;
  }

  // The cheapest footprint whose doors reach a road; doors are pixel offsets from its left.
  findLot(fw: number, fh: number, up: number, doors: readonly number[], target: Cell, options: LotOptions = {}): Lot | null {
    const search: LotSearch = {
      fw,
      fh,
      up,
      doors,
      target,
      options,
      ok: options.groundOk ?? ((x: number, y: number) => this.buildable(x, y)),
      cols: nearestFirst(this.w - fw + 1, floorDiv(fw, 2), target[0]),
      reach: doors.length > 0 ? this.spurReach(options.spur ?? 0) : new Uint8Array(0),
    };
    let best: Lot | null = null;
    for (const ty of nearestFirst(this.h - fh, fh, target[1])) {
      const rowGap = Math.abs(ty + fh - target[1]);
      if (best !== null && rowGap * 8 > best.cost) break;
      best = this.bestInRow(search, ty, rowGap, best);
    }
    return best;
  }

  // Builds on a lot from findLot, lays its spur paths and notes its door, bottom centre.
  settle(category: string, name: string, lot: Lot): void {
    this.build(category, name, lot.tx, lot.ty);
    for (const path of lot.spurs) this.layPath(path);
    const f = frame(category, name);
    this.doors.push({ name, x: lot.tx + floorDiv(f.footprintW, 2), y: lot.ty + f.footprintH });
  }

  private clear(c: number): boolean {
    return !this.keep[c] && !this.shade[c];
  }

  // `best`, or the lot in row ty that beats it. Columns nearest the target come first, and the row stops once the gap
  // alone costs more than `best`: a lot costs at least 8 a step of gap. Budget: a capital builds in about 150 ms in Node,
  // where a full scan for each of 200 houses took 480 ms.
  private bestInRow(search: LotSearch, ty: number, rowGap: number, best: Lot | null): Lot | null {
    const { fw, fh, up, doors, target, options, ok, cols } = search;
    for (const tx of cols) {
      const gap = rowGap + Math.abs(tx + floorDiv(fw, 2) - target[0]);
      if (best !== null && gap * 8 > best.cost) break;
      if (!this.doorsReach(search, tx, ty) || !this.fits(tx, ty, fw, fh, up, ok)) continue;
      const lot = this.lotAt(tx, ty, fw, fh, doors, target, options);
      if (lot !== null && (best === null || readsBefore(lot, best))) best = lot;
    }
    return best;
  }

  // The tiles a spur of at most `limit` steps can start from: roads, and tiles within `limit` of a dry road. A spur of
  // none starts on a road, so the road grid serves as it is.
  private spurReach(limit: number): Uint8Array {
    if (limit === 0) return this.road;
    const near = new Uint8Array(this.w * this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!this.road[this.at(x, y)]) continue;
        near[this.at(x, y)] = 1;
        if (!this.water(x, y)) this.markWithin(near, x, y, limit);
      }
    }
    return near;
  }

  private markWithin(near: Uint8Array, x: number, y: number, limit: number): void {
    for (let dy = Math.max(-limit, -y); dy <= Math.min(limit, this.h - 1 - y); dy++) {
      const span = limit - Math.abs(dy);
      for (let nx = Math.max(0, x - span); nx < Math.min(this.w, x + span + 1); nx++) near[this.at(nx, y + dy)] = 1;
    }
  }

  // Whether a spur could start at every door of a lot at (tx, ty).
  private doorsReach(search: LotSearch, tx: number, ty: number): boolean {
    for (const dx of search.doors) {
      const x = tx + floorDiv(dx, TILE);
      if (!this.inside(x, ty + search.fh) || !search.reach[this.at(x, ty + search.fh)]) return false;
    }
    return true;
  }

  private lotAt(
    tx: number,
    ty: number,
    fw: number,
    fh: number,
    doors: readonly number[],
    target: Cell,
    options: LotOptions,
  ): Lot | null {
    const spurs = this.doorSpurs(tx, ty, fw, fh, doors, options.spur ?? 0);
    if (spurs === null) return null;
    const gap = Math.abs(tx + floorDiv(fw, 2) - target[0]) + Math.abs(ty + fh - target[1]);
    const cost = gap * 8 + spurLength(spurs) * 6 + this.below(8, LOT, options.salt ?? 0, tx, ty);
    return { cost, tx, ty, spurs };
  }

  private crownCells(left: number, top: number, w: number, ty: number): number[] {
    const cells: number[] = [];
    for (let cy = floorDiv(top, TILE); cy < ty; cy++) {
      for (let cx = floorDiv(left, TILE); cx < floorDiv(left + w - 1, TILE) + 1; cx++) {
        if (this.inside(cx, cy)) cells.push(this.at(cx, cy));
      }
    }
    return cells;
  }

  private groundFits(tx: number, ty: number, fw: number, fh: number, groundOk: CellTest): boolean {
    for (let cy = ty; cy < ty + fh; cy++) {
      for (let cx = tx; cx < tx + fw; cx++) {
        if (!groundOk(cx, cy)) return false;
      }
    }
    return true;
  }

  private clearAround(tx: number, ty: number, fw: number, fh: number): boolean {
    for (let cy = ty - MARGIN; cy < ty + fh + MARGIN; cy++) {
      for (let cx = tx - MARGIN; cx < tx + fw + MARGIN; cx++) {
        if (this.inside(cx, cy) && this.solid[this.at(cx, cy)] !== null) return false;
      }
    }
    return true;
  }

  private clearAbove(tx: number, ty: number, fw: number, up: number): boolean {
    for (let cy = Math.max(0, ty - up); cy < ty; cy++) {
      for (let cx = tx; cx < tx + fw; cx++) {
        const c = this.at(cx, cy);
        if (this.solid[c] !== null || this.crown[c]) return false;
      }
    }
    return true;
  }

  // One breadth-first step of spur from cell c: the path back to the start once a dry road is next to it.
  private spurFrom(c: number, parent: Map<number, number>, avoid: ReadonlySet<number>, next: number[]): Cell[] | null {
    const cx = xOf(c, this.w);
    const cy = yOf(c, this.w);
    for (const [dx, dy] of SPUR_STEPS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!this.inside(nx, ny) || parent.has(this.at(nx, ny))) continue;
      if (this.road[this.at(nx, ny)] && !this.water(nx, ny)) return this.pathBack(c, parent);
      if (this.free(nx, ny) && !avoid.has(this.at(nx, ny))) {
        parent.set(this.at(nx, ny), c);
        next.push(this.at(nx, ny));
      }
    }
    return null;
  }

  private pathBack(c: number, parent: ReadonlyMap<number, number>): Cell[] {
    const path: Cell[] = [];
    for (let at = c; at >= 0; at = parent.get(at) ?? -1) path.push([xOf(at, this.w), yOf(at, this.w)]);
    return path;
  }

  private doorSpurs(tx: number, ty: number, fw: number, fh: number, doors: readonly number[], limit: number): Cell[][] | null {
    const avoid = new Set<number>();
    for (let cy = ty; cy < ty + fh; cy++) {
      for (let cx = tx; cx < tx + fw; cx++) avoid.add(this.at(cx, cy));
    }
    const spurs: Cell[][] = [];
    for (const dx of doors) {
      const path = this.spur(tx + floorDiv(dx, TILE), ty + fh, limit, avoid);
      if (path === null) return null;
      spurs.push(path);
      for (const [x, y] of path) avoid.add(this.at(x, y));
    }
    return spurs;
  }
}

// The indexes 0..count-1 by their distance to `at - offset`, nearest first and, at equal distance, lower index first:
// place.py's sorted(range(count), key=lambda i: (abs(i + offset - at), i)), without a sort.
function nearestFirst(count: number, offset: number, at: number): number[] {
  const order: number[] = [];
  const centre = at - offset;
  for (let d = 0; order.length < count; d++) {
    if (centre - d >= 0 && centre - d < count) order.push(centre - d);
    if (d > 0 && centre + d >= 0 && centre + d < count) order.push(centre + d);
  }
  return order;
}

// find_lot's (cost, ty, tx) order: the cheaper lot, and of equal cost the one a scan in reading order meets first.
function readsBefore(lot: Lot, best: Lot): boolean {
  return lot.cost < best.cost || (lot.cost === best.cost && (lot.ty < best.ty || (lot.ty === best.ty && lot.tx < best.tx)));
}

function spurLength(spurs: readonly Cell[][]): number {
  let total = 0;
  for (const path of spurs) total += path.length;
  return total;
}
