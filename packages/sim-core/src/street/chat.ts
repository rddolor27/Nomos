import { FACING_DOWN, FACING_LEFT, FACING_RIGHT, FACING_UP } from '../agents/actions.ts';
import { levelAt, relieveNeed, settleNeeds } from '../life/needs.ts';
import { NEED_COMPANY, TALLY_CHECKED, TALLY_LOOKED, TALLY_PAIRED } from '../life/store.ts';
import { CHAT_RELIEF_PER_TICK, LOOK_BASE, LOOK_STEP } from '../life/table.ts';
import { drawBelow3 } from '../random/draw.ts';
import { LIFE_DRAW } from '../random/streams.ts';
import { TICKS_PER_DAY, dayOf, minuteOf } from '../time/calendar.ts';
import { tileOf } from '../world/ground.ts';
import { TICK, type World } from '../world/world.ts';
import { ACTIVITY_DOORSTEP, PHASE_COMING, PHASE_STAYING, type Errands } from './errands.ts';
import { halt, pathTicks, runCount } from './motion.ts';
import { RUN_BYTES } from './runs.ts';
import { NIGHT_MINUTE, OPENING_MINUTE } from './timetable.ts';

// Chats (M3.2 Ruling 3): two free blobs who meet out of doors stop face to face under speech bubbles, and each is eased of some
// loneliness. Perception is R5's per-cell aggregate. The ground is cut into cells of 2 x 2 tiles, and a cell's mailbox holds the one
// blob that last looked there and found no one, stamped with the tick. Each tick the blobs with (i + tick) & 3 equal to 0, a quarter
// of them, may look. A looker that is free, out and lonelier than its sociability lets it be takes its cell's waiter if the waiter
// is near enough, which is the one exact check a look makes and so never more than MAX_NEIGHBOURS, and otherwise waits there.
//
// A chat moves both blobs' end ticks on by its length: a stay ends later, and a walker, stopped where it stands, arrives that much
// late (walk.ts sets it off again). It runs after the life system in the same tick.
export const MAX_NEIGHBOURS = 16;
export const CHAT_MIN_TICKS = 20;
export const CHAT_MAX_TICKS = 60;
// No chat starts from 21:00 on, a half hour before the life system's last choice ends.
export const CHAT_LAST_MINUTE = 1_260;

// The reach of a chat in Q8: 1.5 tiles.
const NEAR_Q8 = 6_144;
const NEAR_SQUARED = NEAR_Q8 * NEAR_Q8;
// A waiter stays in the mailbox this many ticks after it last looked: it looks again every 4 ticks while it is lonely, and stays
// open to a chat for half an hour after it stops. At 8 ticks Highcourt had 131 plaza chats over day 0 of ten seeds, and 160 at 32
// (measured here), where the plaza holds a handful of blobs and a newcomer seldom finds one still looking.
const WAIT_TICKS = 32;
const LOOK_EVERY = 4;
const LOOK_MASK = LOOK_EVERY - 1;
const CHAT_SPAN = CHAT_MAX_TICKS - CHAT_MIN_TICKS + 1;
// The purpose of the chat's length on LIFE_DRAW, after activities.ts's 0 to 3 and the opening moods' 4 and 5.
const DRAW_CHAT = 6;

// Out of doors and free: on its doorstep or in a site, or walking out to one or home from one. Work, shopping and meals are not
// free time, so a blob on one of those errands never stops for a chat.
function isFreeOut(errands: Errands, blob: number): boolean {
  return errands.phase[blob] >= PHASE_STAYING && errands.activity[blob] >= ACTIVITY_DOORSTEP;
}

function isLonely(world: World, blob: number, tick: number): boolean {
  const { errands, life } = world;
  return levelAt(life, errands, blob, NEED_COMPANY, tick) + life.sociable[blob] * LOOK_STEP > LOOK_BASE;
}

// The mailbox cell of the tile the blob is in, in rows of half the ground's width, rounded up.
function cellOf(world: World, blob: number): number {
  const { agents, ground } = world;
  return (tileOf(agents.y[blob]) >> 1) * ((ground.width + 1) >> 1) + (tileOf(agents.x[blob]) >> 1);
}

function isNear(world: World, a: number, b: number): boolean {
  const { x, y } = world.agents;
  const dx = x[a] - x[b];
  const dy = y[a] - y[b];
  return Math.abs(dx) <= NEAR_Q8 && Math.abs(dy) <= NEAR_Q8 && dx * dx + dy * dy <= NEAR_SQUARED;
}

