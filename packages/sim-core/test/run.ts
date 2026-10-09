import { step } from '../src/step/step.ts';
import { currentTick, type World } from '../src/world/world.ts';

export function run(world: World, toTick: number): World {
  while (currentTick(world) < toTick) step(world);
  return world;
}
