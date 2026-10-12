import { readFileSync } from 'node:fs';
import {
  ACTIVITY_DOORSTEP,
  ACTIVITY_GREEN,
  ACTIVITY_PLAZA,
  ACTIVITY_SLEEP,
  ACTIVITY_STAY,
  CELL_HIDDEN,
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
  SITE_PLAZA,
  TICK,
  checkpoint,
  createHomes,
  createShops,
  createStandInTownHomes,
  createTown,
  currentTick,
  decideLives,
  levelAt,
  parkFree,
  pointInTileQ8,
  restoreWorld,
  sitOnDoorstep,
  sitesOf,
  stateHash,
  startOuting,
  step,
  tileOf,
  type Ground,
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

// The cells of the front of the blob's home that it can sit on: its door's tile and the walkable ones round it that no awning hides.
function frontOf(world: World, blob: number): number[] {
  const { width, height, walk } = world.ground;
  const door = world.errands.homeCell[blob];
  const cells: number[] = [];
  for (let y = Math.floor(door / width) - 1; y <= Math.floor(door / width) + 1; y++) {
    for (let x = (door % width) - 1; x <= (door % width) + 1; x++) {
      const cell = y * width + x;
      if (x >= 0 && y >= 0 && x < width && y < height && walk[cell] !== 0 && world.life.holds[cell] !== CELL_HIDDEN) cells.push(cell);
    }
  }
  return cells;
}

// Whether the blob stands on its home's door tile or one of the eight round it, where a blob sits out on its doorstep.
function onFrontOf(world: World, blob: number): boolean {
  const door = world.errands.homeCell[blob];
  const cell = cellOf(world, blob);
  const dx = Math.abs((cell % town.width) - (door % town.width));
  const dy = Math.abs(Math.floor(cell / town.width) - Math.floor(door / town.width));
  return dx <= 1 && dy <= 1;
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

// The cells of the rows a stall's awning hides, as the map's premises list them.
function hiddenCells(): Set<number> {
  const cells = new Set<number>();
  for (const { hiddenX = 0, hiddenY = 0, hiddenW = 0, hiddenH = 0 } of premisesOf(town)) {
    for (let y = hiddenY; y < hiddenY + hiddenH; y++) {
      for (let x = hiddenX; x < hiddenX + hiddenW; x++) cells.add(y * town.width + x);
    }
  }
  return cells;
}

// Every tile a blob stood on in the plaza or a green, noted at every tick up to `until`.
function siteTiles(world: World, until: number): Set<number> {
  const tiles = new Set<number>();
  while (currentTick(world) < until) {
    step(world);
    for (const blob of blobsOf(world)) {
      const { phase, activity } = world.errands;
      if (phase[blob] === PHASE_STAYING && (activity[blob] === ACTIVITY_PLAZA || activity[blob] === ACTIVITY_GREEN)) tiles.add(cellOf(world, blob));
    }
  }
  return tiles;
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

  it("stands no blob in the rows a stall's awning hides, though the plaza's cluster has some", () => {
    const hidden = hiddenCells();
    const world = highcourt();
    const inCluster = (cell: number): boolean =>
      Math.abs((cell % town.width) - plaza.doorX) <= CLUSTER_X && Math.abs(Math.floor(cell / town.width) - plaza.doorY) <= CLUSTER_Y;

    // Six stalls of three columns, marked when the streets open, and some of them within reach of the plaza's spots.
    expect(hidden.size).toBe(18);
    expect(world.life.holds.filter((held) => held === CELL_HIDDEN)).toHaveLength(hidden.size);
    expect(Array.from(hidden).filter(inCluster).length).toBeGreaterThan(0);

    const tiles = siteTiles(world, TEN_PM);
    console.info(`Highcourt on day 0: blobs stood on ${tiles.size} tiles of the plaza and the greens, ${Array.from(tiles).filter((cell) => hidden.has(cell)).length} of them hidden`);
    expect(tiles.size).toBeGreaterThan(30);
    expect(Array.from(tiles).filter((cell) => hidden.has(cell))).toEqual([]);
  });

  it('holds a tile for each blob that sits out or walks out to a site, none sharing the plaza, and lets them all go by night', () => {
    const world = highcourt();
    const { errands, life } = world;
    const holding = (): number => blobsOf(world).filter((blob) => life.seat[blob] !== 0).length;
    const held = (): number => life.holds.reduce((sum, count) => sum + (count === CELL_HIDDEN ? 0 : count), 0);
    // A green has 24 tiles and holds every blob on its way too, so two blobs can share one when the green is full: 28 held at 18:20.
    const mostOnATile = { plaza: 0, green: 0 };
    let busiest = 0;
    while (currentTick(world) <= TEN_PM) {
      step(world);
      const onTile = new Map<number, number>();
      for (const blob of blobsOf(world)) {
        if (errands.phase[blob] !== PHASE_STAYING || errands.activity[blob] === ACTIVITY_DOORSTEP) continue;
        const key = errands.activity[blob] === ACTIVITY_PLAZA ? cellOf(world, blob) : -1 - cellOf(world, blob);
        onTile.set(key, (onTile.get(key) ?? 0) + 1);
      }
      for (const [key, blobs] of onTile) {
        const kind = key >= 0 ? 'plaza' : 'green';
        mostOnATile[kind] = Math.max(mostOnATile[kind], blobs);
      }
      busiest = Math.max(busiest, onTile.size);
      // Every blob that holds a tile is counted once in the cells.
      if (currentTick(world) % 60 === 0) expect(held()).toBe(holding());
    }

    console.info(`Highcourt on day 0: at most ${mostOnATile.plaza} blob to a plaza tile and ${mostOnATile.green} to a green tile, ${busiest} tiles in use at once`);
    expect(busiest).toBeGreaterThan(20);
    expect(mostOnATile.plaza).toBe(1);
    expect(mostOnATile.green).toBeLessThanOrEqual(2);
    expect(held()).toBe(0);
    expect(life.holds.filter((count) => count === CELL_HIDDEN)).toHaveLength(hiddenCells().size);
  });

  it("sits a blob on a tile of its home's front that a housemate holds only when the whole front is held", () => {
    const world = highcourt();
    const { errands, life } = world;
    const sitting = (blob: number): boolean => errands.phase[blob] === PHASE_STAYING && errands.activity[blob] === ACTIVITY_DOORSTEP;
    const before = new Uint8Array(world.agents.capacity);
    let sits = 0;
    let stacked = 0;
    let mostOnATile = 0;
    const shares: number[] = [];
    while (currentTick(world) < TEN_PM) {
      step(world);
      const byTile = new Map<number, number[]>();
      const bySeat = new Map<number, number[]>();
      for (const blob of blobsOf(world)) {
        if (!sitting(blob)) continue;
        byTile.set(cellOf(world, blob), [...(byTile.get(cellOf(world, blob)) ?? []), blob]);
        bySeat.set(life.seat[blob] - 1, [...(bySeat.get(life.seat[blob] - 1) ?? []), blob]);
      }
      for (const blob of blobsOf(world)) {
        if (sitting(blob) && before[blob] === 0) {
          sits++;
          // The later of two blobs that sit down on one tile in one tick, in blob order, found every tile of its front held.
          const neighbours = (bySeat.get(life.seat[blob] - 1) ?? []).filter((other) => other !== blob && (before[other] === 1 || other < blob));
          if (neighbours.length > 0) {
            stacked++;
            expect(frontOf(world, blob).every((cell) => life.holds[cell] >= 1), `blob ${blob} at tick ${currentTick(world)}`).toBe(true);
          }
        }
        before[blob] = sitting(blob) ? 1 : 0;
      }
      for (const blobs of byTile.values()) mostOnATile = Math.max(mostOnATile, blobs.length);
      if (currentTick(world) === 1_244) shares.push(...[...byTile.values()].map((blobs) => blobs.length));
    }

    const sharing = shares.filter((count) => count > 1).reduce((sum, count) => sum + count, 0);
    const sitters = shares.reduce((sum, count) => sum + count, 0);
    console.info(
      `Highcourt on day 0: ${sits} doorstep sits, ${stacked} onto a tile another sitter held; at 20:44 ${sharing} of ${sitters} sitters share a tile, ` +
        `${mostOnATile} on one tile at most`,
    );
    expect(sits).toBeGreaterThan(1_000);
    expect(sharing / sitters).toBeLessThan(0.3);
  });

  it('has no free-time choice running past half past nine but for a chat, and everyone home in bed by 22:00', () => {
    const world = highcourt();
    runTo(world, LIFE_END_MINUTE + 1);
    // A choice ends by 21:30, and a chat that moves its end on takes up the half hour to 22:00, no more.
    const late = blobsOf(world).filter((blob) => FREE_TIME.includes(world.errands.activity[blob]));
    expect(late.length).toBeGreaterThan(0);
    expect(late.filter((blob) => world.life.chatWith[blob] === 0 || world.life.chatUntil[blob] > TEN_PM)).toEqual([]);

    // At 22:00 a blob is at home, or on its doorstep for the last tick of its stay, on a tile of its home's front.
    runTo(world, TEN_PM);
    expect(blobsOf(world).filter((blob) => !onFrontOf(world, blob))).toEqual([]);

    runTo(world, TEN_PM + 1);
    const { phase, activity } = world.errands;
    expect(blobsOf(world).filter((blob) => phase[blob] !== PHASE_ASLEEP || activity[blob] !== ACTIVITY_SLEEP)).toEqual([]);
    expect(blobsOf(world).filter((blob) => cellOf(world, blob) !== world.errands.homeCell[blob])).toEqual([]);
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

    // A chat settles the needs of both blobs as it starts, being a change of state, and nothing else does while the blob stays.
    let stays = 0;
    let settled = arrival;
    let chatUntil = life.chatUntil[blob];
    while (errands.phase[blob] === PHASE_STAYING) {
      step(world);
      if (errands.phase[blob] !== PHASE_STAYING) break;
      if (life.chatUntil[blob] !== chatUntil) settled = currentTick(world) - 1;
      chatUntil = life.chatUntil[blob];
      expect(life.settleTick[blob]).toBe(settled);
      stays++;
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

// A shop and a plaza of `across` by `rows` tiles on an open ground of its own, at noon, so that the blobs a test sets off stand where
// it puts them and meet nothing else of the day.
const OPEN: Ground = { width: 64, height: 64, walk: new Uint8Array(64 * 64).fill(1) };
const NOON = 720;
const PLAZA_AT = 30;

function plazaScene(across: number, rows: number): World {
  const shops = createShops([
    { doorX: 8, doorY: 8, goods: 0xfe, stall: false },
    { doorX: PLAZA_AT, doorY: PLAZA_AT, goods: 0, stall: false, kind: SITE_PLAZA, x: PLAZA_AT, y: PLAZA_AT, w: across, h: rows },
  ]);
  const world = createTown(7, 'phone', OPEN, createStandInTownHomes(OPEN, 12), shops);
  world.checks = false;
  world.globals[TICK] = NOON;
  return world;
}

describe('a site with little ground', () => {
  it('gives its tiles to the blobs that go there one each, then stacks the rest on the tiles with the fewest', () => {
    const world = plazaScene(2, 1);
    const { agents, errands, life } = world;
    const sites = sitesOf(errands);
    const started: boolean[] = [];
    for (let blob = 0; blob < 5; blob++) {
      agents.x[blob] = pointInTileQ8(10 + blob, 2_048);
      agents.y[blob] = pointInTileQ8(10, 2_048);
      started.push(startOuting(world, blob, NOON + blob, 1, ACTIVITY_PLAZA, sites));
    }

    const cells = [0, 1, 2, 3, 4].map((blob) => life.seat[blob] - 1);
    const first = PLAZA_AT * OPEN.width + PLAZA_AT;
    expect(started).toEqual([true, true, true, true, true]);
    expect(new Set(cells.slice(0, 2)).size).toBe(2);
    expect(cells.every((cell) => cell === first || cell === first + 1)).toBe(true);
    // 5 blobs on 2 tiles: 3 and 2.
    expect([life.holds[first], life.holds[first + 1]].sort()).toEqual([2, 3]);
  });
});

describe('a house front', () => {
  const DOOR_AT = 20;
  const DOOR = DOOR_AT * OPEN.width + DOOR_AT;
  const AROUND = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => DOOR + dy * OPEN.width + dx));

  // The first `blobs` blobs, all of the house whose door is DOOR, sit out one after another, and the cells they hold are returned.
  function sitAll(world: World, blobs: number): number[] {
    for (let blob = 0; blob < blobs; blob++) {
      world.errands.homeCell[blob] = DOOR;
      sitOnDoorstep(world, blob, NOON + blob, 100);
    }
    return Array.from({ length: blobs }, (_, blob) => world.life.seat[blob] - 1);
  }

  it('seats a household on different tiles of its door and the ground round it, then stacks the rest on the tiles with the fewest', () => {
    const world = plazaScene(1, 1);
    const { agents, errands, life } = world;
    const seats = sitAll(world, 12);

    expect(new Set(seats.slice(0, 9)).size).toBe(9);
    expect(seats.every((cell) => AROUND.includes(cell))).toBe(true);
    // 12 blobs on 9 tiles: three tiles of two and six of one.
    expect(AROUND.map((cell) => life.holds[cell]).sort()).toEqual([1, 1, 1, 1, 1, 1, 2, 2, 2]);
    for (let blob = 0; blob < 12; blob++) {
      expect([errands.phase[blob], errands.activity[blob]]).toEqual([PHASE_STAYING, ACTIVITY_DOORSTEP]);
    }
    // The first on a tile stands at its centre, a tile from the next, and no two blobs stand on one point.
    for (let blob = 0; blob < 9; blob++) {
      expect([agents.x[blob], agents.y[blob]]).toEqual([pointInTileQ8(seats[blob] % OPEN.width, 2_048), pointInTileQ8(Math.floor(seats[blob] / OPEN.width), 2_048)]);
    }
    expect(new Set(Array.from({ length: 12 }, (_, blob) => `${agents.x[blob]},${agents.y[blob]}`)).size).toBe(12);
  });

  it('seats a household stacked on its door when no tile round it can be walked on', () => {
    const walk = OPEN.walk.slice();
    for (const cell of AROUND) if (cell !== DOOR) walk[cell] = 0;
    const closet: Ground = { width: OPEN.width, height: OPEN.height, walk };
    const world = createTown(7, 'phone', closet, createStandInTownHomes(closet, 12), createShops([{ doorX: 8, doorY: 8, goods: 0xfe, stall: false }]));
    world.checks = false;

    expect(new Set(sitAll(world, 6))).toEqual(new Set([DOOR]));
    expect(world.life.holds[DOOR]).toBe(6);
  });
});
