import { stepAwayTowns } from '../spawn/away.ts';
import type { Homes } from '../spawn/homes.ts';
import { homesSeat, switchTown } from '../spawn/switch.ts';
import { dayOf, dayOfMonth, dayOfYear, monthOf, yearOf } from '../time/calendar.ts';
import type { Ground } from '../world/ground.ts';
import { INPUT_CAPACITY, INPUT_FOCUS, INPUT_LAYOFFS } from '../world/inputs.ts';
import { openDayWindow } from './slices.ts';
import { rekeyStride } from './stride.ts';
import { DAY_LAYOFFS, FOCUS_PENDING, MAX_TOWNS, NO_PLACE, TICK, TOWN, type World } from '../world/world.ts';

const LOGGED = 0;
const APPLIED = 1;
// The log's a column and the DAY_LAYOFFS slot are Int32Arrays, which wrap past this.
const MAX_INT32 = 0x7fff_ffff;

export function logInput(world: World, kind: number, a: number, b: number): boolean {
  const log = world.inputs;
  const n = log.cursor[LOGGED];
  if (n >= INPUT_CAPACITY) return false;
  log.tick[n] = world.globals[TICK];
  log.kind[n] = kind;
  log.a[n] = a;
  log.b[n] = b;
  log.cursor[LOGGED] = n + 1;
  return true;
}

export function logFocus(world: World, settlement: number): boolean {
  return logInput(world, INPUT_FOCUS, settlement, 0);
}

// Asks a town to enter `place`, on `ground` and in `homes`, at the next day boundary, where switchTown spawns it (M2.2c
// Ruling 2). It logs the focus input and keeps the town it names in one call, so a checkpoint never falls between them, and
// a later request of the same day replaces an earlier one. It returns false, and changes nothing, when the world is not a
// town, the place has no row in the ledger table, the homes cannot seat the town (homesSeat: fewer beds than a household has
// suppliers, or than the people the place's row holds), or the log is full. A request for the live town switches nothing. It
// sits here beside logFocus because the boundary below calls switchTown, so spawn/switch.ts may not import this file.
export function requestTown(world: World, place: number, ground: Ground, homes: Homes): boolean {
  if (world.globals[TOWN] !== 1 || !Number.isInteger(place) || place < 0 || place >= MAX_TOWNS) return false;
  if (!homesSeat(world, place, homes) || !logFocus(world, place)) return false;
  attachTown(world, place, ground, homes);
  return true;
}

// Keeps the ground and homes the next boundary spawns `place` on, and marks the place pending in the arena. requestTown does
// both with its log entry. A world restored from a checkpoint holds the pending place (focus[FOCUS_PENDING]) and the log
// entry but not the ground and homes, so whoever restores it attaches them before the boundary, which throws without them.
// It trusts its caller's place, which requestTown has checked.
export function attachTown(world: World, place: number, ground: Ground, homes: Homes): void {
  const request = world.request;
  request.place = place;
  request.ground = ground;
  request.homes = homes;
  world.focus[FOCUS_PENDING] = place;
}

// A count under 1 would cancel other layoffs in the boundary's sum, and one past the largest int32 would wrap into one.
export function logLayoffs(world: World, people: number): boolean {
  if (people < 1 || people > MAX_INT32) return false;
  return logInput(world, INPUT_LAYOFFS, people, 0);
}

// Inputs wait here so that every replay applies them at the same tick, in log order (R4 architecture §3.3). A focus lands
// before the window opens, so the day's slices run over the town it chose.
export function dayBoundary(world: World): void {
  const log = world.inputs;
  const logged = log.cursor[LOGGED];
  let layoffs = 0;
  let focused = false;
  let focus = NO_PLACE;
  for (let n = log.cursor[APPLIED]; n < logged; n++) {
    const kind = log.kind[n];
    if (kind === INPUT_FOCUS) {
      focused = true;
      focus = log.a[n];
    } else if (kind === INPUT_LAYOFFS) layoffs = Math.min(layoffs + log.a[n], MAX_INT32);
  }
  log.cursor[APPLIED] = logged;
  world.globals[DAY_LAYOFFS] = layoffs;
  const day = dayOf(world.globals[TICK]);
  if (focused) applyFocus(world, focus);
  advanceAwayTowns(world, day);
  if (dayOfYear(day) === 0) rekeyStride(world.stride, world.seed, yearOf(day));
  openDayWindow(world);
}

// In a town the last focus logged since the boundary is a switch to that place, and in a world that is not a town it sets
// the watched settlement.
function applyFocus(world: World, place: number): void {
  if (world.globals[TOWN] === 1) switchTown(world, place);
  else world.focus[0] = place;
}

// A month's first day steps every away town once (M2.2c Ruling 8), after any switch, so the town just left is stepped and
// the one just entered is not. Steps are numbered from month 1, as a first visit's catch-up is.
function advanceAwayTowns(world: World, day: number): void {
  if (world.globals[TOWN] !== 1 || day === 0 || dayOfMonth(day) !== 0) return;
  stepAwayTowns(world.townRecords, world.focus[0], world.seed, monthOf(day), world.recordRow);
}
