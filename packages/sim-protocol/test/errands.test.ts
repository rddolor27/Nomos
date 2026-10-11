import { readFileSync } from 'node:fs';
import {
  FIRST_WALKING,
  PHASE_ASLEEP,
  PHASE_BUYING,
  PHASE_COMING,
  PHASE_EATING,
  PHASE_GOING,
  PHASE_KEEPING,
  PHASE_LEAVING,
  PHASE_WORKING,
  PURPOSE_FOOD,
  PURPOSE_WORK,
  carriedIn,
  checkpoint,
  createHomes,
  createShops,
  createTown,
  currentTick,
  firstMemberOf,
  indoorsIn,
  restoreWorld,
  stateHash,
  step,
  tileOf,
  type Ground,
  type World,
} from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import { ENTITY_HOME, WALK_BLOCKED, parseMap, premisesOf, type MapV1 } from '../src/index.ts';

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

function highcourt(ground: Ground = town): World {
  const homes = createHomes(town.entities.filter((entity) => entity.kind === ENTITY_HOME));
  const world = createTown(SEED, 'phone', ground, homes, createShops(premises));
  // The streets never touch money, and the ledger's check would cost more than the rest of the tick.
  world.checks = false;
  return world;
}

function runTo(world: World, tick: number): void {
  while (currentTick(world) < tick) step(world);
}

function firstIn(world: World, phase: number): number {
  const phases = world.errands.phase;
  for (let blob = 0; blob < world.agents.count[0]; blob++) if (phases[blob] === phase) return blob;
  throw new Error(`no blob is in phase ${phase} at tick ${currentTick(world)}`);
}

interface Stop {
  tick: number;
  phase: number;
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

describe('Highcourt on its streets', { timeout: 60_000 }, () => {
  it('sends a buyer to its shop for its good, home with it, and out on its doorstep to eat it', () => {
    const world = highcourt();
    runTo(world, MORNING);
    const buyer = firstIn(world, PHASE_LEAVING + PURPOSE_FOOD);
    const { errands, goods } = world;
    const { shop, good } = { shop: errands.shop[buyer], good: errands.good[buyer] };
    const home = stopOf(world, buyer).tile;

    const stops = follow(world, buyer, NIGHT);

    expect(stops.map((stop) => stop.phase)).toEqual([
      PHASE_LEAVING + PURPOSE_FOOD,
      PHASE_GOING + PURPOSE_FOOD,
      PHASE_BUYING,
      PHASE_COMING + PURPOSE_FOOD,
      PHASE_EATING,
      PHASE_ASLEEP,
    ]);
    // The good is the one the economy sold it today, and the shop it walks to sells it, by its door.
    expect(good).toBe(goods.good[errands.dayFood[buyer] - 1]);
    expect((premises[shop].goods >> good) & 1).toBe(1);
    const door: [number, number] = [premises[shop].doorX, premises[shop].doorY];
    expect(stops[2].tile).toEqual(door);
    expect(stops[3].tick - stops[2].tick).toBe(BUY_TICKS);
    // It carries the good from the shop's door to its own, eats it there, and is indoors again with nothing in its hands.
    expect(stops.map((stop) => stop.item)).toEqual([0, 0, 0, good, good, 0]);
    expect(stops.map((stop) => stop.indoors)).toEqual([true, false, false, false, false, true]);
    expect([stops[4].tile, stops[5].tile]).toEqual([home, home]);
    expect(stops[5].tick - stops[4].tick).toBe(EAT_TICKS);
    expect(stops[1].tick).toBeGreaterThan(MORNING);
    expect(stops[5].tick).toBeLessThanOrEqual(NIGHT);
  });

  it('sends a worker to its employer, keeps it there through the workday and walks it home', () => {
    const world = highcourt();
    runTo(world, MORNING);
    const worker = firstIn(world, PHASE_LEAVING + PURPOSE_WORK);
    const { errands, agents } = world;
    const shop = errands.firmShop[agents.employer[worker]] - 1;
    const home = stopOf(world, worker).tile;

    const stops = follow(world, worker, NIGHT);

    // A stall's first worker keeps its counter, one tile behind the door, and any other works indoors at the door.
    const arrived = premises[shop].stall ? PHASE_KEEPING : PHASE_WORKING;
    expect(stops.slice(0, 4).map((stop) => stop.phase)).toEqual([
      PHASE_LEAVING + PURPOSE_WORK,
      PHASE_GOING + PURPOSE_WORK,
      arrived,
      PHASE_COMING + PURPOSE_WORK,
    ]);
    expect(stops[2].tile).toEqual([premises[shop].doorX, premises[shop].doorY - (premises[shop].stall ? 1 : 0)]);
    expect(stops[2].indoors).toBe(!premises[shop].stall);
    // It arrives in the morning, leaves between 15:00 and 15:59, and reaches the door of its home.
    expect(stops[2].tick).toBeLessThanOrEqual(MORNING + 60 + 300);
    expect(stops[3].tick).toBeGreaterThanOrEqual(900);
    expect(stops[3].tick).toBeLessThanOrEqual(960);
    expect(stops[4].tile).toEqual(home);
    expect(stops[4].indoors).toBe(true);
  });

  it('replays to the same hash from a checkpoint taken while blobs are mid-trip', () => {
    const live = highcourt();
    runTo(live, MORNING + 90);
    let walking = 0;
    for (let blob = 0; blob < live.agents.count[0]; blob++) walking += live.errands.phase[blob] >= FIRST_WALKING ? 1 : 0;
    expect(walking).toBeGreaterThan(1_000);
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

  it("keeps a walled-off home's blobs asleep all day, while the same home's blobs walk in the open town", () => {
    const open = highcourt();
    runTo(open, MORNING);
    const home = homeOf(open, firstIn(open, PHASE_LEAVING + PURPOSE_FOOD));
    const people = peopleOf(open, home);
    const homeDoor = [tileOf(open.agents.x[people[0]]), tileOf(open.agents.y[people[0]])];
    let walkedOpen = 0;
    while (currentTick(open) < NIGHT) {
      step(open);
      for (const person of people) walkedOpen += open.errands.phase[person] >= FIRST_WALKING ? 1 : 0;
    }

    // Eight walls round the door cell cut it off from every premises.
    const walk = town.walk.slice();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx !== 0 || dy !== 0) walk[(homeDoor[1] + dy) * town.width + homeDoor[0] + dx] = WALK_BLOCKED;
      }
    }
    const walled = highcourt({ width: town.width, height: town.height, walk });
    expect(peopleOf(walled, home)).toEqual(people);
    const started = people.map((person) => [walled.agents.x[person], walled.agents.y[person]]);
    let walkedWalled = 0;
    let walkedElsewhere = 0;
    while (currentTick(walled) < NIGHT) {
      step(walled);
      for (const person of people) walkedWalled += walled.errands.phase[person] !== PHASE_ASLEEP ? 1 : 0;
      if (currentTick(walled) === MORNING + 240) {
        for (let blob = 0; blob < walled.agents.count[0]; blob++) walkedElsewhere += walled.errands.phase[blob] >= FIRST_WALKING ? 1 : 0;
      }
    }

    expect(walkedOpen).toBeGreaterThan(0);
    expect(walkedWalled).toBe(0);
    expect(people.map((person) => [walled.agents.x[person], walled.agents.y[person]])).toEqual(started);
    expect(walkedElsewhere).toBeGreaterThan(1_000);
  });
});
