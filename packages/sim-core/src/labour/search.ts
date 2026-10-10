import type { EconomyParams } from '../economy/params.ts';
import { STAT_HIRES, STAT_JOB_VISITS, STAT_SWITCHES } from '../economy/stats.ts';
import { PPM } from '../money/ppm.ts';
import { draw3, draw4 } from '../random/draw.ts';
import { keyedShuffle } from '../random/shuffle.ts';
import { LABOUR_DRAW } from '../random/streams.ts';
import type { World } from '../world/world.ts';

// Purposes drawn on LABOUR_DRAW, distinct across labour/ so that no two draws share a key.
const ORDER = 0;
const SAMPLE = 1;
const LOOK = 2;

// A firm row drawn with replacement for sample k of a household's search in a month (A13).
export function sampledFirm(seed: number, month: number, household: number, sample: number, firms: number): number {
  return draw4(seed, LABOUR_DRAW, month, household, sample, SAMPLE) % firms;
}

function hire(world: World, household: number, firm: number): void {
  world.agents.employer[household] = firm;
  world.firms.employees[firm]++;
  world.firms.vacancy[firm] = 0;
}

// The first sampled vacancy that pays at least the reservation wage (A4, A13).
function searchUnemployed(world: World, params: EconomyParams, month: number, household: number): void {
  const firms = world.firms;
  const stats = world.economyScratch.stats;
  const wantedCents = world.agents.reservationWage[household];
  for (let k = 0; k < params.jobSearches; k++) {
    stats[STAT_JOB_VISITS]++;
    const f = sampledFirm(world.seed, month, household, k, firms.count[0]);
    if (firms.vacancy[f] !== 0 && firms.wage[f] >= wantedCents) {
      hire(world, household, f);
      stats[STAT_HIRES]++;
      return;
    }
  }
}

// One sampled firm, always looked at when the wage is under the reservation wage and otherwise with chance pi, and a move
// needs a strictly higher wage (A13).
function searchEmployed(world: World, params: EconomyParams, month: number, household: number): void {
  const firms = world.firms;
  const own = world.agents.employer[household];
  const underpaid = firms.wage[own] < world.agents.reservationWage[household];
  if (!underpaid && draw3(world.seed, LABOUR_DRAW, month, household, LOOK) % PPM >= params.onJobSearchPpm) return;
  const f = sampledFirm(world.seed, month, household, 0, firms.count[0]);
  if (firms.vacancy[f] === 0 || firms.wage[f] <= firms.wage[own]) return;
  firms.employees[own]--;
  hire(world, household, f);
  world.economyScratch.stats[STAT_SWITCHES]++;
}

// Households search in a keyed order each month, never by index, because a vacancy goes to whoever reaches it first (A8).
export function searchJobs(world: World, params: EconomyParams, month: number): void {
  const employer = world.agents.employer;
  const households = world.agents.count[0];
  const order = world.economyScratch.order;
  keyedShuffle(order, households, world.seed, LABOUR_DRAW, month, ORDER);
  for (let i = 0; i < households; i++) {
    const household = order[i];
    if (employer[household] < 0) searchUnemployed(world, params, month, household);
    else searchEmployed(world, params, month, household);
  }
}
