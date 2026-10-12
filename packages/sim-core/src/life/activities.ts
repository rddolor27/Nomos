import { drawBelow3 } from '../random/draw.ts';
import { LIFE_DRAW } from '../random/streams.ts';
import { TICKS_PER_DAY, dayOf } from '../time/calendar.ts';
import { tileOf } from '../world/ground.ts';
import type { World } from '../world/world.ts';
import {
  ACTIVITY_DOORSTEP,
  ACTIVITY_STAY,
  PHASE_ASLEEP,
  PHASE_COMING,
  PHASE_LEAVING,
  PHASE_STAYING,
} from '../street/errands.ts';
import { UNREACHED } from '../street/fields.ts';
import { NO_HUB, planLeg } from '../street/legs.ts';
import { clearRuns, halt, pathTicks, placeAtCentre, placeAtSpot, runCount, snapToTile, startRun } from '../street/motion.ts';
import { RUN_BYTES } from '../street/runs.ts';
import { settleNeeds } from './needs.ts';
import { NO_CELL, holdCell, leastHeldCell, releaseCell } from './seats.ts';
import { REASON_NONE, type Life } from './store.ts';

// How a blob spends its free time (M3.2 Ruling 3): the moves between a blob's states that the life system and the timetable make,
// each writing the blob's own row and the sites' crowd and nothing else. A choice always ends, with its way home, by LIFE_END_MINUTE,
// half an hour before the 22:00 every trip is home by, which leaves room for the chats of Task 4.
export const LIFE_END_MINUTE = 1_290;
export const MIN_STAY_TICKS = 30;
export const MAX_STAY_TICKS = 120;
const STAY_SPAN = MAX_STAY_TICKS - MIN_STAY_TICKS + 1;

// The purposes of the draws on LIFE_DRAW, keyed (blob, tick, purpose).
export const DRAW_PICK = 0;
const DRAW_STAY = 1;
const DRAW_SPOT = 2;
const DRAW_FACING = 3;
// After the opening moods' 4 and 5 (life/store.ts) and the chat's length, 6 (street/chat.ts).
const DRAW_SEAT = 7;
// The walk grid's value for a tile that cannot be walked on.
const WALK_BLOCKED = 0;
// placeAtSpot reads only the low 24 bits of a draw, and a draw of 2^31 or more is a heap number in a tick (random/draw.ts).
const SPOT_VALUES = 1 << 24;
const FACINGS = 4;

// The last tick a choice made at `tick` may run to.
export function lifeEndTick(tick: number): number {
  return dayOf(tick) * TICKS_PER_DAY + LIFE_END_MINUTE;
}

// A blob with nothing planned, at its door or home: it waits indoors for the life system to choose, which comes in this same tick
// after walkStreets. Its row says it is due, so a tick that skipped the system would list it again. Its reason is cleared, since the
// system leaves a blob that wakes before the streets open (decide) waiting with the evening's reason until it chooses at 06:00.
export function parkFree(world: World, blob: number, tick: number): void {
  const { errands, life } = world;
  settleNeeds(life, errands, blob, tick);
  life.reason[blob] = REASON_NONE;
  errands.phase[blob] = PHASE_ASLEEP;
  errands.activity[blob] = ACTIVITY_STAY;
  errands.good[blob] = 0;
  errands.endTick[blob] = tick;
  const listed = life.dueCount[0];
  life.due[listed] = blob;
  life.dueCount[0] = listed + 1;
}

function stayTicks(world: World, blob: number, tick: number, left: number): number {
  const wanted = MIN_STAY_TICKS + drawBelow3(world.seed, LIFE_DRAW, blob, tick, DRAW_STAY, STAY_SPAN);
  return Math.max(1, Math.min(wanted, left));
}

// Indoors at home for a keyed 30 to 120 ticks, or what is left before LIFE_END_MINUTE.
export function stayIn(world: World, blob: number, tick: number, left: number): void {
  world.errands.endTick[blob] = tick + stayTicks(world, blob, tick, left);
}

