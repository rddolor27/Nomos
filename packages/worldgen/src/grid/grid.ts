import { floorDiv, floorMod } from '@nomos/sim-core/kernels';

// A cell's neighbours are cells[start[cell]] up to cells[start[cell + 1] - 1].
export interface Adjacency {
  readonly start: Int32Array;
  readonly cells: Int32Array;
}

// grid.py's fixed order, orthogonal steps first: north, east, south, west, then the diagonals clockwise from north-east.
export const ORTHO: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
export const DIAG: readonly (readonly [number, number])[] = [
  [1, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
];

const built = new Map<string, Adjacency>();

export function xOf(cell: number, width: number): number {
  return floorMod(cell, width);
}

export function yOf(cell: number, width: number): number {
  return floorDiv(cell, width);
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function adjacency(lists: readonly (readonly number[])[]): Adjacency {
  const start = new Int32Array(lists.length + 1);
  for (let c = 0; c < lists.length; c++) start[c + 1] = start[c] + lists[c].length;
  const cells = new Int32Array(start[lists.length]);
  for (let c = 0; c < lists.length; c++) cells.set(lists[c], start[c]);
  return { start, cells };
}

function inside(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

// Cached per grid, as grid.py's lru_cache does, since every stage asks for the same lists.
export function neighbours(width: number, height: number, diagonal = true): Adjacency {
  const key = `${width}x${height}${diagonal ? 'd' : ''}`;
  const cached = built.get(key);
  if (cached) return cached;
  const steps = diagonal ? [...ORTHO, ...DIAG] : ORTHO;
  const lists: number[][] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const list: number[] = [];
      for (const [dx, dy] of steps) {
        if (inside(x + dx, y + dy, width, height)) list.push((y + dy) * width + x + dx);
      }
      lists.push(list);
    }
  }
  const made = adjacency(lists);
  built.set(key, made);
  return made;
}

// Steps to the nearest source, capped at limit; a cell whose passable flag is 0 is never entered.
export function distances(
  nbrs: Adjacency,
  sources: readonly number[],
  passable: ArrayLike<number> | null,
  limit: number,
): Uint8Array {
  const n = nbrs.start.length - 1;
  const dist = new Uint8Array(n).fill(limit);
  const queue = new Int32Array(n + sources.length);
  let head = 0;
  let tail = 0;
  for (const cell of sources) {
    dist[cell] = 0;
    queue[tail++] = cell;
  }
  while (head < tail) {
    const c = queue[head++];
    const d = dist[c] + 1;
    if (d >= limit) continue;
    for (let k = nbrs.start[c]; k < nbrs.start[c + 1]; k++) {
      const m = nbrs.cells[k];
      if (dist[m] > d && (passable === null || passable[m])) {
        dist[m] = d;
        queue[tail++] = m;
      }
    }
  }
  return dist;
}

// Each connected group of member cells, labelled 0, 1, ... in index order; -1 elsewhere.
export function parts(nbrs: Adjacency, member: ArrayLike<number>): { label: Int32Array; sizes: number[] } {
  const n = nbrs.start.length - 1;
  const label = new Int32Array(n).fill(-1);
  const sizes: number[] = [];
  const queue = new Int32Array(n);
  for (let first = 0; first < n; first++) {
    if (!member[first] || label[first] >= 0) continue;
    const id = sizes.length;
    label[first] = id;
    let head = 0;
    let tail = 0;
    queue[tail++] = first;
    while (head < tail) {
      const c = queue[head++];
      for (let k = nbrs.start[c]; k < nbrs.start[c + 1]; k++) {
        const m = nbrs.cells[k];
        if (member[m] && label[m] < 0) {
          label[m] = id;
          queue[tail++] = m;
        }
      }
    }
    sizes.push(tail);
  }
  return { label, sizes };
}

// Whether any neighbour in the list has its flag set. The cell's own flag does not count.
export function anyAround(flags: ArrayLike<number>, nbrs: Adjacency, cell: number): boolean {
  for (let k = nbrs.start[cell]; k < nbrs.start[cell + 1]; k++) {
    if (flags[nbrs.cells[k]] !== 0) return true;
  }
  return false;
}

// Cells set in either: the ocean with the lakes, or the ocean with the terminal lakes.
export function union(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] | b[i];
  return out;
}

// The cells set in either, in index order: the sources a distances() walk starts from.
export function unionCells(a: ArrayLike<number>, b: ArrayLike<number>): number[] {
  const cells: number[] = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== 0 || b[i] !== 0) cells.push(i);
  }
  return cells;
}

export function sum(values: ArrayLike<number>): number {
  let total = 0;
  for (let i = 0; i < values.length; i++) total += values[i];
  return total;
}
