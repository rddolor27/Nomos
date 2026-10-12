import { take, type Arena } from '../memory/arena.ts';
import { drawBelow3 } from '../random/draw.ts';
import { LIFE_DRAW } from '../random/streams.ts';
import type { Ground } from '../world/ground.ts';
import { MAX_FIELD_CELLS, MAX_SITES } from '../street/fields.ts';
import type { Shops } from '../street/shops.ts';

// What a blob wants (M3.2 Ruling 1), each a level from 0, met, to 65,535, laid out a blob at a time in `Life.needs`.
export const NEEDS = 4;
export const NEED_HUNGER = 0;
export const NEED_REST = 1;
export const NEED_FUN = 2;
export const NEED_COMPANY = 3;

// The reason a blob does what its life system chose: the need that most drove it, plus one, or 0 when none did.
export const REASON_NONE = 0;

// A cell of the chat mailbox is 2 x 2 tiles. buildFields refuses a ground of over 256 tiles a side or MAX_FIELD_CELLS, so no town
// with streets has more cells than this: the most is 5,002, on 81 x 243 tiles (computed over every allowed size).
export const MAIL_CELLS = (MAX_FIELD_CELLS >> 2) + 129;

// What the chat system did in the last tick it ran, for the card and the tests: the blobs that looked, the most candidates any one
// look checked, and the pairs made.
export const TALLY_LOOKED = 0;
export const TALLY_CHECKED = 1;
export const TALLY_PAIRED = 2;
const TALLIES = 3;

// A cell of `Life.holds` that a site's image hides, where no one may stand, set when the streets open. Any other value counts the
// blobs that hold the cell as their spot, and a count never reaches this one (seats.ts).
export const CELL_HIDDEN = 255;

// One row a blob of what the life system keeps (M3.2 Ruling 5), in columns at the arena's end, so no offset moved. The hash
// mixes the first group in beside the errand store, only while a town has streets. Personality is drawn once at birth from the
// blob's id (life/traits.ts) and no sim rule reads a look, a culture or a wallet to make it.
export interface Life {
  readonly capacity: number;
  // NEEDS levels a blob, at i * NEEDS + NEED_*.
  readonly needs: Uint16Array;
  // The tick the needs last settled, absolute.
  readonly settleTick: Int32Array;
  readonly sociable: Uint8Array;
  readonly homebody: Uint8Array;
  readonly restless: Uint8Array;
  // REASON_NONE, or the need + 1 that drove the blob's free-time choice.
  readonly reason: Uint8Array;
  // The blobs standing at each site now, plaza and greens only.
  readonly crowd: Int32Array;
  // The chat a blob is in or was last in (M3.2 Ruling 3): the absolute tick it ends, and its partner + 1. A blob is in a chat while the
  // tick is under chatUntil; both keep the last chat after it ends, so nothing has to clear them.
  readonly chatUntil: Int32Array;
  readonly chatWith: Int32Array;
  // The cell the blob holds as its seat on its doorstep or its spot in a site (life/seats.ts), plus one, or 0 for none: from the
  // tick it chooses it to the end of the stay.
  readonly seat: Int32Array;
  // The chat mailbox (street/chat.ts): for each 2 x 2 tile cell of the ground the blob + 1 that last looked there and found no one,
  // or 0, and the tick it looked.
  readonly mailBlob: Int32Array;
  readonly mailTick: Int32Array;
  // A byte for each cell of the ground, y * width + x: CELL_HIDDEN where a site's image hides the ground, else the blobs that hold
  // the cell as a spot (M3.2 polish).
  readonly holds: Uint8Array;
  // The hash's region, needs to the holds.
  readonly byteOffset: number;
  readonly byteLength: number;
  // The ground each site covers in tiles, written when the streets open and outside the hash: the spots blobs stand on.
  readonly areaX: Int32Array;
  readonly areaY: Int32Array;
  readonly areaW: Int32Array;
  readonly areaH: Int32Array;
  // The blobs that walkStreets found free this tick, for the life system to choose for. It is empty between ticks and outside the
  // hash: a blob's own row says it is due, so a checkpoint needs no list.
  readonly due: Int32Array;
  readonly dueCount: Int32Array;
  // TALLY_*, rewritten by every pass of the chat system and outside the hash.
  readonly tally: Int32Array;
  // Every byte of the store, to empty at a switch in one fill.
  readonly bytes: Uint8Array;
}

