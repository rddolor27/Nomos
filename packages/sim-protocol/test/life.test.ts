import { readFileSync } from 'node:fs';
import {
  ACTIVITY_DOORSTEP,
  ACTIVITY_GREEN,
  ACTIVITY_PLAZA,
  ACTIVITY_SLEEP,
  ACTIVITY_STAY,
  CLUSTER_X,
  CLUSTER_Y,
  LIFE_END_MINUTE,
  NEEDS,
  NEED_COMPANY,
  NEED_FUN,
  NEED_REST,
  PHASE_ASLEEP,
  PHASE_COMING,
  PHASE_STAYING,
  checkpoint,
  createHomes,
  createShops,
  createTown,
  currentTick,
  decideLives,
  levelAt,
  parkFree,
  restoreWorld,
  stateHash,
  step,
  tileOf,
  type World,
} from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import { ENTITY_HOME, leisureOf, parseMap, premisesOf, type LeisureSite, type MapV1 } from '../src/index.ts';

const townFile = new URL('../../../assets/maps/town.nmap', import.meta.url);
const SEED = 42;
const TICKS_PER_DAY = 1_440;
const TWO_PM = 840;
const HALF_PAST_ONE = 810;
const TEN_PM = 1_320;
const FREE_TIME = [ACTIVITY_STAY, ACTIVITY_DOORSTEP, ACTIVITY_PLAZA, ACTIVITY_GREEN];

const town: MapV1 = parseMap(new Uint8Array(readFileSync(townFile)).buffer);
const sites = leisureOf(town);
const [plaza, ...greens] = sites;

// Built as the worker builds it: the premises, then the plaza, the greens and the water edges.
function highcourt(seed = SEED): World {
  const homes = createHomes(town.entities.filter((entity) => entity.kind === ENTITY_HOME));
  const world = createTown(seed, 'phone', town, homes, createShops([...premisesOf(town), ...sites]));
  // The streets never touch money, and the ledger's check would cost more than the rest of the tick.
  world.checks = false;
  return world;
}

function runTo(world: World, tick: number): void {
  while (currentTick(world) < tick) step(world);
}

function blobsOf(world: World): number[] {
  return Array.from({ length: world.agents.count[0] }, (_, blob) => blob);
}

function cellOf(world: World, blob: number): number {
  return tileOf(world.agents.y[blob]) * world.ground.width + tileOf(world.agents.x[blob]);
}

function covers(site: LeisureSite, cell: number): boolean {
  const x = cell % town.width;
  const y = (cell - x) / town.width;
  return x >= site.x && x < site.x + site.w && y >= site.y && y < site.y + site.h;
}

function onDoorstep(world: World, blob: number): boolean {
  return world.errands.phase[blob] === PHASE_STAYING && world.errands.activity[blob] === ACTIVITY_DOORSTEP;
}

// The tile of each blob that has stood in the plaza and in a green by `until`, noted at every tick.
function standers(world: World, until: number): { atPlaza: Map<number, number>; atGreen: Map<number, number> } {
  const found = { atPlaza: new Map<number, number>(), atGreen: new Map<number, number>() };
  while (currentTick(world) < until) {
    step(world);
    for (const blob of blobsOf(world)) {
      if (world.errands.phase[blob] !== PHASE_STAYING) continue;
      if (world.errands.activity[blob] === ACTIVITY_PLAZA) found.atPlaza.set(blob, cellOf(world, blob));
      if (world.errands.activity[blob] === ACTIVITY_GREEN) found.atGreen.set(blob, cellOf(world, blob));
    }
  }
  return found;
}

// A blob on its doorstep at `tick` is freed again and chosen for, with the life system run for it alone.
function chosenAt(tick: number): { world: World; blob: number } {
  const world = highcourt();
  runTo(world, tick);
  const blob = blobsOf(world).find((each) => onDoorstep(world, each));
  if (blob === undefined) throw new Error(`no blob is on its doorstep at tick ${tick}`);
  world.life.dueCount[0] = 0;
  parkFree(world, blob, tick);
  decideLives(world);
  return { world, blob };
}

function meanLevel(world: World, need: number): number {
  const tick = currentTick(world);
  const levels = blobsOf(world).map((blob) => levelAt(world.life, world.errands, blob, need, tick));
  return levels.reduce((sum, level) => sum + level, 0) / levels.length;
}

