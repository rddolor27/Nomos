import { take, type Arena } from '../memory/arena.ts';
import { MAX_PREMISES, MAX_SITES } from './fields.ts';
import { RUN_BYTES } from './runs.ts';
import { NO_SITE } from './shops.ts';

// What a trip is for when the timetable plans it. A row keeps it as the blob's activity, and the good it fetches tells a food trip
// from a goods trip.
export const PURPOSE_WORK = 0;
export const PURPOSE_FOOD = 1;
export const PURPOSE_GOODS = 2;

// Why a blob does what it does (M3.2 Ruling 3), where the phase says where and how it is. SLEEP is any time at home with nothing
// to do, asleep or waiting for the day to plan. A fetch is the trip to a premises for what the blob bought, there and home.
export const ACTIVITY_SLEEP = 0;
export const ACTIVITY_WORK = 1;
export const ACTIVITY_FETCH = 2;
export const ACTIVITY_EAT = 3;

// Where and how a blob is in its day. A blob is indoors at home in ASLEEP, and in LEAVING until the tick it sets out, with its
// trip's runs already in its row. It stands still until endTick at a post (WORKING indoors at the premises, KEEPING behind a
// stall's counter, BUYING at a door, EATING on its own doorstep), and walks from GOING on: out along the runs, or home along
// them backwards.
export const PHASE_ASLEEP = 0;
export const PHASE_LEAVING = 1;
export const PHASE_WORKING = 2;
export const PHASE_KEEPING = 3;
export const PHASE_BUYING = 4;
export const PHASE_EATING = 5;
export const PHASE_GOING = 6;
export const PHASE_COMING = 7;
export const FIRST_WALKING = PHASE_GOING;

// Indoors at home or at work, so not on the street to draw or to pick.
export function indoorsIn(phase: number): boolean {
  return phase <= PHASE_WORKING;
}

// The good a blob holds up: on its way home with it, and while it eats. The same icon whoever carries it. A worker walking home
// holds none.
export function carriedIn(phase: number, good: number): number {
  return phase === PHASE_COMING || phase === PHASE_EATING ? good : 0;
}

// One row a blob, in columns: the errand row is 73 bytes (its phase, activity, good, premises, run, end tick and 64 bytes of runs),
// with the two columns the economy day fills beside it. They sit at the arena's end, so no offset moved (M2.7 Ruling 5).
export interface Errands {
  readonly capacity: number;
  // The firm row + 1 of the first food firm, and of the first goods firm, a blob bought from today, or 0. buyFood and shopDay
  // write them in the economy window, and the trips read them, so a trip is the sale's visible consequence and money moves where
  // it always did (Ruling 2).
  readonly dayFood: Int32Array;
  readonly dayGoods: Int32Array;
  readonly phase: Uint8Array;
  // ACTIVITY_*: why the blob is where and as the phase has it.
  readonly activity: Uint8Array;
  // The good fetched or carried, or 0.
  readonly good: Uint8Array;
  // The trip's site: its index in the town's sites, a premises so far.
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
  // The town's sites, written when the streets open and outside the hash: the premises first, then the leisure sites, each with its
  // kind (SITE_*, 0 for an empty slot) and the tile its field floods from, which is a premises' door. These are the hubs that legs
  // run to (street/legs.ts). shopStall says which premises are stalls, and firmShop gives each firm row the premises + 1 it trades
  // from, or 0.
  readonly siteKind: Uint8Array;
  readonly siteX: Int32Array;
  readonly siteY: Int32Array;
  readonly shopStall: Uint8Array;
  readonly firmShop: Uint8Array;
  // Each blob's home door tile as y * width + x, written when the streets open, outside the hash. A blob away from home plans its
  // way back, and to a friend's home, from these (street/legs.ts).
  readonly homeCell: Int32Array;
  // Every byte of the store, to empty at a switch in one fill.
  readonly bytes: Uint8Array;
}

// How many sites the town's streets hold: the slots from 0 that have a kind.
export function sitesOf(errands: Errands): number {
  let sites = 0;
  while (sites < MAX_SITES && errands.siteKind[sites] !== NO_SITE) sites++;
  return sites;
}

export function createErrands(arena: Arena, agents: number, firms: number): Errands {
  const dayFood = take(arena, Int32Array, agents, false);
  const dayGoods = take(arena, Int32Array, agents, false);
  const phase = take(arena, Uint8Array, agents, false);
  const activity = take(arena, Uint8Array, agents, false);
  const good = take(arena, Uint8Array, agents, false);
  const shop = take(arena, Uint8Array, agents, false);
  const run = take(arena, Uint8Array, agents, false);
  const endTick = take(arena, Int32Array, agents, false);
  const runs = take(arena, Uint8Array, agents * RUN_BYTES, false);
  const keeper = take(arena, Int32Array, MAX_PREMISES, false);
  const hashed = arena.top - dayFood.byteOffset;
  const siteKind = take(arena, Uint8Array, MAX_SITES, false);
  const siteX = take(arena, Int32Array, MAX_SITES, false);
  const siteY = take(arena, Int32Array, MAX_SITES, false);
  const shopStall = take(arena, Uint8Array, MAX_PREMISES, false);
  const firmShop = take(arena, Uint8Array, firms, false);
  const homeCell = take(arena, Int32Array, agents, false);
  return {
    capacity: agents,
    dayFood,
    dayGoods,
    phase,
    activity,
    good,
    shop,
    run,
    endTick,
    runs,
    keeper,
    byteOffset: dayFood.byteOffset,
    byteLength: hashed,
    siteKind,
    siteX,
    siteY,
    shopStall,
    firmShop,
    homeCell,
    bytes: new Uint8Array(arena.memory.buffer, dayFood.byteOffset, arena.top - dayFood.byteOffset),
  };
}
