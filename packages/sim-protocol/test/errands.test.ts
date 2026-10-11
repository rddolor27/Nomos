import { readFileSync } from 'node:fs';
import {
  ACTIVITY_DOORSTEP,
  ACTIVITY_EAT,
  ACTIVITY_FETCH,
  ACTIVITY_GREEN,
  ACTIVITY_PLAZA,
  ACTIVITY_SLEEP,
  ACTIVITY_STAY,
  ACTIVITY_WORK,
  FIRST_WALKING,
  PHASE_ASLEEP,
  PHASE_BUYING,
  PHASE_COMING,
  PHASE_EATING,
  PHASE_GOING,
  PHASE_KEEPING,
  PHASE_LEAVING,
  PHASE_STAYING,
  PHASE_WORKING,
  carriedIn,
  checkpoint,
  createHomes,
  createShops,
  createTown,
  currentTick,
  firstMemberOf,
  indoorsIn,
  isFood,
  restoreWorld,
  stateHash,
  step,
  tileOf,
  type Ground,
  type World,
} from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import { ENTITY_HOME, WALK_BLOCKED, leisureOf, parseMap, premisesOf, type MapV1 } from '../src/index.ts';

const townFile = new URL('../../../assets/maps/town.nmap', import.meta.url);
const SEED = 42;
// The streets open at 06:00, and every trip is home by 22:00.
const MORNING = 360;
const NIGHT = 1_320;
// Buying takes 10 ticks at the door and eating 24 on the doorstep.
const BUY_TICKS = 10;
const EAT_TICKS = 24;

const town: MapV1 = parseMap(new Uint8Array(readFileSync(townFile)).buffer);
const premises = premisesOf(town);

// Built as the worker builds it, with the plaza, greens and water edges after the premises, where blobs spend their free time.
function highcourt(ground: Ground = town): World {
  const homes = createHomes(town.entities.filter((entity) => entity.kind === ENTITY_HOME));
  const world = createTown(SEED, 'phone', ground, homes, createShops([...premises, ...leisureOf(town)]));
  // The streets never touch money, and the ledger's check would cost more than the rest of the tick.
  world.checks = false;
  return world;
}

function runTo(world: World, tick: number): void {
  while (currentTick(world) < tick) step(world);
}

// The first blob that has planned a trip and not yet set out, on the activity, and for a fetch whose good is food or is not.
function firstLeaving(world: World, activity: number, food: boolean): number {
  const { phase, activity: why, good } = world.errands;
  for (let blob = 0; blob < world.agents.count[0]; blob++) {
    if (phase[blob] !== PHASE_LEAVING || why[blob] !== activity) continue;
    if (activity !== ACTIVITY_FETCH || isFood(good[blob]) === food) return blob;
  }
  throw new Error(`no blob is leaving on activity ${activity} at tick ${currentTick(world)}`);
}

interface Stop {
  tick: number;
  phase: number;
  activity: number;
  tile: [number, number];
  item: number;
  indoors: boolean;
}

function stopOf(world: World, blob: number): Stop {
  const { agents, errands } = world;
  const phase = errands.phase[blob];
  return {
    tick: currentTick(world),
    phase,
    activity: errands.activity[blob],
    tile: [tileOf(agents.x[blob]), tileOf(agents.y[blob])],
    item: carriedIn(phase, errands.good[blob]),
    indoors: indoorsIn(phase),
  };
}

// A blob's phases from the world's tick to `until`: each as first seen, with the tile the blob stood on and what it carried.
function follow(world: World, blob: number, until: number): Stop[] {
  const stops = [stopOf(world, blob)];
  while (currentTick(world) < until) {
    step(world);
    if (world.errands.phase[blob] !== stops[stops.length - 1].phase) stops.push(stopOf(world, blob));
  }
  return stops;
}

function homeOf(world: World, blob: number): number {
  const { households } = world;
  let household = 0;
  while (firstMemberOf(households, household) + households.size[household] <= blob) household++;
  return households.home[household];
}

function peopleOf(world: World, home: number): number[] {
  const { households } = world;
  const people: number[] = [];
  for (let household = 0; household < households.count[0]; household++) {
    if (households.home[household] !== home) continue;
    const first = firstMemberOf(households, household);
    for (let member = first; member < first + households.size[household]; member++) people.push(member);
  }
  return people;
}

