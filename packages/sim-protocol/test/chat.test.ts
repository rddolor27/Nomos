import { readFileSync } from 'node:fs';
import {
  ACTIVITY_DOORSTEP,
  ACTIVITY_GREEN,
  ACTIVITY_PLAZA,
  ACTIVITY_WORK,
  CHAT_LAST_MINUTE,
  CHAT_MAX_TICKS,
  CHAT_MIN_TICKS,
  FACING_DOWN,
  FACING_LEFT,
  FACING_RIGHT,
  FACING_UP,
  FIRST_WALKING,
  MAIL_CELLS,
  MAX_NEIGHBOURS,
  NEEDS,
  NEED_COMPANY,
  PHASE_COMING,
  PHASE_GOING,
  PHASE_STAYING,
  PHASE_WORKING,
  RUN_BYTES,
  SITE_GREEN,
  SITE_PLAZA,
  SITE_WATER,
  TALLY_CHECKED,
  TALLY_LOOKED,
  TICK,
  checkpoint,
  createHomes,
  createShops,
  createStandInTownHomes,
  createTown,
  currentTick,
  pairChats,
  pointInTileQ8,
  restoreWorld,
  setHeading,
  stateHash,
  step,
  walkStreets,
  type Ground,
  type World,
} from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import {
  ACTION_SIT,
  ACTION_TALK,
  ACTION_WALK,
  EMOTE_BALL,
  EMOTE_HEART,
  EMOTE_MUSIC,
  EMOTE_SPEECH,
  ENTITY_HOME,
  actionOf,
  createSnapshotPool,
  emoteOf,
  facingOf,
  indoorsOf,
  leisureOf,
  parseMap,
  premisesOf,
  takeView,
  writeSnapshot,
  type MapV1,
} from '../src/index.ts';

const townFile = new URL('../../../assets/maps/town.nmap', import.meta.url);
const TICKS_PER_DAY = 1_440;
const NOON = 720;
// A blob whose end tick is this far off sleeps through a scene, or stands there for good.
const NEVER = 1_000_000;
// A run of cells east takes 4 ticks a cell, along an axis.
const TICKS_PER_CELL = 4;
const HEADING_EAST = 192;
const HEADING_WEST = 64;
// A walker's company need, which one chat takes under what a blob of 255 sociable lets it bear, and a doorstep blob's, which a
// scan of the evening's last half hour takes no lower than that.
const WALKER_NEED = 14_000;
const DOORSTEP_NEED = 30_000;
const EVENING = 1_250;

// A scene on an open ground of its own, so that blobs stand where a test puts them: a shop, a plaza, a green and a bank of water.
// Only the walk and the chat run in it, ticked by hand, so that nothing else of the day moves a blob, and every blob sleeps
// until a test sets it going.
const GROUND: Ground = { width: 64, height: 64, walk: new Uint8Array(64 * 64).fill(1) };
const PEOPLE = 60;
const SHOP = 0;
const PLAZA = 1;
const GREEN = 2;
const WATER = 3;
const SCENE_SITES = createShops([
  { doorX: 8, doorY: 8, goods: 0xfe, stall: false },
  { doorX: 50, doorY: 10, goods: 0, stall: false, kind: SITE_PLAZA, x: 44, y: 6, w: 12, h: 8 },
  { doorX: 30, doorY: 40, goods: 0, stall: false, kind: SITE_GREEN, x: 28, y: 38, w: 6, h: 4 },
  { doorX: 20, doorY: 50, goods: 0, stall: false, kind: SITE_WATER },
]);

function scene(at = NOON): World {
  const world = createTown(7, 'phone', GROUND, createStandInTownHomes(GROUND, PEOPLE), SCENE_SITES);
  world.checks = false;
  world.globals[TICK] = at;
  world.errands.endTick.fill(NEVER);
  return world;
}

function tick(world: World): void {
  walkStreets(world);
  pairChats(world);
  world.globals[TICK] += 1;
}

function centreOf(tile: number): number {
  return pointInTileQ8(tile, 2_048);
}

