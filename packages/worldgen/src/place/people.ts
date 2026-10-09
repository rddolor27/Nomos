import { below, floorDiv } from '@nomos/sim-core/kernels';
import { PLACE_TILE_PX as TILE } from '@nomos/sim-protocol/place';
import { CROWD } from '../random/streams.ts';
import { COUNT, EMOTE, FACE, JOB, POSE, SPOT } from './keys.ts';
import { lookFor } from './looks.ts';
import { DIRS, PERSON_Y, PROP_Y, type Cell, type Person, type Site } from './site.ts';

export type Job = readonly [job: string, tiles: readonly Cell[]];
export type FacingHint = (i: number) => string;

const CROWDS: Readonly<Record<string, readonly [lo: number, hi: number]>> = {
  capital: [24, 40],
  city: [24, 40],
  town: [14, 24],
  village: [8, 14],
  hamlet: [4, 8],
};
const EXPRESSIONS = [...new Array<string>(7).fill('neutral'), 'happy', 'happy', 'blink'];
const EMOTES = ['heart', 'coin', 'food', 'question', 'sweat'];
const STAND_FACINGS = ['down', 'down', 'down', 'left', 'right', 'up'];

interface Crowd {
  site: Site;
  taken: Set<number>;
  people: Person[];
  facingHint: FacingHint | null;
  emotes: readonly string[];
}

function crowdBelow(site: Site, n: number, sub: number, ...key: number[]): number {
  return below(n, site.ctx.seed, CROWD, sub, ...key);
}

// Puts people on standable tiles; jobs come first, each on one of its tiles.
export function populate(
  site: Site,
  count: number,
  jobs: readonly Job[],
  spots: readonly Cell[],
  facingHint: FacingHint | null = null,
  emotes: readonly string[] = EMOTES,
): void {
  const crowd: Crowd = { site, taken: new Set(), people: [], facingHint, emotes };
  let i = 0;
  for (const [job, tiles] of jobs) {
    if (placeWorker(crowd, job, tiles, i)) i++;
  }
  const benches = freeBenches(crowd);
  const pool = spots.filter(([x, y]) => !crowd.taken.has(site.at(x, y)));
  for (; crowd.people.length < count && pool.length > 0; i++) placeFromPool(crowd, pool, benches, i);
  site.people = crowd.people;
}

// Person i stands at work on the first free tile of a keyed walk through the job's tiles. Whether one was free.
function placeWorker(crowd: Crowd, job: string, tiles: readonly Cell[], i: number): boolean {
  const site = crowd.site;
  for (let k = 0; k < tiles.length; k++) {
    const [x, y] = tiles[crowdBelow(site, tiles.length, JOB, i, k)];
    if (crowd.taken.has(site.at(x, y))) continue;
    add(crowd, x, y, job, 'stand', facingFor(crowd, x, y, i, 'stand'), i);
    return true;
  }
  return false;
}

function freeBenches(crowd: Crowd): Cell[] {
  const site = crowd.site;
  const benches: Cell[] = [];
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) {
      if (site.solid[site.at(x, y)] === 'prop_bench' && !crowd.taken.has(site.at(x, y))) benches.push([x, y]);
    }
  }
  return benches;
}

// Person i of the crowd: a spot from the pool, or a bench now and then; a lonely sort keeps off taken neighbours.
function placeFromPool(crowd: Crowd, pool: Cell[], benches: Cell[], i: number): void {
  const site = crowd.site;
  const [x, y] = pool.splice(crowdBelow(site, pool.length, SPOT, i), 1)[0];
  const kind = site.road[site.at(x, y)] && crowdBelow(site, 100, POSE, i) < 45 ? 'walk' : 'stand';
  const lonely = crowdBelow(site, 3, SPOT, i, 1) > 0;
  if (benches.length > 0 && crowdBelow(site, 100, POSE, i, 1) < 18) {
    const [bx, by] = benches.splice(crowdBelow(site, benches.length, POSE, i, 5), 1)[0];
    add(crowd, bx, by, null, 'sit', 'down', i);
  } else if (!(lonely && nextToTaken(crowd, x, y))) {
    add(crowd, x, y, null, kind, facingFor(crowd, x, y, i, kind), i);
  }
}

function nextToTaken(crowd: Crowd, x: number, y: number): boolean {
  const site = crowd.site;
  return DIRS.some(([dx, dy]) => site.inside(x + dx, y + dy) && crowd.taken.has(site.at(x + dx, y + dy)));
}

function add(crowd: Crowd, x: number, y: number, job: string | null, pose: string, facing: string, i: number): void {
  const site = crowd.site;
  const expression = EXPRESSIONS[crowdBelow(site, 10, FACE, i)];
  const step = pose === 'walk' ? crowdBelow(site, 2, POSE, i, 2) : 0;
  const emote = emoteOf(crowd, job, pose, expression, i);
  // A sitter is anchored just in front of the bench, so it draws over it, and lifted onto the seat.
  const lift = pose === 'sit' && site.solid[site.at(x, y)] === 'prop_bench' ? 5 : 0;
  const jitter = lift ? 0 : crowdBelow(site, 5, SPOT, i, 9) - 2;
  const look = lookFor(site.ctx.seed, crowd.people.length);
  const px = x * TILE + floorDiv(TILE, 2) + jitter;
  const py = y * TILE + (lift ? PROP_Y + 1 : PERSON_Y);
  crowd.people.push({ look, pose, facing, step, expression, job, emote, x: px, y: py, lift });
  crowd.taken.add(site.at(x, y));
}

