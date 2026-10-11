import { FACING_DOWN, FACING_UP } from '../agents/actions.ts';
import { isFood } from '../goods/goods.ts';
import { drawBelow3 } from '../random/draw.ts';
import { STREET_DRAW } from '../random/streams.ts';
import { TICKS_PER_DAY, dayOf, isRestDay } from '../time/calendar.ts';
import { tileOf } from '../world/ground.ts';
import type { World } from '../world/world.ts';
import {
  ACTIVITY_EAT,
  ACTIVITY_FETCH,
  ACTIVITY_SLEEP,
  ACTIVITY_WORK,
  PHASE_ASLEEP,
  PHASE_BUYING,
  PHASE_COMING,
  PHASE_EATING,
  PHASE_GOING,
  PHASE_KEEPING,
  PHASE_LEAVING,
  PHASE_WORKING,
  PURPOSE_FOOD,
  PURPOSE_GOODS,
  type Errands,
} from './errands.ts';
import { clearRuns, halt, pathTicks, placeAtCentre, placeAtSpot, runCount, snapToTile, startRun } from './motion.ts';
import { pathRuns, RUN_BYTES } from './runs.ts';

// The day of a town with streets, in minutes, which are ticks into the day. A blob plans its day in its sleep, sets out for
// work from 06:00 and leaves it from 15:00, and walks to the shop of whatever it bought this morning (M2.7 Ruling 3). The walks
// are longer than the plan guessed: a way averages 259 ticks at Highcourt and runs to 632, so the day makes room for what fits.
//   - Work: a worker whose way is no more than COMMUTE_MAX_TICKS goes on a workday, and any other stays home.
//   - One shopping trip a workday, a second on a rest day: food, then goods. The blob who commuted shops after work if the trip
//     is home by 22:00, which a long way rarely is, and one who did not leaves at a keyed minute of the morning, or in the
//     time its way leaves before night.
//   - Every trip is home by 22:00, since it starts only if it fits, so the streets are empty from then to 06:00.
// Every time is a keyed draw on STREET_DRAW, so no rule reads a look, culture or wallet.
export const OPENING_MINUTE = 360;
const NIGHT_MINUTE = 1_320;
const WAKE_MINUTE = 240;
const WAKE_SPREAD = 120;
const WORK_OUT_SPREAD = 60;
const WORK_IN_MINUTE = 900;
const WORK_IN_SPREAD = 60;
const FOOD_SPREAD = 240;
const GOODS_SPREAD = 240;
const COMMUTE_MAX_TICKS = 300;
export const BUY_TICKS = 10;
export const EAT_TICKS = 24;

// The purposes of the draws on STREET_DRAW, keyed (blob, day, purpose). A spot at a shop adds the trip's purpose.
const DRAW_WAKE = 0;
const DRAW_WORK_OUT = 1;
const DRAW_WORK_IN = 2;
const DRAW_FOOD_OUT = 3;
const DRAW_GOODS_OUT = 4;
const DRAW_SHOP_SPOT = 5;
const DRAW_HOME_SPOT = 8;

// By trip purpose: the ticks a trip spends at its shop and at home, the minutes after 06:00 its start is spread over, and the
// draw that spreads them.
const STAY_TICKS = Int32Array.of(0, BUY_TICKS + EAT_TICKS, BUY_TICKS);
const START_SPREAD = Int32Array.of(WORK_OUT_SPREAD, FOOD_SPREAD, GOODS_SPREAD);
const START_DRAW = Uint8Array.of(DRAW_WORK_OUT, DRAW_FOOD_OUT, DRAW_GOODS_OUT);
export const NO_START = -1;

function minuteDrawn(world: World, i: number, day: number, purpose: number, spread: number): number {
  return drawBelow3(world.seed, STREET_DRAW, i, day, purpose, spread);
}

// placeAtSpot reads only the low 24 bits of a draw, 12 for each axis, so the draw is reduced to them here: a whole draw of 2^31
// or more is a heap number in a tick (random/draw.ts). Reducing by 2^24 keeps those same low bits, so no hash moves.
const SPOT_VALUES = 1 << 24;

function spotDrawn(world: World, i: number, day: number, purpose: number): number {
  return drawBelow3(world.seed, STREET_DRAW, i, day, purpose, SPOT_VALUES);
}

// Asleep until a keyed minute of the planning window of `day`, with no trip in the row.
export function sleepUntil(world: World, i: number, day: number): void {
  const errands = world.errands;
  errands.phase[i] = PHASE_ASLEEP;
  errands.activity[i] = ACTIVITY_SLEEP;
  errands.good[i] = 0;
  errands.endTick[i] = day * TICKS_PER_DAY + WAKE_MINUTE + minuteDrawn(world, i, day, DRAW_WAKE, WAKE_SPREAD);
  clearRuns(errands.runs, i);
}