// Makes the blob look for company now: sociable to the top, with a company need of `need` as of this tick.
function lonely(world: World, blob: number, need: number): void {
  world.life.needs[blob * NEEDS + NEED_COMPANY] = need;
  world.life.settleTick[blob] = currentTick(world);
  world.life.sociable[blob] = 255;
}

// Puts a blob on the street at tile (x, y), walking east for `cells` cells on a run of its own, for the activity and to the site.
function walkEast(world: World, blob: number, x: number, y: number, cells: number, activity: number, site: number): void {
  const { agents, errands } = world;
  agents.x[blob] = centreOf(x);
  agents.y[blob] = centreOf(y);
  errands.runs.fill(0, blob * RUN_BYTES, (blob + 1) * RUN_BYTES);
  errands.runs[blob * RUN_BYTES] = HEADING_EAST;
  errands.runs[blob * RUN_BYTES + 1] = cells;
  errands.run[blob] = 0;
  setHeading(agents, blob, HEADING_EAST);
  agents.action[blob] = ACTION_WALK;
  errands.phase[blob] = PHASE_GOING;
  errands.activity[blob] = activity;
  errands.shop[blob] = site;
  errands.good[blob] = 0;
  errands.endTick[blob] = currentTick(world) + TICKS_PER_CELL * cells;
  lonely(world, blob, WALKER_NEED);
}

// The same blob walking home along its run backward, west.
function walkHome(world: World, blob: number, x: number, y: number, cells: number, activity: number, site: number): void {
  walkEast(world, blob, x, y, cells, activity, site);
  setHeading(world.agents, blob, HEADING_WEST);
  world.errands.phase[blob] = PHASE_COMING;
}

// Stands a blob on its doorstep at tile (x, y), free and lonely, until `until`.
function sitOut(world: World, blob: number, x: number, y: number, until: number): void {
  const { agents, errands } = world;
  agents.x[blob] = centreOf(x);
  agents.y[blob] = centreOf(y);
  errands.phase[blob] = PHASE_STAYING;
  errands.activity[blob] = ACTIVITY_DOORSTEP;
  errands.endTick[blob] = until;
  lonely(world, blob, DOORSTEP_NEED);
}

// Two walkers a tile apart on one road to the plaza, as close as two blobs on tile centres can be and still be two tiles.
function walkersToThePlaza(): World {
  const world = scene();
  walkEast(world, 0, 10, 10, 40, ACTIVITY_PLAZA, PLAZA);
  walkEast(world, 1, 11, 11, 40, ACTIVITY_PLAZA, PLAZA);
  return world;
}

function snapshotter(world: World): () => number[] {
  const view = takeView(createSnapshotPool(world.agents.capacity));
  if (view === null) throw new Error('a new snapshot pool has no free view');
  const blobs = world.agents.count[0];
  return () => {
    writeSnapshot(world, view);
    return Array.from({ length: blobs }, (_, blob) => view[3 * blob + 2]);
  };
}

interface Walk {
  chatTick: number;
  length: number;
  arrivals: number[];
}

// Ticks a scene of walkers on until each of `blobs` has stopped walking, and returns when the first chat of the first blob began
// and how long it lasted, and the tick each blob stopped on. While they stand talking, none of them has moved.
function walkToThePlaza(world: World, blobs: number[]): Walk {
  const walk: Walk = { chatTick: -1, length: 0, arrivals: blobs.map(() => -1) };
  const { agents, errands, life } = world;
  let stood: number[] = [];
  for (let n = 0; n < 400 && walk.arrivals.includes(-1); n++) {
    const now = currentTick(world);
    tick(world);
    const where = blobs.flatMap((blob) => [agents.x[blob], agents.y[blob]]);
    if (walk.chatTick < 0 && life.chatUntil[blobs[0]] > 0) {
      walk.chatTick = now;
      walk.length = life.chatUntil[blobs[0]] - now;
      stood = where;
    }
    if (walk.chatTick >= 0 && now <= life.chatUntil[blobs[0]]) expect(where, `tick ${now}`).toEqual(stood);
    blobs.forEach((blob, k) => {
      if (walk.arrivals[k] < 0 && errands.phase[blob] < FIRST_WALKING) walk.arrivals[k] = now;
    });
  }
  return walk;
}