function emoteOf(crowd: Crowd, job: string | null, pose: string, expression: string, i: number): string | null {
  const site = crowd.site;
  if (crowdBelow(site, 100, EMOTE, i) >= 14) return null;
  if (pose === 'sit' && expression === 'blink') return 'sleep';
  const emote = crowd.emotes[crowdBelow(site, crowd.emotes.length, EMOTE, i, 1)];
  return job && (emote === 'heart' || emote === 'food') ? 'sweat' : emote;
}

function facingFor(crowd: Crowd, x: number, y: number, i: number, kind: string): string {
  const site = crowd.site;
  if (crowd.facingHint) return crowd.facingHint(i);
  if (kind !== 'walk') return STAND_FACINGS[crowdBelow(site, 6, POSE, i, 4)];
  const west = x > 0 && site.road[site.at(x - 1, y)] === 1;
  const east = x + 1 < site.w && site.road[site.at(x + 1, y)] === 1;
  const turn = crowdBelow(site, 2, POSE, i, 3);
  return west || east ? ['left', 'right'][turn] : ['down', 'up'][turn];
}

export function settlementPeople(site: Site): void {
  const tier = site.ctx.tier ?? '';
  const [lo, hi] = CROWDS[tier];
  const count = lo + crowdBelow(site, hi - lo + 1, COUNT);
  const spots: Cell[] = [];
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) {
      if (crowdSpot(site, x, y)) spots.push([x, y]);
    }
  }
  populate(site, count, jobsOf(site), spots);
}

// Standable tiles on a road, in a kept space or near the centre, off the fields.
function crowdSpot(site: Site, x: number, y: number): boolean {
  const c = site.at(x, y);
  if (!site.standable(x, y) || site.kind[c].startsWith('crop')) return false;
  return site.road[c] === 1 || site.keep[c] === 1 || Math.abs(x - site.cx) + Math.abs(y - site.cy) < 10;
}

// Police, a nurse, merchants, farmers and a builder, each by their workplace, in place.py's order.
function jobsOf(site: Site): Job[] {
  const tier = site.ctx.tier ?? '';
  const jobs: Job[] = [];
  const police = around(site, 'civic_police-station', 2);
  if (police.length > 0) jobs.push(...repeated(['police', police], tier === 'city' || tier === 'capital' ? 2 : 1));
  const clinic = around(site, 'civic_clinic', 1);
  if (clinic.length > 0) jobs.push(['clinic', clinic]);
  jobs.push(...stallKeepers(site));
  const shop = around(site, 'shop_general', 1);
  if (shop.length > 0 && !site.places.has('shop_market-stall')) jobs.push(['merchant', shop]);
  const crops = cropTiles(site);
  if (crops.length > 0) jobs.push(...repeated(['farmer', crops], site.fields.length > 2 ? 2 : 1));
  jobs.push(...builders(site));
  return jobs;
}

function repeated(job: Job, times: number): Job[] {
  return new Array<Job>(times).fill(job);
}

function builders(site: Site): Job[] {
  const works = around(site, 'work_workshop', 2);
  return works.length > 0 ? [['builder', works]] : [];
}

// Standable tiles in front of each door of a building, reach either side, on the door's row and the one below.
function around(site: Site, name: string, reach: number): Cell[] {
  const tiles: Cell[] = [];
  for (const door of site.doors) {
    if (door.name !== name) continue;
    for (let dx = -reach; dx <= reach; dx++) {
      for (const dy of [0, 1]) {
        const x = door.x + dx;
        const y = door.y + dy;
        if (site.inside(x, y) && site.standable(x, y)) tiles.push([x, y]);
      }
    }
  }
  return tiles;
}

// A merchant beside each of the first three market stalls.
function stallKeepers(site: Site): Job[] {
  const jobs: Job[] = [];
  for (const [tx, ty, fw, fh] of (site.places.get('shop_market-stall') ?? []).slice(0, 3)) {
    const beside: Cell[] = [
      [tx - 1, ty + fh - 1],
      [tx + fw, ty + fh - 1],
      [tx + floorDiv(fw, 2), ty + fh],
    ];
    const free = beside.filter(([x, y]) => site.inside(x, y) && site.standable(x, y));
    if (free.length > 0) jobs.push(['merchant', free]);
  }
  return jobs;
}

function cropTiles(site: Site): Cell[] {
  const tiles: Cell[] = [];
  for (const [tx, ty, fw, fh] of site.fields) {
    for (let y = ty; y < ty + fh; y++) {
      for (let x = tx; x < tx + fw; x++) {
        if (site.solid[site.at(x, y)] === null) tiles.push([x, y]);
      }
    }
  }
  return tiles;
}
