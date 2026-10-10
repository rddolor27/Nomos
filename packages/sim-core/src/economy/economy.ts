import { planConsumption } from '../consumption/plan.ts';
import { searchShops } from '../consumption/search.ts';
import { shopDay } from '../consumption/shop.ts';
import { decideFirms } from '../firms/decide.ts';
import { produce } from '../firms/produce.ts';
import { closeFirmMonth } from '../firms/renew.ts';
import { layOff, layOffExiting } from '../labour/layoffs.ts';
import { fireOnNotice } from '../labour/notice.ts';
import { updateReservationWages } from '../labour/reservation.ts';
import { searchJobs } from '../labour/search.ts';
import { issueFiat } from '../money/fiat.ts';
import { OK, checkInvariants, failInvariant } from '../money/invariants.ts';
import { DAYS_PER_MONTH, DAYS_PER_YEAR, dayOfMonth, dayOfYear, monthOf } from '../time/calendar.ts';
import { payWages } from '../wages/payroll.ts';
import { stepWages } from '../wages/wage-step.ts';
import { distributeProfits } from '../wealth/profits.ts';
import type { World } from '../world/world.ts';
import type { EconomyParams } from './params.ts';
import { clearFlows, recordDay, recordMonth, recordYear } from './stats.ts';

const LAST_DAY_OF_MONTH = DAYS_PER_MONTH - 1;
const LAST_DAY_OF_YEAR = DAYS_PER_YEAR - 1;

// An economy day is 18 systems in a fixed order: opening the day, the 5 of a month's first day, shopping, production, the 7
// of a month's last day, then the month, day and year records. A town's step runs system k on the day's tick k (M2.2b
// Ruling 2), and a system that does not fall due on a day does nothing. A2: households shop before firms produce, so a
// purchase takes earlier output.
const OPEN_DAY = 0;
const FIRST_START = OPEN_DAY + 1;
const START_SYSTEMS = 5;
const SHOP_DAY = FIRST_START + START_SYSTEMS;
const PRODUCE = SHOP_DAY + 1;
const FIRST_END = PRODUCE + 1;
const END_SYSTEMS = 7;
const RECORD_MONTH = FIRST_END + END_SYSTEMS;
const RECORD_DAY = RECORD_MONTH + 1;
const RECORD_YEAR = RECORD_DAY + 1;
export const ECONOMY_TICKS = RECORD_YEAR + 1;

// A1 (R2): firms first, then households. stepWages reads last month's vacancies, which decideFirms then resets, and
// households plan with the prices their searches settled on.
export function startMonth(world: World, params: EconomyParams, month: number): void {
  for (let k = 0; k < START_SYSTEMS; k++) startSystem(world, params, month, k);
}

function startSystem(world: World, params: EconomyParams, month: number, k: number): void {
  switch (k) {
    case 0:
      stepWages(world, params, month);
      break;
    case 1:
      decideFirms(world, params, month);
      break;
    case 2:
      searchShops(world, params, month);
      break;
    case 3:
      searchJobs(world, params, month);
      break;
    default:
      planConsumption(world, params);
  }
}

// A14 and A17: pay comes first, since the reservation wage reads it and a notice lays off only after it. Profits empty an
// idle firm before closeFirmMonth can retire its row, so an exit moves no money (Ruling 7), and the workers of a firm that
// exited short of pay lose their jobs right after.
export function endMonth(world: World, params: EconomyParams, month: number): void {
  for (let k = 0; k < END_SYSTEMS; k++) endSystem(world, params, month, k);
}

function endSystem(world: World, params: EconomyParams, month: number, k: number): void {
  switch (k) {
    case 0:
      payWages(world);
      break;
    case 1:
      updateReservationWages(world, params);
      break;
    case 2:
      fireOnNotice(world, month);
      break;
    case 3:
      distributeProfits(world, params, month);
      break;
    case 4:
      closeFirmMonth(world, params);
      break;
    case 5:
      layOffExiting(world);
      break;
    default:
      issueFiat(world, params, month);
  }
}

// layoffs is a scenario's unemployment shock: that many people lose their jobs at the day's start, before a month's first
// search.
function openDay(world: World, day: number, layoffs: number): void {
  clearFlows(world.economyScratch.stats);
  if (layoffs > 0) layOff(world, layoffs, day);
}

// A month's first-day systems fall due on its first day, its last-day systems and the month record on its last, and the
// year record on a year's last. The rest run every day.
function isDue(system: number, day: number): boolean {
  if (system >= FIRST_START && system < SHOP_DAY) return dayOfMonth(day) === 0;
  if (system >= FIRST_END && system <= RECORD_MONTH) return dayOfMonth(day) === LAST_DAY_OF_MONTH;
  return system !== RECORD_YEAR || dayOfYear(day) === LAST_DAY_OF_YEAR;
}

// System number `system` of the economy of day `day`, which a town's step runs on the day's tick of that number. Day 0 opens
// month 0.
export function runEconomySystem(
  world: World,
  params: EconomyParams,
  day: number,
  system: number,
  layoffs: number,
): void {
  if (!isDue(system, day)) return;
  if (system === OPEN_DAY) openDay(world, day, layoffs);
  else if (system < SHOP_DAY) startSystem(world, params, monthOf(day), system - FIRST_START);
  else if (system === SHOP_DAY) shopDay(world, params, day);
  else if (system === PRODUCE) produce(world, params);
  else if (system < RECORD_MONTH) endSystem(world, params, monthOf(day), system - FIRST_END);
  else if (system === RECORD_MONTH) recordMonth(world);
  else if (system === RECORD_DAY) recordDay(world);
  else recordYear(world);
}

// All 18 systems in a row, for tests and the CLI, which have no ticks.
export function economyDay(world: World, params: EconomyParams, day: number, layoffs = 0): void {
  for (let system = 0; system < ECONOMY_TICKS; system++) runEconomySystem(world, params, day, system, layoffs);
  if (!world.checks) return;
  const code = checkInvariants(world.cash, world.claims);
  if (code !== OK) failInvariant(code);
}