function centreInCell(world: World, blob: number, cell: number): void {
  const tileX = cell % world.ground.width;
  placeAtCentre(world, blob, tileX, (cell - tileX) / world.ground.width);
}

// Stands the blob in a cell of the ground facing a keyed way: at the cell's centre when it holds the cell alone, so that blobs on
// neighbouring tiles stand a tile apart, and at a keyed point of the tile when others hold it too, so that those who stack do not
// stand on one point.
function standInCell(world: World, blob: number, tick: number, cell: number): void {
  const tileX = cell % world.ground.width;
  const tileY = (cell - tileX) / world.ground.width;
  if (world.life.holds[cell] <= 1) placeAtCentre(world, blob, tileX, tileY);
  else placeAtSpot(world, blob, tileX, tileY, drawBelow3(world.seed, LIFE_DRAW, blob, tick, DRAW_SPOT, SPOT_VALUES));
  halt(world, blob, drawBelow3(world.seed, LIFE_DRAW, blob, tick, DRAW_FACING, FACINGS));
}

// How far from its door, in tiles each way, a house's front reaches: the door's tile and the ground round it that a blob can walk on.
// Blobs of one house sit on different tiles of it while there is one free, in a row along the wall. A wider reach would put a walled
// home's blobs on the far side of its walls, where nothing connects them to the door.
const FRONT_REACH = 1;

// The tile of the front of the blob's home with the fewest blobs holding it, the first free one from a keyed start, else the door's
// own: a house with one walkable tile seats all its household there, stacked.
function frontSeat(world: World, blob: number, tick: number): number {
  const { ground, errands, life } = world;
  const { width, height } = ground;
  const door = errands.homeCell[blob];
  const doorX = door % width;
  const doorY = (door - doorX) / width;
  const left = Math.max(0, doorX - FRONT_REACH);
  const top = Math.max(0, doorY - FRONT_REACH);
  const across = Math.min(width, doorX + FRONT_REACH + 1) - left;
  const rows = Math.min(height, doorY + FRONT_REACH + 1) - top;
  const first = drawBelow3(world.seed, LIFE_DRAW, blob, tick, DRAW_SEAT, across * rows);
  const seat = leastHeldCell(life.holds, ground.walk, 0, WALK_BLOCKED, width, left, top, across, rows, first);
  return seat === NO_CELL ? door : seat;
}

// Out on its own doorstep, on a tile of its home's front, for a keyed 30 to 120 ticks. The blob holds the tile until the stay ends.
export function sitOnDoorstep(world: World, blob: number, tick: number, left: number): void {
  const { errands, life } = world;
  const seat = frontSeat(world, blob, tick);
  holdCell(life, seat);
  life.seat[blob] = seat + 1;
  standInCell(world, blob, tick, seat);
  errands.phase[blob] = PHASE_STAYING;
  errands.activity[blob] = ACTIVITY_DOORSTEP;
  errands.endTick[blob] = tick + stayTicks(world, blob, tick, left);
}

// How far from a site's door, in tiles across and up or down, its blobs choose to stand. Highcourt's plaza is 28 tiles wide and its
// blobs, spread over all of it, were seldom within reach of one another to chat (street/chat.ts), so they gather round the
// fountain, in front of which its door lies: 160 plaza chats over day 0 of ten seeds, where the whole plaza gave 98 (measured here).
export const CLUSTER_X = 6;
export const CLUSTER_Y = 5;

// A tile of the part of the site's covered ground within CLUSTER_X and CLUSTER_Y of its door that its field reaches and no image
// hides, that the fewest blobs hold, the first free one from a keyed start (seats.ts), else its door: the plaza has a fountain in it
// and stalls whose awnings hide the row north of them, and the greens may have trees, so not every tile is ground to stand on.
function spotCell(world: World, site: number, blob: number, tick: number): number {
  const { fields, ground, life, errands } = world;
  const { width, height } = ground;
  const doorX = errands.siteX[site];
  const doorY = errands.siteY[site];
  const left = Math.max(life.areaX[site], doorX - CLUSTER_X);
  const top = Math.max(life.areaY[site], doorY - CLUSTER_Y);
  const across = Math.min(life.areaX[site] + life.areaW[site], doorX + CLUSTER_X + 1) - left;
  const rows = Math.min(life.areaY[site] + life.areaH[site], doorY + CLUSTER_Y + 1) - top;
  if (across < 1 || rows < 1) return doorY * width + doorX;
  const first = drawBelow3(world.seed, LIFE_DRAW, blob, tick, DRAW_SPOT, across * rows);
  const cell = leastHeldCell(life.holds, fields, site * width * height, UNREACHED, width, left, top, across, rows, first);
  return cell === NO_CELL ? doorY * width + doorX : cell;
}