export function createLife(arena: Arena, agents: number): Life {
  const needs = take(arena, Uint16Array, agents * NEEDS, false);
  const settleTick = take(arena, Int32Array, agents, false);
  const sociable = take(arena, Uint8Array, agents, false);
  const homebody = take(arena, Uint8Array, agents, false);
  const restless = take(arena, Uint8Array, agents, false);
  const reason = take(arena, Uint8Array, agents, false);
  const crowd = take(arena, Int32Array, MAX_SITES, false);
  const chatUntil = take(arena, Int32Array, agents, false);
  const chatWith = take(arena, Int32Array, agents, false);
  const seat = take(arena, Int32Array, agents, false);
  const mailBlob = take(arena, Int32Array, MAIL_CELLS, false);
  const mailTick = take(arena, Int32Array, MAIL_CELLS, false);
  const holds = take(arena, Uint8Array, MAX_FIELD_CELLS, false);
  const hashed = arena.top - needs.byteOffset;
  const areaX = take(arena, Int32Array, MAX_SITES, false);
  const areaY = take(arena, Int32Array, MAX_SITES, false);
  const areaW = take(arena, Int32Array, MAX_SITES, false);
  const areaH = take(arena, Int32Array, MAX_SITES, false);
  const due = take(arena, Int32Array, agents, false);
  const dueCount = take(arena, Int32Array, 1, false);
  const tally = take(arena, Int32Array, TALLIES, false);
  return {
    capacity: agents,
    needs,
    settleTick,
    sociable,
    homebody,
    restless,
    reason,
    crowd,
    chatUntil,
    chatWith,
    seat,
    mailBlob,
    mailTick,
    holds,
    byteOffset: needs.byteOffset,
    byteLength: hashed,
    areaX,
    areaY,
    areaW,
    areaH,
    due,
    dueCount,
    tally,
    bytes: new Uint8Array(arena.memory.buffer, needs.byteOffset, arena.top - needs.byteOffset),
  };
}

// A town opens with its blobs part way through their moods, so its first day is a day like any other: fun and company start at a keyed
// level between an eighth and five eighths of the range, hunger and rest at 0. The purposes follow activities.ts's 0 to 3 on LIFE_DRAW.
const START_FUN = 4;
const START_COMPANY = 5;
const START_FLOOR = 8_192;
const START_SPAN = 32_768;

// Marks the cells of the ground that site `site`'s image hides, clipped to the ground.
function hideSiteGround(life: Life, shops: Shops, ground: Ground, site: number): void {
  const left = Math.max(0, shops.hiddenX[site]);
  const top = Math.max(0, shops.hiddenY[site]);
  const right = Math.min(ground.width, shops.hiddenX[site] + shops.hiddenW[site]);
  const bottom = Math.min(ground.height, shops.hiddenY[site] + shops.hiddenH[site]);
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) life.holds[y * ground.width + x] = CELL_HIDDEN;
  }
}

// Gives the live town's blobs a life: each site's covered and hidden ground, a settle tick of now so the first settling counts from
// the tick the streets opened and not from tick 0, and the starting moods. Traits are as spawn left them.
export function openLife(life: Life, shops: Shops, ground: Ground, blobs: number, tick: number, seed: number): void {
  for (let s = 0; s < shops.count; s++) {
    life.areaX[s] = shops.areaX[s];
    life.areaY[s] = shops.areaY[s];
    life.areaW[s] = shops.areaW[s];
    life.areaH[s] = shops.areaH[s];
    hideSiteGround(life, shops, ground, s);
  }
  life.settleTick.fill(tick, 0, blobs);
  for (let blob = 0; blob < blobs; blob++) {
    life.needs[blob * NEEDS + NEED_FUN] = START_FLOOR + drawBelow3(seed, LIFE_DRAW, blob, tick, START_FUN, START_SPAN);
    life.needs[blob * NEEDS + NEED_COMPANY] = START_FLOOR + drawBelow3(seed, LIFE_DRAW, blob, tick, START_COMPANY, START_SPAN);
  }
}
