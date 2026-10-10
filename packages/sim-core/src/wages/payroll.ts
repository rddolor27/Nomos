import { STAT_WAGE_BILL } from '../economy/stats.ts';
import { firmAccount, transfer, walletAccount } from '../money/ledger.ts';
import type { World } from '../world/world.ts';

// A15: a firm that cannot cover its payroll pays every worker an equal share of its cash and keeps the remainder. Exact: whole
// cash below 2^53 over a whole worker count never rounds up to the next whole number.
function payPerWorkerCents(wageCents: number, workers: number, cashCents: number): number {
  return cashCents >= wageCents * workers ? wageCents : Math.floor(cashCents / workers);
}

// Plans every firm's pay from its cash before any wallet is paid, so the order of households cannot change a firm's offer.
export function payWages(world: World): void {
  const firms = world.firms;
  const cash = world.cash;
  const pay = world.economyScratch.pay;
  const firmCount = firms.count[0];
  for (let f = 0; f < firmCount; f++) {
    pay[f] = payPerWorkerCents(firms.wage[f], firms.employees[f], cash.balance[firmAccount(cash, f)]);
  }
  const employer = world.agents.employer;
  const households = world.agents.count[0];
  let billCents = 0;
  for (let h = 0; h < households; h++) {
    const f = employer[h];
    if (f < 0) continue;
    transfer(cash, firmAccount(cash, f), walletAccount(cash, h), pay[f]);
    billCents += pay[f];
  }
  world.economyScratch.stats[STAT_WAGE_BILL] += billCents;
}
