import { type Adjacency, adjacency, neighbours, parts } from '../grid/grid.ts';
import { MinHeap } from '../grid/heap.ts';
import { LAKE_DEPTH, MAX_LAKE } from './flood.ts';

export interface Pools {
  lake: Uint8Array;
  terminal: Uint8Array;
  level: Int32Array;
}

function pitsOf(elevation: Int32Array, filled: Int32Array, ocean: Uint8Array): Uint8Array {
  const pit = new Uint8Array(elevation.length);
  for (let i = 0; i < pit.length; i++) {
    if (ocean[i] === 0 && filled[i] > elevation[i]) pit[i] = 1;
  }
  return pit;
}

// Each cell's neighbours that share its filled height, so a part of pit cells is one level of water.
function sameHeight(nbrs: Adjacency, filled: Int32Array): Adjacency {
  const lists: number[][] = [];
  for (let i = 0; i < filled.length; i++) {
    const list: number[] = [];
    for (let k = nbrs.start[i]; k < nbrs.start[i + 1]; k++) {
      if (filled[nbrs.cells[k]] === filled[i]) list.push(nbrs.cells[k]);
    }
    lists.push(list);
  }
  return adjacency(lists);
}

// The cells of each pit part, in index order.
function membersOf(pit: Uint8Array, label: Int32Array, count: number): number[][] {
  const members: number[][] = [];
  for (let id = 0; id < count; id++) members.push([]);
  for (let i = 0; i < pit.length; i++) {
    if (pit[i] !== 0) members[label[i]].push(i);
  }
  return members;
}

function depthOf(cells: readonly number[], elevation: Int32Array, filled: Int32Array): number {
  let depth = filled[cells[0]] - elevation[cells[0]];
  for (const i of cells) depth = Math.max(depth, filled[i] - elevation[i]);
  return depth;
}

// min(cells, key=lambda i: (elevation[i], i))
function deepest(cells: readonly number[], elevation: Int32Array): number {
  let best = cells[0];
  for (const i of cells) {
    if (elevation[i] < elevation[best] || (elevation[i] === elevation[best] && i < best)) best = i;
  }
  return best;
}

// The basin's lowest MAX_LAKE cells as one connected body, grown upwards from its deepest. A cell can be pushed from two
// neighbours, so it pops twice and the second pop is skipped.
export function lowest(cells: readonly number[], elevation: Int32Array, nbrs: Adjacency): number[] {
  const inside = new Uint8Array(elevation.length);
  for (const i of cells) inside[i] = 1;
  const taken = new Uint8Array(elevation.length);
  const body: number[] = [];
  const start = deepest(cells, elevation);
  const heap = new MinHeap(cells.length);
  heap.push(elevation[start], start);
  while (heap.size > 0 && body.length < MAX_LAKE) {
    heap.pop();
    const c = heap.b;
    if (taken[c] !== 0) continue;
    taken[c] = 1;
    body.push(c);
    for (let k = nbrs.start[c]; k < nbrs.start[c + 1]; k++) {
      const m = nbrs.cells[k];
      if (inside[m] !== 0 && taken[m] === 0) heap.push(elevation[m], m);
    }
  }
  return body;
}

function fillBasin(
  cells: readonly number[],
  elevation: Int32Array,
  filled: Int32Array,
  nbrs: Adjacency,
  pools: Pools,
): void {
  if (cells.length < 2 || depthOf(cells, elevation, filled) < LAKE_DEPTH) {
    for (const i of cells) pools.level[i] = filled[i];
  } else if (cells.length <= MAX_LAKE) {
    for (const i of cells) pools.lake[i] = 1;
  } else {
    for (const i of lowest(cells, elevation, nbrs)) {
      pools.lake[i] = 1;
      pools.terminal[i] = 1;
    }
  }
}

function sumAround(flags: Uint8Array, nbrs: Adjacency, cell: number): number {
  let total = 0;
  for (let k = nbrs.start[cell]; k < nbrs.start[cell + 1]; k++) total += flags[nbrs.cells[k]];
  return total;
}

function maxAround(flags: Uint8Array, nbrs: Adjacency, cell: number): number {
  let top = 0;
  for (let k = nbrs.start[cell]; k < nbrs.start[cell + 1]; k++) top = Math.max(top, flags[nbrs.cells[k]]);
  return top;
}

// A dry cell with 6 or more lake neighbours joins the lake, and a lake cell with at most one leaves it. Every cell reads
// the lake and terminal flags as they stood before the pass.
function smoothShores(nbrs: Adjacency, filled: Int32Array, ocean: Uint8Array, pools: Pools): void {
  const before = pools.lake.slice();
  const closed = pools.terminal.slice();
  for (let i = 0; i < before.length; i++) {
    if (ocean[i] !== 0) continue;
    const wet = sumAround(before, nbrs, i);
    if (before[i] === 0 && wet >= 6) {
      pools.lake[i] = 1;
      pools.terminal[i] = maxAround(closed, nbrs, i);
    } else if (before[i] !== 0 && wet <= 1) {
      pools.lake[i] = 0;
      pools.terminal[i] = 0;
      if (closed[i] === 0) pools.level[i] = filled[i];
    }
  }
}

// A filled depression deep enough and 2+ cells becomes a lake; shallower ones are levelled. A basin too big for one lake
// holds water only in its lowest MAX_LAKE cells, with no outlet, like a lake in a dry closed basin. level is the
// elevation with the levelled pits raised to their fill.
export function lakes(
  width: number,
  height: number,
  elevation: Int32Array,
  filled: Int32Array,
  ocean: Uint8Array,
): Pools {
  const nbrs = neighbours(width, height);
  const pit = pitsOf(elevation, filled, ocean);
  const { label, sizes } = parts(sameHeight(nbrs, filled), pit);
  const pools: Pools = {
    lake: new Uint8Array(elevation.length),
    terminal: new Uint8Array(elevation.length),
    level: elevation.slice(),
  };
  for (const cells of membersOf(pit, label, sizes.length)) fillBasin(cells, elevation, filled, nbrs, pools);
  smoothShores(nbrs, filled, ocean, pools);
  return pools;
}
