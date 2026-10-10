import type { EconomyParams } from '../economy/params.ts';
import { STAT_PRODUCED } from '../economy/stats.ts';
import type { World } from '../world/world.ts';

export function produce(world: World, params: EconomyParams): void {
  const firms = world.firms;
  const count = firms.count[0];
  let made = 0;
  for (let f = 0; f < count; f++) {
    const units = params.unitsPerWorkerDay * firms.employees[f];
    firms.stock[f] += units;
    made += units;
  }
  world.economyScratch.stats[STAT_PRODUCED] += made;
}
