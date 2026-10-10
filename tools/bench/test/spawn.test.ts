import {
  LEDGER_EMPLOYED,
  LEDGER_FIELDS,
  LEDGER_FIRMS,
  LEDGER_HOUSEHOLDS,
  LENGNICK,
  OK,
  TIER_AGENTS,
  TIER_MEMORY_BYTES,
  checkCash,
  checkRecord,
  foldToLedger,
  layoutWorld,
  populationOf,
  spawnFromLedger,
  stateHash,
} from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import { BUDGET_ROWS, MIN_SAMPLES, SPAWN_ROW } from '../src/compute/budgets.ts';
import { judge } from '../src/compute/judge.ts';
import { benchHomes, benchRecord, sampleSpawn } from '../src/compute/spawn.ts';

function desktopWorld(seed: number) {
  return layoutWorld(seed, 'desktop', TIER_AGENTS.desktop, TIER_MEMORY_BYTES.desktop);
}

// Each spawn of a 100,000-person city and each desktop layout takes tens of ms, and 64 MiB of arena.
describe('the spawn bench city', { timeout: 120_000 }, () => {
  it('holds 100,000 people and 10,000 firms, and fits a desktop world', () => {
    const record = benchRecord();
    expect(populationOf(record)).toBe(100_000);
    expect(record[LEDGER_FIRMS]).toBe(10_000);
    expect(Array.from(record.subarray(LEDGER_HOUSEHOLDS, LEDGER_EMPLOYED))).toEqual([12_000, 12_000, 6_000, 6_000, 2_000, 2_000]);
    expect(() => checkRecord(record, desktopWorld(1))).not.toThrow();
  });

  it('spawns into a city that folds back into the record, and hashes as it did when the row was set', () => {
    const record = benchRecord();
    const world = desktopWorld(1);
    spawnFromLedger(world, record, benchHomes(), LENGNICK, 0, 0);

    const folded = new Float64Array(LEDGER_FIELDS);
    foldToLedger(world, folded);
    expect(Array.from(folded)).toEqual(Array.from(record));
    expect(checkCash(world.cash)).toBe(OK);
    expect(stateHash(world).toString(16)).toBe('62d5bf30');
  });
});

describe('sampling spawns', { timeout: 120_000 }, () => {
  it('times each spawn between two clock reads, after one that is not timed', () => {
    let reads = 0;
    const steppingClock = () => 7 * reads++;
    const samples = sampleSpawn(3, steppingClock);
    expect(reads).toBe(2 * 3);
    expect(Object.keys(samples)).toEqual([SPAWN_ROW.system]);
    expect(Array.from(samples[SPAWN_ROW.system])).toEqual([7, 7, 7]);
  });
});

describe('the spawn row', () => {
  it('is a desktop-only row of 35 ms, judged with the gate tolerance and kept out of the tick rows', () => {
    expect(SPAWN_ROW.rmMs).toEqual({ desktop: 35 });
    expect(BUDGET_ROWS).not.toContain(SPAWN_ROW);
    const within = { spawn: new Float64Array(MIN_SAMPLES).fill(38.4) };
    const over = { spawn: new Float64Array(MIN_SAMPLES).fill(38.6) };
    expect(judge([SPAWN_ROW], 'desktop', within)[0].pass).toBe(true);
    expect(judge([SPAWN_ROW], 'desktop', over)[0].pass).toBe(false);
  });
});
