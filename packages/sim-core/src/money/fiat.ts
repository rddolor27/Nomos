import type { EconomyParams } from '../economy/params.ts';
import { STAT_ISSUED } from '../economy/stats.ts';
import { apportionByStride } from '../maths/apportion.ts';
import { draw2 } from '../random/draw.ts';
import { WEALTH_DRAW } from '../random/streams.ts';
import type { World } from '../world/world.ts';
import { MINT, issue } from './ledger.ts';
import { mulPpm } from './ppm.ts';

// Purpose 1 of WEALTH_DRAW's keys (month, purpose); wealth/profits.ts takes 0.
const FIAT = 1;

export function issueFiat(world: World, params: EconomyParams, month: number): void {
  if (params.fiatIssuePpm === 0) return;
  const cash = world.cash;
  const scratch = world.economyScratch;
  const households = world.agents.count[0];
  // The money stock is what MINT has issued, which every other account holds.
  const issued = mulPpm(0 - cash.balance[MINT], params.fiatIssuePpm);
  for (let i = 0; i < households; i++) scratch.weights[i] = 1;
  apportionByStride(issued, scratch.weights, households, scratch.shares, draw2(world.seed, WEALTH_DRAW, month, FIAT));
  for (let i = 0; i < households; i++) issue(cash, cash.firstWallet + i, scratch.shares[i]);
  scratch.stats[STAT_ISSUED] += issued;
}
