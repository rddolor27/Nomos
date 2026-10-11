import { SUPPLIERS } from '../agents/store.ts';
import type { EconomyParams } from '../economy/params.ts';
import { GOODS_TRADES, logPurchase } from '../economy/scratch.ts';
import { STAT_SALES_CENTS, STAT_SALES_UNITS, STAT_SOLD, STAT_SOLD_CENTS } from '../economy/stats.ts';
import { FOOD_LINKS } from '../goods/goods.ts';
import { floorDiv } from '../maths/int.ts';
import { firmAccount, transfer, walletAccount } from '../money/ledger.ts';
import { drawBelow3 } from '../random/draw.ts';
import { keyedShuffle } from '../random/shuffle.ts';
import { SHOP_DRAW } from '../random/streams.ts';
import { DAYS_PER_MONTH, dayOfMonth } from '../time/calendar.ts';
import { GOODS, type World } from '../world/world.ts';

// Purposes of the draws on SHOP_DRAW, after search.ts's 0 to 5. food.ts takes 8 and 9.
export const SHOP_ORDER = 6;
export const SHOP_VISIT = 7;

// A9's 42 visit orders: a start link, and a step of 1 to 6 that reaches all 7 links because 7 is prime.
const VISIT_ORDERS = SUPPLIERS * (SUPPLIERS - 1);

// A9: a shopper is done at 95% met, which is 20 * unmet <= wanted.
function ninetyFivePercentMet(unmet: number, wanted: number): boolean {
  return 20 * unmet <= wanted;
}

// A6: day j of the month buys floor((j + 1) * plan / 21) - floor(j * plan / 21), so no unit of the plan is lost.
function unitsOnDay(plan: number, dayInMonth: number): number {
  return floorDiv((dayInMonth + 1) * plan, DAYS_PER_MONTH) - floorDiv(dayInMonth * plan, DAYS_PER_MONTH);
}

// A7 and A10: the firm is asked for what the buyer can pay, whatever its stock, and a bit marks a firm that supplied less.
function buyFrom(world: World, household: number, link: number, unmet: number): number {
  const { agents, firms, goods, cash, economyScratch } = world;
  const firm = agents.suppliers[household * SUPPLIERS + link];
  const price = firms.price[firm];
  const wallet = walletAccount(cash, household);
  const ask = Math.min(unmet, Math.floor(cash.balance[wallet] / price));
  if (ask < 1) return 0;
  firms.demand[firm] += ask;
  const units = Math.min(ask, firms.stock[firm]);
  if (units < ask) agents.stockedOut[household] |= 1 << link;
  if (units > 0) {
    const cents = units * price;
    const stats = economyScratch.stats;
    firms.stock[firm] -= units;
    transfer(cash, wallet, firmAccount(cash, firm), cents);
    stats[STAT_SALES_UNITS] += units;
    stats[STAT_SALES_CENTS] += cents;
    stats[STAT_SOLD + goods.good[firm]] += units;
    stats[STAT_SOLD_CENTS + goods.good[firm]] += cents;
    logPurchase(economyScratch, GOODS_TRADES, firm, units, cents);
  }
  return units;
}

// firstLink is the first link shopDay visits: a goods world's foods are food.ts's, so it starts past them. A visit to a
// food link still takes its turn in the order, so the draws and the orders are the same as with goods off.
function shopFor(world: World, household: number, wanted: number, day: number, firstLink: number): void {
  const visitOrder = drawBelow3(world.seed, SHOP_DRAW, day, household, SHOP_VISIT, VISIT_ORDERS);
  const step = 1 + floorDiv(visitOrder, SUPPLIERS);
  let link = visitOrder % SUPPLIERS;
  let unmet = wanted;
  for (let visits = 0; visits < SUPPLIERS && !ninetyFivePercentMet(unmet, wanted); visits++) {
    if (link >= firstLink) unmet -= buyFrom(world, household, link, unmet);
    link = (link + step) % SUPPLIERS;
  }
}

// params stays in the signature so the economy day calls every system alike.
export function shopDay(world: World, params: EconomyParams, day: number): void {
  const households = world.agents.count[0];
  const order = world.economyScratch.order;
  const firstLink = world.globals[GOODS] === 1 ? FOOD_LINKS : 0;
  keyedShuffle(order, households, world.seed, SHOP_DRAW, day, SHOP_ORDER);
  const dayInMonth = dayOfMonth(day);
  for (let turn = 0; turn < households; turn++) {
    const household = order[turn];
    const wanted = unitsOnDay(world.agents.plannedUnits[household], dayInMonth);
    if (wanted > 0) shopFor(world, household, wanted, day, firstLink);
  }
}