function facingBetween(world: World, from: number, to: number): number {
  const dx = world.agents.x[to] - world.agents.x[from];
  const dy = world.agents.y[to] - world.agents.y[from];
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? FACING_RIGHT : FACING_LEFT;
  return dy < 0 ? FACING_UP : FACING_DOWN;
}

describe('two free walkers who meet', () => {
  it('stop face to face under speech bubbles, then arrive exactly the length of the chat late', () => {
    // And a twin scene where neither is lonely, so that nobody chats.
    const chatting = walkersToThePlaza();
    const quiet = walkersToThePlaza();
    quiet.life.needs.fill(0);

    const talked = walkToThePlaza(chatting, [0, 1]);
    const free = walkToThePlaza(quiet, [0, 1]);

    expect(free.chatTick).toBe(-1);
    expect(talked.chatTick).toBeGreaterThan(NOON);
    expect(talked.length).toBeGreaterThanOrEqual(CHAT_MIN_TICKS);
    expect(talked.length).toBeLessThanOrEqual(CHAT_MAX_TICKS);
    expect(talked.arrivals).toEqual(free.arrivals.map((arrived) => arrived + talked.length));

    // They are each other's partner for the same length, and both have eased, so neither chats again.
    const { life, errands } = chatting;
    expect([life.chatWith[0], life.chatWith[1]]).toEqual([2, 1]);
    expect(life.chatUntil[0]).toBe(life.chatUntil[1]);
    expect(life.chatUntil[0]).toBe(talked.chatTick + talked.length);
    expect([errands.phase[0], errands.phase[1]]).toEqual([PHASE_STAYING, PHASE_STAYING]);
  });

  it('face each other and stand still while they chat, showing speech and talking, and walk on after', () => {
    const world = walkersToThePlaza();
    const wordsNow = snapshotter(world);
    const { agents, life } = world;
    while (life.chatUntil[0] === 0) tick(world);

    const words = wordsNow();
    for (const [blob, other] of [[0, 1], [1, 0]]) {
      expect(facingOf(words[blob])).toBe(facingBetween(world, blob, other));
      expect(emoteOf(words[blob])).toBe(EMOTE_SPEECH);
      expect(actionOf(words[blob])).toBe(ACTION_TALK);
      expect(indoorsOf(words[blob])).toBe(0);
      expect([agents.vx[blob], agents.vy[blob]]).toEqual([0, 0]);
    }
    // One faces the other, and the other faces back.
    expect(facingOf(words[0])).not.toBe(facingOf(words[1]));

    // The walkers stand until the step of tick chatUntil sets them off, so the world still shows the chat as it waits to run it.
    while (currentTick(world) < life.chatUntil[0]) tick(world);
    expect(emoteOf(wordsNow()[0])).toBe(EMOTE_SPEECH);
    tick(world);
    const after = wordsNow();
    expect([emoteOf(after[0]), emoteOf(after[1])]).toEqual([0, 0]);
    expect([actionOf(after[0]), actionOf(after[1])]).toEqual([ACTION_WALK, ACTION_WALK]);
    expect(agents.vx[0]).toBeGreaterThan(0);
  });

  it('are never joined by a blob going to work, which walks on and arrives on time', () => {
    // A worker on the same road, in the same cell as a free walker and a tile from it: the walker looks, finds no one waiting, and
    // waits; the worker neither waits nor looks.
    const world = scene();
    walkEast(world, 0, 10, 10, 40, ACTIVITY_WORK, SHOP);
    walkEast(world, 1, 11, 11, 40, ACTIVITY_PLAZA, PLAZA);
    const alone = scene();
    walkEast(alone, 0, 10, 10, 40, ACTIVITY_WORK, SHOP);
    alone.life.needs.fill(0);

    const together = walkToThePlaza(world, [0, 1]);
    const worker = walkToThePlaza(alone, [0]);

    expect(together.chatTick).toBe(-1);
    expect([world.life.chatUntil[0], world.life.chatUntil[1], world.life.chatWith[0], world.life.chatWith[1]]).toEqual([0, 0, 0, 0]);
    expect(together.arrivals[0]).toBe(worker.arrivals[0]);
    expect(world.errands.phase[0]).toBe(PHASE_WORKING);
    // The free walker did look, and is the cell's waiter.
    expect(world.life.mailBlob.includes(2)).toBe(true);
  });
});

