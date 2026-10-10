import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CITY, DAYS_PER_MONTH, LENGNICK } from '@nomos/sim-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseGrid, type Grid } from '../src/design/grid.ts';
import { judgeTarget } from '../src/targets/judge.ts';
import { SUMMARY_COLUMNS, summarize, type SummaryColumns, type SummaryMeta } from '../src/targets/summarize.ts';
import { TARGETS, type TargetId } from '../src/targets/targets.ts';

const LONG = process.env.ECONOMY_LONG === '1';
const CLI = fileURLToPath(new URL('../src/main.ts', import.meta.url));
// M2.3 Ruling 12: the confirmation runs 100 months on 50 seeds it never tuned on.
const CONFIRM_MONTHS = 100;
const CONFIRM_SEEDS = Array.from({ length: 50 }, (_, i) => 1001 + i);

function gridPath(name: string): string {
  return fileURLToPath(new URL(`../grids/${name}.json`, import.meta.url));
}

function readGrid(name: string): Grid {
  return parseGrid(JSON.parse(readFileSync(gridPath(name), 'utf8')));
}

function readColumn(folder: string, column: string): Float64Array {
  return new Float64Array(new Uint8Array(readFileSync(join(folder, `${column}.f64`))).buffer);
}

// Each target's value on every cell of a design run, in the cells' name order.
function summarizeRun(dir: string): Record<TargetId, number[]> {
  const values = Object.fromEntries(TARGETS.map((target) => [target.id, []])) as unknown as Record<TargetId, number[]>;
  for (const name of readdirSync(dir).sort()) {
    const folder = join(dir, name);
    const meta = JSON.parse(readFileSync(join(folder, 'meta.json'), 'utf8')) as SummaryMeta;
    const columns = Object.fromEntries(SUMMARY_COLUMNS.map((column) => [column, readColumn(folder, column)])) as SummaryColumns;
    const summary = summarize(columns, meta);
    for (const target of TARGETS) values[target.id].push(summary[target.id]);
  }
  return values;
}

describe('the calibration grids', () => {
  it.each([
    ['confirm-city', CITY],
    ['confirm-lengnick', LENGNICK],
  ] as const)("%s measures 100 months from the first month start on or after its preset's burn-in", (name, preset) => {
    const grid = readGrid(name);
    expect(grid.warmUpDays).toBe(preset.burnInDays);
    expect(grid.days).toBe((Math.ceil(preset.burnInDays / DAYS_PER_MONTH) + CONFIRM_MONTHS) * DAYS_PER_MONTH);
    expect(grid.seeds).toEqual(CONFIRM_SEEDS);
  });

  it.each(['sweep', 'refine', 'design'])('%s parses', (name) => {
    expect(() => readGrid(name)).not.toThrow();
  });
});

describe.runIf(LONG)('the city preset on fresh seeds (ECONOMY_LONG=1)', () => {
  let work = '';
  let values = {} as Record<TargetId, number[]>;

  beforeAll(() => {
    work = mkdtempSync(join(tmpdir(), 'nomos-confirm-city-'));
    const run = spawnSync(process.execPath, [CLI, 'design', '--grid', gridPath('confirm-city'), '--out', work], {
      encoding: 'utf8',
    });
    if (run.status !== 0) throw new Error(run.stderr);
    values = summarizeRun(work);
  }, 1_800_000);

  afterAll(() => {
    rmSync(work, { recursive: true, force: true });
  });

  it('judges all 50 seeds', () => {
    expect(values.unemployment_mean).toHaveLength(CONFIRM_SEEDS.length);
  });

  // The one confirmation (10 October 2026) held every tier-1 target, so no tier-1 gap is listed. Tier-2 misses are gaps
  // that rank, never filter (Ruling 12), and M2.3's task.md documents them.
  it.each(TARGETS.filter((target) => target.tier === 1))('$id holds', (target) => {
    expect(judgeTarget(target, values[target.id]).verdict).toBe('holds');
  });

  it('meets no crisis on every seed', () => {
    const [target] = TARGETS.filter((candidate) => candidate.id === 'no_crisis');
    expect(judgeTarget(target, values.no_crisis).verdict).toBe('holds');
  });
});
