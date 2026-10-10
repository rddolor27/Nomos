import type { EconomyParams } from '../economy/params.ts';
import { STAT_ABOVE_MARKUP, STAT_PRICE_CHANGES, STAT_PRICE_CHANGE_PPM } from '../economy/stats.ts';
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
    const high = demand + mulPpmUp(demand, params.stockHighPpm);
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
  const ceilingCents = wage + mulPpm(wage, params.markupHighPpm);
  const stats = world.economyScratch.stats;
  let eta = 0;
  let next = price;
  if (firms.stock[f] < low && monthOutputCents < ceilingCents) {
    eta = priceStep(world.seed, params, month, f);
    next = risenPrice(params, price, eta, ceilingCents, unitsPerMonth);
  } else if (firms.stock[f] > high && monthOutputCents > wage + mulPpm(wage, params.markupLowPpm)) {
    eta = priceStep(world.seed, params, month, f);
    next = cutPrice(params, price, eta, wage, unitsPerMonth);
  }
  next = Math.max(next, costFloor(wage, unitsPerMonth));
  firms.price[f] = next;
  if (eta > 0 && next !== price) {
    stats[STAT_PRICE_CHANGES] += 1;
    stats[STAT_PRICE_CHANGE_PPM] += eta;
  }
  if (unitsPerMonth * next > ceilingCents) stats[STAT_ABOVE_MARKUP] += 1;
}

// M2.3 Ruling 6: with markupClamp a step stops at the edge of the markup band, in whole cents rounded inward, so the
// price it ends on is inside the band whenever the band holds a whole price. Lengnick's rule (0) lets the band only gate
// a step, so a step can overshoot it.
function risenPrice(params: EconomyParams, price: number, eta: number, ceilingCents: number, unitsPerMonth: number): number {
  const next = price + mulPpm(price, eta);
  if (params.markupClamp === 0) return next;
  return Math.min(next, Math.floor(ceilingCents / unitsPerMonth));
}

function cutPrice(params: EconomyParams, price: number, eta: number, wage: number, unitsPerMonth: number): number {
  const next = price - mulPpm(price, eta);
  if (params.markupClamp === 0) return next;
  return Math.max(next, ceilDiv(wage + mulPpmUp(wage, params.markupLowPpm), unitsPerMonth));
}

// Lengnick's theta and vartheta: with chance priceChancePpm the step is eta ppm, uniform over 0 to priceStepPpm, else 0.
function priceStep(seed: number, params: EconomyParams, month: number, f: number): number {
  if (draw3(seed, FIRM_DRAW, month, f, PRICE_CHANCE) % PPM >= params.priceChancePpm) return 0;
  return draw3(seed, FIRM_DRAW, month, f, PRICE_STEP) % (params.priceStepPpm + 1);
}

// A18: the wage over a worker's month of output, rounded up, and never under a cent.
function costFloor(wage: number, unitsPerMonth: number): number {
  return Math.max(1, ceilDiv(wage, unitsPerMonth));
}

function ceilDiv(cents: number, units: number): number {
  return Math.floor((cents + units - 1) / units);
}
