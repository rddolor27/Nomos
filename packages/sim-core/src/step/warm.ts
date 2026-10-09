import { dayBoundary } from '../day/day.ts';
import { SPOILAGE_RULE, daySliceCount, runDaySlice } from '../day/slices.ts';
import { step } from './step.ts';
import { DAY_AGENTS, DAY_HOUSEHOLDS, layoutWorld, populate } from '../world/world.ts';

export const WARM_AGENTS = 1024;
export const WARM_MEMORY_BYTES = 1_048_576;
export const WARM_DAYS = 40;
export const WARM_TICKS = 2000;

// Day code runs once every 144 s at 1x, so the first real day would run cold; compiling it on a throwaway world first
// roughly halves that day's cost at 100k (R6 integration-cost §2). An empty world would have no slices to run.
export function warmUp(): void {
  const world = layoutWorld(0, 'phone', WARM_AGENTS, WARM_MEMORY_BYTES);
  populate(world);
  for (let day = 0; day < WARM_DAYS; day++) {
    dayBoundary(world);
    const slices = daySliceCount(world.globals[DAY_AGENTS], world.globals[DAY_HOUSEHOLDS], SPOILAGE_RULE, world.tier);
    for (let k = 0; k < slices; k++) runDaySlice(world, k);
  }
  for (let tick = 0; tick < WARM_TICKS; tick++) step(world);
}
