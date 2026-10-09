import { below, floorDiv, floorMod } from '@nomos/sim-core/kernels';
import { PLACE_TILE_PX as TILE, type PlaceCrowd, type PlaceLayout, type PlaceWalks } from '@nomos/sim-protocol/place';
import { CROWD } from '../random/streams.ts';
import { buildSite } from './build.ts';
import type { PlaceContext } from './context.ts';
import { layoutOf } from './layout.ts';
import { lookFor } from './looks.ts';
import { DIRS, type Site } from './site.ts';
import { placeWalks } from './walks.ts';

// One look-only walker per this many residents, up to MOST_WALKERS (owner, 10 October 2026: M3.1 part 2).
const RESIDENTS_PER_WALKER = 150;
const MOST_WALKERS = 3000;
// About one loop per ten walkers, up to MOST_LOOPS, each through 3 to 6 waypoints.
const WALKERS_PER_LOOP = 10;
const MOST_LOOPS = 300;
// Waypoints are drawn from this many hubs drawn anywhere on the roads, each with one breadth-first tree, so a capital's
// crowd costs HUBS searches rather than one a leg.
const HUBS = 48;
// At most one walker per two loop cells, spaced evenly, so no line of overlapping blobs forms.
const CELLS_PER_WALKER = 2;
// A phase is art px along its loop, kept in a Uint16Array.
const MOST_LOOP_CELLS = 4000;
// First keys of the crowd's CROWD draws, clear of place.py's 1-6 and the walks' 0x110-0x112.
const HUB = 0x120;
const WAYPOINTS = 0x121;
const WAYPOINT = 0x122;
const SPIN = 0x123;
const FACE = 0x124;
// place.py's faces: seven neutral in ten, two happy and one blinking.
const FACES = [0, 0, 0, 0, 0, 0, 0, 1, 1, 2];
const NO_PARENT = -1;

// buildPlace's place with its street crowd, the site built once.
export function crowdedPlace(ctx: PlaceContext): { layout: PlaceLayout; walks: PlaceWalks; crowd: PlaceCrowd } {
  const site = buildSite(ctx);
  const layout = layoutOf(site);
  return { layout, walks: placeWalks(site), crowd: streetCrowd(site, layout.people.look.length) };
}

// walks.ts's rule, which it keeps to itself: a road, or a tile people may stand on, with nothing standing there.
function walkable(site: Site): Uint8Array {
  const open = new Uint8Array(site.w * site.h);
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) {
      const c = site.at(x, y);
      if (site.solid[c] === null && (site.road[c] === 1 || site.standable(x, y))) open[c] = 1;
    }
  }
  return open;
}

function hubsOf(site: Site, open: Uint8Array): number[] {
  const roads: number[] = [];
  for (let c = 0; c < open.length; c++) if (open[c] && site.road[c] === 1) roads.push(c);
  if (roads.length < 2) return [];
  return Array.from({ length: HUBS }, (_, i) => roads[below(roads.length, site.ctx.seed, CROWD, HUB, i)]);
}

// tree[c] is the next cell from c toward the hub, NO_PARENT where the hub is out of reach.
function treeTo(site: Site, open: Uint8Array, hub: number, tree: Int32Array, queue: Int32Array): void {
  tree.fill(NO_PARENT);
  tree[hub] = hub;
  queue[0] = hub;
  let tail = 1;
  for (let head = 0; head < tail; head++) {
    const c = queue[head];
    const x = floorMod(c, site.w);
    const y = floorDiv(c, site.w);
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= site.w || ny >= site.h) continue;
      const n = ny * site.w + nx;
      if (!open[n] || tree[n] !== NO_PARENT) continue;
      tree[n] = c;
      queue[tail++] = n;
    }
  }
}

