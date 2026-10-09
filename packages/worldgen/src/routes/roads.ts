import { floorDiv } from '@nomos/sim-core/kernels';
import { wetCells } from '../climate/biomes.ts';
import { type Adjacency, dist2, neighbours, xOf, yOf } from '../grid/grid.ts';
import { MinHeap } from '../grid/heap.ts';
import type { Settlement } from '../settle/settle.ts';
import { BRIDGE, COVER, DIAGONAL, STRAIGHT } from './costs.ts';
import { landmasses, routeGraph } from './graph.ts';

// The cells a road may step to from each cell, in Adjacency's layout, with each move's base cost beside it.
export interface Moves extends Adjacency {
  readonly base: Int32Array;
}

// 2^31 - 1: a cost no path reaches, standing for a cell the walk has not seen.
const UNSEEN = 0x7fffffff;

// A diagonal may not cut a water corner, nor slip between two river cells that flow into each other.
function pinched(a: number, b: number, wet: Uint8Array, river: Uint8Array, receiver: Int32Array): boolean {
  if (wet[a] !== 0 || wet[b] !== 0) return true;
  return river[a] !== 0 && river[b] !== 0 && (receiver[a] === b || receiver[b] === a);
}

// Per cell, the moves A* may take, in the neighbours' order. A move into water is left out, but a river cell is land: a
// road enters it at a bridge's price.
export function steps(
  width: number,
  height: number,
  biome: Uint8Array,
  river: Uint8Array,
  receiver: Int32Array,
): Moves {
  const n = width * height;
  const nbrs = neighbours(width, height);
  const wet = wetCells(biome);
  const start = new Int32Array(n + 1);
  const cells = new Int32Array(nbrs.cells.length);
  const base = new Int32Array(nbrs.cells.length);
  let count = 0;
  for (let c = 0; c < n; c++) {
    const x = xOf(c, width);
    const y = yOf(c, width);
    for (let k = nbrs.start[c]; k < nbrs.start[c + 1]; k++) {
      const m = nbrs.cells[k];
      const dx = xOf(m, width) - x;
      const dy = yOf(m, width) - y;
      const diagonal = dx !== 0 && dy !== 0;
      if (wet[m] !== 0 || (diagonal && pinched(c + dx, c + dy * width, wet, river, receiver))) continue;
      cells[count] = m;
      base[count++] = diagonal ? DIAGONAL : STRAIGHT;
    }
    start[c + 1] = count;
  }
  return { start, cells: cells.slice(0, count), base: base.slice(0, count) };
}

// A* over the moves, made once per build. Its scratch arrays and heap are reused, and each walk puts back what it
// touched. road is read live: the caller marks each finished path in it, and a later walk finds that road half price.
export class Walker {
  private readonly width: number;
  private readonly moves: Moves;
  private readonly enter: Int32Array;
  private readonly elevation: Int32Array;
  private readonly road: Uint8Array;
  private readonly cost: Int32Array;
  private readonly came: Int32Array;
  private readonly touched: Int32Array;
  private readonly heap: MinHeap;
  private touchedCount = 0;

  constructor(width: number, moves: Moves, enter: Int32Array, elevation: Int32Array, road: Uint8Array) {
    this.width = width;
    this.moves = moves;
    this.enter = enter;
    this.elevation = elevation;
    this.road = road;
    this.cost = new Int32Array(road.length).fill(UNSEEN);
    this.came = new Int32Array(road.length).fill(UNSEEN);
    this.touched = new Int32Array(road.length);
    this.heap = new MinHeap(road.length);
  }

  // The cells of the cheapest way from start to goal, start first. The heap key is (cost plus the way ahead, cost,
  // cell). A push replaces nothing, so a popped key whose cost is above the cell's has been beaten and is skipped.
  walk(start: number, goal: number): number[] {
    const gx = xOf(goal, this.width);
    const gy = yOf(goal, this.width);
    this.reach(start, 0, -1);
    this.heap.push(0, 0, start);
    while (this.heap.size > 0) {
      this.heap.pop();
      const g = this.heap.b;
      const c = this.heap.c;
      if (c === goal) break;
      if (g <= this.cost[c]) this.expand(c, g, gx, gy);
    }
    const path = this.trace(goal);
    this.clear();
    return path;
  }

