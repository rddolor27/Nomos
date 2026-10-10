import type { EconomyParams } from '../economy/params.ts';
import { STAT_EXITS, STAT_WRITE_OFF } from '../economy/stats.ts';
import { mulPpm } from '../money/ppm.ts';
import type { World } from '../world/world.ts';
import type { FirmStore } from './store.ts';

// idleMonths is a byte.
const MAX_IDLE_MONTHS = 255;

// A firm exits after idleMonthsToExit months with no workers and no demand, or (M2.3 Ruling 5) at once when it has
// workers and paid them under shortPayExitPpm of its wage. Either way its stock is written off and the row re-enters as an
// entrant. exiting marks the firms that still have workers to lay off, and labour/layoffs.ts reads it.
export function closeFirmMonth(world: World, params: EconomyParams): void {
  const firms = world.firms;
  const { exiting, pay, stats } = world.economyScratch;
  const count = firms.count[0];
  // Ruling 7: every entrant takes the means of the firms as they stood, so the order of the exits cannot change them.
  const price = Math.floor(sumOf(firms.price, count) / count);
  const wage = Math.floor(sumOf(firms.wage, count) / count);
  let exits = 0;
  let writtenOff = 0;
  for (let f = 0; f < count; f++) {
    const idle = firms.employees[f] === 0 && firms.demand[f] === 0;
    const idleMonths = idle ? Math.min(firms.idleMonths[f] + 1, MAX_IDLE_MONTHS) : 0;
    const shortPay = paidShort(firms, pay, f, params.shortPayExitPpm);
    exiting[f] = shortPay ? 1 : 0;
    if (shortPay || idledOut(params, idleMonths)) {
      writtenOff += firms.stock[f];
      reenter(firms, f, price, wage, params.demandFloor);
      exits++;
    } else {
      firms.idleMonths[f] = idleMonths;
      firms.lastDemand[f] = firms.demand[f];
      firms.demand[f] = 0;
    }
  }
  stats[STAT_EXITS] += exits;
  stats[STAT_WRITE_OFF] += writtenOff;
}

function sumOf(column: Float64Array, count: number): number {
  let total = 0;
  for (let f = 0; f < count; f++) total += column[f];
  return total;
}

function idledOut(params: EconomyParams, idleMonths: number): boolean {
  return params.idleMonthsToExit > 0 && idleMonths >= params.idleMonthsToExit;
}

// pay is what A15 paid each worker this month end, short of the wage when the firm's cash could not cover its payroll.
function paidShort(firms: FirmStore, pay: Float64Array, f: number, shortPayExitPpm: number): boolean {
  return firms.employees[f] > 0 && pay[f] < mulPpm(firms.wage[f], shortPayExitPpm);
}

// An idle firm has no workers to drop, and profits have left its cash at zero. A firm that paid short keeps the few cents
// A15 left it, and its workers are laid off right after, so an exit moves no money.
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
