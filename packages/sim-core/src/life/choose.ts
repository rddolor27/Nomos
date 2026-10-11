import { drawBelow3 } from '../random/draw.ts';
import { LIFE_DRAW } from '../random/streams.ts';
import { TICKS_PER_DAY, dayOf } from '../time/calendar.ts';
import { tileOf } from '../world/ground.ts';
import { TICK, type World } from '../world/world.ts';
import { ACTIVITY_GREEN, ACTIVITY_PLAZA, sitesOf } from '../street/errands.ts';
import { UNREACHED } from '../street/fields.ts';
import { runTicks } from '../street/motion.ts';
import { SITE_GREEN, SITE_PLAZA } from '../street/shops.ts';
import { OPENING_MINUTE, sleepUntil } from '../street/timetable.ts';
import {
  DRAW_PICK,
  MIN_STAY_TICKS,
  lifeEndTick,
  sitOnDoorstep,
  startOuting,
  stayIn,
} from './activities.ts';
import { reliefOf } from './needs.ts';
import { NEEDS, REASON_NONE, type Life } from './store.ts';
import {
  COL_BASE,
  COL_CROWD_BASE,
  COL_CROWD_STEP,
  COL_FLOOR,
  COL_HOMEBODY,
  COL_RESTLESS,
  COL_SLOPE,
  COL_SOCIABLE,
  CROWD_CAP,
  DRIVE_SHIFT,
  MIN_ATTITUDE,
  MODE_DOORSTEP,
  MODE_GREEN,
  MODE_HOME,
  MODE_PLAZA,
  OPTION_COLS,
  OPTION_WEIGHTS,
} from './table.ts';
import { TRAIT_MEAN } from './traits.ts';

// The life system (M3.2 Ruling 2): each tick it chooses for the blobs walkStreets found free, in the order it listed them, which is
// blob order. A blob chooses only when its end tick comes, so a day holds a handful of choices a blob and a tick holds a few.
//
// The options are the four ways to spend free time, in the order of the rows of table.ts: staying in, the doorstep, the plaza and
// the nearest green. An option's score is a Q16 product of four ramps, and a zero vetoes it:
//   - the drive: the relief the option brings, which is what its mode takes off each need a tick times how urgent the blob finds
//     that need, urgency being the square of the level, so a need counts for little until it is high;
//   - the attitude: the option's liking, moved by the blob's three traits;
//   - the way: how much the walk puts it off, and nothing at all when it cannot be walked out, stood in and walked home by LIFE_END;
//   - the crowd: how many are at the site already, more being livelier, up to a cap.
// The pick is a keyed draw weighted by score among the three best. Everything is integer: no Math beyond abs, min and max.
const OPTIONS = 4;
const OPTION_DOORSTEP = 1;
const OPTION_PLAZA = 2;
const OPTION_GREEN = 3;
const TOP = 3;
const MAX_Q16 = 65_535;
const NO_OPTION_SITE = -1;
// The mode each option puts a blob in while it lasts, whose rates are the relief it brings.
const OPTION_MODE = Uint8Array.of(MODE_HOME, MODE_DOORSTEP, MODE_PLAZA, MODE_GREEN);

// Ticks to walk one tile along an axis. The Manhattan way in ticks puts a blob off a far site, and 4 ticks a tile along the longer
// axis alone is the fewest a walk can take, since a diagonal step covers a tile of each axis in 5.66 ticks.
const TILE_TICKS = runTicks(0, 1);

// Scratch for one choice, written before it is read: each option's score, its site and its Manhattan way in ticks, the blob's
// squared needs, and the three best options with their scores.
const score = new Int32Array(OPTIONS);
const siteOf = new Int32Array(OPTIONS).fill(NO_OPTION_SITE);
const wayOf = new Int32Array(OPTIONS);
const lowestOf = new Int32Array(OPTIONS);
const urgency = new Int32Array(NEEDS);
const bestOption = new Int32Array(TOP);
const bestScore = new Int32Array(TOP);

// a × b for two Q16 fractions, within int32: b halves first, so a product never reaches 2^31.
function mulQ16(a: number, b: number): number {
  return (a * (b >> 1)) >> 15;
}

function urgenciesOf(life: Life, blob: number): void {
  for (let need = 0; need < NEEDS; need++) {
    const level = life.needs[blob * NEEDS + need];
    urgency[need] = mulQ16(level, level);
  }
}

function driveOf(option: number, row: number): number {
  let relief = 0;
  for (let need = 0; need < NEEDS; need++) relief += reliefOf(OPTION_MODE[option], need) * urgency[need];
  return Math.min(MAX_Q16, OPTION_WEIGHTS[row + COL_FLOOR] + (relief >> DRIVE_SHIFT));
}

function attitudeOf(life: Life, blob: number, row: number): number {
  const lean =
    OPTION_WEIGHTS[row + COL_SOCIABLE] * (life.sociable[blob] - TRAIT_MEAN) +
    OPTION_WEIGHTS[row + COL_HOMEBODY] * (life.homebody[blob] - TRAIT_MEAN) +
    OPTION_WEIGHTS[row + COL_RESTLESS] * (life.restless[blob] - TRAIT_MEAN);
  return Math.min(MAX_Q16, Math.max(MIN_ATTITUDE, OPTION_WEIGHTS[row + COL_BASE] + (lean >> 7)));
}

function crowdOf(life: Life, option: number, row: number): number {
  const site = siteOf[option];
  if (site === NO_OPTION_SITE) return MAX_Q16;
  return Math.min(MAX_Q16, OPTION_WEIGHTS[row + COL_CROWD_BASE] + Math.min(life.crowd[site], CROWD_CAP) * OPTION_WEIGHTS[row + COL_CROWD_STEP]);
}