  private reach(cell: number, g: number, from: number): void {
    if (this.cost[cell] === UNSEEN) this.touched[this.touchedCount++] = cell;
    this.cost[cell] = g;
    this.came[cell] = from;
  }

  private expand(c: number, g: number, gx: number, gy: number): void {
    const { moves, enter, elevation, road } = this;
    const ec = elevation[c];
    for (let k = moves.start[c]; k < moves.start[c + 1]; k++) {
      const m = moves.cells[k];
      let step = floorDiv(moves.base[k] * (enter[m] + floorDiv(Math.abs(elevation[m] - ec), 4)), 16);
      if (road[m] !== 0) step = floorDiv(step, 2);
      const ng = g + step;
      if (ng < this.cost[m]) {
        this.reach(m, ng, c);
        this.heap.push(ng + this.ahead(m, gx, gy), ng, m);
      }
    }
  }

  // Half the octile distance: the cheapest step is a reused road at half price.
  private ahead(m: number, gx: number, gy: number): number {
    const dx = Math.abs(xOf(m, this.width) - gx);
    const dy = Math.abs(yOf(m, this.width) - gy);
    return floorDiv(STRAIGHT * Math.max(dx, dy) + (DIAGONAL - STRAIGHT) * Math.min(dx, dy), 2);
  }

  private trace(goal: number): number[] {
    const path = [goal];
    for (let c = this.came[goal]; c >= 0; c = this.came[c]) path.push(c);
    return path.reverse();
  }

  // A walk stops at the goal with keys left in the heap, so emptying it is setting its size to 0.
  private clear(): void {
    for (let i = 0; i < this.touchedCount; i++) {
      this.cost[this.touched[i]] = UNSEEN;
      this.came[this.touched[i]] = UNSEEN;
    }
    this.touchedCount = 0;
    this.heap.size = 0;
  }
}

// What entering each cell costs, in sixteenths of the move's base: 16 plus its cover, a fortieth of its height above
// the sea and a bridge's price on a river.
function entryCosts(biome: Uint8Array, elevation: Int32Array, river: Uint8Array): Int32Array {
  const enter = new Int32Array(biome.length);
  for (let i = 0; i < biome.length; i++) {
    enter[i] = 16 + COVER[biome[i]] + floorDiv(Math.max(0, elevation[i]), 40) + (river[i] !== 0 ? BRIDGE : 0);
  }
  return enter;
}

// The edges by pull, strongest first, so the busiest routes lay their roads first and later ones reuse them at half
// price. The key is a total order: no two edges share both indices. A product of two populations is far below 2^52,
// so floorDiv stays exact.
function inPullOrder(settlements: readonly Settlement[], edges: readonly (readonly [number, number])[]): number[][] {
  const pulled = edges.map(([a, b]) => {
    const d2 = dist2(settlements[a].x, settlements[a].y, settlements[b].x, settlements[b].y);
    return [-floorDiv(settlements[a].population * settlements[b].population, d2), a, b];
  });
  return pulled.sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2]);
}

// The river cells a road crosses, in cell order; a settlement's own cell is no bridge.
function bridgesOf(road: Uint8Array, river: Uint8Array, homes: readonly number[]): number[] {
  const home = new Uint8Array(road.length);
  for (const c of homes) home[c] = 1;
  const bridges: number[] = [];
  for (let c = 0; c < road.length; c++) {
    if (road[c] !== 0 && river[c] !== 0 && home[c] === 0) bridges.push(c);
  }
  return bridges;
}

// One cell path per route, and the river cells the roads cross.
export function buildRoads(
  width: number,
  height: number,
  biome: Uint8Array,
  elevation: Int32Array,
  river: Uint8Array,
  receiver: Int32Array,
  settlements: readonly Settlement[],
): { roads: number[][]; bridges: number[] } {
  const label = landmasses(width, height, biome);
  const cells = settlements.map((s) => s.y * width + s.x);
  const edges = routeGraph(settlements, cells.map((c) => label[c]));
  const road = new Uint8Array(width * height);
  const moves = steps(width, height, biome, river, receiver);
  const walker = new Walker(width, moves, entryCosts(biome, elevation, river), elevation, road);
  const roads: number[][] = [];
  for (const [, a, b] of inPullOrder(settlements, edges)) {
    const path = walker.walk(cells[a], cells[b]);
    for (const c of path) road[c] = 1;
    roads.push(path);
  }
  return { roads, bridges: bridgesOf(road, river, cells) };
}
