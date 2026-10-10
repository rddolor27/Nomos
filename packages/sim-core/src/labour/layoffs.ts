import { STAT_FIRINGS } from '../economy/stats.ts';
import { keyedShuffle } from '../random/shuffle.ts';
import { LABOUR_DRAW } from '../random/streams.ts';
import type { World } from '../world/world.ts';

// Distinct from the purposes in search.ts and notice.ts, which draw on the same stream.
const SHOCK_ORDER = 5;
// The value agents/store.ts gives an agent with no employer.
const NO_FIRM = -1;

// M2.3 Ruling 5: the workers of a firm that exited at this month end lose their jobs, and its headcount goes to zero.
// Runs right after closeFirmMonth, which marks those firms, and skips the pass over people when it marked none.
export function layOffExiting(world: World): void {
  const { firms, agents, economyScratch } = world;
  const exiting = economyScratch.exiting;
  const firmCount = firms.count[0];
  let marked = 0;
  for (let f = 0; f < firmCount; f++) {
    if (exiting[f] === 0) continue;
    firms.employees[f] = 0;
    marked++;
  }
  if (marked === 0) return;
  const employer = agents.employer;
  const people = agents.count[0];
  let layoffs = 0;
  for (let h = 0; h < people; h++) {
    const f = employer[h];
    if (f < 0 || exiting[f] === 0) continue;
    employer[h] = NO_FIRM;
    layoffs++;
  }
  economyScratch.stats[STAT_FIRINGS] += layoffs;
}

// A scenario's unemployment shock: count employed people, picked in a keyed order of everyone, or every employed person if
// fewer, lose their jobs. The order depends on the seed and the day alone.
export function layOff(world: World, count: number, day: number): void {
  const { firms, agents, economyScratch } = world;
  const order = economyScratch.order;
  const employer = agents.employer;
  const people = agents.count[0];
  keyedShuffle(order, people, world.seed, LABOUR_DRAW, day, SHOCK_ORDER);
  let remaining = count;
  for (let i = 0; i < people && remaining > 0; i++) {
    const h = order[i];
    const f = employer[h];
    if (f < 0) continue;
    employer[h] = NO_FIRM;
    firms.employees[f]--;
    remaining--;
  }
  economyScratch.stats[STAT_FIRINGS] += count - remaining;
}
