import { ECONOMY_TICKS, SPOILAGE_RULE, TICKS_PER_DAY, TIER_AGENTS, daySliceCount } from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import { BUDGET_ROWS, REPORTED_WORST } from '../src/compute/budgets.ts';
import { BENCH_WARM_DAYS, SAMPLE_DAYS, sampleTier } from '../src/compute/sample.ts';

// sampleTier reads the clock six times a tick: at its start, at the day, move and economy laps, and around the snapshot.
const READS_PER_TICK = 6;
const DAY_LAP_READ = 1;
const ECONOMY_LAP_READ = 3;
const BOUNDARY_MS = 1.0;
const SLICE_MS = 0.3;
const COLD_BOUNDARY_MS = 5.0;
const ECONOMY_SYSTEM_MS = 0.4;
const SHOPPING_MS = 1.1;
const SHOPPING_TICK = 6;

// The day system takes 1.0 ms at the boundary and 0.3 ms in each later slice, and the economy 0.4 ms in each of its ticks
// but 1.1 ms in its 7th, which shops. Nothing else takes any time. The warm days' boundaries take 5.0 ms, as a cold first
// day would, so a sample that kept them would show it.
function lapClock(slices: number): () => number {
  let reads = 0;
  let clockMs = 0;
  return () => {
    const tick = Math.floor(reads / READS_PER_TICK);
    const tickOfDay = tick % TICKS_PER_DAY;
    const boundaryMs = tick < BENCH_WARM_DAYS * TICKS_PER_DAY ? COLD_BOUNDARY_MS : BOUNDARY_MS;
    if (reads % READS_PER_TICK === DAY_LAP_READ && tickOfDay < slices) {
      clockMs += tickOfDay === 0 ? boundaryMs : SLICE_MS;
    }
    if (reads % READS_PER_TICK === ECONOMY_LAP_READ && tickOfDay < ECONOMY_TICKS) {
      clockMs += tickOfDay === SHOPPING_TICK ? SHOPPING_MS : ECONOMY_SYSTEM_MS;
    }
    reads++;
    return clockMs;
  };
}

// Both tests step real 10,000-agent days, which a busy CI runner slows well past Vitest's 5 s default.
describe('sampling a tier', { timeout: 120_000 }, () => {
  it("takes each day's worst tick", () => {
    const slices = daySliceCount(TIER_AGENTS.phone, 0, SPOILAGE_RULE, 'phone');
    const { day, economy } = sampleTier('phone', 2, lapClock(slices));
    expect(Array.from(day)).toEqual([expect.closeTo(BOUNDARY_MS, 9), expect.closeTo(BOUNDARY_MS, 9)]);
    expect(Array.from(economy)).toEqual([expect.closeTo(SHOPPING_MS, 9), expect.closeTo(SHOPPING_MS, 9)]);
  });

  it('samples a phone world', () => {
    const samples = sampleTier('phone', SAMPLE_DAYS, () => performance.now());
    for (const system of [...BUDGET_ROWS.map((row) => row.system), ...REPORTED_WORST]) {
      expect(samples[system], system).toHaveLength(SAMPLE_DAYS);
      expect(Array.from(samples[system]).every((ms) => ms > 0), system).toBe(true);
    }
  });
});