// Writes the way from the blob's home door to the premises into its row, and returns the ticks it takes one way, or -1 when
// there is none to walk: the home is cut off, the way needs over MAX_RUNS runs, or the premises is at the door.
function pathTo(world: World, i: number, shop: number): number {
  const { ground, errands, fields, agents } = world;
  const from = tileOf(agents.y[i]) * ground.width + tileOf(agents.x[i]);
  const base = i * RUN_BYTES;
  const count = pathRuns(fields, shop * ground.width * ground.height, ground.width, from, errands.runs, base);
  return count > 0 ? pathTicks(errands.runs, base, count) : -1;
}

function setOffAt(world: World, i: number, activity: number, shop: number, tick: number): void {
  const errands = world.errands;
  errands.phase[i] = PHASE_LEAVING;
  errands.activity[i] = activity;
  errands.shop[i] = shop;
  errands.endTick[i] = tick;
}

// A worker leaves for its employer's premises from 06:00 on a workday, when the way is short enough to arrive in the morning.
function planWork(world: World, i: number, day: number): boolean {
  const errands = world.errands;
  const firm = world.agents.employer[i];
  if (isRestDay(day) || firm < 0) return false;
  const shop = errands.firmShop[firm] - 1;
  if (shop < 0) return false;
  const ticks = pathTo(world, i, shop);
  if (ticks < 0 || ticks > COMMUTE_MAX_TICKS) {
    clearRuns(errands.runs, i);
    return false;
  }
  const out = day * TICKS_PER_DAY + OPENING_MINUTE + minuteDrawn(world, i, day, DRAW_WORK_OUT, WORK_OUT_SPREAD);
  errands.good[i] = 0;
  setOffAt(world, i, ACTIVITY_WORK, shop, out);
  return true;
}

// The tick a shopping trip sets out, or NO_START when it cannot be home by night. A keyed tick from the first moment it may
// leave, 06:00 or the tick after `tick`, over the trip's spread, or over what is left of the day when its length leaves less room
// than that. A draw clamped to the last moment would pile every long way's trip onto the same tick of the night. The blob can
// leave no sooner than the next tick, since walkStreets has passed it in this one: a start at `tick` would run a tick late, to 22:01.
export function startOf(world: World, i: number, tick: number, purpose: number, ticks: number): number {
  const day = dayOf(tick);
  const earliest = Math.max(tick + 1, day * TICKS_PER_DAY + OPENING_MINUTE);
  const latest = day * TICKS_PER_DAY + NIGHT_MINUTE - STAY_TICKS[purpose] - 2 * ticks;
  if (latest < earliest) return NO_START;
  return earliest + minuteDrawn(world, i, day, START_DRAW[purpose], Math.min(START_SPREAD[purpose], latest - earliest + 1));
}

// A trip to the shop of the first firm the blob bought food (or goods) from today, if it bought any, has a way and fits the day.
function planShopping(world: World, i: number, tick: number, purpose: number): boolean {
  const errands = world.errands;
  const bought = purpose === PURPOSE_FOOD ? errands.dayFood[i] : errands.dayGoods[i];
  const shop = bought === 0 ? -1 : errands.firmShop[bought - 1] - 1;
  if (shop < 0) return false;
  const ticks = pathTo(world, i, shop);
  const start = ticks < 0 ? NO_START : startOf(world, i, tick, purpose, ticks);
  if (start === NO_START) {
    clearRuns(errands.runs, i);
    return false;
  }
  errands.good[i] = world.goods.good[bought - 1];
  setOffAt(world, i, ACTIVITY_FETCH, shop, start);
  return true;
}

// The day's first plan, when a blob wakes in the small hours: work if it has a way to it, else the one shopping trip of a
// workday, else nothing.
function planDay(world: World, i: number, tick: number): void {
  const day = dayOf(tick);
  if (planWork(world, i, day) || planShopping(world, i, tick, PURPOSE_FOOD) || planShopping(world, i, tick, PURPOSE_GOODS)) return;
  sleepUntil(world, i, day + 1);
}

// Home from work: the day's one shopping trip, if it fits.
function afterWork(world: World, i: number, tick: number): void {
  if (!planShopping(world, i, tick, PURPOSE_FOOD)) sleepUntil(world, i, dayOf(tick) + 1);
}

