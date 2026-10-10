import type { EconomyParams } from '../economy/params.ts';
import { STAT_ABOVE_MARKUP, STAT_PRICE_CHANGES, STAT_PRICE_CHANGE_PPM } from '../economy/stats.ts';
import { isFood, outputPerWorkerDay } from '../goods/goods.ts';
import { PPM, mulPpm, mulPpmUp } from '../money/ppm.ts';
import { drawBelow3 } from '../random/draw.ts';
import { FIRM_DRAW } from '../random/streams.ts';
import { DAYS_PER_MONTH } from '../time/calendar.ts';
import type { World } from '../world/world.ts';

// Purposes in FIRM_DRAW's keys (month, firm, purpose). The chance and the size of a step are drawn apart, so changing the
// chance never reshuffles the sizes.
const PRICE_CHANCE = 0;
const PRICE_STEP = 1;

export function decideFirms(world: World, params: EconomyParams, month: number): void {
  const count = world.firms.count[0];
  for (let f = 0; f < count; f++) {
    if (isFood(world.goods.good[f])) decideFood(world, params, month, f);
    else decideGoods(world, params, month, f);
  }
}

// Lengnick's band over a month's demand: short under its bottom opens a vacancy, long over its top gives notice.
function decideGoods(world: World, params: EconomyParams, month: number, f: number): void {
  const firms = world.firms;
  const demand = Math.max(firms.lastDemand[f], params.demandFloor);
  const low = mulPpmUp(demand, params.stockLowPpm);
  const high = demand + mulPpmUp(demand, params.stockHighPpm);
  const short = firms.stock[f] < low;
  const long = firms.stock[f] > high;
  firms.vacancy[f] = short ? 1 : 0;
  firms.notice[f] = long && firms.employees[f] > 0 ? 1 : 0;
  repriceFirm(world, params, month, f, short, long, DAYS_PER_MONTH * params.unitsPerWorkerDay);
}

// M2.4 Ruling 2. Food spoils, so stock never piles up for the band to see. A food firm is short when it holds under a day's
// demand, and long once it has wasted a worker-month of its output since it last decided; the waste then starts again from
// 0. Short and long cannot both hold, as under the band, so a firm never both hires and gives notice.
function decideFood(world: World, params: EconomyParams, month: number, f: number): void {
  const { firms, goods } = world;
  const workerMonth = DAYS_PER_MONTH * outputPerWorkerDay(goods.good[f], params.unitsPerWorkerDay);
  const demand = Math.max(firms.lastDemand[f], params.demandFloor);
  const short = firms.stock[f] < ceilDiv(demand, DAYS_PER_MONTH);
  const long = !short && goods.wasted[f] >= workerMonth;
  firms.vacancy[f] = short ? 1 : 0;
  firms.notice[f] = long && firms.employees[f] > 0 ? 1 : 0;
  goods.wasted[f] = 0;
  repriceFirm(world, params, month, f, short, long, workerMonth);
}

// Short of stock under the band's top a firm may raise its price, and long on stock over the band's bottom it may cut it.
// The cost floor then holds whatever the stock did, since a wage rise can lift it past a price that sat still.
// unitsPerMonth is a worker's month of output in the firm's own unit, a unit or a portion.
function repriceFirm(
  world: World,
  params: EconomyParams,
  month: number,
  f: number,
  short: boolean,
  long: boolean,
  unitsPerMonth: number,
): void {
  const firms = world.firms;
  const price = firms.price[f];
  const wage = firms.wage[f];
  const monthOutputCents = unitsPerMonth * price;
  const ceilingCents = wage + mulPpm(wage, params.markupHighPpm);
  const stats = world.economyScratch.stats;
  let eta = 0;
  let next = price;
  if (short && monthOutputCents < ceilingCents) {
    eta = priceStep(world.seed, params, month, f);
    next = risenPrice(params, price, eta, ceilingCents, unitsPerMonth);
  } else if (long && monthOutputCents > wage + mulPpm(wage, params.markupLowPpm)) {
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
  if (drawBelow3(seed, FIRM_DRAW, month, f, PRICE_CHANCE, PPM) >= params.priceChancePpm) return 0;
  return drawBelow3(seed, FIRM_DRAW, month, f, PRICE_STEP, params.priceStepPpm + 1);
}

// A18: the wage over a worker's month of output, rounded up, and never under a cent.
function costFloor(wage: number, unitsPerMonth: number): number {
  return Math.max(1, ceilDiv(wage, unitsPerMonth));
}

function ceilDiv(cents: number, units: number): number {
  return Math.floor((cents + units - 1) / units);
}
