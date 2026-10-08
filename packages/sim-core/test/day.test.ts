import { describe, expect, it } from 'vitest';
import { logFocus, logInput } from '../src/day.ts';
import { INPUT_CAPACITY, INPUT_FOCUS } from '../src/inputs.ts';
import { step } from '../src/step.ts';
import { checkpoint, createWorld, currentTick, restoreWorld, stateHash } from '../src/world.ts';
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