// The activities each phase can have: the phase says where and how a blob is, and the activity why.
const OUTINGS = [ACTIVITY_PLAZA, ACTIVITY_GREEN];
const WHY: Readonly<Record<number, readonly number[]>> = {
  [PHASE_ASLEEP]: [ACTIVITY_SLEEP, ACTIVITY_STAY],
  [PHASE_LEAVING]: [ACTIVITY_WORK, ACTIVITY_FETCH, ...OUTINGS],
  [PHASE_WORKING]: [ACTIVITY_WORK],
  [PHASE_KEEPING]: [ACTIVITY_WORK],
  [PHASE_BUYING]: [ACTIVITY_FETCH],
  [PHASE_EATING]: [ACTIVITY_EAT],
  [PHASE_STAYING]: [ACTIVITY_DOORSTEP, ...OUTINGS],
  [PHASE_GOING]: [ACTIVITY_WORK, ACTIVITY_FETCH, ...OUTINGS],
  [PHASE_COMING]: [ACTIVITY_WORK, ACTIVITY_FETCH, ...OUTINGS],
};

// A blob eats food, fetches something, and works or sleeps with its hands empty.
function holdsRightGood(activity: number, good: number): boolean {
  if (activity === ACTIVITY_EAT) return isFood(good);
  return activity === ACTIVITY_FETCH ? good !== 0 : good === 0;
}

// How many blobs have an activity or a good their phase cannot have, noting each activity seen.
function strayBlobs(world: World, seen: Set<number>): number {
  const { phase, activity, good } = world.errands;
  let stray = 0;
  for (let blob = 0; blob < world.agents.count[0]; blob++) {
    seen.add(activity[blob]);
    if (!WHY[phase[blob]].includes(activity[blob]) || !holdsRightGood(activity[blob], good[blob])) stray++;
  }
  return stray;
}

function walkersIn(world: World): number {
  let walkers = 0;
  for (let blob = 0; blob < world.agents.count[0]; blob++) walkers += world.errands.phase[blob] >= FIRST_WALKING ? 1 : 0;
  return walkers;
}

// The ticks from the world's tick to `until` at which a blob of `people` is on the move, summed over the blobs.
function ticksWalking(world: World, people: number[], until: number): number {
  let ticks = 0;
  while (currentTick(world) < until) {
    step(world);
    for (const person of people) ticks += world.errands.phase[person] >= FIRST_WALKING ? 1 : 0;
  }
  return ticks;
}

function tilesOf(world: World, people: number[]): number[][] {
  return people.map((person) => [tileOf(world.agents.x[person]), tileOf(world.agents.y[person])]);
}

// The town's ground with the eight cells round a door cell walled up, which cuts that cell off from every premises.
function walledAround(tile: number[]): Ground {
  const walk = town.walk.slice();
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx !== 0 || dy !== 0) walk[(tile[1] + dy) * town.width + tile[0] + dx] = WALK_BLOCKED;
    }
  }
  return { width: town.width, height: town.height, walk };
}

