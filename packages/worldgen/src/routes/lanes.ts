import { OCEAN } from '../climate/biomes.ts';
import { type Adjacency, anyAround, dist2, neighbours } from '../grid/grid.ts';
import type { Settlement } from '../settle/settle.ts';
import { landmasses } from './graph.ts';

// 2^31 - 1: the parent of a cell the sail has not met. The start's own parent is -1, which ends a trace.
const UNSEEN = 0x7fffffff;

// Two ports on different landmasses, by cell with a below b: their squared distance, then a, then b.
type Pair = readonly [d2: number, a: number, b: number];

function trace(came: Int32Array, goal: number): number[] {
  const path = [goal];
  for (let c = came[goal]; c >= 0; c = came[c]) path.push(c);
  return path.reverse();
}

// The fewest open-sea cells from one port to another, or none when no sea joins them. The search marks every neighbour
// it meets, sea or not, so a stretch of land is met once and never crossed; only a sea cell goes on to be searched.
export function sail(start: number, goal: number, nbrs: Adjacency, biome: Uint8Array): number[] {
  const came = new Int32Array(biome.length).fill(UNSEEN);
  const queue = new Int32Array(biome.length);
  came[start] = -1;
  queue[0] = start;
  let head = 0;
  let tail = 1;
  while (head < tail) {
    const c = queue[head++];
    for (let k = nbrs.start[c]; k < nbrs.start[c + 1]; k++) {
      const m = nbrs.cells[k];
      if (came[m] !== UNSEEN) continue;
      came[m] = c;
      if (m === goal) return trace(came, goal);
      if (biome[m] === OCEAN) queue[tail++] = m;
    }
  }
  return [];
}

// A port is a settlement with open sea beside it, diagonals included. A lake does not count.
function portsOf(biome: Uint8Array, nbrs: Adjacency, settlements: readonly Settlement[]): Settlement[] {
  const ocean = biome.map((cover) => (cover === OCEAN ? 1 : 0));
  return settlements.filter((s) => anyAround(ocean, nbrs, s.uid));
}

// Every pair of ports on different landmasses, nearest first. The key is a total order: no two pairs share both cells.
function portPairs(ports: readonly Settlement[], label: Int32Array): Pair[] {
  const pairs: Pair[] = [];
  for (const a of ports) {
    for (const b of ports) {
      if (a.uid < b.uid && label[a.uid] !== label[b.uid]) pairs.push([dist2(a.x, a.y, b.x, b.y), a.uid, b.uid]);
    }
  }
  return pairs.sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2]);
}

// Python's root dict, without path compression: a landmass not yet joined into another is its own root.
function find(joined: ReadonlyMap<number, number>, landmass: number): number {
  let at = landmass;
  for (let into = joined.get(at); into !== undefined; into = joined.get(at)) at = into;
  return at;
}

// Sea lanes as cell paths: a spanning tree over the landmasses whose links are the closest pair of ports, each sailed
// over open sea, so every settlement on a landmass with a port reaches the rest. Two landmasses join only when a sail
// is found; otherwise the pair is passed over and a farther one may join them.
export function lanes(
  width: number,
  height: number,
  biome: Uint8Array,
  settlements: readonly Settlement[],
): number[][] {
  const label = landmasses(width, height, biome);
  const nbrs = neighbours(width, height);
  const joined = new Map<number, number>();
  const out: number[][] = [];
  for (const [, a, b] of portPairs(portsOf(biome, nbrs, settlements), label)) {
    const ra = find(joined, label[a]);
    const rb = find(joined, label[b]);
    if (ra === rb) continue;
    const path = sail(a, b, nbrs, biome);
    if (path.length > 0) {
      joined.set(ra, rb);
      out.push(path);
    }
  }
  return out;
}
