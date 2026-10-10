import { describe, expect, it } from 'vitest';
import { MAX_HOUSEHOLD, NO_HOME } from '../src/households/store.ts';
import { draw2 } from '../src/random/draw.ts';
import { keyedShuffle } from '../src/random/shuffle.ts';
import * as streams from '../src/random/streams.ts';
import { SPAWN_DRAW, layerOf } from '../src/random/streams.ts';
import {
  HOME_ORDER,
  createHomes,
  createStandInHomes,
  seatHouseholds,
  type HomeSite,
  type Homes,
} from '../src/spawn/homes.ts';
import { standInGround, type Ground } from '../src/world/ground.ts';

const SEED = 42;
const SIZES = 0x78;
const CAPACITIES = 0x79;
const TRIALS = 30;
const ROOM = { x: 4, y: 10, width: 12, height: 6 };

// A 32 × 32 ground, open only in the room's 12 × 6 cells.
function roomGround(): Ground {
  const width = 32;
  const walk = new Uint8Array(width * 32);
  for (let ty = ROOM.y; ty < ROOM.y + ROOM.height; ty++) {
    walk.fill(1, ty * width + ROOM.x, ty * width + ROOM.x + ROOM.width);
  }
  return { width, height: 32, walk };
}

function site(capacity: number): HomeSite {
  return { doorX: 0, doorY: 0, capacity };
}

function randomSizes(trial: number, households: number): Uint8Array {
  const size = new Uint8Array(households);
  for (let h = 0; h < households; h++) size[h] = 1 + (draw2(SEED, SIZES, trial, h) % MAX_HOUSEHOLD);
  return size;
}

function peopleIn(size: Uint8Array): number {
  return size.reduce((total, people) => total + people, 0);
}

// ceil(people ÷ 3) homes of 6 beds or more hold twice the people and always seat a mix, so a throw here is a bug.
function randomHomes(trial: number, count: number): Homes {
  const sites: HomeSite[] = [];
  for (let i = 0; i < count; i++) sites.push(site(MAX_HOUSEHOLD + (draw2(SEED, CAPACITIES, trial, i) % 19)));
  return createHomes(sites);
}

function seat(size: Uint8Array, homes: Homes, key: number): Int32Array {
  const home = new Int32Array(size.length).fill(NO_HOME);
  seatHouseholds(size, size.length, home, homes, SEED, key);
  return home;
}

// The rule spelled out the slow way: the largest households first, each into the first home of the keyed order with
// room, always searching from the start of the order.
function seatSlowly(size: Uint8Array, homes: Homes, key: number): Int32Array {
  const order = new Int32Array(homes.count);
  keyedShuffle(order, homes.count, SEED, SPAWN_DRAW, key, HOME_ORDER);
  const room = Int32Array.from(homes.capacity);
  const home = new Int32Array(size.length).fill(NO_HOME);
  for (let s = MAX_HOUSEHOLD; s >= 1; s--) {
    for (let h = 0; h < size.length; h++) {
      if (size[h] !== s) continue;
      const chosen = order.find((candidate) => room[candidate] >= s);
      if (chosen === undefined) throw new RangeError(`no home has room for a household of ${s}`);
      home[h] = chosen;
      room[chosen] -= s;
    }
  }
  return home;
}

function unseated(home: Int32Array, homes: Homes): number[] {
  return Array.from(home.keys()).filter((h) => home[h] < 0 || home[h] >= homes.count);
}

function overfull(size: Uint8Array, home: Int32Array, homes: Homes): number[] {
  const used = new Int32Array(homes.count);
  for (let h = 0; h < size.length; h++) used[home[h]] += size[h];
  return Array.from(used.keys()).filter((i) => used[i] > homes.capacity[i]);
}

describe('the spawn stream', () => {
  it('is an agent stream of its own, with the home order as its purpose 0', () => {
    expect(SPAWN_DRAW).toBe(0x10d);
    expect(layerOf(SPAWN_DRAW)).toBe('agent');
    expect(Object.values(streams).filter((stream) => stream === SPAWN_DRAW)).toHaveLength(1);
    expect(HOME_ORDER).toBe(0);
  });
});

describe('createHomes', () => {
  it('copies each site into columns, with working arrays as long as the homes are many', () => {
    const homes = createHomes([
      { doorX: 3, doorY: 4, capacity: 6 },
      { doorX: 10, doorY: 2, capacity: 24 },
    ]);

    expect(homes.count).toBe(2);
    expect(Array.from(homes.doorX)).toEqual([3, 10]);
    expect(Array.from(homes.doorY)).toEqual([4, 2]);
    expect(Array.from(homes.capacity)).toEqual([6, 24]);
    expect([homes.order.length, homes.room.length]).toEqual([2, 2]);
  });
});

