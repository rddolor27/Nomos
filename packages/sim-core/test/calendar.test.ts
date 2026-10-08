import { describe, expect, it } from 'vitest';
import {
  DAYS_PER_SEASON,
  DAYS_PER_WEEK,
  DAYS_PER_YEAR,
  SUNRISE,
  SUNSET,
  TICKS_PER_YEAR,
  dayOf,
  dayOfSeason,
  isRestDay,
  minuteOf,
  seasonOf,
  tickAt,
  weekdayOf,
  yearOf,
} from '../src/calendar.ts';
import { dayLengthTable } from '../scripts/day-length.ts';

function dateOf(tick: number): number[] {
  const day = dayOf(tick);
  return [yearOf(day), seasonOf(day), dayOfSeason(day), minuteOf(tick)];
}

describe('the calendar', () => {
  it('round-trips ticks through their dates', () => {
    const ticks = [-1, 0, 1439, 1440, 161_279, 161_280];
    for (let tick = -2 * TICKS_PER_YEAR; tick <= 3 * TICKS_PER_YEAR; tick += 997) ticks.push(tick);
    const broken = ticks.filter((tick) => {
      const day = dayOf(tick);
      return tickAt(yearOf(day), seasonOf(day), dayOfSeason(day), minuteOf(tick)) !== tick;
    });
    expect(broken).toEqual([]);
  });

  it('lines up seasons, weeks and years', () => {
    expect(DAYS_PER_SEASON).toBe(4 * DAYS_PER_WEEK);
    expect(DAYS_PER_YEAR).toBe(4 * DAYS_PER_SEASON);
    for (let year = 1; year <= 3; year++) {
      for (let season = 0; season < 4; season++) {
        expect(weekdayOf(dayOf(tickAt(year, season, 1, 0))), `year ${year}, season ${season}`).toBe(0);
      }
    }
  });

  it('rests on the last two days of each week', () => {
    for (const firstDay of [-14, -7, 0, 7]) {
      const rest = [0, 1, 2, 3, 4, 5, 6].map((offset) => isRestDay(firstDay + offset));
      expect(rest, `week from day ${firstDay}`).toEqual([false, false, false, false, false, true, true]);
    }
  });

  it('turns the year at tick 161,280', () => {
    expect(TICKS_PER_YEAR).toBe(161_280);
    expect(dateOf(0)).toEqual([1, 0, 1, 0]);
    expect(dateOf(161_279)).toEqual([1, 3, 28, 1439]);
    expect(dateOf(161_280)).toEqual([2, 0, 1, 0]);
  });

  it('counts back before Year 1', () => {
    expect(dateOf(-1)).toEqual([0, 3, 28, 1439]);
  });

  it('gives 14 hours of light at mid-summer and 10 at mid-winter, centred on noon', () => {
    expect(SUNRISE).toHaveLength(DAYS_PER_YEAR);
    expect(SUNSET).toHaveLength(DAYS_PER_YEAR);
    expect(SUNSET[42] - SUNRISE[42]).toBe(840);
    expect(SUNSET[98] - SUNRISE[98]).toBe(600);
    for (let day = 0; day < DAYS_PER_YEAR; day++) {
      expect(SUNRISE[day] + SUNSET[day], `day ${day}`).toBe(1440);
    }
  });

  it('matches its generator', () => {
    const table = dayLengthTable();
    expect(Array.from(SUNRISE)).toEqual(table.sunrise);
    expect(Array.from(SUNSET)).toEqual(table.sunset);
  });
});
