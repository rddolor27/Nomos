import { floorDiv, isqrt } from '@nomos/sim-core/kernels';
import { LAKE, OCEAN } from '../climate/biomes.ts';
import { dist2, neighbours, parts } from '../grid/grid.ts';
import { MinHeap } from '../grid/heap.ts';
import type { Settlement } from '../settle/settle.ts';
import { SPAN2 } from './costs.ts';

// Two settlements on one landmass, by index with a below b: their squared distance, then a, then b.
type Pair = readonly [d2: number, a: number, b: number];
// A road to another settlement and its length in tenths of a cell.
type Link = readonly [to: number, tenths: number];

// Each connected group of land cells, joined by their four sides, labelled 0, 1, ... in index order; -1 on water.
export function landmasses(width: number, height: number, biome: Uint8Array): Int32Array {
  const land = new Uint8Array(biome.length);
  for (let i = 0; i < biome.length; i++) land[i] = biome[i] === OCEAN || biome[i] === LAKE ? 0 : 1;
  return parts(neighbours(width, height, false), land).label;
}

// A straight line's length in tenths of a cell, rounded down: the integer root of 100 times the squared distance.
function tenthsOf(d2: number): number {
  return isqrt(d2 * 100);
}

// Every pair on one landmass, nearest first. The key is a total order: no two pairs share both indices.
function pairsOnOneLandmass(settlements: readonly Settlement[], mass: readonly number[]): Pair[] {
  const pairs: Pair[] = [];
  for (let a = 0; a < settlements.length; a++) {
    for (let b = a + 1; b < settlements.length; b++) {
      if (mass[a] !== mass[b]) continue;
      pairs.push([dist2(settlements[a].x, settlements[a].y, settlements[b].x, settlements[b].y), a, b]);
    }
  }
  return pairs.sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2]);
}

// Path halving: each step points a settlement at its grandparent, as Python's find does.
function find(root: Int32Array, a: number): number {
  let at = a;
  while (root[at] !== at) {
    root[at] = root[root[at]];
    at = root[at];
  }
  return at;
}

function join(edges: [number, number][], links: Link[][], a: number, b: number, tenths: number): void {
  edges.push([a, b]);
  links[a].push([b, tenths]);
  links[b].push([a, tenths]);
}

// Kruskal's tree over the pairs, nearest first. A pair that closes a loop within SPAN2 is left over, in order, as a
// candidate for an extra.
function spanningTree(pairs: readonly Pair[], count: number, edges: [number, number][], links: Link[][]): Pair[] {
  const root = new Int32Array(count);
  for (let i = 0; i < count; i++) root[i] = i;
  const rest: Pair[] = [];
  for (const pair of pairs) {
    const [d2, a, b] = pair;
    const ra = find(root, a);
    const rb = find(root, b);
    if (ra !== rb) {
      root[ra] = rb;
      join(edges, links, a, b, tenthsOf(d2));
    } else if (d2 <= SPAN2) {
      rest.push(pair);
    }
  }
  return rest;
}

// The cheapest way from start to goal along the links, or limit + 1 when it costs more than limit. A settlement not yet
// reached costs limit + 1 (Python's best.get(m, limit + 1)), so nothing dearer than limit is ever queued.
export function around(
  links: readonly (readonly [number, number])[][],
  start: number,
  goal: number,
  limit: number,
): number {
  const best = new Int32Array(links.length).fill(limit + 1);
  best[start] = 0;
  const heap = new MinHeap(links.length);
  heap.push(0, start);
  while (heap.size > 0) {
    heap.pop();
    const d = heap.a;
    const c = heap.b;
    if (c === goal) return d;
    if (d > limit || d > best[c]) continue;
    for (const [m, w] of links[c]) {
      if (d + w < best[m]) {
        best[m] = d + w;
        heap.push(d + w, m);
      }
    }
  }
  return limit + 1;
}

// Each leftover pair, nearest first, gets a road when the way round is over 1.5 times the straight line: the search
// limit is 3/2 of it rounded down, and the test is two ways round against three straight. A pair sees every extra added
// before it.
function addSpanners(rest: readonly Pair[], edges: [number, number][], links: Link[][]): void {
  for (const [d2, a, b] of rest) {
    const direct = tenthsOf(d2);
    if (around(links, a, b, floorDiv(direct * 3, 2)) * 2 > direct * 3) join(edges, links, a, b, direct);
  }
}

// Route edges (a, b) by settlement index: a spanning tree per landmass, then the shortest extra pairs within SPAN2
// whose way round the graph is over 1.5 times the straight line.
export function routeGraph(settlements: readonly Settlement[], mass: readonly number[]): [number, number][] {
  const links: Link[][] = settlements.map(() => []);
  const edges: [number, number][] = [];
  const rest = spanningTree(pairsOnOneLandmass(settlements, mass), settlements.length, edges, links);
  addSpanners(rest, edges, links);
  return edges;
}