// The tick the blob is home again if nothing delays it: where it stands, or the end of the run it is on, and the way home from there.
// A blob on its way out is counted as staying a single tick, the least startStaying leaves it, so a delay costs it its stay first.
function dueHome(errands: Errands, blob: number): number {
  const { runs } = errands;
  const base = blob * RUN_BYTES;
  const end = errands.endTick[blob];
  if (errands.activity[blob] === ACTIVITY_DOORSTEP) return end;
  const way = pathTicks(runs, base, runCount(runs, base));
  const phase = errands.phase[blob];
  if (phase === PHASE_STAYING) return end + way;
  if (phase === PHASE_COMING) return end + pathTicks(runs, base, errands.run[blob]);
  return end + way - pathTicks(runs, base, errands.run[blob] + 1) + 1 + way;
}

// How long the two can chat: a keyed length, cut to what leaves both home by 22:00. The life system ends every choice with its way
// home by 21:30, so a chat may use the half hour that leaves, and no more.
function chatLength(world: World, looker: number, waiter: number, tick: number): number {
  const { errands } = world;
  const wanted = CHAT_MIN_TICKS + drawBelow3(world.seed, LIFE_DRAW, looker, tick, DRAW_CHAT, CHAT_SPAN);
  const night = dayOf(tick) * TICKS_PER_DAY + NIGHT_MINUTE;
  return Math.min(wanted, night - Math.max(dueHome(errands, looker), dueHome(errands, waiter)));
}

// The facing that points `from` at `to` along the longer of the two ways between them.
function facingTowards(world: World, from: number, to: number): number {
  const { x, y } = world.agents;
  const dx = x[to] - x[from];
  const dy = y[to] - y[from];
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? FACING_RIGHT : FACING_LEFT;
  return dy < 0 ? FACING_UP : FACING_DOWN;
}

// One side of a chat that starts now. Its needs settle first, since its company eases in one lump (Ruling 1), and it stops facing
// the other. Its end tick, a stay's or the end of the run it is on, moves on by the length.
function pause(world: World, blob: number, other: number, tick: number, length: number): void {
  const { errands, life } = world;
  settleNeeds(life, errands, blob, tick);
  relieveNeed(life, blob, NEED_COMPANY, length * CHAT_RELIEF_PER_TICK);
  life.chatUntil[blob] = tick + length;
  life.chatWith[blob] = other + 1;
  errands.endTick[blob] += length;
  halt(world, blob, facingTowards(world, blob, other));
}

// Whether the looker and the waiter now chat: the waiter must be free, out, not already in a chat and near, and the evening must
// leave room for the least chat.
function tryChat(world: World, looker: number, waiter: number, tick: number): boolean {
  const { errands, life } = world;
  if (!isFreeOut(errands, waiter) || tick < life.chatUntil[waiter] || !isNear(world, looker, waiter)) return false;
  const length = chatLength(world, looker, waiter, tick);
  if (length < CHAT_MIN_TICKS) return false;
  pause(world, looker, waiter, tick, length);
  pause(world, waiter, looker, tick, length);
  life.tally[TALLY_PAIRED]++;
  return true;
}

function look(world: World, looker: number, tick: number): void {
  const { life } = world;
  const cell = cellOf(world, looker);
  const waiter = life.mailBlob[cell] - 1;
  if (waiter >= 0 && waiter !== looker && tick - life.mailTick[cell] < WAIT_TICKS) {
    // The cell's waiter is the one candidate a look checks.
    life.tally[TALLY_CHECKED] = 1;
    if (tryChat(world, looker, waiter, tick)) {
      life.mailBlob[cell] = 0;
      return;
    }
  }
  life.mailBlob[cell] = looker + 1;
  life.mailTick[cell] = tick;
}

// The chat system, run after the life system in a town with streets. It writes only the two blobs' rows, their needs, the mailbox and
// the tally, never money.
export function pairChats(world: World): void {
  const tick = world.globals[TICK];
  const { agents, errands, life } = world;
  life.tally.fill(0);
  const minute = minuteOf(tick);
  if (minute < OPENING_MINUTE || minute >= CHAT_LAST_MINUTE) return;
  const count = agents.count[0];
  for (let i = -tick & LOOK_MASK; i < count; i += LOOK_EVERY) {
    if (!isFreeOut(errands, i) || tick < life.chatUntil[i] || !isLonely(world, i, tick)) continue;
    life.tally[TALLY_LOOKED]++;
    look(world, i, tick);
  }
}
