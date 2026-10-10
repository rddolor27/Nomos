import { STAT_FIRINGS } from '../economy/stats.ts';
import { drawBelow3 } from '../random/draw.ts';
import { LABOUR_DRAW } from '../random/streams.ts';
import type { World } from '../world/world.ts';

// Distinct from the purposes in search.ts, which draws on the same stream.
const LAYOFF = 3;
// The value agents/store.ts gives an agent with no employer.
const NO_FIRM = -1;

// Which of a firm's workers, counted from 1 in household order, to lay off; 0 when it has no notice or no workers.
function layoffPlace(seed: number, month: number, firm: number, notice: number, employees: number): number {
  if (notice === 0 || employees === 0) return 0;
  return 1 + drawBelow3(seed, LABOUR_DRAW, month, firm, LAYOFF, employees);
}

// A14: a notice set at month start takes effect at month end, after wages, and lays off one keyed-random worker.
export function fireOnNotice(world: World, month: number): void {
  const firms = world.firms;
  const place = world.economyScratch.firmTally;
  const firmCount = firms.count[0];
  for (let f = 0; f < firmCount; f++) {
    place[f] = layoffPlace(world.seed, month, f, firms.notice[f], firms.employees[f]);
    firms.notice[f] = 0;
  }
  const employer = world.agents.employer;
  const households = world.agents.count[0];
  let layoffs = 0;
  for (let h = 0; h < households; h++) {
    const f = employer[h];
    if (f < 0 || place[f] === 0) continue;
    place[f]--;
    if (place[f] === 0) {
      employer[h] = NO_FIRM;
      firms.employees[f]--;
      layoffs++;
    }
  }
  world.economyScratch.stats[STAT_FIRINGS] += layoffs;
}
