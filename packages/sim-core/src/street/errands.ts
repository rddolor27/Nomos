import { take, type Arena } from '../memory/arena.ts';
import { MAX_PREMISES } from './fields.ts';
import { RUN_BYTES } from './runs.ts';

// What a trip is for. A phase of a trip is its base plus the purpose.
export const PURPOSE_WORK = 0;
export const PURPOSE_FOOD = 1;
export const PURPOSE_GOODS = 2;

// Where a blob is in its day. A blob is indoors at home in ASLEEP, and in LEAVING until the tick it sets out, with its trip's
// runs already in its row. It stands still until endTick at a post (WORKING indoors at the premises, KEEPING behind a stall's
// counter, BUYING at a door, EATING on its own doorstep), and walks from GOING on: out along the runs, or home along them
// backwards.
export const PHASE_ASLEEP = 0;
export const PHASE_LEAVING = 1;
export const PHASE_WORKING = 4;
export const PHASE_KEEPING = 5;
export const PHASE_BUYING = 6;
export const PHASE_EATING = 7;
export const PHASE_GOING = 8;
export const PHASE_COMING = 11;
export const FIRST_WALKING = PHASE_GOING;

// Indoors at home or at work, so not on the street to draw or to pick.
export function indoorsIn(phase: number): boolean {
  return phase <= PHASE_WORKING;
}

// The good a blob holds up: on its way home with it, and while it eats. The same icon whoever carries it.
export function carriedIn(phase: number, good: number): number {
  const homeward = phase === PHASE_COMING + PURPOSE_FOOD || phase === PHASE_COMING + PURPOSE_GOODS;
  return homeward || phase === PHASE_EATING ? good : 0;
}

// One row a blob, in columns: the errand row is 72 bytes (its phase, good, premises, run, end tick and 64 bytes of runs), with
// the two columns the economy day fills beside it. They sit at the arena's end, so no offset moved (M2.7 Ruling 5).
export interface Errands {
  readonly capacity: number;
  // The firm row + 1 of the first food firm, and of the first goods firm, a blob bought from today, or 0. buyFood and shopDay
  // write them in the economy window, and the trips read them, so a trip is the sale's visible consequence and money moves where
  // it always did (Ruling 2).
  readonly dayFood: Int32Array;
  readonly dayGoods: Int32Array;
  readonly phase: Uint8Array;
  // The good fetched or carried, or 0.
  readonly good: Uint8Array;
  // The trip's premises: its index in the town's shops.
  readonly shop: Uint8Array;
  // The run being walked.
  readonly run: Uint8Array;
  // The tick the phase ends, absolute; while walking, the end of the run being walked.
  readonly endTick: Int32Array;
  // RUN_BYTES a blob, pathRuns' heading and length pairs from home to the premises.
  readonly runs: Uint8Array;
  // The blob + 1 that stands behind each stall's counter, or 0. A name left by a keeper who has gone home is stale and ignored.
  readonly keeper: Int32Array;
  // The hash's region, dayFood to keeper, which counts only while a town has streets.
  readonly byteOffset: number;
  readonly byteLength: number;
  // What the town's shops make of the firm rows, written when the streets open and outside the hash: each stall's door tile and
  // whether it is a stall, and for each firm row the premises + 1 it trades from, or 0.
  readonly shopDoorX: Int32Array;
  readonly shopDoorY: Int32Array;
  readonly shopStall: Uint8Array;
  readonly firmShop: Uint8Array;
  // Every byte of the store, to empty at a switch in one fill.
  readonly bytes: Uint8Array;
}

export function createErrands(arena: Arena, agents: number, firms: number): Errands {
  const dayFood = take(arena, Int32Array, agents, false);
  const dayGoods = take(arena, Int32Array, agents, false);
  const phase = take(arena, Uint8Array, agents, false);
  const good = take(arena, Uint8Array, agents, false);
  const shop = take(arena, Uint8Array, agents, false);
  const run = take(arena, Uint8Array, agents, false);
  const endTick = take(arena, Int32Array, agents, false);
  const runs = take(arena, Uint8Array, agents * RUN_BYTES, false);
  const keeper = take(arena, Int32Array, MAX_PREMISES, false);
  const hashed = arena.top - dayFood.byteOffset;
  const shopDoorX = take(arena, Int32Array, MAX_PREMISES, false);
  const shopDoorY = take(arena, Int32Array, MAX_PREMISES, false);
  const shopStall = take(arena, Uint8Array, MAX_PREMISES, false);
  const firmShop = take(arena, Uint8Array, firms, false);
  return {
    capacity: agents,
    dayFood,
    dayGoods,
    phase,
    good,
    shop,
    run,
    endTick,
    runs,
    keeper,
    byteOffset: dayFood.byteOffset,
    byteLength: hashed,
    shopDoorX,
    shopDoorY,
    shopStall,
    firmShop,
    bytes: new Uint8Array(arena.memory.buffer, dayFood.byteOffset, arena.top - dayFood.byteOffset),
  };
}