describe('the evening', () => {
  // Two blobs a tile apart on a doorstep until `until`, from index 1 and 2: blob 2 looks on the ticks that are 2 mod 4 and blob 1 on
  // those that are 3 mod 4, so a chat forms on the first tick of the second.
  function doorstep(until: number): World {
    const world = scene(EVENING);
    sitOut(world, 1, 20, 20, until);
    sitOut(world, 2, 21, 20, until);
    return world;
  }

  function firstChat(world: World, from: number, to: number): number {
    for (let at = from; at < to; at++) {
      world.globals[TICK] = at;
      pairChats(world);
      if (world.life.chatUntil[1] > 0) return at;
    }
    return -1;
  }

  it('starts no chat from 21:00, but starts one the minute before, and none while nobody is out', () => {
    expect(CHAT_LAST_MINUTE).toBe(1_260);
    expect(firstChat(doorstep(1_275), 1_258, 1_260)).toBe(1_259);
    expect(firstChat(doorstep(1_275), 1_260, 1_290)).toBe(-1);
    expect(firstChat(doorstep(1_275), 1_262, 1_290)).toBe(-1);
    expect(firstChat(doorstep(1_275), 300, 359)).toBe(-1);
  });

  it('cuts a chat to what leaves both home by 22:00, and starts none shorter than the least', () => {
    // A doorstep stay that ends at 21:40 leaves 20 ticks to 22:00: the least chat, so exactly 20.
    const tight = doorstep(1_300);
    expect(firstChat(tight, 1_258, 1_260)).toBe(1_259);
    expect(tight.life.chatUntil[1] - 1_259).toBe(CHAT_MIN_TICKS);
    expect([tight.errands.endTick[1], tight.errands.endTick[2]]).toEqual([1_320, 1_320]);

    // One that ends at 21:45 leaves 15, so the two just stand there.
    const full = doorstep(1_305);
    expect(firstChat(full, 1_258, 1_260)).toBe(-1);
    expect(full.errands.endTick[1]).toBe(1_305);

    // With room to spare the chat is a keyed length, within the room, and both stays move on by it.
    const roomy = doorstep(1_275);
    expect(firstChat(roomy, 1_258, 1_260)).toBe(1_259);
    const length = roomy.life.chatUntil[1] - 1_259;
    expect(length).toBeGreaterThanOrEqual(CHAT_MIN_TICKS);
    expect(length).toBeLessThanOrEqual(1_320 - 1_275);
    expect([roomy.errands.endTick[1], roomy.errands.endTick[2]]).toEqual([1_275 + length, 1_275 + length]);
  });

  // Ticks two walkers on until they chat, or `ticks` pass, and returns the length of the chat, or 0.
  function chatLengthOf(world: World, ticks: number): number {
    for (let n = 0; n < ticks; n++) {
      const now = currentTick(world);
      tick(world);
      if (world.life.chatUntil[0] > 0) return world.life.chatUntil[0] - now;
    }
    return 0;
  }

  it('counts the walk a walker has still to make, out to a site or home from it, against the night', () => {
    // Two walkers a tile apart on a run of 20 cells, 80 ticks. Going out, they are due home after the rest of the run, a tick at
    // the plaza and the walk back: 161 ticks from the start. Coming home, the run is all that is left: 80.
    const outAt = (start: number): World => {
      const world = scene(start);
      walkEast(world, 0, 10, 10, 20, ACTIVITY_PLAZA, PLAZA);
      walkEast(world, 1, 11, 11, 20, ACTIVITY_PLAZA, PLAZA);
      return world;
    };
    const homeAt = (start: number): World => {
      const world = scene(start);
      walkHome(world, 0, 30, 10, 20, ACTIVITY_PLAZA, PLAZA);
      walkHome(world, 1, 31, 11, 20, ACTIVITY_PLAZA, PLAZA);
      return world;
    };

    // Due home at 21:40, leaving 20 ticks to 22:00: exactly the least chat.
    expect(chatLengthOf(outAt(1_139), 30)).toBe(CHAT_MIN_TICKS);
    expect(chatLengthOf(homeAt(1_220), 30)).toBe(CHAT_MIN_TICKS);
    // Five ticks later they would be home too late for the least chat, so they walk on.
    expect(chatLengthOf(outAt(1_144), 30)).toBe(0);
    expect(chatLengthOf(homeAt(1_225), 30)).toBe(0);

    // With the evening before them, a chat moves their run's end tick on by its length.
    const world = homeAt(1_000);
    const end = world.errands.endTick[0];
    const length = chatLengthOf(world, 30);
    expect(length).toBeGreaterThanOrEqual(CHAT_MIN_TICKS);
    expect([world.errands.endTick[0], world.errands.endTick[1]]).toEqual([end + length, end + length]);
  });
});

