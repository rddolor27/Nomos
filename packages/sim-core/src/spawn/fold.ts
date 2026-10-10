import { isFood } from '../goods/goods.ts';
import { MAX_HOUSEHOLD } from '../households/store.ts';
import { firmAccount, walletAccount } from '../money/ledger.ts';
import { GOODS, type World } from '../world/world.ts';
import {
  LEDGER_EMPLOYED,
  LEDGER_FIELDS,
  LEDGER_FIRMS,
  LEDGER_FIRM_CASH,
  LEDGER_HOUSEHOLDS,
  LEDGER_HOUSEHOLD_CASH,
  LEDGER_PRICE,
  LEDGER_STOCK,
  LEDGER_UNEMPLOYED,
  LEDGER_WAGE,
} from './record.ts';

// Sums a city back into its ledger record (M2.2 Ruling 5). It only reads the world and writes all 14 fields of out.
export function foldToLedger(world: World, out: Float64Array): void {
  for (let field = 0; field < LEDGER_FIELDS; field++) out[field] = 0;
  foldHouseholds(world, out);
  foldBlobs(world, out);
  foldFirms(world, out);
}

function foldHouseholds(world: World, out: Float64Array): void {
  const { count, size } = world.households;
  for (let h = 0; h < count[0]; h++) {
    const people = size[h];
    // A row of any other size counts for nobody, which checkRecord reports as a short population.
    if (people >= 1 && people <= MAX_HOUSEHOLD) out[LEDGER_HOUSEHOLDS + people - 1]++;
  }
}

function foldBlobs(world: World, out: Float64Array): void {
  const { agents, cash } = world;
  const blobs = agents.count[0];
  let employed = 0;
  let cents = 0;
  for (let b = 0; b < blobs; b++) {
    if (agents.employer[b] >= 0) employed++;
    cents += cash.balance[walletAccount(cash, b)];
  }
  out[LEDGER_EMPLOYED] = employed;
  out[LEDGER_UNEMPLOYED] = blobs - employed;
  out[LEDGER_HOUSEHOLD_CASH] = cents;
}

// In a goods world (M2.4) the record's price and stock are the goods firms' alone, since a food firm counts portions where
// they count units. A food firm adds only to the firm count, the wage mean and the cash. Spawn starts food fresh, so
// nothing of it needs to fold.
function foldFirms(world: World, out: Float64Array): void {
  const { firms, goods, cash } = world;
  const byGood = world.globals[GOODS] === 1;
  const count = firms.count[0];
  let goodsFirms = 0;
  let prices = 0;
  let wages = 0;
  let stock = 0;
  let cents = 0;
  for (let f = 0; f < count; f++) {
    wages += firms.wage[f];
    cents += cash.balance[firmAccount(cash, f)];
    if (byGood && isFood(goods.good[f])) continue;
    prices += firms.price[f];
    stock += firms.stock[f];
    goodsFirms++;
  }
  out[LEDGER_FIRMS] = count;
  out[LEDGER_FIRM_CASH] = cents;
  out[LEDGER_STOCK] = stock;
  if (count === 0) return;
  if (goodsFirms > 0) out[LEDGER_PRICE] = meanCents(prices, goodsFirms);
  out[LEDGER_WAGE] = meanCents(wages, count);
}

// Exact for a whole total below 2^53, where the float quotient cannot round up across a whole cent.
function meanCents(totalCents: number, count: number): number {
  return Math.floor(totalCents / count);
}
