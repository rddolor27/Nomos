import type { EconomyParams } from '../economy/params.ts';
import { mulPpm } from '../money/ppm.ts';
import { drawBelow3 } from '../random/draw.ts';
import { WAGE_DRAW } from '../random/streams.ts';
import type { World } from '../world/world.ts';

const STEP = 0;
const MIN_WAGE_CENTS = 1;

// R1: a step is uniform over 0 to delta ppm of the wage, floored by mulPpm like every rate.
function stepPpm(seed: number, month: number, firm: number, maxPpm: number): number {
  return drawBelow3(seed, WAGE_DRAW, month, firm, STEP, maxPpm + 1);
}

// Reads last month's vacancy, so it runs before decideFirms clears it. A vacancy still open raises the wage; wageCutMonths
// months without one cut it, and the count starts again after either.
export function stepWages(world: World, params: EconomyParams, month: number): void {
  const seed = world.seed;
  const firms = world.firms;
  const count = firms.count[0];
  for (let f = 0; f < count; f++) {
    const wage = firms.wage[f];
    if (firms.vacancy[f] !== 0) {
      firms.wage[f] = wage + mulPpm(wage, stepPpm(seed, month, f, params.wageStepPpm));
      firms.monthsFull[f] = 0;
    } else if (firms.monthsFull[f] + 1 < params.wageCutMonths) {
      firms.monthsFull[f]++;
    } else {
      firms.wage[f] = Math.max(MIN_WAGE_CENTS, wage - mulPpm(wage, stepPpm(seed, month, f, params.wageStepPpm)));
      firms.monthsFull[f] = 0;
    }
  }
}
