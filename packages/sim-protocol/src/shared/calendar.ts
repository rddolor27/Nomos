// sim-core owns the day, week, season and year; every side reads them from here so build-time half-lives and rates
// convert from the same constants (Calendar).
export { DAYS_PER_SEASON, DAYS_PER_WEEK, DAYS_PER_YEAR, TICKS_PER_DAY, TICKS_PER_YEAR } from '@nomos/sim-core';

export const SEASONS_PER_YEAR = 4;
export const TICKS_PER_SECOND = 10;
export const TICK_MS = 1000 / TICKS_PER_SECOND;
