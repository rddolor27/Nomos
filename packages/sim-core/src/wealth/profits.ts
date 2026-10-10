import type { EconomyParams } from '../economy/params.ts';
import { STAT_PROFITS_PAID } from '../economy/stats.ts';
import { apportionByStride } from '../maths/apportion.ts';
import { PROFITS, firmAccount, transfer } from '../money/ledger.ts';
import { mulPpmUp } from '../money/ppm.ts';
import { draw2 } from '../random/draw.ts';
import { WEALTH_DRAW } from '../random/streams.ts';
import type { World } from '../world/world.ts';

// Purpose 0 of WEALTH_DRAW's keys (month, purpose); money/fiat.ts takes 1.
const PROFIT = 0;
// apportionByStride is exact while pool x weight stays under 2^53, so weights stay under 2^20 and the pool under 2^33.
const WEIGHT_LIMIT = 1 << 20;
const POOL_LIMIT_CENTS = 8_589_934_592;

export function distributeProfits(world: World, params: EconomyParams, month: number): void {
  const pool = poolOf(world, params);
  if (pool === 0) return;
  if (pool >= POOL_LIMIT_CENTS) throw new RangeError(`a pool of ${pool} cents is too big to share exactly`);
  sweepIntoPool(world, params);
  const cash = world.cash;
  const scratch = world.economyScratch;
  const households = world.agents.count[0];
  weighByCash(world, households);
  apportionByStride(pool, scratch.weights, households, scratch.shares, draw2(world.seed, WEALTH_DRAW, month, PROFIT));
  for (let i = 0; i < households; i++) transfer(cash, PROFITS, cash.firstWallet + i, scratch.shares[i]);
  scratch.stats[STAT_PROFITS_PAID] += pool;
}

// What a firm holds above the buffer it keeps against its next wage bill; a firm under its buffer keeps all it has.
function excessCash(world: World, params: EconomyParams, f: number): number {
  const firms = world.firms;
  const buffer = mulPpmUp(firms.wage[f] * firms.employees[f], params.bufferPpm);
  const excess = world.cash.balance[firmAccount(world.cash, f)] - buffer;
  return excess > 0 ? excess : 0;
}

// A read-only pass first, so a pool too big to share throws before any cent has moved.
function poolOf(world: World, params: EconomyParams): number {
  const count = world.firms.count[0];
  let pool = 0;
  for (let f = 0; f < count; f++) pool += excessCash(world, params, f);
  return pool;
}

function sweepIntoPool(world: World, params: EconomyParams): void {
  const count = world.firms.count[0];
  for (let f = 0; f < count; f++) {
    const excess = excessCash(world, params, f);
    if (excess > 0) transfer(world.cash, firmAccount(world.cash, f), PROFITS, excess);
  }
}

// Cash over the smallest power of two that brings the largest under 2^20, rounded down; 1 each when nobody holds any.
function weighByCash(world: World, households: number): void {
  const balance = world.cash.balance;
  const first = world.cash.firstWallet;
  const weights = world.economyScratch.weights;
  let largest = 0;
  for (let i = 0; i < households; i++) largest = Math.max(largest, balance[first + i]);
  let divisor = 1;
  while (largest >= divisor * WEIGHT_LIMIT) divisor *= 2;
  for (let i = 0; i < households; i++) weights[i] = largest === 0 ? 1 : Math.floor(balance[first + i] / divisor);
}
