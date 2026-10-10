import { SUPPLIERS } from '../agents/store.ts';
import type { EconomyParams } from '../economy/params.ts';
import { exp2Floor, log2Q16Wide } from '../maths/log2.ts';
import { walletAccount } from '../money/ledger.ts';
import { mulPpm } from '../money/ppm.ts';
import type { World } from '../world/world.ts';

// A5: a household plans with the mean of its suppliers' prices, rounded down.
function meanSupplierPrice(suppliers: Int32Array, price: Float64Array, household: number): number {
  const first = household * SUPPLIERS;
  let sum = 0;
  for (let k = 0; k < SUPPLIERS; k++) sum += price[suppliers[first + k]];
  return Math.floor(sum / SUPPLIERS);
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

export function planConsumption(world: World, params: EconomyParams): void {
  const { agents, firms, cash } = world;
  const households = agents.count[0];
  for (let i = 0; i < households; i++) {
    const price = meanSupplierPrice(agents.suppliers, firms.price, i);
    agents.plannedUnits[i] = unitsToPlan(cash.balance[walletAccount(cash, i)], price, params.consumptionPowerPpm);
  }
}
