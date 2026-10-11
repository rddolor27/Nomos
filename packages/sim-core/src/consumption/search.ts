import { SUPPLIERS } from '../agents/store.ts';
import type { EconomyParams } from '../economy/params.ts';
import { goodOfLink } from '../goods/goods.ts';
import { PPM, mulPpm } from '../money/ppm.ts';
import { drawBelow3 } from '../random/draw.ts';
import { SHOP_DRAW } from '../random/streams.ts';
import { GOODS, type World } from '../world/world.ts';

// Purposes of the draws on SHOP_DRAW, which shop.ts and food.ts share: 0 to 5 here, 6 and 7 there, 8 and 9 in food.ts, so
// no two draws share a key.
export const PRICE_CHANCE = 0;
export const PRICE_LINK = 1;
export const PRICE_FIRM = 2;
export const STOCKOUT_CHANCE = 3;
export const STOCKOUT_LINK = 4;
export const STOCKOUT_FIRM = 5;

function chance(seed: number, month: number, household: number, purpose: number, ppm: number): boolean {
  return drawBelow3(seed, SHOP_DRAW, month, household, purpose, PPM) < ppm;
}

function fillWorkerPrefix(employees: Int32Array, prefix: Int32Array, firms: number): void {
  let workers = 0;
  for (let f = 0; f < firms; f++) {
    workers += employees[f];
    prefix[f] = workers;
  }
}

// The rows a link may be replaced from: a goods world's link k only takes a firm of good k + 1, whose rows run together;
// with goods off every row is open.
function firstRowOfLink(world: World, link: number): number {
  return world.globals[GOODS] === 1 ? world.goods.firstRow[goodOfLink(link)] : 0;
}

function endRowOfLink(world: World, link: number): number {
  if (world.globals[GOODS] === 0) return world.firms.count[0];
  const good = goodOfLink(link);
  return world.goods.firstRow[good] + world.goods.rowCount[good];
}

// A firm of the link's rows in proportion to its workers: the first row whose running sum passes the ticket, which is the
// household's draw for this purpose below the rows' workers. Uniform over the rows while nobody works.
function firmByWorkers(world: World, link: number, month: number, household: number, purpose: number): number {
  const low = firstRowOfLink(world, link);
  const end = endRowOfLink(world, link);
  const prefix = world.economyScratch.firmPrefix;
  const before = low > 0 ? prefix[low - 1] : 0;
  const workers = prefix[end - 1] - before;
  if (workers === 0) return low + drawBelow3(world.seed, SHOP_DRAW, month, household, purpose, end - low);
  const ticket = before + drawBelow3(world.seed, SHOP_DRAW, month, household, purpose, workers);
  let first = low;
  let last = end - 1;
  while (first < last) {
    const middle = (first + last) >> 1;
    if (prefix[middle] > ticket) last = middle;
    else first = middle + 1;
  }
  return first;
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
// price, rounded down. A newcomer that is already a link is a miss, so a household never holds a firm twice. A switch
// clears the link's stock-out bit, which was the old firm's, so A12 cannot replace the firm just found.
function searchCheaper(world: World, params: EconomyParams, month: number, household: number): void {
  const { seed, agents, firms } = world;
  const first = household * SUPPLIERS;
  const link = drawBelow3(seed, SHOP_DRAW, month, household, PRICE_LINK, SUPPLIERS);
  const newcomer = firmByWorkers(world, link, month, household, PRICE_FIRM);
  if (isLinked(agents.suppliers, first, newcomer)) return;
  const linkedPrice = firms.price[agents.suppliers[first + link]];
  if (firms.price[newcomer] + mulPpm(linkedPrice, params.cheaperPpm) <= linkedPrice) {
    agents.suppliers[first + link] = newcomer;
    agents.stockedOut[household] &= ~(1 << link);
  }
}

// A12: replace one random stocked-out link with a firm drawn by workers, on the same no-duplicate rule as A11.
function searchStockedOut(world: World, month: number, household: number): void {
  const { seed, agents } = world;
  const stockedOut = agents.stockedOut[household];
  if (stockedOut === 0) return;
  const first = household * SUPPLIERS;
  const pick = drawBelow3(seed, SHOP_DRAW, month, household, STOCKOUT_LINK, countSet(stockedOut));
  const link = nthSet(stockedOut, pick);
  const newcomer = firmByWorkers(world, link, month, household, STOCKOUT_FIRM);
  if (!isLinked(agents.suppliers, first, newcomer)) agents.suppliers[first + link] = newcomer;
}

export function searchShops(world: World, params: EconomyParams, month: number): void {
  const { seed, agents, firms, economyScratch } = world;
  fillWorkerPrefix(firms.employees, economyScratch.firmPrefix, firms.count[0]);
  const households = agents.count[0];
  for (let i = 0; i < households; i++) {
    if (chance(seed, month, i, PRICE_CHANCE, params.priceSearchPpm)) {
      searchCheaper(world, params, month, i);
    }
    if (chance(seed, month, i, STOCKOUT_CHANCE, params.stockoutSearchPpm)) {
      searchStockedOut(world, month, i);
    }
    agents.stockedOut[i] = 0;
  }
}