describe('createStandInHomes', () => {
  it('puts the i-th door on open cell floor(i × open ÷ count), in homes of 6 beds', () => {
    const homes = createStandInHomes(roomGround(), 10);

    expect(homes.count).toBe(10);
    expect(Array.from(homes.doorX)).toEqual([4, 11, 6, 13, 8, 4, 11, 6, 13, 8]);
    expect(Array.from(homes.doorY)).toEqual([10, 10, 11, 11, 12, 13, 13, 14, 14, 15]);
    expect(Array.from(homes.capacity)).toEqual(new Array<number>(10).fill(6));
  });

  it('keeps every door on an open cell, even with more homes than cells', () => {
    const ground = roomGround();
    for (const count of [1, 2, 71, 72, 73, 500]) {
      const homes = createStandInHomes(ground, count);
      const cellOf = (i: number) => homes.doorY[i] * ground.width + homes.doorX[i];
      const shut = Array.from(homes.doorX.keys()).filter((i) => ground.walk[cellOf(i)] === 0);
      expect(shut, `${count} homes`).toEqual([]);
    }
  });

  it('places doors exactly when i × open passes 2^31', () => {
    const count = 33_334;
    const homes = createStandInHomes(standInGround(), count);

    const misplaced: number[] = [];
    for (let i = 0; i < count; i++) {
      const cell = Number((BigInt(i) * 65_536n) / BigInt(count));
      if (homes.doorY[i] * 256 + homes.doorX[i] !== cell) misplaced.push(i);
    }
    expect(misplaced).toEqual([]);
  });
});

describe('seatHouseholds', () => {
  it('seats keyed random mixes in full, none over capacity, in homes holding twice their people', () => {
    for (let trial = 0; trial < TRIALS; trial++) {
      const size = randomSizes(trial, 20 + 40 * trial);
      const homes = createStandInHomes(standInGround(), Math.ceil(peopleIn(size) / 3));
      const home = seat(size, homes, trial);

      expect(unseated(home, homes), `trial ${trial}`).toEqual([]);
      expect(overfull(size, home, homes), `trial ${trial}`).toEqual([]);
    }
  });

  it('matches the rule spelled out the slow way, in homes of 6 to 24 beds', () => {
    for (let trial = 0; trial < TRIALS; trial++) {
      const size = randomSizes(trial, 20 + 40 * trial);
      const homes = randomHomes(trial, Math.ceil(peopleIn(size) / 3));

      expect(seat(size, homes, trial), `trial ${trial}`).toEqual(seatSlowly(size, homes, trial));
    }
  });

  it('seats a small mix to fixed homes, the largest households first', () => {
    const homes = createHomes([site(4), site(6), site(4), site(2)]);
    const home = seat(Uint8Array.of(1, 4, 2, 3, 2, 1), homes, 9);

    expect(Array.from(homes.order)).toEqual([2, 1, 0, 3]);
    expect(Array.from(home)).toEqual([1, 2, 1, 1, 0, 0]);
  });

  it('never lets a small household block a large one', () => {
    const homes = createHomes([site(6), site(6)]);
    for (let key = 0; key < 10; key++) {
      const home = seat(Uint8Array.of(1, 1, 5, 5), homes, key);

      expect(home[2], `key ${key}`).not.toBe(home[3]);
      expect([home[0], home[1]], `key ${key}`).toEqual([home[2], home[3]]);
    }
  });

  it('seats the same way for the same key and differently for another', () => {
    const size = randomSizes(0, 200);
    const count = Math.ceil(peopleIn(size) / 3);
    const homes = createStandInHomes(standInGround(), count);

    const first = seat(size, homes, 7);
    const other = seat(size, homes, 8);
    expect(other).not.toEqual(first);
    expect(seat(size, homes, 7)).toEqual(first);
    expect(seat(size, createStandInHomes(standInGround(), count), 7)).toEqual(first);
  });

  it('seats only the first count households', () => {
    const homes = createStandInHomes(standInGround(), 10);
    const home = new Int32Array(8).fill(NO_HOME);

    seatHouseholds(Uint8Array.of(2, 3, 1, 1, 4, 4, 4, 4), 4, home, homes, SEED, 3);

    expect(unseated(home.subarray(0, 4), homes)).toEqual([]);
    expect(Array.from(home.subarray(4))).toEqual([NO_HOME, NO_HOME, NO_HOME, NO_HOME]);
  });

  it('throws a RangeError naming the size when no home has room', () => {
    const fours = createHomes([site(4), site(4), site(4)]);

    expect(() => seat(Uint8Array.of(5), fours, 1)).toThrow(RangeError);
    expect(() => seat(Uint8Array.of(5), fours, 1)).toThrow(/household of 5/);
    expect(() => seat(Uint8Array.of(4, 4, 4, 4), fours, 1)).toThrow(/household of 4/);
    expect(() => seat(Uint8Array.of(1, 6), createHomes([site(4), site(4)]), 1)).toThrow(/household of 6/);
    expect(() => seat(Uint8Array.of(1), createHomes([]), 1)).toThrow(/household of 1/);
    expect(() => seat(new Uint8Array(0), createHomes([]), 1)).not.toThrow();
  });
});
