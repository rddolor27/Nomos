import { dayBoundary } from '../day/day.ts';
import { SPOILAGE_RULE, daySliceCount, runDaySlice } from '../day/slices.ts';
import { CITY } from '../economy/city.ts';
import { economyDay } from '../economy/economy.ts';
import { spawnTown } from '../spawn/town.ts';
import { step } from './step.ts';
import { DAY_AGENTS, DAY_HOUSEHOLDS, layoutWorld } from '../world/world.ts';

export const WARM_AGENTS = 1024;
export const WARM_MEMORY_BYTES = 1_048_576;
export const WARM_DAYS = 40;
export const WARM_TICKS = 2000;

// Day code runs once every 144 s at 1x, so the first real day would run cold; compiling it on a throwaway world first
// roughly halves that day's cost at 100k (R6 integration-cost §2). An empty world would have no slices to run. The world
// is a town, so the economy's days compile too: 40 of them cover a month's start and end.
export function warmUp(): void {
  const world = layoutWorld(0, 'phone', WARM_AGENTS, WARM_MEMORY_BYTES);
  spawnTown(world, WARM_AGENTS);
  // Production workers skip the ledger check, so the warm-up compiles the step without it, and its cost stays flat as
  // wallets grow.
  world.checks = false;
  for (let day = 0; day < WARM_DAYS; day++) {
    dayBoundary(world);
    const slices = daySliceCount(world.globals[DAY_AGENTS], world.globals[DAY_HOUSEHOLDS], SPOILAGE_RULE, world.tier);
    for (let k = 0; k < slices; k++) runDaySlice(world, k);
    economyDay(world, CITY, day);
  }
  for (let tick = 0; tick < WARM_TICKS; tick++) step(world);
}
