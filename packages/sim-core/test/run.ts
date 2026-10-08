import { step } from '../src/step.ts';
import { currentTick, type World } from '../src/world.ts';

export function run(world: World, toTick: number): World {
  while (currentTick(world) < toTick) step(world);
  return world;
}
