import { WALK_BLOCKED } from '@nomos/sim-protocol/map';
import { xOf, yOf } from '../grid/grid.ts';
import { walkAt } from './ground.ts';
import { pave, route } from './roads.ts';
import { DIRS, RANK, type Cell, type Site } from './site.ts';

// The walkable land a walk from the middle of the place has reached so far, and the queue its flood runs on, which holds
// the tiles of the latest flood from its start.
interface Reach {
  readonly reached: Uint8Array;
  readonly queue: Int32Array;
}

// Joins every road of a place to its middle on foot (M3.1 Part 4, Ruling 6), so that every door a road leads to can be walked
// to. It floods the walkable land 4 ways from the plaza or green, with the ring line shut where no road crosses it. Each road
// tile the flood misses, in reading order, gets the cheapest route to a reached road, paved as a lane that crosses water on a
// footbridge or a ford; and a road no route reaches goes back to grass. A walled place's main roads already cross its rivers,
// so what this joins are the streets a river or a cliff cut off.
export function connect(site: Site): void {
  const reach: Reach = { reached: new Uint8Array(site.w * site.h), queue: new Int32Array(site.w * site.h) };
  spread(site, reach, centreOf(site));
  for (let c = 0; c < site.w * site.h; c++) {
    if (site.road[c] === 0 || reach.reached[c] === 1 || !walkable(site, c)) continue;
    const path = lane(site, reach.reached, c);
    if (path === null) {
      unroad(site, reach, c);
    } else {
      pave(site, path, 'lane');
      spread(site, reach, path.map(([x, y]) => site.at(x, y)));
    }
  }
}

// Whether a blob can stand on tile c, as the map's walk grid says.
function walkable(site: Site, c: number): boolean {
  return walkAt(site, c, false) !== WALK_BLOCKED;
}

// A tile of the ring line that no road crosses: the wall will stand there, so no one walks through it.
function shut(site: Site, x: number, y: number, c: number): boolean {
  return site.wall !== null && site.road[c] === 0 && site.wall.onLine(x, y);
}

// Where the walk starts: the plaza, or a village's or hamlet's green and the ring of path tiles round it.
function centreOf(site: Site): number[] {
  const cells: number[] = [];
  if (site.plaza !== null) {
    const [px, py, pw, ph] = site.plaza;
    for (let y = py; y < py + ph; y++) {
      for (let x = px; x < px + pw; x++) cells.push(site.at(x, y));
    }
    return cells;
  }
  for (const [gx, gy] of site.green) {
    for (const dy of [-1, 0, 1]) {
      for (const dx of [-1, 0, 1]) {
        if (site.inside(gx + dx, gy + dy)) cells.push(site.at(gx + dx, gy + dy));
      }
    }
  }
  return cells;
}

// Marks as reached every walkable tile joined 4 ways to a tile of `from`, and returns how many it marked, which are the first
// of the queue.
function spread(site: Site, reach: Reach, from: readonly number[]): number {
  let tail = 0;
  for (const c of from) tail = take(site, reach, c, tail);
  for (let head = 0; head < tail; head++) tail = spreadFrom(site, reach, reach.queue[head], tail);
  return tail;
}

// Queues tile c at `tail` unless it is reached, blocked or shut, and returns the new tail.
function take(site: Site, reach: Reach, c: number, tail: number): number {
  if (reach.reached[c] === 1 || !walkable(site, c) || shut(site, xOf(c, site.w), yOf(c, site.w), c)) return tail;
  reach.reached[c] = 1;
  reach.queue[tail] = c;
  return tail + 1;
}

function spreadFrom(site: Site, reach: Reach, c: number, tail: number): number {
  const x = xOf(c, site.w);
  const y = yOf(c, site.w);
  let next = tail;
  for (const [dx, dy] of DIRS) {
    if (site.inside(x + dx, y + dy)) next = take(site, reach, site.at(x + dx, y + dy), next);
  }
  return next;
}

// The cheapest route from road tile c to a reached road on dry land, or null.
function lane(site: Site, reached: Uint8Array, c: number): Cell[] | null {
  const x = xOf(c, site.w);
  const y = yOf(c, site.w);
  const goal = (gx: number, gy: number): boolean => {
    const g = site.at(gx, gy);
    return reached[g] === 1 && site.road[g] === 1 && !site.water(gx, gy);
  };
  return route(site, [x, y], towardMiddle(site, x, y), goal);
}

// The heading, as an index of DIRS, that points from (x, y) at the middle of the place along the longer of the two gaps.
function towardMiddle(site: Site, x: number, y: number): number {
  const dx = site.cx - x;
  const dy = site.cy - y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 1 : 3;
  return dy > 0 ? 2 : 0;
}

// Takes the roads off the land that tile c stands on, which no route joins to the middle.
function unroad(site: Site, reach: Reach, c: number): void {
  const count = spread(site, reach, [c]);
  for (let i = 0; i < count; i++) {
    const t = reach.queue[i];
    if (site.road[t] === 0 || site.kind[t] === 'water') continue;
    site.road[t] = 0;
    if (RANK.includes(site.kind[t])) site.kind[t] = 'grass';
  }
}
