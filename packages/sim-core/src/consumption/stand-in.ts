import { festivalToday } from '@nomos/sim-culture';
import { CUSTOM_FESTIVAL, MAX_CULTURES, customOf } from '../agents/store.ts';
import type { World } from '../world/world.ts';

// Module-level, so a daily count allocates nothing.
const festiveToday = new Uint8Array(MAX_CULTURES);

// Consumption's stand-in until M2.6: the relabel test spends by it, and the step never calls it.
export function festivalShoppers(world: World, day: number): number {
  for (let c = 0; c < MAX_CULTURES; c++) festiveToday[c] = festivalToday(world.seed, world.cultureUid[c], day) ? 1 : 0;
  const { count, customs } = world.agents;
  let shoppers = 0;
  for (let i = 0; i < count[0]; i++) shoppers += festiveToday[customOf(customs[i], CUSTOM_FESTIVAL)];
  return shoppers;
}
