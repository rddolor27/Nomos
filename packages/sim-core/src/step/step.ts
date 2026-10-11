import { TICKS_PER_DAY, dayOf } from '../time/calendar.ts';
import { dayBoundary } from '../day/day.ts';
import { CITY } from '../economy/city.ts';
import { ECONOMY_TICKS, runEconomySystem } from '../economy/economy.ts';
import { decideLives } from '../life/choose.ts';
import { OK, checkInvariants, failInvariant } from '../money/invariants.ts';
import { SPOILAGE_RULE, daySliceCount, runDaySlice } from '../day/slices.ts';
import { move } from '../movement/wander.ts';
import { pairChats } from '../street/chat.ts';
import { walkStreets } from '../street/walk.ts';
import { DAY_AGENTS, DAY_HOUSEHOLDS, DAY_LAYOFFS, STREETS, TICK, TOWN, type World } from '../world/world.ts';

export interface SystemTimer {
  lap(system: number): void;
}

// A system's index here is the number step passes to SystemTimer.lap. `life` chooses for the blobs `move` found free (M3.2), so
// it runs after the economy, and `chat` pairs the blobs who are out after that. A world without streets laps both too, having
// nobody for them.
export const SYSTEM_NAMES: readonly string[] = ['day', 'move', 'economy', 'life', 'chat'];
const DAY_SYSTEM = 0;
const MOVE_SYSTEM = 1;
const ECONOMY_SYSTEM = 2;
const LIFE_SYSTEM = 3;
const CHAT_SYSTEM = 4;

export function step(world: World, timer?: SystemTimer): void {
  runDayWork(world);
  timer?.lap(DAY_SYSTEM);
  if (world.globals[STREETS] === 1) walkStreets(world);
  else move(world);
  timer?.lap(MOVE_SYSTEM);
  runEconomyTick(world);
  timer?.lap(ECONOMY_SYSTEM);
  runLifeSystems(world, timer);
  world.globals[TICK] += 1;
  if (!world.checks) return;
  const code = checkInvariants(world.cash, world.claims);
  if (code !== OK) failInvariant(code);
}

// The blobs that came free choose, then the blobs out of doors pair up for chats. Only a town with streets has either.
function runLifeSystems(world: World, timer?: SystemTimer): void {
  const streets = world.globals[STREETS] === 1;
  if (streets) decideLives(world);
  timer?.lap(LIFE_SYSTEM);
  if (streets) pairChats(world);
  timer?.lap(CHAT_SYSTEM);
}

// The boundary when a day starts, then slice k on the day's tick k while the window is open.
function runDayWork(world: World): void {
  const globals = world.globals;
  const k = globals[TICK] % TICKS_PER_DAY;
  if (k === 0) dayBoundary(world);
  if (k < daySliceCount(globals[DAY_AGENTS], globals[DAY_HOUSEHOLDS], SPOILAGE_RULE, world.tier)) runDaySlice(world, k);
}

// A town's economy runs system k on the day's tick k, from the boundary on, one system a tick (M2.2b Ruling 2). The day's
// layoffs are the boundary's sum, which system 0 on the day's first tick spends and no later system reads.
function runEconomyTick(world: World): void {
  const globals = world.globals;
  if (globals[TOWN] === 0) return;
  const tick = globals[TICK];
  const system = tick % TICKS_PER_DAY;
  if (system < ECONOMY_TICKS) runEconomySystem(world, CITY, dayOf(tick), system, globals[DAY_LAYOFFS]);
}
