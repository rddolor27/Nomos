import { MAX_HOUSEHOLD } from '../households/store.ts';
import { floorDiv } from '../maths/int.ts';
import { keyedShuffle } from '../random/shuffle.ts';
import { SPAWN_DRAW } from '../random/streams.ts';
import { openCells, type Ground } from '../world/ground.ts';

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

// The largest households sit first, so a small one never takes the room a large one needs. Within a size, room only
// shrinks, so one cursor over the keyed order finds each household's first home with room.
function seatSize(s: number, size: Uint8Array, count: number, home: Int32Array, homes: Homes): void {
  const { order, room } = homes;
  let cursor = 0;
  for (let h = 0; h < count; h++) {
    if (size[h] !== s) continue;
    while (cursor < homes.count && room[order[cursor]] < s) cursor++;
    if (cursor === homes.count) throw new RangeError(`no home has room for a household of ${s}`);
    const chosen = order[cursor];
    home[h] = chosen;
    room[chosen] -= s;
  }
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
  keyedShuffle(homes.order, homes.count, seed, SPAWN_DRAW, key, HOME_ORDER);
  homes.room.set(homes.capacity);
  for (let s = MAX_HOUSEHOLD; s >= 1; s--) seatSize(s, size, count, home, homes);
}
