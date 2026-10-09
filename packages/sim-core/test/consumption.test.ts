import { festivalToday } from '@nomos/sim-culture';
import { describe, expect, it } from 'vitest';
import { festivalShoppers } from '../src/consumption/stand-in.ts';
import { CUSTOM_FESTIVAL, customOf } from '../src/agents/store.ts';
import { createWorld, type World } from '../src/world/world.ts';

function shoppersByHand(world: World, day: number): number {
  const { count, customs } = world.agents;
  let shoppers = 0;
  for (let i = 0; i < count[0]; i++) {
    const uid = world.cultureUid[customOf(customs[i], CUSTOM_FESTIVAL)];
    if (festivalToday(world.seed, uid, day)) shoppers++;
  }
  return shoppers;
}

describe('the consumption stand-in', () => {
  it('counts festival shoppers by uid', () => {
    const world = createWorld(42, 'phone');
    expect([...world.cultureUid]).toEqual([1, 2, 3, 4, 0, 0, 0, 0]);
    // Seed 42 holds no festival on day 3, and uids 1, 3 and 4 hold one on day 27 (tools/worldgen/rng.py).
    expect(festivalShoppers(world, 3)).toBe(shoppersByHand(world, 3));
    expect(festivalShoppers(world, 27)).toBe(shoppersByHand(world, 27));
    expect([festivalShoppers(world, 3), festivalShoppers(world, 27)]).toEqual([0, 7_460]);
  });
});
