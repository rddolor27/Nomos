import { ROAD_CLASS_NAMES, TIER_NAMES } from '@nomos/sim-protocol/world-map';
import { MinHeap } from '../grid/heap.ts';
import type { Settlement } from '../settle/settle.ts';
import { landmasses, routeGraph } from './graph.ts';

const MAJOR = ROAD_CLASS_NAMES.indexOf('major');
// Capitals, cities and towns: every tier up to town.
const TOWN = TIER_NAMES.indexOf('town');
// 2^31 - 1: a cost no chain reaches, standing for a settlement Dijkstra has not seen.
const UNSEEN = 0x7fffffff;

// A road out of a settlement: the settlement at its far end, its length in steps, and its index.
type Link = readonly [to: number, steps: number, road: number];

// Each road joins the settlements on its first and last cells, both ways, in road order.
function linksOf(cells: number, settlements: readonly Settlement[], roads: readonly (readonly number[])[]): Link[][] {
  const at = new Int32Array(cells).fill(-1);
  for (let s = 0; s < settlements.length; s++) at[settlements[s].uid] = s;
  const links: Link[][] = settlements.map(() => []);
  for (let road = 0; road < roads.length; road++) {
    const path = roads[road];
    const a = at[path[0]];
    const b = at[path[path.length - 1]];
    links[a].push([b, path.length - 1, road]);
    links[b].push([a, path.length - 1, road]);
  }
  return links;
}

// The roads along the cheapest way between two settlements: Dijkstra over the roads, each weighted by its steps. The
// heap key is (cost, settlement), so ties go to the lower settlement index, as Python's heapq orders them.
function chain(links: readonly Link[][], start: number, goal: number): number[] {
  const best = new Int32Array(links.length).fill(UNSEEN);
  const from = new Int32Array(links.length).fill(-1);
  const via = new Int32Array(links.length).fill(-1);
  const heap = new MinHeap(links.length);
  best[start] = 0;
  heap.push(0, start);
  while (heap.size > 0) {
    heap.pop();
    const d = heap.a;
    const c = heap.b;
    if (c === goal) break;
    if (d > best[c]) continue;
    for (const [m, steps, road] of links[c]) {
      if (d + steps >= best[m]) continue;
      best[m] = d + steps;
      from[m] = c;
      via[m] = road;
      heap.push(d + steps, m);
    }
  }
  const out: number[] = [];
  for (let c = goal; via[c] >= 0; c = from[c]) out.push(via[c]);
  return out;
}

// One ROAD_CLASS_NAMES index per road. On each landmass a spanning tree links the capitals, cities and towns, and the
// cheapest chain of roads between each linked pair is major; every other road is minor.
export function roadClasses(
  width: number,
  height: number,
  biome: Uint8Array,
  settlements: readonly Settlement[],
  roads: readonly (readonly number[])[],
): Uint8Array {
  const label = landmasses(width, height, biome);
  const hubs: number[] = [];
  for (let s = 0; s < settlements.length; s++) {
    if (settlements[s].tier <= TOWN) hubs.push(s);
  }
  const tree = routeGraph(
    hubs.map((s) => settlements[s]),
    hubs.map((s) => label[settlements[s].uid]),
    0,
  );
  const links = linksOf(width * height, settlements, roads);
  const out = new Uint8Array(roads.length);
  for (const [a, b] of tree) {
    for (const road of chain(links, hubs[a], hubs[b])) out[road] = MAJOR;
  }
  return out;
}
