import { TICKS_PER_DAY } from './calendar.ts';
import { dayBoundary } from './day.ts';
import { OK, checkInvariants, failInvariant } from './invariants.ts';
import { move } from './wander.ts';
import { TICK, type World } from './world.ts';

export interface SystemTimer {
  lap(system: number): void;
}

// A system's index here is the number step passes to SystemTimer.lap.
export const SYSTEM_NAMES: readonly string[] = ['day', 'move'];
const DAY_SYSTEM = 0;
const MOVE_SYSTEM = 1;

export function step(world: World, timer?: SystemTimer): void {
  if (world.globals[TICK] % TICKS_PER_DAY === 0) dayBoundary(world);
  timer?.lap(DAY_SYSTEM);
  move(world);
  timer?.lap(MOVE_SYSTEM);
  world.globals[TICK] += 1;
  if (!world.checks) return;
  const code = checkInvariants(world.cash, world.claims);
  if (code !== OK) failInvariant(code);
}
