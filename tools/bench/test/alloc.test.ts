import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { DAYS_PER_MONTH, TICKS_PER_DAY, dayOfMonth } from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import { allocationWindow, runTicks } from '../src/compute/allocation.ts';
import {
  ALLOCATION_DAYS,
  MAX_HEAP_GROWTH_BYTES_PER_TICK,
  MAX_YOUNG_BYTES_PER_DAY,
  allocationLimit,
} from '../src/compute/budgets.ts';
import { BENCH_WARM_DAYS, createBenchWorld, type BenchWorld } from '../src/compute/sample.ts';

// Vitest runs without --expose-gc, so the tests expose gc themselves. Each window then starts from a full collection,
// as the CLI's does, so no scavenge left due by earlier work can land in it.
setFlagsFromString('--expose-gc');
globalThis.gc ??= runInNewContext('gc');

function warmedPhoneWorld(): BenchWorld {
  const bench = createBenchWorld('phone');
  runTicks(bench.world, BENCH_WARM_DAYS * TICKS_PER_DAY, bench.view);
  return bench;
}

// Each test steps two 10,000-agent days and waits a second for late GC reports.
describe('the allocation window', { timeout: 120_000 }, () => {
  it('sees no scavenge in a day of phone ticks', async () => {
    const { world, view } = warmedPhoneWorld();
    const { scavenges, youngBytes, heapGrowthPerTick } = await allocationWindow(world, TICKS_PER_DAY, view);
    expect(scavenges).toBe(0);
    expect(youngBytes).toBeLessThanOrEqual(MAX_YOUNG_BYTES_PER_DAY);
    expect(heapGrowthPerTick).toBeLessThan(MAX_HEAP_GROWTH_BYTES_PER_TICK);
  });

  it('counts a planted allocator', async () => {
    const { world, view } = warmedPhoneWorld();
    const kept: unknown[] = [];
    const { scavenges } = await allocationWindow(world, TICKS_PER_DAY, view, () => {
      kept[0] = new Array(10_000);
    });
    expect(scavenges).toBeGreaterThan(0);
  });

  // A warmed young generation absorbs this whole day of garbage, so only the bytes in use show it.
  it('counts a planted allocator too small for a scavenge', async () => {
    const { world, view } = warmedPhoneWorld();
    const kept: unknown[] = [];
    const { scavenges, youngBytes } = await allocationWindow(world, TICKS_PER_DAY, view, () => {
      kept[0] = new Array(8);
    });
    expect(scavenges).toBe(0);
    expect(youngBytes).toBeGreaterThan(MAX_YOUNG_BYTES_PER_DAY);
  });
});

// A plain day runs 4 of the economy's 18 systems. A month's last day adds the 7 month-end systems and the month record, and
// its next day the 5 month-start systems, so the gate needs both.
describe('the allocation days', () => {
  it('are a plain day, a month end and the next month start', () => {
    expect(ALLOCATION_DAYS).toEqual([1, 20, 21]);
    expect(ALLOCATION_DAYS.map((day) => dayOfMonth(day))).toEqual([1, DAYS_PER_MONTH - 1, 0]);
  });

  it('come in order and after the warm days, which the gate walks through once', () => {
    expect(ALLOCATION_DAYS[0]).toBeGreaterThanOrEqual(BENCH_WARM_DAYS);
    expect(ALLOCATION_DAYS.every((day, i) => i === 0 || day > ALLOCATION_DAYS[i - 1])).toBe(true);
  });
});

// A plain day keeps the strict limit. The once-a-month systems box numbers in V8's cold tiers, so their two days have an
// interim allowance until M6 (coordinator, 11 October 2026).
describe('the allocation limits', () => {
  it('give a plain day 16 KiB and no scavenge, and a month end and start their allowance', () => {
    expect(allocationLimit(1)).toEqual({ scavenges: 0, youngBytes: MAX_YOUNG_BYTES_PER_DAY });
    expect(allocationLimit(20)).toEqual({ scavenges: 2, youngBytes: 1_114_112 });
    expect(allocationLimit(21)).toEqual({ scavenges: 0, youngBytes: 262_144 });
  });

  it('follow the day of the month, so day 0 starts a month and day 41 ends one', () => {
    expect(allocationLimit(0)).toBe(allocationLimit(21));
    expect(allocationLimit(41)).toBe(allocationLimit(20));
    expect(allocationLimit(40)).toBe(allocationLimit(1));
  });
});
