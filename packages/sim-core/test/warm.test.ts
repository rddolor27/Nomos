import { describe, expect, it } from 'vitest';
import { WARM_AGENTS, WARM_DAYS, WARM_MEMORY_BYTES, WARM_TICKS, warmUp } from '../src/step/warm.ts';
import { stateHash } from '../src/world/checkpoint.ts';
import { createWorld } from '../src/world/world.ts';
import { run } from './run.ts';

describe('the warm-up', () => {
  it('warms up without changing any replay', () => {
    expect([WARM_AGENTS, WARM_MEMORY_BYTES, WARM_DAYS, WARM_TICKS]).toEqual([1_024, 1_048_576, 40, 2_000]);
    const before = stateHash(run(createWorld(42, 'phone'), 1_000));
    warmUp();
    expect(stateHash(run(createWorld(42, 'phone'), 1_000))).toBe(before);
  });
});