// Home and fed: a rest day has a second trip for goods.
function afterFood(world: World, i: number, tick: number): void {
  const day = dayOf(tick);
  if (!isRestDay(day) || !planShopping(world, i, tick, PURPOSE_GOODS)) sleepUntil(world, i, day + 1);
}

function depart(world: World, i: number, tick: number): void {
  snapToTile(world, i);
  startRun(world, i, tick, 0, false);
  world.errands.phase[i] = PHASE_GOING;
}

// Whether no one stands behind the stall's counter: the name the stall holds is stale once its keeper has left.
function counterFree(errands: Errands, shop: number): boolean {
  const keeper = errands.keeper[shop] - 1;
  return keeper < 0 || errands.phase[keeper] !== PHASE_KEEPING || errands.shop[keeper] !== shop;
}

// Arrived at work: the first of a stall's workers to arrive stands behind its counter until the day's work is done, in the
// open (Ruling 7), and every other worker goes indoors.
function startWork(world: World, i: number, tick: number): void {
  const errands = world.errands;
  const shop = errands.shop[i];
  const day = dayOf(tick);
  errands.endTick[i] = Math.max(tick + 1, day * TICKS_PER_DAY + WORK_IN_MINUTE + minuteDrawn(world, i, day, DRAW_WORK_IN, WORK_IN_SPREAD));
  errands.phase[i] = PHASE_WORKING;
  halt(world, i, FACING_DOWN);
  if (errands.shopStall[shop] === 0 || !counterFree(errands, shop)) return;
  errands.keeper[shop] = i + 1;
  errands.phase[i] = PHASE_KEEPING;
  placeAtCentre(world, i, errands.siteX[shop], errands.siteY[shop] - 1);
}

// Arrived at the shop's door: the blob buys there at a keyed point of the door's tile, for BUY_TICKS.
function startBuying(world: World, i: number, tick: number): void {
  const errands = world.errands;
  const shop = errands.shop[i];
  const purpose = isFood(errands.good[i]) ? PURPOSE_FOOD : PURPOSE_GOODS;
  placeAtSpot(world, i, errands.siteX[shop], errands.siteY[shop], spotDrawn(world, i, dayOf(tick), DRAW_SHOP_SPOT + purpose));
  halt(world, i, FACING_UP);
  errands.phase[i] = PHASE_BUYING;
  errands.endTick[i] = tick + BUY_TICKS;
}

// Sets off home along the row's runs, last first, from the premises' door.
function startHome(world: World, i: number, tick: number): void {
  const errands = world.errands;
  const shop = errands.shop[i];
  placeAtCentre(world, i, errands.siteX[shop], errands.siteY[shop]);
  startRun(world, i, tick, runCount(errands.runs, i * RUN_BYTES) - 1, true);
  errands.phase[i] = PHASE_COMING;
}

// Home with food: it is eaten on the doorstep, at a keyed point of the home door's tile, for EAT_TICKS.
function startEating(world: World, i: number, tick: number): void {
  const { agents, errands } = world;
  placeAtSpot(world, i, tileOf(agents.x[i]), tileOf(agents.y[i]), spotDrawn(world, i, dayOf(tick), DRAW_HOME_SPOT));
  halt(world, i, FACING_DOWN);
  errands.phase[i] = PHASE_EATING;
  errands.activity[i] = ACTIVITY_EAT;
  errands.endTick[i] = tick + EAT_TICKS;
}

// Home from work, which shops once; or from a shop, with food to eat at the door, or with goods, which end the day's trips.
function arriveHome(world: World, i: number, tick: number): void {
  const errands = world.errands;
  halt(world, i, FACING_DOWN);
  if (errands.activity[i] === ACTIVITY_WORK) afterWork(world, i, tick);
  else if (isFood(errands.good[i])) startEating(world, i, tick);
  else sleepUntil(world, i, dayOf(tick) + 1);
}

// The last run is done: the blob is at the door it walked to, or at home.
export function arrive(world: World, i: number, tick: number): void {
  const errands = world.errands;
  if (errands.phase[i] === PHASE_COMING) arriveHome(world, i, tick);
  else if (errands.activity[i] === ACTIVITY_WORK) startWork(world, i, tick);
  else startBuying(world, i, tick);
}

// A blob whose phase has run out, at `tick`.
export function wake(world: World, i: number, tick: number): void {
  const errands = world.errands;
  const phase = errands.phase[i];
  if (phase === PHASE_ASLEEP) planDay(world, i, tick);
  else if (phase === PHASE_LEAVING) depart(world, i, tick);
  else if (phase <= PHASE_BUYING) startHome(world, i, tick);
  else {
    errands.good[i] = 0;
    afterFood(world, i, tick);
  }
}
