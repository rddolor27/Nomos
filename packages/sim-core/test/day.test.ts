import { describe, expect, it } from 'vitest';
import { logFocus, logInput, logLayoffs } from '../src/day/day.ts';
import { CITY } from '../src/economy/city.ts';
import { ECONOMY_TICKS, economyDay } from '../src/economy/economy.ts';
import { STAT_FIRINGS } from '../src/economy/stats.ts';
import { createTown } from '../src/spawn/town.ts';
import { TICKS_PER_DAY } from '../src/time/calendar.ts';
import { INPUT_CAPACITY, INPUT_FOCUS } from '../src/world/inputs.ts';
import { step } from '../src/step/step.ts';
import { checkpoint, restoreWorld, stateHash } from '../src/world/checkpoint.ts';
import { standInGround } from '../src/world/ground.ts';
import { DAY_LAYOFFS, createWorld, currentTick, type World } from '../src/world/world.ts';
import { run } from './run.ts';

describe('the day boundary', () => {
  it('applies an input at the next day boundary, once', () => {
    const world = run(createWorld(42, 'phone'), 300);
    expect(world.focus[0]).toBe(-1);
    expect(logFocus(world, 3)).toBe(true);
    const log = world.inputs;
    expect([log.tick[0], log.kind[0], log.a[0], log.b[0]]).toEqual([300, INPUT_FOCUS, 3, 0]);

    run(world, 1_440);
    expect(world.focus[0]).toBe(-1);
    step(world);
    expect(world.focus[0]).toBe(3);
    world.focus[0] = -1; // a reapplied input would set it back to 3
    run(world, 2_881);
    expect(world.focus[0]).toBe(-1);
    expect(Array.from(log.cursor)).toEqual([1, 1]);

    const late = run(createWorld(42, 'phone'), 1_440);
    logFocus(late, 7);
    step(late);
    expect(late.focus[0]).toBe(7);
  });

  it('leaves the replay hash unchanged when a focus change touches nothing', () => {
    const plain = createWorld(42, 'phone');
    const watched = createWorld(42, 'phone');
    const focusAt = new Map([
      [300, 0],
      [2_000, 7],
    ]);
    for (const tick of [1_440, 1_441, 2_880, 2_881, 3_000]) {
      while (currentTick(watched) < tick) {
        const settlement = focusAt.get(currentTick(watched));
        if (settlement !== undefined) logFocus(watched, settlement);
        step(watched);
      }
      expect(stateHash(watched), `tick ${tick}`).toBe(stateHash(run(plain, tick)));
    }
    expect([watched.focus[0], watched.inputs.cursor[0]]).toEqual([7, 2]);
    expect([plain.focus[0], plain.inputs.cursor[0]]).toEqual([-1, 0]);
  });

  it('carries pending inputs through a checkpoint', () => {
    const original = run(createWorld(42, 'phone'), 300);
    logFocus(original, 5);
    run(original, 400);
    const restored = restoreWorld(42, 'phone', checkpoint(original));
    expect(Array.from(restored.inputs.cursor)).toEqual([1, 0]);
    run(original, 1_441);
    run(restored, 1_441);
    expect(restored.focus[0]).toBe(5);
    expect(restored.focus[0]).toBe(original.focus[0]);

    const edge = run(createWorld(42, 'phone'), 1_440);
    logFocus(edge, 6);
    const resumed = restoreWorld(42, 'phone', checkpoint(edge));
    step(resumed);
    expect([resumed.focus[0], ...resumed.inputs.cursor]).toEqual([6, 1, 1]);
  });

  it("refuses an input past the log's capacity", () => {
    const world = createWorld(42, 'phone');
    let accepted = 0;
    for (let n = 0; n < 4_096; n++) if (logInput(world, INPUT_FOCUS, n % 8, 0)) accepted++;
    expect(accepted).toBe(INPUT_CAPACITY);
    expect(logInput(world, INPUT_FOCUS, 0, 0)).toBe(false);
    expect(world.inputs.cursor[0]).toBe(4_096);
  });
});

