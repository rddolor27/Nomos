import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { TICKS_PER_DAY } from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import { allocationWindow, runTicks } from '../src/allocation.ts';
import { MAX_HEAP_GROWTH_BYTES_PER_TICK } from '../src/budgets.ts';
import { BENCH_WARM_DAYS, createBenchWorld, type BenchWorld } from '../src/sample.ts';

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
    const { scavenges, heapGrowthPerTick } = await allocationWindow(world, TICKS_PER_DAY, view);
    expect(scavenges).toBe(0);
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
});