describe('looking', () => {
  it('lets a quarter of the blobs look in a tick, each once every four ticks, and checks no one when each stands alone', () => {
    // 40 lonely blobs on their doorsteps, in cells of their own.
    const world = scene(EVENING - 100);
    for (let blob = 0; blob < 40; blob++) sitOut(world, blob, 2 + 5 * (blob % 8), 12 + 4 * Math.floor(blob / 8), NEVER);
    const looks: number[] = [];
    for (let n = 0; n < 8; n++) {
      pairChats(world);
      looks.push(world.life.tally[TALLY_LOOKED]);
      expect(world.life.tally[TALLY_CHECKED]).toBe(0);
      world.globals[TICK] += 1;
    }
    expect(looks).toEqual(new Array<number>(8).fill(10));
  });

  it('checks the one blob waiting in a cell, never more than 16, when forty stand on one tile, and pairs each blob once', () => {
    const world = scene(EVENING - 100);
    for (let blob = 0; blob < 40; blob++) sitOut(world, blob, 20, 20, EVENING + 5);
    let checked = 0;
    for (let n = 0; n < 8; n++) {
      pairChats(world);
      checked = Math.max(checked, world.life.tally[TALLY_CHECKED]);
      world.globals[TICK] += 1;
    }
    expect(checked).toBe(1);
    expect(checked).toBeLessThanOrEqual(MAX_NEIGHBOURS);
    const partners = Array.from({ length: 40 }, (_, blob) => world.life.chatWith[blob]).filter((partner) => partner > 0);
    expect(partners).toHaveLength(40);
    expect(new Set(partners).size).toBe(40);
  });

  it('holds a mailbox cell for every cell of the largest ground a town may have', () => {
    let most = 0;
    for (let width = 1; width <= 256; width++) {
      for (let height = 1; height <= 256 && width * height <= 176 * 112; height++) {
        most = Math.max(most, ((width + 1) >> 1) * ((height + 1) >> 1));
      }
    }
    expect(most).toBe(5_002);
    expect(MAIL_CELLS).toBeGreaterThanOrEqual(most);
  });

  it('keeps the chat and the mailbox in the hash, and a twin restored from a checkpoint taken mid-chat ends at the same hash', () => {
    const world = walkersToThePlaza();
    const before = stateHash(world);
    for (const column of [world.life.chatUntil, world.life.chatWith, world.life.mailBlob, world.life.mailTick]) {
      column[3] = 5;
      expect(stateHash(world)).not.toBe(before);
      column[3] = 0;
      expect(stateHash(world)).toBe(before);
    }

    while (world.life.chatUntil[0] === 0) tick(world);
    const saved = checkpoint(world);
    const hashAtCheckpoint = stateHash(world);
    for (let n = 0; n < 200; n++) tick(world);

    const twin = restoreWorld(7, 'phone', saved, GROUND);
    twin.checks = false;
    expect(stateHash(twin)).toBe(hashAtCheckpoint);
    for (let n = 0; n < 200; n++) tick(twin);
    expect(stateHash(twin)).toBe(stateHash(world));
    expect(stateHash(twin)).not.toBe(hashAtCheckpoint);
  });
});

