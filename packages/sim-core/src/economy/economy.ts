import { planConsumption } from '../consumption/plan.ts';
import { searchShops } from '../consumption/search.ts';
import { shopDay } from '../consumption/shop.ts';
import { decideFirms } from '../firms/decide.ts';
import { produce } from '../firms/produce.ts';
import { closeFirmMonth } from '../firms/renew.ts';
import { fireOnNotice } from '../labour/notice.ts';
import { updateReservationWages } from '../labour/reservation.ts';
import { searchJobs } from '../labour/search.ts';
import { issueFiat } from '../money/fiat.ts';
import { OK, checkInvariants, failInvariant } from '../money/invariants.ts';
import { DAYS_PER_MONTH, dayOfMonth, monthOf } from '../time/calendar.ts';
import { payWages } from '../wages/payroll.ts';
import { stepWages } from '../wages/wage-step.ts';
import { distributeProfits } from '../wealth/profits.ts';
import type { World } from '../world/world.ts';
import type { EconomyParams } from './params.ts';
import { clearDaySums, clearMonthSums, recordDay } from './stats.ts';

const LAST_DAY_OF_MONTH = DAYS_PER_MONTH - 1;

// A1 (R2): firms first, then households. stepWages reads last month's vacancies, which decideFirms then resets, and
// households plan with the prices their searches settled on.
export function startMonth(world: World, params: EconomyParams, month: number): void {
  stepWages(world, params, month);
  decideFirms(world, params, month);
  searchShops(world, params, month);
  searchJobs(world, params, month);
  planConsumption(world, params);
}

// A14 and A17: pay comes first, since the reservation wage reads it and a notice lays off only after it. Profits empty an
// idle firm before closeFirmMonth can retire its row, so an exit moves no money (Ruling 7).
export function endMonth(world: World, params: EconomyParams, month: number): void {
  payWages(world);
  updateReservationWages(world, params);
  fireOnNotice(world, month);
  distributeProfits(world, params, month);
  closeFirmMonth(world, params);
  issueFiat(world, params, month);
}

// Day 0 opens month 0. The step does not call this yet, so tests and the CLI run it once per sim day.
export function economyDay(world: World, params: EconomyParams, day: number): void {
  const month = monthOf(day);
  const dayInMonth = dayOfMonth(day);
  const stats = world.economyScratch.stats;
  clearDaySums(stats);
  if (dayInMonth === 0) {
    clearMonthSums(stats);
    startMonth(world, params, month);
  }
  // A2: households shop before firms produce, so a purchase takes earlier output.
  shopDay(world, params, day);
  produce(world, params);
  if (dayInMonth === LAST_DAY_OF_MONTH) endMonth(world, params, month);
  recordDay(world);
  if (!world.checks) return;
  const code = checkInvariants(world.cash, world.claims);
  if (code !== OK) failInvariant(code);
}
