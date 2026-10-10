import type { EconomyParams } from '../economy/params.ts';
import { STAT_EXITS, STAT_WRITE_OFF } from '../economy/stats.ts';
import type { World } from '../world/world.ts';
import type { FirmStore } from './store.ts';

// idleMonths is a byte.
const MAX_IDLE_MONTHS = 255;

export function closeFirmMonth(world: World, params: EconomyParams): void {
  const firms = world.firms;
  const count = firms.count[0];
  // Ruling 7: every entrant takes the means of the firms as they stood, so the order of the exits cannot change them.
  const price = Math.floor(sumOf(firms.price, count) / count);
  const wage = Math.floor(sumOf(firms.wage, count) / count);
  let exits = 0;
  let writtenOff = 0;
  for (let f = 0; f < count; f++) {
    const idle = firms.employees[f] === 0 && firms.demand[f] === 0;
    const idleMonths = idle ? Math.min(firms.idleMonths[f] + 1, MAX_IDLE_MONTHS) : 0;
    if (params.idleMonthsToExit > 0 && idleMonths >= params.idleMonthsToExit) {
      writtenOff += firms.stock[f];
      reenter(firms, f, price, wage, params.demandFloor);
      exits++;
    } else {
      firms.idleMonths[f] = idleMonths;
      firms.lastDemand[f] = firms.demand[f];
      firms.demand[f] = 0;
    }
  }
  const stats = world.economyScratch.stats;
  stats[STAT_EXITS] += exits;
  stats[STAT_WRITE_OFF] += writtenOff;
}

function sumOf(column: Float64Array, count: number): number {
  let total = 0;
  for (let f = 0; f < count; f++) total += column[f];
  return total;
}

// An idle firm has no workers to drop, and profits have left its cash at zero, so the row keeps both.
function reenter(firms: FirmStore, f: number, price: number, wage: number, demandFloor: number): void {
  firms.price[f] = price;
  firms.wage[f] = wage;
  firms.stock[f] = 0;
  firms.demand[f] = 0;
  firms.lastDemand[f] = demandFloor;
  firms.vacancy[f] = 0;
  firms.notice[f] = 0;
  firms.monthsFull[f] = 0;
  firms.idleMonths[f] = 0;
}
