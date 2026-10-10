import type { EconomyParams } from '../economy/params.ts';
import type { World } from '../world/world.ts';

export function produce(world: World, params: EconomyParams): void {
  const firms = world.firms;
  const count = firms.count[0];
  for (let f = 0; f < count; f++) firms.stock[f] += params.unitsPerWorkerDay * firms.employees[f];
}
