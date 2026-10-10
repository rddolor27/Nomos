import type { EconomyParams } from '../economy/params.ts';
import { mulPpm } from '../money/ppm.ts';
import type { World } from '../world/world.ts';

// A17 (R2): pay above the reservation wage lifts it to that pay, and it only falls by a floored share for each month
// without work. Runs after payWages, which sets the pay it reads.
export function updateReservationWages(world: World, params: EconomyParams): void {
  const agents = world.agents;
  const pay = world.economyScratch.pay;
  const households = agents.count[0];
  for (let h = 0; h < households; h++) {
    const employer = agents.employer[h];
    if (employer < 0) agents.reservationWage[h] -= mulPpm(agents.reservationWage[h], params.reservationCutPpm);
    else agents.reservationWage[h] = Math.max(agents.reservationWage[h], pay[employer]);
  }
}
