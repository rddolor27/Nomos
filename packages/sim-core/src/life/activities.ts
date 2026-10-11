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
import { clearRuns, halt, pathTicks, placeAtSpot, runCount, snapToTile, startRun } from '../street/motion.ts';
import { RUN_BYTES } from '../street/runs.ts';
import { settleNeeds } from './needs.ts';

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
// placeAtSpot reads only the low 24 bits of a draw, and a draw of 2^31 or more is a heap number in a tick (random/draw.ts).
const SPOT_VALUES = 1 << 24;
const FACINGS = 4;

// The last tick a choice made at `tick` may run to.
export function lifeEndTick(tick: number): number {
  return dayOf(tick) * TICKS_PER_DAY + LIFE_END_MINUTE;
}

// A blob with nothing planned, at its door or home: it waits indoors for the life system to choose, which comes in this same tick
// after walkStreets. Its row says it is due, so a tick that skipped the system would list it again.
export function parkFree(world: World, blob: number, tick: number): void {
  const { errands, life } = world;
  settleNeeds(life, errands, blob, tick);
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

function standAt(world: World, blob: number, tick: number, tileX: number, tileY: number): void {
  const spot = drawBelow3(world.seed, LIFE_DRAW, blob, tick, DRAW_SPOT, SPOT_VALUES);
  placeAtSpot(world, blob, tileX, tileY, spot);
  halt(world, blob, drawBelow3(world.seed, LIFE_DRAW, blob, tick, DRAW_FACING, FACINGS));
}

// Out on its own doorstep at a keyed point of the door's tile, for a keyed 30 to 120 ticks. Task 5 draws it sitting.
export function sitOnDoorstep(world: World, blob: number, tick: number, left: number): void {
  const { agents, errands } = world;
  standAt(world, blob, tick, tileOf(agents.x[blob]), tileOf(agents.y[blob]));
  errands.phase[blob] = PHASE_STAYING;
  errands.activity[blob] = ACTIVITY_DOORSTEP;
  errands.endTick[blob] = tick + stayTicks(world, blob, tick, left);
}

// How far from a site's door, in tiles across and up or down, its blobs choose to stand. Highcourt's plaza is 28 tiles wide and its
// blobs, spread over all of it, were seldom within reach of one another to chat (street/chat.ts), so they gather round the
// fountain, in front of which its door lies: 160 plaza chats over day 0 of ten seeds, where the whole plaza gave 98 (measured here).
export const CLUSTER_X = 6;
export const CLUSTER_Y = 5;

// A keyed tile of the part of the site's covered ground within CLUSTER_X and CLUSTER_Y of its door that its field reaches, the first
// from a keyed start that does, else its door: the plaza has a fountain in it and the greens may have trees, so not every tile is
// ground to stand on. The walk over the tiles steps a column and a row and divides once, exactly, since a division that leaves a
// remainder is a heap number in cold code.
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
  const tiles = across * rows;
  const first = drawBelow3(world.seed, LIFE_DRAW, blob, tick, DRAW_SPOT, tiles);
  const field = site * width * height;
  let column = first % across;
  let row = (first - column) / across;
  for (let n = 0; n < tiles; n++) {
    const cell = (top + row) * width + left + column;
    if (fields[field + cell] !== UNREACHED) return cell;
    column = (column + 1) % across;
    if (column === 0) row = (row + 1) % rows;
  }
  return doorY * width + doorX;
}

// Sets the blob off to a spot in the site with the leg from where it stands, and returns whether it can: a leg that is cut off,
// too winding for 32 runs, or already there is none, and one that cannot be walked out, stood in for the least stay and walked
// home before LIFE_END_MINUTE does not fit. The runs stay in its row for the walk home, backward.
export function startOuting(world: World, blob: number, tick: number, site: number, activity: number, sites: number): boolean {
  const { agents, errands, fields, ground } = world;
  const base = blob * RUN_BYTES;
  const from = tileOf(agents.y[blob]) * ground.width + tileOf(agents.x[blob]);
  const count = planLeg(
    fields,
    ground.width,
    ground.height,
    errands.siteX,
    errands.siteY,
    sites,
    from,
    spotCell(world, site, blob, tick),
    NO_HUB,
    errands.runs,
    base,
  );
  if (count <= 0) return false;
  const way = pathTicks(errands.runs, base, count);
  if (1 + 2 * way + MIN_STAY_TICKS > lifeEndTick(tick) - tick) {
    clearRuns(errands.runs, blob);
    return false;
  }
  errands.phase[blob] = PHASE_LEAVING;
  errands.activity[blob] = activity;
  errands.shop[blob] = site;
  errands.good[blob] = 0;
  errands.endTick[blob] = tick + 1;
  return true;
}

// The blob has walked its leg out and stands in the site, at a keyed point of the tile it reached, for a keyed 30 to 120 ticks,
// or whatever lets it walk home by LIFE_END_MINUTE.
export function startStaying(world: World, blob: number, tick: number): void {
  const { agents, errands, life } = world;
  settleNeeds(life, errands, blob, tick);
  standAt(world, blob, tick, tileOf(agents.x[blob]), tileOf(agents.y[blob]));
  errands.phase[blob] = PHASE_STAYING;
  life.crowd[errands.shop[blob]]++;
  const base = blob * RUN_BYTES;
  const home = pathTicks(errands.runs, base, runCount(errands.runs, base));
  errands.endTick[blob] = tick + stayTicks(world, blob, tick, lifeEndTick(tick) - tick - home);
}

// A stay has run out. A blob on its doorstep is free again, and one in a site sets off home along its leg, backward.
export function endStay(world: World, blob: number, tick: number): void {
  const { errands, life } = world;
  settleNeeds(life, errands, blob, tick);
  if (errands.activity[blob] === ACTIVITY_DOORSTEP) {
    parkFree(world, blob, tick);
    return;
  }
  life.crowd[errands.shop[blob]]--;
  snapToTile(world, blob);
  startRun(world, blob, tick, runCount(errands.runs, blob * RUN_BYTES) - 1, true);
  errands.phase[blob] = PHASE_COMING;
}