describe("Highcourt's free time", { timeout: 60_000 }, () => {
  it('has blobs free from the morning stand at keyed spots of the plaza and a green by 14:00', () => {
    const { atPlaza, atGreen } = standers(highcourt(), TWO_PM);
    const plazaTiles = new Set(atPlaza.values());

    console.info(`Highcourt by 14:00 on day 0: ${atPlaza.size} blobs stood at the plaza on ${plazaTiles.size} tiles, ${atGreen.size} at a green`);
    expect(atPlaza.size).toBeGreaterThanOrEqual(5);
    expect(Array.from(plazaTiles).every((cell) => covers(plaza, cell))).toBe(true);
    // Keyed spots on the plaza's ground near its door, in front of the fountain, and not its door tile alone.
    const nearDoor = (cell: number): boolean =>
      Math.abs((cell % town.width) - plaza.doorX) <= CLUSTER_X && Math.abs(Math.floor(cell / town.width) - plaza.doorY) <= CLUSTER_Y;
    expect(Array.from(plazaTiles).every(nearDoor)).toBe(true);
    expect(plazaTiles.size).toBeGreaterThanOrEqual(4);
    expect(atGreen.size).toBeGreaterThanOrEqual(1);
    expect(Array.from(atGreen.values()).every((cell) => greens.some((green) => covers(green, cell)))).toBe(true);
  });

  it('has no free-time choice running past half past nine but for a chat, and everyone home in bed by 22:00', () => {
    const world = highcourt();
    runTo(world, LIFE_END_MINUTE + 1);
    // A choice ends by 21:30, and a chat that moves its end on takes up the half hour to 22:00, no more.
    const late = blobsOf(world).filter((blob) => FREE_TIME.includes(world.errands.activity[blob]));
    expect(late.length).toBeGreaterThan(0);
    expect(late.filter((blob) => world.life.chatWith[blob] === 0 || world.life.chatUntil[blob] > TEN_PM)).toEqual([]);

    runTo(world, TEN_PM);
    expect(blobsOf(world).filter((blob) => cellOf(world, blob) !== world.errands.homeCell[blob])).toEqual([]);

    runTo(world, TEN_PM + 1);
    const { phase, activity } = world.errands;
    expect(blobsOf(world).filter((blob) => phase[blob] !== PHASE_ASLEEP || activity[blob] !== ACTIVITY_SLEEP)).toEqual([]);
  });

  it('replays to the same hash from a checkpoint taken at 13:30, with blobs out on their outings', () => {
    const live = highcourt();
    runTo(live, HALF_PAST_ONE);
    const out = blobsOf(live).filter((blob) => [ACTIVITY_PLAZA, ACTIVITY_GREEN].includes(live.errands.activity[blob]));
    expect(out.length).toBeGreaterThan(0);
    const saved = checkpoint(live);
    const hashAtCheckpoint = stateHash(live);

    runTo(live, TICKS_PER_DAY + 600);
    const twin = restoreWorld(SEED, 'phone', saved, town);
    twin.checks = false;
    expect(stateHash(twin)).toBe(hashAtCheckpoint);
    runTo(twin, TICKS_PER_DAY + 600);

    expect(stateHash(twin)).toBe(stateHash(live));
    expect(stateHash(live)).not.toBe(hashAtCheckpoint);
  });

  it('puts a blob with no time left to bed, as before, and stays a blob with a little in until half past nine', () => {
    // 21:15: 15 ticks are left, short of the least stay of 30.
    const late = chosenAt(LIFE_END_MINUTE - 15);
    const { errands } = late.world;
    expect([errands.phase[late.blob], errands.activity[late.blob]]).toEqual([PHASE_ASLEEP, ACTIVITY_SLEEP]);
    expect(errands.endTick[late.blob]).toBeGreaterThanOrEqual(TICKS_PER_DAY + 240);
    expect(errands.endTick[late.blob]).toBeLessThan(TICKS_PER_DAY + 360);

    // 20:55: 35 ticks are left, enough for a stay but not for a way out to a site and home.
    const early = chosenAt(LIFE_END_MINUTE - 35);
    expect([ACTIVITY_STAY, ACTIVITY_DOORSTEP]).toContain(early.world.errands.activity[early.blob]);
    expect(early.world.errands.endTick[early.blob]).toBeLessThanOrEqual(LIFE_END_MINUTE);
    expect(early.world.errands.endTick[early.blob]).toBeGreaterThan(LIFE_END_MINUTE - 35);
  });

  it('settles a need only when a blob changes state, and eases its fun and company at the plaza', () => {
    const world = highcourt();
    const { errands, life } = world;
    let blob: number | undefined;
    while (blob === undefined && currentTick(world) < TICKS_PER_DAY) {
      step(world);
      blob = blobsOf(world).find((each) => errands.phase[each] === PHASE_STAYING && errands.activity[each] === ACTIVITY_PLAZA);
    }
    if (blob === undefined) throw new Error('no blob reached the plaza on day 0');
    const arrival = currentTick(world) - 1;
    const arrived = [life.needs[blob * NEEDS + NEED_FUN], life.needs[blob * NEEDS + NEED_COMPANY]];
    expect(life.settleTick[blob]).toBe(arrival);

    let stays = 0;
    while (errands.phase[blob] === PHASE_STAYING) {
      step(world);
      if (errands.phase[blob] === PHASE_STAYING) {
        expect(life.settleTick[blob]).toBe(arrival);
        stays++;
      }
    }
    expect(stays).toBeGreaterThanOrEqual(29);
    expect(errands.phase[blob]).toBe(PHASE_COMING);
    expect(life.settleTick[blob]).toBe(currentTick(world) - 1);
    expect(life.needs[blob * NEEDS + NEED_FUN]).toBeLessThan(arrived[0]);
    expect(life.needs[blob * NEEDS + NEED_COMPANY]).toBeLessThan(arrived[1]);
  });

  it('rests a blob in bed, and draws the same traits from a seed and other ones from another', () => {
    const world = highcourt();
    runTo(world, TEN_PM - 1);
    const evening = meanLevel(world, NEED_REST);
    runTo(world, TICKS_PER_DAY + 180);
    expect(evening).toBeGreaterThan(20_000);
    expect(meanLevel(world, NEED_REST)).toBeLessThan(evening / 4);

    const blobs = world.agents.count[0];
    const traitsOf = (w: World): number[] => [w.life.sociable, w.life.homebody, w.life.restless].flatMap((column) => Array.from(column.subarray(0, blobs)));
    const traits = traitsOf(world);
    expect(traitsOf(highcourt())).toEqual(traits);
    expect(traitsOf(highcourt(SEED + 1))).not.toEqual(traits);
    // Spread over the byte, and not one trait copied into another.
    expect([Math.min(...traits), Math.max(...traits)]).toEqual([0, 255]);
    expect(world.life.sociable.subarray(0, blobs)).not.toEqual(world.life.homebody.subarray(0, blobs));
  });
});
