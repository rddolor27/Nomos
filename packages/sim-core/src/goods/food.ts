import { STAT_SPOILED } from '../economy/stats.ts';
import type { FirmStore } from '../firms/store.ts';
import type { World } from '../world/world.ts';
import { DAYS_ON_SALE, isFood } from './goods.ts';
import { FOOD_RING, ringSlot, type GoodsStore } from './store.ts';

// A firm's food is dated by the day it was made (M2.4 Ruling 2). A batch made on day m enters slot m after that day's
// shopping, is on sale for the next L days, and spoils at the start of day m + L + 1. firms.stock stays the total of a
// row's slots, so each change here moves both.
export function addFood(firms: FirmStore, goods: GoodsStore, firm: number, day: number, portions: number): void {
  goods.ring[ringSlot(firm, day)] += portions;
  firms.stock[firm] += portions;
}

// Takes up to `portions`, the oldest batch first, and returns how many it took. A batch past its days is gone from its
// slot, so a scan from the oldest day on sale reaches every batch that is left.
export function takeFood(firms: FirmStore, goods: GoodsStore, firm: number, day: number, portions: number): number {
  const ring = goods.ring;
  let left = portions;
  for (let age = DAYS_ON_SALE[goods.good[firm]]; age >= 1 && left > 0; age--) {
    const slot = ringSlot(firm, day - age);
    const taken = Math.min(left, ring[slot]);
    ring[slot] -= taken;
    left -= taken;
  }
  firms.stock[firm] -= portions - left;
  return portions - left;
}

// The day's first system: the batch made L + 1 days ago has been on sale its L days, and what is left of it spoils. A
// spoiled portion counts toward the firm's waste, which food hiring reads, and toward the day's spoiled column.
export function spoilFood(world: World, day: number): void {
  const { firms, goods } = world;
  const stats = world.economyScratch.stats;
  const count = firms.count[0];
  for (let f = 0; f < count; f++) {
    const good = goods.good[f];
    if (!isFood(good)) continue;
    const slot = ringSlot(f, day - DAYS_ON_SALE[good] - 1);
    const spoiled = goods.ring[slot];
    if (spoiled === 0) continue;
    goods.ring[slot] = 0;
    firms.stock[f] -= spoiled;
    goods.wasted[f] += spoiled;
    stats[STAT_SPOILED + good] += spoiled;
  }
}

// A food firm that exits takes its whole shelf with it, and every batch spoils. It counts toward the day's spoiled
// column and not toward the firm's waste, since a firm that re-enters starts over.
export function spoilShelf(world: World, firm: number): void {
  const { firms, goods } = world;
  const first = ringSlot(firm, 0);
  let spoiled = 0;
  for (let slot = first; slot < first + FOOD_RING; slot++) {
    spoiled += goods.ring[slot];
    goods.ring[slot] = 0;
  }
  firms.stock[firm] -= spoiled;
  world.economyScratch.stats[STAT_SPOILED + goods.good[firm]] += spoiled;
}