// How little the way puts the blob off, 0 when the site is none or cannot be had in the time left. The lowest way is the Chebyshev
// distance in ticks, the fewest a walk with diagonals can take.
function wayLeftOf(option: number, row: number, left: number): number {
  const site = siteOf[option];
  if (site === NO_OPTION_SITE) return option >= OPTION_PLAZA ? 0 : MAX_Q16;
  if (1 + 2 * lowestOf[option] + MIN_STAY_TICKS > left) return 0;
  return Math.max(0, MAX_Q16 - wayOf[option] * OPTION_WEIGHTS[row + COL_SLOPE]);
}

function scoreOption(life: Life, blob: number, option: number, left: number): number {
  const row = option * OPTION_COLS;
  const way = wayLeftOf(option, row, left);
  if (way === 0) return 0;
  const liked = mulQ16(driveOf(option, row), attitudeOf(life, blob, row));
  return mulQ16(mulQ16(liked, way), crowdOf(life, option, row));
}

// Records the nearest site of a kind that the blob's cell reaches, and the way to it, for the option that goes to a site of that kind.
function considerSite(world: World, site: number, option: number, fromX: number, fromY: number): void {
  const { errands, ground } = world;
  const dx = Math.abs(errands.siteX[site] - fromX);
  const dy = Math.abs(errands.siteY[site] - fromY);
  const way = TILE_TICKS * (dx + dy);
  const reached = world.fields[site * ground.width * ground.height + fromY * ground.width + fromX] !== UNREACHED;
  if (!reached || (siteOf[option] !== NO_OPTION_SITE && way >= wayOf[option])) return;
  siteOf[option] = site;
  wayOf[option] = way;
  lowestOf[option] = TILE_TICKS * Math.max(dx, dy);
}

function findSites(world: World, sites: number, fromX: number, fromY: number): void {
  const kind = world.errands.siteKind;
  siteOf[OPTION_PLAZA] = NO_OPTION_SITE;
  siteOf[OPTION_GREEN] = NO_OPTION_SITE;
  for (let site = 0; site < sites; site++) {
    if (kind[site] === SITE_PLAZA) considerSite(world, site, OPTION_PLAZA, fromX, fromY);
    else if (kind[site] === SITE_GREEN) considerSite(world, site, OPTION_GREEN, fromX, fromY);
  }
}

// Keeps the best TOP options by score, the lower option winning a tie, so the order of a pick never depends on anything but the scores.
function rankOptions(): void {
  bestScore.fill(0);
  for (let option = 0; option < OPTIONS; option++) {
    let at = TOP;
    while (at > 0 && score[option] > bestScore[at - 1]) at--;
    if (at === TOP) continue;
    for (let move = TOP - 1; move > at; move--) {
      bestScore[move] = bestScore[move - 1];
      bestOption[move] = bestOption[move - 1];
    }
    bestScore[at] = score[option];
    bestOption[at] = option;
  }
}

// A keyed draw among the best options, in proportion to their scores. The floor of staying in keeps the sum above 0.
function pickOption(world: World, blob: number, tick: number): number {
  let total = 0;
  for (let rank = 0; rank < TOP; rank++) total += bestScore[rank];
  let draw = drawBelow3(world.seed, LIFE_DRAW, blob, tick, DRAW_PICK, total);
  for (let rank = 0; rank < TOP - 1; rank++) {
    if (draw < bestScore[rank]) return bestOption[rank];
    draw -= bestScore[rank];
  }
  return bestOption[TOP - 1];
}

// The need that weighs most in the option's drive, plus one, or REASON_NONE when no need weighs anything.
function reasonOf(option: number): number {
  let reason = REASON_NONE;
  let most = 0;
  for (let need = 0; need < NEEDS; need++) {
    const weight = reliefOf(OPTION_MODE[option], need) * urgency[need];
    if (weight > most) {
      most = weight;
      reason = need + 1;
    }
  }
  return reason;
}

// Whether the blob is on its way to the site of an outing option. An outing with no way passes the turn: the blob stays in.
function setOffFor(world: World, blob: number, tick: number, option: number, sites: number): boolean {
  if (option === OPTION_PLAZA) return startOuting(world, blob, tick, siteOf[option], ACTIVITY_PLAZA, sites);
  if (option === OPTION_GREEN) return startOuting(world, blob, tick, siteOf[option], ACTIVITY_GREEN, sites);
  return false;
}

function begin(world: World, blob: number, tick: number, option: number, sites: number, left: number): void {
  world.life.reason[blob] = reasonOf(option);
  if (option === OPTION_DOORSTEP) sitOnDoorstep(world, blob, tick, left);
  else if (!setOffFor(world, blob, tick, option, sites)) stayIn(world, blob, tick, left);
}

function decide(world: World, blob: number, tick: number): void {
  const left = lifeEndTick(tick) - tick;
  if (left < MIN_STAY_TICKS) {
    sleepUntil(world, blob, dayOf(tick) + 1);
    return;
  }
  const opens = dayOf(tick) * TICKS_PER_DAY + OPENING_MINUTE;
  if (tick < opens) {
    world.errands.endTick[blob] = opens;
    return;
  }
  const { agents, errands, life } = world;
  const sites = sitesOf(errands);
  findSites(world, sites, tileOf(agents.x[blob]), tileOf(agents.y[blob]));
  urgenciesOf(life, blob);
  for (let option = 0; option < OPTIONS; option++) score[option] = scoreOption(life, blob, option, left);
  rankOptions();
  begin(world, blob, tick, pickOption(world, blob, tick), sites, left);
}

export function decideLives(world: World): void {
  const { life } = world;
  const tick = world.globals[TICK];
  const due = life.dueCount[0];
  for (let d = 0; d < due; d++) decide(world, life.due[d], tick);
}
