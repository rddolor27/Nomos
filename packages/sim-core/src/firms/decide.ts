import type { EconomyParams } from '../economy/params.ts';
import { STAT_PRICE_CHANGES, STAT_PRICE_CHANGE_PPM } from '../economy/stats.ts';
import { PPM, mulPpm, mulPpmUp } from '../money/ppm.ts';
import { draw3 } from '../random/draw.ts';
import { FIRM_DRAW } from '../random/streams.ts';
import { DAYS_PER_MONTH } from '../time/calendar.ts';
import type { World } from '../world/world.ts';

// Purposes in FIRM_DRAW's keys (month, firm, purpose). The chance and the size of a step are drawn apart, so changing the
// chance never reshuffles the sizes.
const PRICE_CHANCE = 0;
const PRICE_STEP = 1;

export function decideFirms(world: World, params: EconomyParams, month: number): void {
  const firms = world.firms;
  const count = firms.count[0];
  for (let f = 0; f < count; f++) {
    const demand = Math.max(firms.lastDemand[f], params.demandFloor);
    const low = mulPpmUp(demand, params.stockLowPpm);
    const high = mulPpmUp(demand, params.stockHighPpm);
    firms.vacancy[f] = firms.stock[f] < low ? 1 : 0;
    firms.notice[f] = firms.stock[f] > high && firms.employees[f] > 0 ? 1 : 0;
    repriceFirm(world, params, month, f, low, high);
  }
}

// Short of stock under the band's top a firm may raise its price, and long on stock over the band's bottom it may cut it.
// The cost floor then holds whatever the stock did, since a wage rise can lift it past a price that sat still.
function repriceFirm(world: World, params: EconomyParams, month: number, f: number, low: number, high: number): void {
  const firms = world.firms;
  const price = firms.price[f];
  const wage = firms.wage[f];
  const unitsPerMonth = DAYS_PER_MONTH * params.unitsPerWorkerDay;
  const monthOutputCents = unitsPerMonth * price;
  let eta = 0;
  let next = price;
  if (firms.stock[f] < low && monthOutputCents < wage + mulPpm(wage, params.markupHighPpm)) {
    eta = priceStep(world.seed, params, month, f);
    next = price + mulPpm(price, eta);
  } else if (firms.stock[f] > high && monthOutputCents > wage + mulPpm(wage, params.markupLowPpm)) {
    eta = priceStep(world.seed, params, month, f);
    next = price - mulPpm(price, eta);
  }
  next = Math.max(next, costFloor(wage, unitsPerMonth));
  firms.price[f] = next;
  if (eta > 0 && next !== price) {
    const stats = world.economyScratch.stats;
    stats[STAT_PRICE_CHANGES] += 1;
    stats[STAT_PRICE_CHANGE_PPM] += eta;
  }
}

// Lengnick's theta and vartheta: with chance priceChancePpm the step is eta ppm, uniform over 0 to priceStepPpm, else 0.
function priceStep(seed: number, params: EconomyParams, month: number, f: number): number {
  if (draw3(seed, FIRM_DRAW, month, f, PRICE_CHANCE) % PPM >= params.priceChancePpm) return 0;
  return draw3(seed, FIRM_DRAW, month, f, PRICE_STEP) % (params.priceStepPpm + 1);
}

// A18: the wage over a worker's month of output, rounded up, and never under a cent.
function costFloor(wage: number, unitsPerMonth: number): number {
  return Math.max(1, Math.floor((wage + unitsPerMonth - 1) / unitsPerMonth));
}
