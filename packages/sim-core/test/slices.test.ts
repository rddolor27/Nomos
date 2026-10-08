import { describe, expect, it } from 'vitest';
import { ACTION_WALK } from '../src/actions.ts';
import {
  KIND_AGENTS,
  KIND_HOUSEHOLDS,
  SLICE,
  SPOILAGE_RULE,
  daySlice,
  daySliceCount,
  type SpoilageRule,
} from '../src/slices.ts';
import { step } from '../src/step.ts';
import { TIER_AGENTS, type Tier } from '../src/tiers.ts';
import {
  RECORD_DAY,
  RECORD_POPULATION,
  RECORD_WALKING,
  checkpoint,
  committed,
  createWorld,
  restoreWorld,
  stateHash,
} from '../src/world.ts';
import { run } from './run.ts';

const TIERS: readonly Tier[] = ['phone', 'phone-plus', 'desktop'];
const RULES: readonly SpoilageRule[] = ['accept-lateness', 'households-first', 'skip-expired', 'one-pass-at-10k'];
// Agents and households in R6's 10k, 25k and 100k cases.
const COUNTS: readonly (readonly [number, number])[] = [
  [10_000, 4_079],
  [25_000, 10_184],
  [100_000, 40_582],
];

function schedule(agents: number, households: number, rule: SpoilageRule, tier: Tier): number[][] {
  const out = new Int32Array(3);
  const slices: number[][] = [];
  for (let k = 0; k < daySliceCount(agents, households, rule, tier); k++) {
    daySlice(k, agents, households, rule, tier, out);
    slices.push(Array.from(out));
  }
  return slices;
}

// How many slices hold each entity, indexed by kind, and the sizes of the smallest and largest slices.
function coverage(agents: number, households: number, rule: SpoilageRule, tier: Tier) {
  const held = [new Uint8Array(agents), new Uint8Array(households)];
  let smallest = Infinity;
  let largest = 0;
  for (const [kind, from, to] of schedule(agents, households, rule, tier)) {
    for (let i = from; i < to; i++) held[kind][i]++;
    smallest = Math.min(smallest, to - from);
    largest = Math.max(largest, to - from);
  }
  return { held, smallest, largest };
}

function householdSlices(agents: number, households: number, rule: SpoilageRule, tier: Tier): number[] {
  return schedule(agents, households, rule, tier).flatMap(([kind], k) => (kind === KIND_HOUSEHOLDS ? [k] : []));
}

function ks(first: number, last: number): number[] {
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

// Slice j counts the walkers among its agents as they stand when tick j's step begins.
function walkersSeenBySlices(slices: number): number {
  const twin = createWorld(42, 'phone');
  let walkers = 0;
  for (let j = 0; j < slices; j++) {
    const actions = twin.agents.action.subarray(j * SLICE, Math.min(10_000, (j + 1) * SLICE));
    walkers += actions.filter((action) => action === ACTION_WALK).length;
    step(twin);
  }
  return walkers;
}

describe('sliced day work', () => {
  it('slices 10k, 25k and 100k agents into 10, 25 and 98 slices', () => {
    expect(SLICE).toBe(1_024);
    expect(SPOILAGE_RULE).toBe('skip-expired');
    expect(TIERS.map((tier) => daySliceCount(TIER_AGENTS[tier], 0, SPOILAGE_RULE, tier))).toEqual([10, 25, 98]);
  });

  it('covers every entity once a day under every rule', () => {
    for (const [agents, households] of COUNTS) {
      for (const rule of RULES) {
        for (const tier of TIERS) {
          const label = `${agents} agents, ${households} households, ${rule}, ${tier}`;
          const { held, smallest, largest } = coverage(agents, households, rule, tier);
          expect(held[KIND_AGENTS].every((n) => n === 1), label).toBe(true);
          expect(held[KIND_HOUSEHOLDS].every((n) => n === 1), label).toBe(true);
          expect(smallest, label).toBeGreaterThan(0);
          if (rule !== 'one-pass-at-10k' || tier !== 'phone') expect(largest, label).toBeLessThanOrEqual(1_024);
        }
      }
    }
  });

  it('orders slices by the spoilage rule', () => {
    for (const rule of ['accept-lateness', 'skip-expired'] as const) {
      expect(daySliceCount(100_000, 40_582, rule, 'desktop'), rule).toBe(138);
      expect(householdSlices(100_000, 40_582, rule, 'desktop'), rule).toEqual(ks(98, 137));
    }
    expect(householdSlices(100_000, 40_582, 'households-first', 'desktop')).toEqual(ks(0, 39));
    expect(schedule(100_000, 40_582, 'one-pass-at-10k', 'desktop')).toEqual(
      schedule(100_000, 40_582, 'accept-lateness', 'desktop'),
    );
    expect(schedule(25_000, 10_184, 'one-pass-at-10k', 'phone-plus')).toEqual(
      schedule(25_000, 10_184, 'accept-lateness', 'phone-plus'),
    );
    expect(schedule(10_000, 4_079, 'one-pass-at-10k', 'phone')).toEqual([
      [KIND_HOUSEHOLDS, 0, 4_079],
      [KIND_AGENTS, 0, 10_000],
    ]);
  });

  it('commits the settlement record when the last slice ends', () => {
    const n = daySliceCount(10_000, 0, SPOILAGE_RULE, 'phone');
    expect(n).toBe(10);
    const world = run(createWorld(42, 'phone'), n - 1);
    expect(committed(world, RECORD_DAY)).toBe(-1);
    step(world);
    expect([RECORD_DAY, RECORD_POPULATION, RECORD_WALKING].map((field) => committed(world, field))).toEqual([
      0,
      10_000,
      walkersSeenBySlices(n),
    ]);

    run(world, 1_440 + n - 1);
    expect([committed(world, RECORD_DAY), committed(world, RECORD_POPULATION)]).toEqual([0, 10_000]);
    step(world);
    expect([committed(world, RECORD_DAY), committed(world, RECORD_POPULATION)]).toEqual([1, 10_000]);
    run(world, 2_880 + n);
    expect([committed(world, RECORD_DAY), committed(world, RECORD_POPULATION)]).toEqual([2, 10_000]);
  });

  it('restores a checkpoint taken mid-window', () => {
    const lastSliceTick = daySliceCount(10_000, 0, SPOILAGE_RULE, 'phone') - 1;
    const original = run(createWorld(42, 'phone'), 6);
    const restored = restoreWorld(42, 'phone', checkpoint(original));
    for (const world of [original, restored]) {
      run(world, lastSliceTick);
      expect(committed(world, RECORD_DAY)).toBe(-1);
      step(world);
      expect(committed(world, RECORD_DAY)).toBe(0);
    }
    expect(stateHash(run(restored, 1_000))).toBe(stateHash(run(original, 1_000)));
  });
});