// Sets the blob off to a spot in the site with the leg from where it stands, and returns whether it can: a leg that is cut off,
// too winding for 32 runs, or already there is none, and one that cannot be walked out, stood in for the least stay and walked
// home before LIFE_END_MINUTE does not fit. The runs stay in its row for the walk home, backward. The blob holds its spot from here
// to the end of the stay, so that no one else chooses it while a free tile is left.
export function startOuting(world: World, blob: number, tick: number, site: number, activity: number, sites: number): boolean {
  const { agents, errands, fields, ground, life } = world;
  const base = blob * RUN_BYTES;
  const from = tileOf(agents.y[blob]) * ground.width + tileOf(agents.x[blob]);
  const spot = spotCell(world, site, blob, tick);
  const count = planLeg(fields, ground.width, ground.height, errands.siteX, errands.siteY, sites, from, spot, NO_HUB, errands.runs, base);
  if (count <= 0) return false;
  const way = pathTicks(errands.runs, base, count);
  if (1 + 2 * way + MIN_STAY_TICKS > lifeEndTick(tick) - tick) {
    clearRuns(errands.runs, blob);
    return false;
  }
  holdCell(life, spot);
  life.seat[blob] = spot + 1;
  errands.phase[blob] = PHASE_LEAVING;
  errands.activity[blob] = activity;
  errands.shop[blob] = site;
  errands.good[blob] = 0;
  errands.endTick[blob] = tick + 1;
  return true;
}

// The blob has walked its leg out and stands in the site, in the tile it reached, for a keyed 30 to 120 ticks, or whatever lets it
// walk home by LIFE_END_MINUTE.
export function startStaying(world: World, blob: number, tick: number): void {
  const { agents, errands, life, ground } = world;
  settleNeeds(life, errands, blob, tick);
  standInCell(world, blob, tick, tileOf(agents.y[blob]) * ground.width + tileOf(agents.x[blob]));
  errands.phase[blob] = PHASE_STAYING;
  life.crowd[errands.shop[blob]]++;
  const base = blob * RUN_BYTES;
  const home = pathTicks(errands.runs, base, runCount(errands.runs, base));
  errands.endTick[blob] = tick + stayTicks(world, blob, tick, lifeEndTick(tick) - tick - home);
}

// Gives up the cell the blob held and returns it, or NO_CELL for a blob that held none.
function giveUpSeat(life: Life, blob: number): number {
  const cell = life.seat[blob] - 1;
  if (cell === NO_CELL) return NO_CELL;
  releaseCell(life, cell);
  life.seat[blob] = 0;
  return cell;
}

// A stay has run out. A blob on its doorstep goes back to its door, being free again there, and one in a site sets off home along
// its leg, backward, from the spot it held. A chat may have moved either off its tile.
export function endStay(world: World, blob: number, tick: number): void {
  const { errands, life } = world;
  settleNeeds(life, errands, blob, tick);
  const seat = giveUpSeat(life, blob);
  if (errands.activity[blob] === ACTIVITY_DOORSTEP) {
    if (seat !== NO_CELL) centreInCell(world, blob, errands.homeCell[blob]);
    parkFree(world, blob, tick);
    return;
  }
  life.crowd[errands.shop[blob]]--;
  if (seat === NO_CELL) snapToTile(world, blob);
  else centreInCell(world, blob, seat);
  startRun(world, blob, tick, runCount(errands.runs, blob * RUN_BYTES) - 1, true);
  errands.phase[blob] = PHASE_COMING;
}
