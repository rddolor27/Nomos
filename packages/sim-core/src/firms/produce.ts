import type { EconomyParams } from '../economy/params.ts';
import { STAT_MADE, STAT_PRODUCED } from '../economy/stats.ts';
import { addFood } from '../goods/food.ts';
import { isFood, outputPerWorkerDay } from '../goods/goods.ts';
import type { World } from '../world/world.ts';

// A day's output after its shopping: food enters the ring's slot for `day`, and any other good goes straight to stock. The
// made column counts every good, and produced the goods firms' units alone, as the schema says.
export function produce(world: World, params: EconomyParams, day: number): void {
  const { firms, goods } = world;
  const stats = world.economyScratch.stats;
  const count = firms.count[0];
  let made = 0;
  for (let f = 0; f < count; f++) {
    const good = goods.good[f];
    const units = outputPerWorkerDay(good, params.unitsPerWorkerDay) * firms.employees[f];
    if (isFood(good)) {
      addFood(firms, goods, f, day, units);
    } else {
      firms.stock[f] += units;
      made += units;
    }
    stats[STAT_MADE + good] += units;
  }
  stats[STAT_PRODUCED] += made;
}