describe('Highcourt on its streets', { timeout: 60_000 }, () => {
  it('sends a buyer to its shop for its good, home with it, and out on its doorstep to eat it', () => {
    const world = highcourt();
    runTo(world, MORNING);
    const buyer = firstLeaving(world, ACTIVITY_FETCH, true);
    const { errands, goods } = world;
    const { shop, good } = { shop: errands.shop[buyer], good: errands.good[buyer] };
    const home = stopOf(world, buyer).tile;

    const stops = follow(world, buyer, NIGHT);

    expect(stops.slice(0, 5).map((stop) => stop.phase)).toEqual([PHASE_LEAVING, PHASE_GOING, PHASE_BUYING, PHASE_COMING, PHASE_EATING]);
    // It fetches the whole way there and home, eats, and is free once it has eaten: the day's trips are done.
    expect(stops.slice(0, 5).map((stop) => stop.activity)).toEqual([
      ACTIVITY_FETCH,
      ACTIVITY_FETCH,
      ACTIVITY_FETCH,
      ACTIVITY_FETCH,
      ACTIVITY_EAT,
    ]);
    expect([ACTIVITY_STAY, ACTIVITY_DOORSTEP, ACTIVITY_PLAZA, ACTIVITY_GREEN]).toContain(stops[5].activity);
    // The good is the one the economy sold it today, and the shop it walks to sells it, by its door.
    expect(good).toBe(goods.good[errands.dayFood[buyer] - 1]);
    expect((premises[shop].goods >> good) & 1).toBe(1);
    const door: [number, number] = [premises[shop].doorX, premises[shop].doorY];
    expect(stops[2].tile).toEqual(door);
    expect(stops[3].tick - stops[2].tick).toBe(BUY_TICKS);
    // It carries the good from the shop's door to its own, eats it there, and has nothing in its hands once it has.
    expect(stops.slice(0, 6).map((stop) => stop.item)).toEqual([0, 0, 0, good, good, 0]);
    expect(stops.slice(0, 5).map((stop) => stop.indoors)).toEqual([true, false, false, false, false]);
    expect([stops[4].tile, stops[5].tile]).toEqual([home, home]);
    expect(stops[5].tick - stops[4].tick).toBe(EAT_TICKS);
    expect(stops[1].tick).toBeGreaterThan(MORNING);
    expect(stops[5].tick).toBeLessThanOrEqual(NIGHT);
  });

  it('sends a worker to its employer, keeps it there through the workday and walks it home', () => {
    const world = highcourt();
    runTo(world, MORNING);
    const worker = firstLeaving(world, ACTIVITY_WORK, false);
    const { errands, agents } = world;
    const shop = errands.firmShop[agents.employer[worker]] - 1;
    const home = stopOf(world, worker).tile;

    const stops = follow(world, worker, NIGHT);

    // A stall's first worker to arrive keeps its counter, one tile behind the door, and any other works indoors at the door.
    const keeping = stops[2].phase === PHASE_KEEPING;
    expect(keeping && !premises[shop].stall).toBe(false);
    expect(stops.slice(0, 4).map((stop) => stop.phase)).toEqual([
      PHASE_LEAVING,
      PHASE_GOING,
      keeping ? PHASE_KEEPING : PHASE_WORKING,
      PHASE_COMING,
    ]);
    expect(stops.slice(0, 4).map((stop) => stop.activity)).toEqual(new Array<number>(4).fill(ACTIVITY_WORK));
    expect(stops[2].tile).toEqual([premises[shop].doorX, premises[shop].doorY - (keeping ? 1 : 0)]);
    expect(stops[2].indoors).toBe(!keeping);
    // It arrives in the morning, leaves between 15:00 and 15:59, and reaches the door of its home, where it is done with work.
    expect(stops[2].tick).toBeLessThanOrEqual(MORNING + 60 + 300);
    expect(stops[3].tick).toBeGreaterThanOrEqual(900);
    expect(stops[3].tick).toBeLessThanOrEqual(960);
    expect(stops[4].tile).toEqual(home);
    expect(stops[4].activity).not.toBe(ACTIVITY_WORK);
  });

  it("keeps every blob's activity and good in step with its phase through a day, and shows all eight activities", () => {
    const world = highcourt();
    const seen = new Set<number>();
    let stray = 0;

    for (let tick = 0; tick < 1_440; tick += 15) {
      runTo(world, tick);
      stray += strayBlobs(world, seen);
    }

    expect(stray).toBe(0);
    expect(Array.from(seen).sort()).toEqual([
      ACTIVITY_SLEEP,
      ACTIVITY_WORK,
      ACTIVITY_FETCH,
      ACTIVITY_EAT,
      ACTIVITY_STAY,
      ACTIVITY_DOORSTEP,
      ACTIVITY_PLAZA,
      ACTIVITY_GREEN,
    ]);
  });

  it('replays to the same hash from a checkpoint taken while blobs are mid-trip', () => {
    const live = highcourt();
    runTo(live, MORNING + 90);
    expect(walkersIn(live)).toBeGreaterThan(1_000);
    const saved = checkpoint(live);
    const hashAtCheckpoint = stateHash(live);

    runTo(live, 1_000);
    const twin = restoreWorld(SEED, 'phone', saved, town);
    twin.checks = false;
    expect(stateHash(twin)).toBe(hashAtCheckpoint);
    runTo(twin, 1_000);

    expect(stateHash(twin)).toBe(stateHash(live));
    expect(stateHash(live)).not.toBe(hashAtCheckpoint);
  });

  it("keeps a walled-off home's blobs at home all day, free but never on a trip, while the same home's blobs walk in the open town", () => {
    const open = highcourt();
    runTo(open, MORNING);
    const home = homeOf(open, firstLeaving(open, ACTIVITY_FETCH, true));
    const people = peopleOf(open, home);
    const [tileX, tileY] = tilesOf(open, people)[0];
    const walkedOpen = ticksWalking(open, people, NIGHT);

    const walled = highcourt(walledAround([tileX, tileY]));
    expect(peopleOf(walled, home)).toEqual(people);
    const started = tilesOf(walled, people);
    const walkedByMorning = ticksWalking(walled, people, MORNING + 240);
    const walkingElsewhere = walkersIn(walled);
    const walkedAfter = ticksWalking(walled, people, NIGHT);

    expect(walkedOpen).toBeGreaterThan(0);
    expect([walkedByMorning, walkedAfter]).toEqual([0, 0]);
    expect(tilesOf(walled, people)).toEqual(started);
    expect(walkingElsewhere).toBeGreaterThan(1_000);
  });
});