// From the first drawn hub through the others and back, each leg a shortest path, the closing step home left out;
// empty when a leg cannot be walked.
function loopThrough(hubs: readonly number[], order: readonly number[], trees: Int32Array): number[] {
  const cells = hubs.length === 0 ? [] : [hubs[order[0]]];
  const n = floorDiv(trees.length, HUBS);
  for (let i = 1; i <= order.length && cells.length > 0; i++) {
    const to = order[floorMod(i, order.length)];
    let c = cells[cells.length - 1];
    if (trees[to * n + c] === NO_PARENT) return [];
    while (c !== hubs[to]) {
      c = trees[to * n + c];
      cells.push(c);
    }
  }
  if (cells.length > 1 && cells[cells.length - 1] === cells[0]) cells.pop();
  return cells;
}

function crowdLoops(site: Site, wanted: number): number[][] {
  const open = walkable(site);
  const hubs = hubsOf(site, open);
  const n = open.length;
  const trees = new Int32Array(hubs.length * n);
  const queue = new Int32Array(n);
  hubs.forEach((hub, i) => treeTo(site, open, hub, trees.subarray(i * n, (i + 1) * n), queue));
  const loops: number[][] = [];
  const seed = site.ctx.seed;
  for (let r = 0; r < Math.min(MOST_LOOPS, floorDiv(wanted + WALKERS_PER_LOOP - 1, WALKERS_PER_LOOP)); r++) {
    const order = Array.from({ length: 3 + below(4, seed, CROWD, WAYPOINTS, r) }, (_, j) => below(HUBS, seed, CROWD, WAYPOINT, r, j));
    const cells = loopThrough(hubs, order, trees);
    if (cells.length >= 2 && cells.length <= MOST_LOOP_CELLS) loops.push(cells);
  }
  return loops;
}

// A loop's room for walkers: one per CELLS_PER_WALKER cells, each cell's share split among the loops through it, so
// loops whose shortest paths meet on a main street share its room rather than pile onto it. ROOM is fixed point.
const ROOM = 1024;

function roomsOf(loops: readonly number[][], cellCount: number): number[] {
  const through = new Int32Array(cellCount);
  for (const cells of loops) for (const c of cells) through[c]++;
  return loops.map((cells) => floorDiv(cells.reduce((sum, c) => sum + floorDiv(ROOM, through[c]), 0), ROOM * CELLS_PER_WALKER));
}

// TypeScript only, beside place.py's people (no golden changes). Walker k's look is the keyed look of person
// firstPerson + k, the index it takes after place.py's people.
export function streetCrowd(site: Site, firstPerson: number): PlaceCrowd {
  const seed = site.ctx.seed;
  const wanted = Math.min(MOST_WALKERS, floorDiv(site.ctx.population, RESIDENTS_PER_WALKER));
  const loops = wanted === 0 ? [] : crowdLoops(site, wanted);
  const total = loops.reduce((sum, cells) => sum + cells.length, 0);
  const walkers = Math.min(wanted, floorDiv(total, CELLS_PER_WALKER));
  const rooms = roomsOf(loops, site.w * site.h);
  const on = loops.map((cells, r) => Math.min(rooms[r], floorDiv(walkers * cells.length, Math.max(1, total))));
  const count = on.reduce((sum, m) => sum + m, 0);
  const offsets = new Int32Array(loops.length + 1);
  loops.forEach((cells, r) => {
    offsets[r + 1] = offsets[r] + cells.length;
  });
  const crowd: PlaceCrowd = {
    look: new Uint8Array(count),
    expression: new Uint8Array(count),
    loop: new Uint16Array(count),
    phase: new Uint16Array(count),
    offsets,
    cells: Int32Array.from(loops.flat()),
  };
  let k = 0;
  loops.forEach((cells, r) => {
    const px = cells.length * TILE;
    const spin = below(px, seed, CROWD, SPIN, r);
    for (let i = 0; i < on[r]; i++, k++) {
      crowd.look[k] = lookFor(seed, firstPerson + k);
      crowd.expression[k] = FACES[below(FACES.length, seed, CROWD, FACE, k)];
      crowd.loop[k] = r;
      crowd.phase[k] = floorMod(floorDiv(i * px, on[r]) + spin, px);
    }
  });
  return crowd;
}
