import { SUPPLIERS } from '../agents/store.ts';
import { FOOD_TRADES, logPurchase } from '../economy/scratch.ts';
import { STAT_EATEN, STAT_SALES_CENTS, STAT_SOLD, STAT_SOLD_CENTS, STAT_UNMET } from '../economy/stats.ts';
import { takeFood } from '../goods/food.ts';
import { FOOD_LINKS, PORTIONS_PER_DAY } from '../goods/goods.ts';
import { firmAccount, transfer, walletAccount } from '../money/ledger.ts';
import { drawBelow3 } from '../random/draw.ts';
import { keyedShuffle } from '../random/shuffle.ts';
import { SHOP_DRAW } from '../random/streams.ts';
import { GOODS, type World } from '../world/world.ts';

// Purposes of the draws on SHOP_DRAW, after shop.ts's 6 and 7: the order of the day's eaters and a blob's order of shops.
export const FOOD_ORDER = 8;
export const FOOD_VISIT = 9;

// A9 for the foods: a start link and a step that reaches all 4 of them, which only 1 and 3 do, so 8 orders.
const FOOD_STEPS = 2;
const FOOD_VISIT_ORDERS = FOOD_LINKS * FOOD_STEPS;

// A7 and A10 for a portion: the shop is asked for what the eater can pay, and sells what its shelf holds, oldest first. A
// bit marks a shop that supplied less. Returns the portions bought.
function buyPortions(world: World, household: number, link: number, wanted: number, day: number): number {
  const { agents, firms, goods, cash, economyScratch } = world;
  const firm = agents.suppliers[household * SUPPLIERS + link];
  const price = firms.price[firm];
  const wallet = walletAccount(cash, household);
  const ask = Math.min(wanted, Math.floor(cash.balance[wallet] / price));
  if (ask < 1) return 0;
  firms.demand[firm] += ask;
  const portions = takeFood(firms, goods, firm, day, ask);
  if (portions < ask) agents.stockedOut[household] |= 1 << link;
  if (portions > 0) {
    const cents = portions * price;
    const stats = economyScratch.stats;
    transfer(cash, wallet, firmAccount(cash, firm), cents);
    stats[STAT_SALES_CENTS] += cents;
    stats[STAT_SOLD + goods.good[firm]] += portions;
    stats[STAT_SOLD_CENTS + goods.good[firm]] += cents;
    logPurchase(economyScratch, FOOD_TRADES, firm, portions, cents);
  }
  return portions;
}

// A blob wants its day's portions and visits its four food shops in a keyed order until it has them. Every portion it
// bought is eaten that day, and the rest is unmet, for M3's needs system: nothing else follows yet.
function eat(world: World, household: number, day: number): void {
  const visitOrder = drawBelow3(world.seed, SHOP_DRAW, day, household, FOOD_VISIT, FOOD_VISIT_ORDERS);
  const step = visitOrder < FOOD_LINKS ? 1 : FOOD_LINKS - 1;
  let link = visitOrder % FOOD_LINKS;
  let unmet = PORTIONS_PER_DAY;
  for (let visits = 0; visits < FOOD_LINKS && unmet > 0; visits++) {
    unmet -= buyPortions(world, household, link, unmet, day);
    link = (link + step) % FOOD_LINKS;
  }
  const stats = world.economyScratch.stats;
  stats[STAT_EATEN] += PORTIONS_PER_DAY - unmet;
  stats[STAT_UNMET] += unmet;
}

// Runs before shopDay each day, so food comes first (M2.4 Ruling 2). A world with goods off eats nothing.
export function buyFood(world: World, day: number): void {
  if (world.globals[GOODS] === 0) return;
  const households = world.agents.count[0];
  const order = world.economyScratch.order;
  keyedShuffle(order, households, world.seed, SHOP_DRAW, day, FOOD_ORDER);
  for (let turn = 0; turn < households; turn++) eat(world, order[turn], day);
}
