import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { mix } from '../src/random/draw.ts';
import { populationAt } from '../src/spawn/record.ts';
import { switchTown } from '../src/spawn/switch.ts';
import {
  WARM_AGENTS,
  WARM_DAYS,
  WARM_MEMORY_BYTES,
  WARM_SEED,
  WARM_SWITCH_PLACE,
  WARM_TICKS,
  warmUp,
} from '../src/step/warm.ts';
import { stateHash } from '../src/world/checkpoint.ts';
import { createWorld } from '../src/world/world.ts';
import { switchHash, type Goldens } from './engines/checks.ts';
import { run } from './run.ts';

// The real switch, wrapped so a test can see which world the warm-up switched and where it ended.
vi.mock('../src/spawn/switch.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/spawn/switch.ts')>();
  return { ...real, switchTown: vi.fn(real.switchTown) };
});

const goldens: Goldens = JSON.parse(readFileSync(new URL('./fixtures/goldens.json', import.meta.url), 'utf8'));

describe('the warm-up', () => {
  it('warms up without changing any replay', () => {
    expect([WARM_AGENTS, WARM_MEMORY_BYTES, WARM_DAYS, WARM_TICKS]).toEqual([1_024, 1_048_576, 40, 2_000]);
    const before = stateHash(run(createWorld(42, 'phone'), 1_000));
    warmUp();
    expect(stateHash(run(createWorld(42, 'phone'), 1_000))).toBe(before);
  });

  it('switches its throwaway town once, to a second place, which leaves the first as a row', () => {
    vi.mocked(switchTown).mockClear();
    warmUp();
    const calls = vi.mocked(switchTown).mock.calls;
    expect(calls).toHaveLength(1);
    const [warmed] = calls[0];
    expect([warmed.focus[0], warmed.agents.count[0], populationAt(warmed.townRecords, 0)]).toEqual([
      WARM_SWITCH_PLACE,
      WARM_AGENTS,
      WARM_AGENTS,
    ]);
  });

  it('changes no switch replay', () => {
    const { seed, tier, people, requests, ticks, hash } = goldens.switch;
    warmUp();
    expect(switchHash(seed, tier, people, requests, ticks)).toBe(hash);
  });

  // The keyed draw hashes the seed first with draw.ts's golden-ratio constant. Seed 0 gives 33350994, which would warm the
  // code for small integers.
  it('seeds its throwaway world so the first mix of the seed is 2^31 or more', () => {
    expect(mix(WARM_SEED ^ 0x9e3779b9)).toBeGreaterThanOrEqual(2 ** 31);
  });
});
