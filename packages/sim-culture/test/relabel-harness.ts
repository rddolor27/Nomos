import {
  TICKS_PER_DAY,
  WARM_AGENTS,
  WARM_MEMORY_BYTES,
  layoutWorld,
  populate,
  stateHashExcept,
  step,
  type World,
} from '@nomos/sim-core';
import { cultureViews, relabelCultures } from '../src/index.ts';

export type Daily = (world: World, day: number) => void;

// M0.3's warm-up world, small enough that a simulated year runs on every push. Each day's first tick runs its
// boundary, then daily, then the rest of the day, and the day's closing non-culture hash is kept.
export function relabelRun(seed: number, perm: Uint8Array | null, days: number, daily?: Daily): number[] {
  const world = layoutWorld(seed, 'phone', WARM_AGENTS, WARM_MEMORY_BYTES);
  populate(world);
  if (perm !== null) relabelCultures(world, perm);
  const skip = cultureViews(world);
  const hashes: number[] = [];
  for (let day = 0; day < days; day++) {
    step(world);
    daily?.(world, day);
    for (let tick = 1; tick < TICKS_PER_DAY; tick++) step(world);
    hashes.push(stateHashExcept(world, skip));
  }
  return hashes;
}
