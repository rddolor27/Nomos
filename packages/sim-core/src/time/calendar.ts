import { floorDiv, floorMod } from '../maths/int.ts';

export { SUNRISE, SUNSET } from './day-length.ts';

export const TICKS_PER_DAY = 1440;
export const DAYS_PER_WEEK = 7;
export const DAYS_PER_SEASON = 28;
export const DAYS_PER_YEAR = 112;
export const TICKS_PER_YEAR = TICKS_PER_DAY * DAYS_PER_YEAR;

const WORKDAYS_PER_WEEK = 5;

export function dayOf(tick: number): number {
  return floorDiv(tick, TICKS_PER_DAY);
}

export function minuteOf(tick: number): number {
  return floorMod(tick, TICKS_PER_DAY);
}

export function yearOf(day: number): number {
  return floorDiv(day, DAYS_PER_YEAR) + 1;
}

export function dayOfYear(day: number): number {
  return floorMod(day, DAYS_PER_YEAR);
}

export function seasonOf(day: number): number {
  return floorDiv(dayOfYear(day), DAYS_PER_SEASON);
}

export function dayOfSeason(day: number): number {
  return floorMod(dayOfYear(day), DAYS_PER_SEASON) + 1;
}

export function weekdayOf(day: number): number {
  return floorMod(day, DAYS_PER_WEEK);
}

export function isRestDay(day: number): boolean {
  return weekdayOf(day) >= WORKDAYS_PER_WEEK;
}

export function tickAt(year: number, season: number, dayInSeason: number, minute: number): number {
  const day = (year - 1) * DAYS_PER_YEAR + season * DAYS_PER_SEASON + (dayInSeason - 1);
  return day * TICKS_PER_DAY + minute;
}
