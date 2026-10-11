import { buyFood } from '../consumption/food.ts';
import { planConsumption } from '../consumption/plan.ts';
import { searchShops } from '../consumption/search.ts';
import { shopDay } from '../consumption/shop.ts';
import { decideFirms } from '../firms/decide.ts';
import { produce } from '../firms/produce.ts';
import { closeFirmMonth } from '../firms/renew.ts';
import { spoilFood } from '../goods/food.ts';
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
import { clearPurchases } from './scratch.ts';
import { clearFlows, recordDay, recordMonth, recordYear } from './stats.ts';

const LAST_DAY_OF_MONTH = DAYS_PER_MONTH - 1;
const LAST_DAY_OF_YEAR = DAYS_PER_YEAR - 1;

// An economy day is 20 systems in a fixed order: opening the day, spoiling food, the 5 of a month's first day, eating and
// shopping, production, the 7 of a month's last day, then the month, day and year records. A town's step runs system k on
// the day's tick k (M2.2b Ruling 2), and a system that does not fall due on a day does nothing. A2: households shop before
// firms produce, so a purchase takes earlier output, and the food a shelf spoils is gone before anyone shops (M2.4).
const OPEN_DAY = 0;
const SPOIL_FOOD = 1;
// A1 (R2): firms first, then households. stepWages reads last month's vacancies, which decideFirms then resets, and
// households plan with the prices their searches settled on.
const STEP_WAGES = 2;
const DECIDE_FIRMS = 3;
const SEARCH_SHOPS = 4;
const SEARCH_JOBS = 5;
const PLAN_CONSUMPTION = 6;
// Food first (M2.4 Ruling 2): the set-aside already holds a month's food, and goods are bought from the rest.
const BUY_FOOD = 7;
const SHOP_DAY = 8;
const PRODUCE = 9;
// A14 and A17: pay comes first, since the reservation wage reads it and a notice lays off only after it. Profits empty an
// idle firm before closeFirmMonth can retire its row, so an exit moves no money (Ruling 7), and the workers of a firm that
// exited short of pay lose their jobs right after.
const PAY_WAGES = 10;
const UPDATE_RESERVATION_WAGES = 11;
const FIRE_ON_NOTICE = 12;
const DISTRIBUTE_PROFITS = 13;
const CLOSE_FIRM_MONTH = 14;
const LAY_OFF_EXITING = 15;
const ISSUE_FIAT = 16;
const RECORD_MONTH = 17;
const RECORD_DAY = 18;
const RECORD_YEAR = 19;
export const ECONOMY_TICKS = RECORD_YEAR + 1;

// layoffs is a scenario's unemployment shock: that many people lose their jobs at the day's start, before a month's first
// search. Both rings of purchases open empty, since buyFood and shopDay each fill one.
function openDay(world: World, day: number, layoffs: number): void {
  clearFlows(world.economyScratch.stats);
  clearPurchases(world.economyScratch);
  if (layoffs > 0) layOff(world, layoffs, day);
}

// A month's first-day systems fall due on its first day, its last-day systems and the month record on its last, and the
// year record on a year's last. The rest run every day.
function isDue(system: number, day: number): boolean {
  if (system >= STEP_WAGES && system <= PLAN_CONSUMPTION) return dayOfMonth(day) === 0;
  if (system >= PAY_WAGES && system <= RECORD_MONTH) return dayOfMonth(day) === LAST_DAY_OF_MONTH;
  return system !== RECORD_YEAR || dayOfYear(day) === LAST_DAY_OF_YEAR;
}

// System number `system` of the economy of day `day`, which a town's step runs on the day's tick of that number. Day 0 opens
// month 0. A number past the 20th does nothing.
export function runEconomySystem(
  world: World,
  params: EconomyParams,
  day: number,
  system: number,
  layoffs: number,
): void {
  if (!isDue(system, day)) return;
  const month = monthOf(day);
  switch (system) {
    case OPEN_DAY:
      openDay(world, day, layoffs);
      break;
    case SPOIL_FOOD:
      spoilFood(world, day);
      break;
    case STEP_WAGES:
      stepWages(world, params, month);
      break;
    case DECIDE_FIRMS:
      decideFirms(world, params, month);
      break;
    case SEARCH_SHOPS:
      searchShops(world, params, month);
      break;
    case SEARCH_JOBS:
      searchJobs(world, params, month);
      break;
    case PLAN_CONSUMPTION:
      planConsumption(world, params);
      break;
    case BUY_FOOD:
      buyFood(world, day);
      break;
    case SHOP_DAY:
      shopDay(world, params, day);
      break;
    case PRODUCE:
      produce(world, params, day);
      break;
    case PAY_WAGES:
      payWages(world);
      break;
    case UPDATE_RESERVATION_WAGES:
      updateReservationWages(world, params);
      break;
    case FIRE_ON_NOTICE:
      fireOnNotice(world, month);
      break;
    case DISTRIBUTE_PROFITS:
      distributeProfits(world, params, month);
      break;
    case CLOSE_FIRM_MONTH:
      closeFirmMonth(world, params);
      break;
    case LAY_OFF_EXITING:
      layOffExiting(world);
      break;
    case ISSUE_FIAT:
      issueFiat(world, params, month);
      break;
    case RECORD_MONTH:
      recordMonth(world);
      break;
    case RECORD_DAY:
      recordDay(world);
      break;
    case RECORD_YEAR:
      recordYear(world);
      break;
  }
}

// A month's 7 end systems on its last day, without the records, for tests.
export function endMonth(world: World, params: EconomyParams, month: number): void {
  const lastDay = month * DAYS_PER_MONTH + LAST_DAY_OF_MONTH;
  for (let system = PAY_WAGES; system <= ISSUE_FIAT; system++) runEconomySystem(world, params, lastDay, system, 0);
}

// All 20 systems in a row, for tests and the CLI, which have no ticks.
export function economyDay(world: World, params: EconomyParams, day: number, layoffs = 0): void {
  for (let system = 0; system < ECONOMY_TICKS; system++) runEconomySystem(world, params, day, system, layoffs);
  if (!world.checks) return;
  const code = checkInvariants(world.cash, world.claims);
  if (code !== OK) failInvariant(code);
}
