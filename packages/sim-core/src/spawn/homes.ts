import { MAX_HOUSEHOLD } from '../households/store.ts';
import { floorDiv } from '../maths/int.ts';
import { keyedShuffle } from '../random/shuffle.ts';
import { SPAWN_DRAW } from '../random/streams.ts';
import { openCells, type Ground } from '../world/ground.ts';
import { LEDGER_HOUSEHOLDS, populationOf } from './record.ts';

// Purpose 0 on SPAWN_DRAW; spawn's own purposes start at 1.
export const HOME_ORDER = 0;
const STAND_IN_BEDS = 6;

// A MapV1 home entity fits, so sim-core never imports sim-protocol. The caller passes only home entities.
export interface HomeSite {
  readonly doorX: number;
  readonly doorY: number;
  readonly capacity: number;
}

// Doors are in tiles. Like the Ground, homes are an input and stay out of the arena; order and room are
// seatHouseholds' working arrays.
export interface Homes {
  readonly count: number;
  readonly doorX: Int32Array;
  readonly doorY: Int32Array;
  readonly capacity: Int32Array;
  readonly order: Int32Array;
  readonly room: Int32Array;
}

function createHomeColumns(count: number): Homes {
  return {
    count,
    doorX: new Int32Array(count),
    doorY: new Int32Array(count),
    capacity: new Int32Array(count),
    order: new Int32Array(count),
    room: new Int32Array(count),
  };
}

export function createHomes(sites: readonly HomeSite[]): Homes {
  const homes = createHomeColumns(sites.length);
  for (let i = 0; i < sites.length; i++) {
    homes.doorX[i] = sites[i].doorX;
    homes.doorY[i] = sites[i].doorY;
    homes.capacity[i] = sites[i].capacity;
  }
  return homes;
}

// For the CLI's ground, tests and the bench: count homes of 6 beds, spread evenly over the ground's open cells.
// floorDiv stays exact past its 2^31 note, since i × open stays far below 2^53.
export function createStandInHomes(ground: Ground, count: number): Homes {
  const homes = createHomeColumns(count);
  const cells = openCells(ground);
  for (let i = 0; i < count; i++) {
    const cell = cells[floorDiv(i * cells.length, count)];
    homes.doorX[i] = cell % ground.width;
    homes.doorY[i] = floorDiv(cell, ground.width);
    homes.capacity[i] = STAND_IN_BEDS;
  }
  return homes;
}

// The stand-in homes of a town of exactly `people`, one blob to a bed: homes of 6 beds, and the last one takes what is left.
export function createStandInTownHomes(ground: Ground, people: number): Homes {
  const homes = createStandInHomes(ground, floorDiv(people + STAND_IN_BEDS - 1, STAND_IN_BEDS));
  homes.capacity[homes.count - 1] -= homes.count * STAND_IN_BEDS - people;
  return homes;
}

export function bedCount(homes: Homes): number {
  let beds = 0;
  for (let i = 0; i < homes.count; i++) beds += homes.capacity[i];
  return beds;
}

export function largestHome(homes: Homes): number {
  let largest = 0;
  for (let i = 0; i < homes.count; i++) largest = Math.max(largest, homes.capacity[i]);
  return largest;
}

// The first position in the keyed order, from `from` on, whose home has room for s people, or homes.count if none has.
function firstWithRoom(s: number, from: number, homes: Homes): number {
  const { order, room } = homes;
  let cursor = from;
  while (cursor < homes.count && room[order[cursor]] < s) cursor++;
  return cursor;
}

// The largest households sit first, so a small one never takes the room a large one needs. Within a size, room only
// shrinks, so one cursor over the keyed order finds each household's first home with room.
function seatSize(s: number, size: Uint8Array, count: number, home: Int32Array, homes: Homes): void {
  const { order, room } = homes;
  let cursor = 0;
  for (let h = 0; h < count; h++) {
    if (size[h] !== s) continue;
    cursor = firstWithRoom(s, cursor, homes);
    if (cursor === homes.count) throw new RangeError(`no home has room for a household of ${s}`);
    const chosen = order[cursor];
    home[h] = chosen;
    room[chosen] -= s;
  }
}

function readyHomes(homes: Homes, seed: number, key: number): void {
  keyedShuffle(homes.order, homes.count, seed, SPAWN_DRAW, key, HOME_ORDER);
  homes.room.set(homes.capacity);
}

// key is the place and day, draw2(seed, SPAWN_DRAW, settlement, day): one place on one day seats the same way.
export function seatHouseholds(
  size: Uint8Array,
  count: number,
  home: Int32Array,
  homes: Homes,
  seed: number,
  key: number,
): void {
  readyHomes(homes, seed, key);
  for (let s = MAX_HOUSEHOLD; s >= 1; s--) seatSize(s, size, count, home, homes);
}

// How many of `wanted` households of s people the room left takes, placed as seatSize places them.
function takeRoom(s: number, wanted: number, homes: Homes): number {
  const { order, room } = homes;
  let cursor = 0;
  let taken = 0;
  while (taken < wanted) {
    cursor = firstWithRoom(s, cursor, homes);
    if (cursor === homes.count) break;
    room[order[cursor]] -= s;
    taken++;
  }
  return taken;
}

// Trims a record's households of 2 to 6 people to those the homes seat under this key, largest first, and turns the rest into
// one-person households, so its people stay as they were. A village of huts and a few farmhouses has no room for the mix's
// households of 5 and 6, which seatHouseholds would throw on; a record that fits is left as it is. The key must be the one
// spawnFromLedger seats under, since the order of the homes decides what fits.
export function fitHouseholds(record: Float64Array, homes: Homes, seed: number, key: number): void {
  const people = populationOf(record);
  readyHomes(homes, seed, key);
  let seated = 0;
  for (let s = MAX_HOUSEHOLD; s >= 2; s--) {
    const fitting = takeRoom(s, record[LEDGER_HOUSEHOLDS + s - 1], homes);
    record[LEDGER_HOUSEHOLDS + s - 1] = fitting;
    seated += s * fitting;
  }
  record[LEDGER_HOUSEHOLDS] = people - seated;
}
