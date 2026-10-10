import { TICKS_PER_DAY, dayOf } from '../time/calendar.ts';
import { dayBoundary } from '../day/day.ts';
import { CITY } from '../economy/city.ts';
import { ECONOMY_TICKS, runEconomySystem } from '../economy/economy.ts';
import { OK, checkInvariants, failInvariant } from '../money/invariants.ts';
import { SPOILAGE_RULE, daySliceCount, runDaySlice } from '../day/slices.ts';
import { move } from '../movement/wander.ts';
import { DAY_AGENTS, DAY_HOUSEHOLDS, DAY_LAYOFFS, TICK, TOWN, type World } from '../world/world.ts';

export interface SystemTimer {
  lap(system: number): void;
}

// A system's index here is the number step passes to SystemTimer.lap.
export const SYSTEM_NAMES: readonly string[] = ['day', 'move', 'economy'];
const DAY_SYSTEM = 0;
const MOVE_SYSTEM = 1;
const ECONOMY_SYSTEM = 2;

export function step(world: World, timer?: SystemTimer): void {
  runDayWork(world);
  timer?.lap(DAY_SYSTEM);
  move(world);
  timer?.lap(MOVE_SYSTEM);
  runEconomyTick(world);
  timer?.lap(ECONOMY_SYSTEM);
  world.globals[TICK] += 1;
  if (!world.checks) return;
  const code = checkInvariants(world.cash, world.claims);
  if (code !== OK) failInvariant(code);
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
