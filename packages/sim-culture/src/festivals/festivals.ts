import { DAYS_PER_YEAR, FESTIVAL, draw2 } from '@nomos/sim-core/kernels';

// R8's guard demo holds ten festivals a year; M3.7's festival table replaces this stand-in.
export const STAND_IN_FESTIVAL_DAYS = 10;

// Keyed by the culture's stable uid, never its index, so relabelling cultures moves no festival (R8).
export function festivalToday(seed: number, uid: number, day: number): boolean {
  return draw2(seed, FESTIVAL, uid, day) % DAYS_PER_YEAR < STAND_IN_FESTIVAL_DAYS;
}
