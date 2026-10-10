import { SUPPLIERS } from '../agents/store.ts';
import type { EconomyParams } from '../economy/params.ts';
import { PPM, mulPpm } from '../money/ppm.ts';
import { draw3 } from '../random/draw.ts';
import { SHOP_DRAW } from '../random/streams.ts';
import type { World } from '../world/world.ts';

// Purposes of the draws on SHOP_DRAW, which shop.ts shares: 0 to 5 here, 6 and 7 there, so no two draws share a key.
export const PRICE_CHANCE = 0;
export const PRICE_LINK = 1;
export const PRICE_FIRM = 2;
export const STOCKOUT_CHANCE = 3;
export const STOCKOUT_LINK = 4;
export const STOCKOUT_FIRM = 5;

function chance(drawn: number, ppm: number): boolean {
  return drawn % PPM < ppm;
}

function fillWorkerPrefix(employees: Int32Array, prefix: Int32Array, firms: number): number {
  let workers = 0;
  for (let f = 0; f < firms; f++) {
    workers += employees[f];
    prefix[f] = workers;
  }
  return workers;
}

// A firm in proportion to its workers: the first row whose running sum passes the ticket. Uniform while nobody works.
function firmByWorkers(world: World, workers: number, drawn: number): number {
  const firms = world.firms.count[0];
  if (workers === 0) return drawn % firms;
  const prefix = world.economyScratch.firmPrefix;
  const ticket = drawn % workers;
  let low = 0;
  let high = firms - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (prefix[middle] > ticket) high = middle;
    else low = middle + 1;
  }
  return low;
}

function isLinked(suppliers: Int32Array, first: number, firm: number): boolean {
  for (let k = 0; k < SUPPLIERS; k++) if (suppliers[first + k] === firm) return true;
  return false;
}

function countSet(bits: number): number {
  let count = 0;
  for (let k = 0; k < SUPPLIERS; k++) count += (bits >> k) & 1;
  return count;
}

// The link of the nth set bit, counting from 0.
function nthSet(bits: number, n: number): number {
  let remaining = n;
  for (let k = 0; k < SUPPLIERS; k++) {
    if ((bits >> k) & 1) {
      if (remaining === 0) return k;
      remaining--;
    }
  }
  return -1;
}

// A11: compare one random link with a firm drawn by workers, and switch when the newcomer is cheaper by xi of the link's
// price, rounded down. A newcomer that is already a link is a miss, so a household never holds a firm twice.
function searchCheaper(world: World, params: EconomyParams, month: number, household: number, workers: number): void {
  const { seed, agents, firms } = world;
  const first = household * SUPPLIERS;
  const slot = first + (draw3(seed, SHOP_DRAW, month, household, PRICE_LINK) % SUPPLIERS);
  const newcomer = firmByWorkers(world, workers, draw3(seed, SHOP_DRAW, month, household, PRICE_FIRM));
  if (isLinked(agents.suppliers, first, newcomer)) return;
  const linkedPrice = firms.price[agents.suppliers[slot]];
  if (firms.price[newcomer] + mulPpm(linkedPrice, params.cheaperPpm) <= linkedPrice) agents.suppliers[slot] = newcomer;
}

// A12: replace one random stocked-out link with a firm drawn by workers, on the same no-duplicate rule as A11.
function searchStockedOut(world: World, month: number, household: number, workers: number): void {
  const { seed, agents } = world;
  const stockedOut = agents.stockedOut[household];
  if (stockedOut === 0) return;
  const first = household * SUPPLIERS;
  const pick = draw3(seed, SHOP_DRAW, month, household, STOCKOUT_LINK) % countSet(stockedOut);
  const newcomer = firmByWorkers(world, workers, draw3(seed, SHOP_DRAW, month, household, STOCKOUT_FIRM));
  if (!isLinked(agents.suppliers, first, newcomer)) agents.suppliers[first + nthSet(stockedOut, pick)] = newcomer;
}

export function searchShops(world: World, params: EconomyParams, month: number): void {
  const { seed, agents, firms, economyScratch } = world;
  const workers = fillWorkerPrefix(firms.employees, economyScratch.firmPrefix, firms.count[0]);
  const households = agents.count[0];
  for (let i = 0; i < households; i++) {
    if (chance(draw3(seed, SHOP_DRAW, month, i, PRICE_CHANCE), params.priceSearchPpm)) {
      searchCheaper(world, params, month, i, workers);
    }
    if (chance(draw3(seed, SHOP_DRAW, month, i, STOCKOUT_CHANCE), params.stockoutSearchPpm)) {
      searchStockedOut(world, month, i, workers);
    }
    agents.stockedOut[i] = 0;
  }
}