describe('what the snapshot shows of a blob at leisure', () => {
  // Blobs 0 to 3 stand in the plaza, 4 to 7 in the green and 8 to 11 by the water, and 12 on a doorstep, with nobody lonely.
  function lounge(): World {
    const world = scene();
    const { agents, errands } = world;
    const places: [number, number, number][] = [[PLAZA, ACTIVITY_PLAZA, 0], [GREEN, ACTIVITY_GREEN, 4], [WATER, ACTIVITY_GREEN, 8]];
    for (const [site, activity, first] of places) {
      for (let blob = first; blob < first + 4; blob++) {
        agents.x[blob] = centreOf(errands.siteX[site]);
        agents.y[blob] = centreOf(errands.siteY[site]);
        errands.phase[blob] = PHASE_STAYING;
        errands.activity[blob] = activity;
        errands.shop[blob] = site;
      }
    }
    sitOut(world, 12, 40, 40, NEVER);
    world.life.needs.fill(0);
    return world;
  }

  it('sits whoever stands out at a spot, and shows each outing its sign a quarter of the time, staggered by blob', () => {
    const world = lounge();
    const wordsNow = snapshotter(world);
    const shown: number[][] = Array.from({ length: 13 }, () => []);
    for (let n = 0; n < 128; n++) {
      const words = wordsNow();
      for (let blob = 0; blob < 13; blob++) {
        expect(actionOf(words[blob]), `blob ${blob}`).toBe(ACTION_SIT);
        shown[blob].push(emoteOf(words[blob]));
      }
      world.globals[TICK] += 1;
    }
    for (const [first, emote] of [[0, EMOTE_BALL], [4, EMOTE_MUSIC], [8, EMOTE_HEART]]) {
      for (let blob = first; blob < first + 4; blob++) {
        expect(shown[blob].filter((each) => each === emote), `blob ${blob}`).toHaveLength(32);
        expect(shown[blob].filter((each) => each !== 0 && each !== emote)).toEqual([]);
      }
      // One of four neighbours shows its sign at any one tick.
      for (let at = 0; at < 128; at++) expect([0, 1, 2, 3].filter((k) => shown[first + k][at] !== 0)).toHaveLength(1);
    }
    // The doorstep has no sign.
    expect(shown[12].every((each) => each === 0)).toBe(true);
  });
});

const town: MapV1 = parseMap(new Uint8Array(readFileSync(townFile)).buffer);

// Highcourt as the worker builds it, with its premises, plaza, greens and water edges.
function highcourt(seed = 42): World {
  const homes = createHomes(town.entities.filter((entity) => entity.kind === ENTITY_HOME));
  const world = createTown(seed, 'phone', town, homes, createShops([...premisesOf(town), ...leisureOf(town)]));
  world.checks = false;
  return world;
}

function placeOf(world: World, blob: number): string {
  const { phase, activity } = world.errands;
  if (phase[blob] !== PHASE_STAYING) return 'street';
  if (activity[blob] === ACTIVITY_DOORSTEP) return 'doorstep';
  return activity[blob] === ACTIVITY_PLAZA ? 'plaza' : 'green';
}

interface DayOfChats {
  starts: { tick: number; length: number; places: string }[];
  mostLooked: number;
  mostChecked: number;
  looks: number;
  eligible: number;
}

// Day 0's chats, found as the ticks that give a blob a new chatUntil, with where the two partners stood, and what the chat system
// tallied of its looks.
function chatsOfDay(world: World): DayOfChats {
  const { life, errands, agents } = world;
  const blobs = agents.count[0];
  const seen = new Int32Array(blobs);
  const day: DayOfChats = { starts: [], mostLooked: 0, mostChecked: 0, looks: 0, eligible: 0 };
  while (currentTick(world) < TICKS_PER_DAY) {
    step(world);
    const now = currentTick(world) - 1;
    day.mostLooked = Math.max(day.mostLooked, life.tally[TALLY_LOOKED]);
    day.mostChecked = Math.max(day.mostChecked, life.tally[TALLY_CHECKED]);
    day.looks += life.tally[TALLY_LOOKED];
    for (let blob = 0; blob < blobs; blob++) {
      const free = errands.phase[blob] >= PHASE_STAYING && errands.activity[blob] >= ACTIVITY_DOORSTEP;
      if (free && now >= life.chatUntil[blob]) day.eligible++;
      if (life.chatUntil[blob] === seen[blob]) continue;
      seen[blob] = life.chatUntil[blob];
      const partner = life.chatWith[blob] - 1;
      if (partner < blob) continue;
      day.starts.push({ tick: now, length: life.chatUntil[blob] - now, places: [placeOf(world, blob), placeOf(world, partner)].sort().join('+') });
    }
  }
  return day;
}

