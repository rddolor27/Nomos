import { below, floorDiv } from '@nomos/sim-core/kernels';
import { PLACE_TILE_PX as TILE, type PlaceWalks } from '@nomos/sim-protocol/place';
import { xOf, yOf } from '../grid/grid.ts';
import { CROWD } from '../random/streams.ts';
import { DIRS, type Person, type Site } from './site.ts';

// First keys of the walks' CROWD draws on a place's seed, clear of place.py's 1-6 (keys.ts), so the port's people
// never shift. place.py's people stand still; these loops are the TypeScript port's own (M3.1's plan, Task 3).
const ROAM = 0x110;
const WAYPOINTS = 0x111;
const WAYPOINT = 0x112;
// About a third of the standers with no job stroll too, so a town is not all still.
const ROAMERS_PER_MILLE = 350;
// Waypoints lie within this many steps of the walker's own tile, so a loop keeps to its neighbourhood.
const REACH = 10;
// A place's loops hold at most this many cells all told (M3.1's plan, Task 3); a loop past it is left out.
const LOOP_CELLS = 4096;

// The loops look-only walkers follow: place.py's walkers and a keyed share of its standers with no job, each a
// closed walk from their own tile through 3 to 6 waypoints and back, on tiles people may walk on.
export function placeWalks(site: Site): PlaceWalks {
  const open = walkableGrid(site);
  const person: number[] = [];
  const offsets = [0];
  const cells: number[] = [];
  site.people.forEach((p, i) => {
    if (!strolls(site, p, i)) return;
    const loop = loopOf(site, open, site.at(floorDiv(p.x, TILE), floorDiv(p.y, TILE)), i);
    if (loop.length < 2 || cells.length + loop.length > LOOP_CELLS) return;
    person.push(i);
    cells.push(...loop);
    offsets.push(cells.length);
  });
  return { person: Uint16Array.from(person), offsets: Int32Array.from(offsets), cells: Int32Array.from(cells) };
}

function strolls(site: Site, p: Person, i: number): boolean {
  if (p.pose === 'walk') return true;
  return p.pose === 'stand' && p.job === null && below(1000, site.ctx.seed, CROWD, ROAM, i) < ROAMERS_PER_MILLE;
}

// A road, or a tile people may stand on, with nothing standing there.
function walkableGrid(site: Site): Uint8Array {
  const open = new Uint8Array(site.w * site.h);
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) {
      const c = site.at(x, y);
      if (site.solid[c] === null && (site.road[c] === 1 || site.standable(x, y))) open[c] = 1;
    }
  }
  return open;
}

// The closed walk from start through person i's waypoints and back, without its last step home: a loop's cells.
function loopOf(site: Site, open: Uint8Array, start: number, i: number): number[] {
  if (!open[start]) return [];
  const region = reachable(site, open, start);
  if (region.length < 2) return [];
  const inRegion = new Uint8Array(open.length);
  for (const c of region) inRegion[c] = 1;
  const seed = site.ctx.seed;
  const waypoints = 3 + below(4, seed, CROWD, WAYPOINTS, i);
  const walk = [start];
  for (let j = 0; j < waypoints; j++) extend(site, inRegion, walk, region[below(region.length, seed, CROWD, WAYPOINT, i, j)]);
  extend(site, inRegion, walk, start);
  walk.pop();
  return walk;
}

// Walkable tiles within REACH steps of start, breadth first, start first.
function reachable(site: Site, open: Uint8Array, start: number): number[] {
  const steps = new Int16Array(open.length).fill(-1);
  steps[start] = 0;
  const order = [start];
  for (let head = 0; head < order.length; head++) {
    const c = order[head];
    if (steps[c] === REACH) continue;
    for (const n of besideOf(site, c)) {
      if (!open[n] || steps[n] >= 0) continue;
      steps[n] = steps[c] + 1;
      order.push(n);
    }
  }
  return order;
}

// Appends a shortest path within the region from the walk's last tile to target, leaving out the tile it starts on.
function extend(site: Site, inRegion: Uint8Array, walk: number[], target: number): void {
  const from = walk[walk.length - 1];
  const parent = new Int32Array(inRegion.length).fill(-1);
  parent[from] = from;
  const queue = [from];
  for (let head = 0; head < queue.length && parent[target] < 0; head++) {
    for (const n of besideOf(site, queue[head])) {
      if (!inRegion[n] || parent[n] >= 0) continue;
      parent[n] = queue[head];
      queue.push(n);
    }
  }
  const path: number[] = [];
  for (let c = target; c !== from; c = parent[c]) path.push(c);
  walk.push(...path.reverse());
}

// The tiles north, east, south and west of a cell, inside the place.
function besideOf(site: Site, c: number): number[] {
  const x = xOf(c, site.w);
  const y = yOf(c, site.w);
  const out: number[] = [];
  for (const [dx, dy] of DIRS) {
    if (site.inside(x + dx, y + dy)) out.push(site.at(x + dx, y + dy));
  }
  return out;
}