const SEED = 42;
const PEOPLE = 1_000;
const LAID_OFF = 50;
const END_TICK = 3_000;
const MAX_INT32 = 2_147_483_647;

function town(): World {
  return createTown(SEED, 'phone', standInGround(), PEOPLE);
}

function employersOf(world: World): number[] {
  return Array.from(world.agents.employer.subarray(0, world.agents.count[0]));
}

function employedCount(world: World): number {
  let employed = 0;
  for (const employer of employersOf(world)) if (employer >= 0) employed++;
  return employed;
}

// The slot the boundary sums into, and the layoffs the day's economy has fired so far.
function layoffsOf(world: World): number[] {
  return [world.globals[DAY_LAYOFFS], world.economyScratch.stats[STAT_FIRINGS]];
}

describe('the layoffs input', () => {
  it("fires a logged 50 at the next day's start, as economyDay's shock does", () => {
    const world = run(town(), 300);
    const employed = employedCount(world);
    expect(logLayoffs(world, LAID_OFF)).toBe(true);

    run(world, TICKS_PER_DAY);
    expect(layoffsOf(world)).toEqual([0, 0]);
    expect(employedCount(world)).toBe(employed);

    step(world);
    expect(layoffsOf(world)).toEqual([LAID_OFF, LAID_OFF]);
    expect(employedCount(world)).toBe(employed - LAID_OFF);

    run(world, TICKS_PER_DAY + ECONOMY_TICKS);
    const twin = town();
    economyDay(twin, CITY, 0);
    economyDay(twin, CITY, 1, LAID_OFF);
    expect(employersOf(world)).toEqual(employersOf(twin));

    run(world, 2 * TICKS_PER_DAY + 1);
    expect(layoffsOf(world)).toEqual([0, 0]);
  });

  it("holds layoffs logged inside a day's economy window for the next day, and adds them up", () => {
    const world = run(town(), TICKS_PER_DAY + 5);
    const employed = employedCount(world);
    expect(logLayoffs(world, 30)).toBe(true);
    run(world, TICKS_PER_DAY + 700);
    expect(logLayoffs(world, 20)).toBe(true);

    run(world, 2 * TICKS_PER_DAY);
    expect(layoffsOf(world)).toEqual([0, 0]);
    expect(employedCount(world)).toBe(employed);

    step(world);
    expect(layoffsOf(world)).toEqual([LAID_OFF, LAID_OFF]);
    expect(employedCount(world)).toBe(employed - LAID_OFF);
  });

  it('refuses a count under 1 or past the int32 range, and clamps a day\'s sum at the largest int32', () => {
    const world = createWorld(SEED, 'phone');
    for (const people of [0, -50, MAX_INT32 + 1]) expect(logLayoffs(world, people), `${people}`).toBe(false);
    expect(world.inputs.cursor[0]).toBe(0);

    const accepted = [2_000_000_000, 2_000_000_000, 7].map((people) => logLayoffs(world, people));
    expect(accepted).toEqual([true, true, true]);
    step(world);
    expect(world.globals[DAY_LAYOFFS]).toBe(MAX_INT32);
  });

  it('reaches the same hash from a checkpoint taken with a layoff pending or after it fired', () => {
    const whole = run(town(), 300);
    logLayoffs(whole, LAID_OFF);
    const pending = checkpoint(run(whole, 800));
    const fired = checkpoint(run(whole, TICKS_PER_DAY + 5));
    run(whole, END_TICK);

    for (const state of [pending, fired]) {
      expect(stateHash(run(restoreWorld(SEED, 'phone', state), END_TICK))).toBe(stateHash(whole));
    }
    expect(stateHash(whole)).not.toBe(stateHash(run(town(), END_TICK)));
  });
});