describe("Highcourt's day 0", { timeout: 120_000 }, () => {
  it('has hundreds of chats on the doorsteps and the streets, some on the plaza before 14:00 and on the greens, none from 21:00', () => {
    const day = chatsOfDay(highcourt());
    const at = (place: string): number => day.starts.filter((chat) => chat.places.includes(place)).length;
    const hours = Array.from({ length: 24 }, (_, hour) => day.starts.filter((chat) => Math.floor(chat.tick / 60) === hour).length);
    const firstPlaza = day.starts.find((chat) => chat.places.includes('plaza'))?.tick;

    console.info(
      `Highcourt day 0 (seed 42): ${day.starts.length} chats: ${at('doorstep')} with a blob on its doorstep, ${at('plaza')} with one on the ` +
        `plaza, ${at('green')} on a green, ${day.starts.filter((chat) => chat.places === 'street+street').length} between two walkers; the first ` +
        `plaza chat at tick ${firstPlaza}; by hour ${hours.join(' ')}`,
    );
    expect(day.starts.length).toBeGreaterThan(400);
    expect(at('doorstep')).toBeGreaterThan(100);
    expect(day.starts.filter((chat) => chat.places === 'street+street').length).toBeGreaterThan(10);
    expect(at('green')).toBeGreaterThan(0);
    // Task 6's spec watches for a pair to chat on the plaza before 14:00.
    expect(firstPlaza).toBeLessThan(840);
    expect(day.starts.every((chat) => chat.length >= CHAT_MIN_TICKS && chat.length <= CHAT_MAX_TICKS)).toBe(true);
    expect(day.starts.every((chat) => chat.tick >= 360 && chat.tick < CHAT_LAST_MINUTE)).toBe(true);
    expect([...hours.slice(0, 6), ...hours.slice(21)]).toEqual(new Array<number>(9).fill(0));
  });

  it('lets a quarter of its blobs look in a tick at most, and checks one blob a look', () => {
    const day = chatsOfDay(highcourt(7));
    const blobs = 1_720;
    expect(day.mostLooked).toBeLessThanOrEqual(Math.ceil(blobs / 4));
    // Of the blobs free and out, a quarter are due to look and only the lonely ones do.
    expect(day.looks / day.eligible).toBeLessThan(0.26);
    expect(day.looks / day.eligible).toBeGreaterThan(0.05);
    expect(day.mostChecked).toBe(1);
    expect(day.mostChecked).toBeLessThanOrEqual(MAX_NEIGHBOURS);
  });

  it('replays from a checkpoint taken while two walkers stand talking', () => {
    const live = highcourt();
    const { life, errands } = live;
    const walkerTalking = (): boolean => {
      for (let blob = 0; blob < live.agents.count[0]; blob++) {
        if (errands.phase[blob] >= FIRST_WALKING && currentTick(live) < life.chatUntil[blob]) return true;
      }
      return false;
    };
    while (!walkerTalking()) step(live);
    const saved = checkpoint(live);
    const hashAtCheckpoint = stateHash(live);

    while (currentTick(live) < TICKS_PER_DAY + 600) step(live);
    const twin = restoreWorld(42, 'phone', saved, town);
    twin.checks = false;
    expect(stateHash(twin)).toBe(hashAtCheckpoint);
    while (currentTick(twin) < TICKS_PER_DAY + 600) step(twin);

    expect(stateHash(twin)).toBe(stateHash(live));
    expect(stateHash(live)).not.toBe(hashAtCheckpoint);
  });
});
