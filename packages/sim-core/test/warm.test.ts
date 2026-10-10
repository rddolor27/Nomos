import { describe, expect, it } from 'vitest';
import { mix } from '../src/random/draw.ts';
import { WARM_AGENTS, WARM_DAYS, WARM_MEMORY_BYTES, WARM_SEED, WARM_TICKS, warmUp } from '../src/step/warm.ts';
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

  // The keyed draw hashes the seed first with draw.ts's golden-ratio constant. Seed 0 gives 33350994, which would warm the
  // code for small integers.
  it('seeds its throwaway world so the first mix of the seed is 2^31 or more', () => {
    expect(mix(WARM_SEED ^ 0x9e3779b9)).toBeGreaterThanOrEqual(2 ** 31);
  });
});
