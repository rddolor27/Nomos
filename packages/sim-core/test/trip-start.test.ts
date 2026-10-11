import { describe, expect, it } from 'vitest';
import { PURPOSE_FOOD, PURPOSE_GOODS } from '../src/street/errands.ts';
import { BUY_TICKS, EAT_TICKS, NO_START, startOf } from '../src/street/timetable.ts';
import { createWorld } from '../src/world/world.ts';

// Every trip is home by 22:00 (M2.7, Ruling 3). A trip is planned as a blob arrives home, after walkStreets has passed that
// blob in the tick, so it can leave no sooner than the next tick (M2.7 Part 1's review, finding 2).
const NIGHT = 1_320;
const MORNING = 360;
const FOOD_STAY = BUY_TICKS + EAT_TICKS;

describe("a shopping trip's start", () => {
  const world = createWorld(7, 'phone', undefined, 10);

  it('falls after the tick it is planned on, and leaves the blob home by 22:00', () => {
    const problems: string[] = [];
    let trips = 0;
    for (const purpose of [PURPOSE_FOOD, PURPOSE_GOODS]) {
      for (const ticks of [20, 100, 200, 300]) {
        for (let tick = MORNING; tick < NIGHT; tick++) {
          const start = startOf(world, 3, tick, purpose, ticks);
          if (start === NO_START) continue;
          trips++;
          if (start <= tick) problems.push(`purpose ${purpose}, way ${ticks}, tick ${tick}: starts at ${start}`);
          const stay = purpose === PURPOSE_FOOD ? FOOD_STAY : BUY_TICKS;
          if (start + stay + 2 * ticks > NIGHT) problems.push(`purpose ${purpose}, way ${ticks}, tick ${tick}: home after 22:00`);
        }
      }
    }
    expect(problems).toEqual([]);
    expect(trips).toBeGreaterThan(4_000);
  });

  it('is refused when only the tick it is planned on would still get the blob home', () => {
    // A way of 100 ticks and a meal leave 1,320 - 34 - 200 = tick 1,086 (18:06) as the last tick to set out.
    expect(startOf(world, 3, 1_085, PURPOSE_FOOD, 100)).toBe(1_086);
    expect(startOf(world, 3, 1_086, PURPOSE_FOOD, 100)).toBe(NO_START);
    // Before the streets open the start still falls in the morning's spread, from 06:00.
    const early = startOf(world, 3, 300, PURPOSE_FOOD, 100);
    expect(early).toBeGreaterThanOrEqual(MORNING);
    expect(early).toBeLessThan(MORNING + 240);
  });
});
