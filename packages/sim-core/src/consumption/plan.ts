import { SUPPLIERS } from '../agents/store.ts';
import type { EconomyParams } from '../economy/params.ts';
import { FOOD_LINKS, PORTIONS_PER_DAY } from '../goods/goods.ts';
import { exp2Floor, log2Q16Wide } from '../maths/log2.ts';
import { walletAccount } from '../money/ledger.ts';
import { mulPpm } from '../money/ppm.ts';
import { DAYS_PER_MONTH } from '../time/calendar.ts';
import { GOODS, type World } from '../world/world.ts';

// A month's food (M2.4 Ruling 2), which a goods world sets aside before it plans anything else.
const MONTH_PORTIONS = PORTIONS_PER_DAY * DAYS_PER_MONTH;

// A5: a household plans with the mean of the prices of the links from first up to end, rounded down.
function meanLinkPrice(suppliers: Int32Array, price: Float64Array, household: number, first: number, end: number): number {
  const row = household * SUPPLIERS;
  let sum = 0;
  for (let k = first; k < end; k++) sum += price[suppliers[row + k]];
  return Math.floor(sum / (end - first));
}

// floor(min((cash / price)^alpha, cash / price)) as 2^(alpha * log2(cash / price)). The log table's 8-bit mantissa lets it
// err by up to 0.35%; it replays exactly, so it stays. A cash that does not pass the price plans cash / price and keeps
// a zero balance out of log2Q16Wide.
function unitsToPlan(cashCents: number, priceCents: number, powerPpm: number): number {
  const affordable = Math.floor(cashCents / priceCents);
  if (cashCents <= priceCents) return affordable;
  const ratioQ16 = Math.max(0, log2Q16Wide(cashCents) - log2Q16Wide(priceCents));
  return Math.min(exp2Floor(mulPpm(ratioQ16, powerPpm)), affordable);
}

// With goods on, a month's portions at the food links' mean price come off the wallet first, and the goods are planned
// from the rest at the goods links' mean price, since a portion and a unit are not one price.
export function planConsumption(world: World, params: EconomyParams): void {
  const { agents, firms, cash } = world;
  const households = agents.count[0];
  const firstGoodsLink = world.globals[GOODS] === 1 ? FOOD_LINKS : 0;
  for (let i = 0; i < households; i++) {
    let budget = cash.balance[walletAccount(cash, i)];
    if (firstGoodsLink > 0) {
      const foodPrice = meanLinkPrice(agents.suppliers, firms.price, i, 0, FOOD_LINKS);
      budget = Math.max(0, budget - MONTH_PORTIONS * foodPrice);
    }
    const price = meanLinkPrice(agents.suppliers, firms.price, i, firstGoodsLink, SUPPLIERS);
    agents.plannedUnits[i] = unitsToPlan(budget, price, params.consumptionPowerPpm);
  }
}
