import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DAYS_PER_MONTH,
  FLOW_LOG_SCHEMA,
  LENGNICK,
  LEDGER_FIELDS,
  LEDGER_PRICE,
  LEDGER_WAGE,
  STAT_NAMES,
  TIER_AGENTS,
  TIER_MEMORY_BYTES,
  createStandInHomes,
  createWorld,
  economyDay,
  foldToLedger,
  layoutWorld,
  spawnFromLedger,
  startEconomy,
  type EconomyParams,
  type World,
} from '@nomos/sim-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listCells, parseGrid } from '../src/design/grid.ts';
import { PRESETS } from '../src/economy/presets.ts';
import { SUMMARY_COLUMNS } from '../src/targets/summarize.ts';

const CLI = fileURLToPath(new URL('../src/main.ts', import.meta.url));
const SMOKE = fileURLToPath(new URL('../grids/smoke.json', import.meta.url));
// The flow-log schema's 29 columns, day, district and meta.json.
const FILES_PER_CELL = STAT_NAMES.length + 3;

const BASE = {
  preset: 'lengnick',
  start: 'hand',
  days: 63,
  warmUpDays: 21,
  seeds: [1, 2],
  sizes: [1000, 3000],
  policeShares: [0],
  shocks: [
    { day: 0, unemploymentPoints: 0 },
    { day: 30, unemploymentPoints: 5 },
  ],
};

describe('a grid', () => {
  it('lists its cells point, size, police share, shock, then seed', () => {
    const cells = listCells(parseGrid(BASE));
    expect(cells.map((cell) => cell.name)).toEqual([
      'p000-n1000-x0-k0-s1', 'p000-n1000-x0-k0-s2', 'p000-n1000-x0-k1-s1', 'p000-n1000-x0-k1-s2',
      'p000-n3000-x0-k0-s1', 'p000-n3000-x0-k0-s2', 'p000-n3000-x0-k1-s1', 'p000-n3000-x0-k1-s2',
    ]);
    expect(cells.map((cell) => cell.layoffs)).toEqual([0, 0, 50, 50, 0, 0, 150, 150]);
  });

  it("gives each cell the preset's params at its size, in the smallest tier that holds it", () => {
    const [small, , , , large] = listCells(parseGrid(BASE));
    expect(small.params).toEqual({ ...PRESETS.lengnick, households: 1000, firms: 100 });
    expect(large.params).toEqual({ ...PRESETS.lengnick, households: 3000, firms: 300 });
    const tiers = listCells(parseGrid({ ...BASE, sizes: [1000, 10_000, 25_000, 30_000, 100_000] }));
    expect(tiers.filter((cell) => cell.seed === 1 && cell.shock.day === 0).map((cell) => cell.tier)).toEqual([
      'phone', 'phone', 'phone-plus', 'desktop', 'desktop',
    ]);
  });

  it('overrides the preset with its own params, and warms up for the preset burn-in unless told otherwise', () => {
    const grid = { ...BASE, preset: 'city', days: 20_000, warmUpDays: undefined, params: { jobSearches: 6 } };
    const [cell] = listCells(parseGrid(grid));
    expect(cell.warmUpDays).toBe(PRESETS.city.burnInDays);
    expect(cell.params).toEqual({ ...PRESETS.city, jobSearches: 6, households: 1000, firms: 100 });
  });

  it("says when the preset's burn-in leaves no run to measure", () => {
    const message = new RegExp(`grid\\.warmUpDays.*${PRESETS.lengnick.burnInDays}`);
    expect(() => parseGrid({ ...BASE, warmUpDays: undefined })).toThrow(message);
  });

  const BAD: readonly [string, unknown, RegExp][] = [
    ['an unknown field', { ...BASE, warmupDays: 21 }, /grid\.warmupDays/],
    ['a missing field', { ...BASE, days: undefined }, /grid\.days/],
    ['an unknown preset', { ...BASE, preset: 'mark0' }, /grid\.preset/],
    ['an unknown start', { ...BASE, start: 'warm' }, /grid\.start/],
    ['no seeds', { ...BASE, seeds: [] }, /grid\.seeds/],
    ['a repeated seed', { ...BASE, seeds: [1, 2, 1] }, /grid\.seeds\[2\]/],
    ['a size off the 1,000 step', { ...BASE, sizes: [1000, 1500] }, /grid\.sizes\[1\]/],
    ['a size above 100,000', { ...BASE, sizes: [101_000] }, /grid\.sizes\[0\]/],
    ['a negative police share', { ...BASE, policeShares: [0, -1] }, /grid\.policeShares\[1\]/],
    ['a shock on the first day past the run', { ...BASE, shocks: [{ day: 63, unemploymentPoints: 5 }] }, /grid\.shocks\[0\]\.day/],
    ['a shock of over 100 points', { ...BASE, shocks: [{ day: 3, unemploymentPoints: 101 }] }, /grid\.shocks\[0\]\.unemploymentPoints/],
    ['a warm-up that fills the run', { ...BASE, warmUpDays: 63 }, /grid\.warmUpDays/],
    ['an unknown param', { ...BASE, params: { jobSearchez: 5 } }, /grid\.params\.jobSearchez/],
    ['a param the size sets', { ...BASE, params: { households: 500 } }, /grid\.params\.households/],
    ['a param that fails checkParams', { ...BASE, params: { jobSearches: 3, slowSearcherPpm: 100_000 } }, /slowJobSearches must be 1 to 3/],
    ['a lhs with a spawn start', { ...BASE, start: 'spawn', lhs: { points: 4, seed: 1, ranges: { bufferPpm: [0, 9] } } }, /grid\.lhs/],
    ['a lhs knob that is no param', { ...BASE, lhs: { points: 4, seed: 1, ranges: { nope: [0, 9] } } }, /grid\.lhs\.ranges\.nope/],
    ['a lhs range read backwards', { ...BASE, lhs: { points: 4, seed: 1, ranges: { bufferPpm: [9, 0] } } }, /grid\.lhs\.ranges\.bufferPpm/],
    ['a lhs knob that params also sets', { ...BASE, params: { bufferPpm: 5 }, lhs: { points: 4, seed: 1, ranges: { bufferPpm: [0, 9] } } }, /grid\.lhs\.ranges\.bufferPpm/],
    [
      'a lhs point that fails checkParams',
      { ...BASE, params: { slowSearcherPpm: 100_000 }, lhs: { points: 10, seed: 1, ranges: { slowJobSearches: [1, 9] } } },
      /slowJobSearches must be 1 to 5/,
    ],
  ];

  it.each(BAD)('refuses %s, naming the field', (_what, grid, message) => {
    expect(() => parseGrid(grid)).toThrow(message);
  });

  it('lets a grid lower jobSearches under a preset with no slow searchers', () => {
    expect(() => parseGrid({ ...BASE, params: { jobSearches: 3 } })).not.toThrow();
  });
});

describe('a Latin hypercube', () => {
  const LHS = { points: 10, seed: 7, ranges: { priceStepPpm: [0, 99], bufferPpm: [1000, 1999] } };

  function hypercube(seed: number): { step: number[]; buffer: number[] } {
    const cells = listCells(parseGrid({ ...BASE, seeds: [1], sizes: [1000], shocks: [BASE.shocks[0]], lhs: { ...LHS, seed } }));
    return { step: cells.map((cell) => cell.params.priceStepPpm), buffer: cells.map((cell) => cell.params.bufferPpm) };
  }

  it('puts one point in each tenth of each range', () => {
    const { step, buffer } = hypercube(LHS.seed);
    expect(step.map((value) => Math.floor(value / 10)).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(buffer.map((value) => Math.floor((value - 1000) / 100)).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('numbers its points from 0, and is the same for the same seed and not for another', () => {
    const cells = listCells(parseGrid({ ...BASE, seeds: [1], sizes: [1000], shocks: [BASE.shocks[0]], lhs: LHS }));
    expect(cells.map((cell) => cell.name.slice(0, 4))).toEqual(['p000', 'p001', 'p002', 'p003', 'p004', 'p005', 'p006', 'p007', 'p008', 'p009']);
    expect(hypercube(7)).toEqual(hypercube(7));
    expect(hypercube(8)).not.toEqual(hypercube(7));
  });

  it("does not move a knob's points when another knob is added after it", () => {
    const alone = listCells(parseGrid({ ...BASE, seeds: [1], sizes: [1000], shocks: [BASE.shocks[0]], lhs: { ...LHS, ranges: { priceStepPpm: [0, 99] } } }));
    expect(alone.map((cell) => cell.params.priceStepPpm)).toEqual(hypercube(LHS.seed).step);
  });
});

function design(grid: string, out: string, threads: number): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [CLI, 'design', '--grid', grid, '--out', out, '--threads', String(threads)], {
    encoding: 'utf8',
  });
}

function filesOf(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)))
    .sort();
}

function expectSameFiles(actual: string, expected: string): void {
  const names = filesOf(expected);
  expect(filesOf(actual)).toEqual(names);
  for (const name of names) {
    expect(readFileSync(join(actual, name)).equals(readFileSync(join(expected, name))), name).toBe(true);
  }
}

function readColumn(folder: string, name: string): number[] {
  return Array.from(new Float64Array(new Uint8Array(readFileSync(join(folder, `${name}.f64`))).buffer));
}

// The rows a bare economyDay loop gives for a started world, one Float64Array of stats a day.
function plainRows(world: World, params: EconomyParams, days: number, shock: { day: number; layoffs: number }): Float64Array[] {
  const rows: Float64Array[] = [];
  for (let day = 0; day < days; day++) {
    economyDay(world, params, day, day === shock.day ? shock.layoffs : 0);
    rows.push(Float64Array.from(world.economyScratch.stats));
  }
  return rows;
}

function expectColumns(folder: string, rows: readonly Float64Array[]): void {
  expect(readColumn(folder, 'day')).toEqual(rows.map((_, day) => day));
  expect(readColumn(folder, 'district')).toEqual(rows.map(() => 0));
  for (let slot = 0; slot < STAT_NAMES.length; slot++) {
    expect(readColumn(folder, STAT_NAMES[slot]), STAT_NAMES[slot]).toEqual(rows.map((row) => row[slot]));
  }
}

// R*, as M2.2's burn-in comparison makes it: seed 42's hand-built city after 472 whole months, which is the first month end
// on or after the preset's 9,893 burn-in days.
function sourceRecord(): Float64Array {
  const world = createWorld(42, 'phone', undefined, LENGNICK.households);
  startEconomy(world, LENGNICK);
  for (let day = 0; day < 472 * DAYS_PER_MONTH; day++) economyDay(world, LENGNICK, day);
  const record = new Float64Array(LEDGER_FIELDS);
  foldToLedger(world, record);
  return record;
}

describe('the design command', { timeout: 300_000 }, () => {
  let work = '';
  let handGrid = '';
  // The one-thread runs of the smoke grid, from a spawn and from a hand-built start, that the tests read.
  let spawnRun: SpawnSyncReturns<string>;
  let handRun: SpawnSyncReturns<string>;

  beforeAll(() => {
    work = mkdtempSync(join(tmpdir(), 'nomos-design-'));
    handGrid = join(work, 'hand.json');
    writeFileSync(handGrid, JSON.stringify({ ...JSON.parse(readFileSync(SMOKE, 'utf8')), start: 'hand' }));
    spawnRun = design(SMOKE, join(work, 'spawn-1'), 1);
    handRun = design(handGrid, join(work, 'hand-1'), 1);
  }, 300_000);

  afterAll(() => {
    rmSync(work, { recursive: true, force: true });
  });

  it('design runner is deterministic: the same bytes on one thread and on four', () => {
    for (const [start, grid, run] of [['spawn', SMOKE, spawnRun], ['hand', handGrid, handRun]] as const) {
      expect(run.status, run.stderr).toBe(0);
      const four = design(grid, join(work, `${start}-4`), 4);
      expect(four.status, four.stderr).toBe(0);
      expect(filesOf(join(work, `${start}-1`))).toHaveLength(8 * FILES_PER_CELL);
      expectSameFiles(join(work, `${start}-4`), join(work, `${start}-1`));
    }
  });

  it("reports each cell's sim days per second on stderr and the cell count on stdout", () => {
    expect(handRun.stdout).toBe(`8 cells in ${join(work, 'hand-1')}\n`);
    for (const cell of listCells(parseGrid(JSON.parse(readFileSync(handGrid, 'utf8'))))) {
      expect(handRun.stderr).toMatch(new RegExp(`${cell.name}: sim days per second: \\d+`));
    }
  });

  it('writes a meta.json with the cell, the preset, the full params and no times or thread ids', () => {
    const meta = JSON.parse(readFileSync(join(work, 'spawn-1', 'p000-n3000-x0-k1-s2', 'meta.json'), 'utf8'));
    expect(meta).toEqual({
      schema: FLOW_LOG_SCHEMA,
      commit: expect.stringMatching(/^([0-9a-f]{40}|unknown)$/),
      cell: 'p000-n3000-x0-k1-s2',
      preset: 'lengnick',
      start: 'spawn',
      seed: 2,
      size: 3000,
      tier: 'phone',
      policeShare: 0,
      shock: { day: 30, unemploymentPoints: 5 },
      layoffs: 150,
      point: 0,
      params: { ...LENGNICK, households: 3000, firms: 300 },
      days: 63,
      warmUpDays: 21,
      districts: 1,
      columns: ['day', 'district', ...STAT_NAMES],
    });
  });

  it('writes the stats rows a plain economyDay loop gives, from a hand-built start', () => {
    const world = createWorld(1, 'phone', undefined, 1000);
    startEconomy(world, LENGNICK);
    expectColumns(join(work, 'hand-1', 'p000-n1000-x0-k1-s1'), plainRows(world, LENGNICK, 63, { day: 30, layoffs: 50 }));
  });

  it("writes the stats rows a plain economyDay loop gives, from a spawn of R* scaled by the size", () => {
    const record = sourceRecord();
    for (const size of [1000, 3000]) {
      const scaled = record.map((value, field) => (field === LEDGER_PRICE || field === LEDGER_WAGE ? value : (value * size) / 1000));
      const params = { ...LENGNICK, households: size, firms: size / 10 };
      const world = layoutWorld(2, 'phone', TIER_AGENTS.phone, TIER_MEMORY_BYTES.phone);
      spawnFromLedger(world, scaled, createStandInHomes(world.ground, Math.ceil(size / 3)), params, 0, 0);
      const rows = plainRows(world, params, 63, { day: 30, layoffs: size / 20 });
      expectColumns(join(work, 'spawn-1', `p000-n${size}-x0-k1-s2`), rows);
    }
  });

  it('writes every column the target suite reads, so targets judges the run', () => {
    expect(SUMMARY_COLUMNS.filter((name) => !STAT_NAMES.includes(name))).toEqual([]);
    const run = spawnSync(process.execPath, [CLI, 'targets', join(work, 'spawn-1')], { encoding: 'utf8' });
    expect(run.status, run.stderr).toBe(0);
    for (const group of ['p000-n1000-x0-k0', 'p000-n1000-x0-k1', 'p000-n3000-x0-k0', 'p000-n3000-x0-k1']) {
      expect(run.stdout).toContain(`${group}: 2 seeds`);
    }
    expect(run.stdout).toMatch(/^unemployment_mean\s+1\s+0\.04 to 0\.09\s+0\.\d+/m);
  });

  it('ends the run with exit code 1 when a worker fails', () => {
    const out = join(work, 'blocked');
    mkdirSync(out);
    writeFileSync(join(out, 'p000-n1000-x0-k0-s1'), 'a file where the cell folder goes');
    const run = design(handGrid, out, 2);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('p000-n1000-x0-k0-s1');
  });

  it('refuses a missing --grid or --out, a bad --threads and a bad grid, naming what is wrong', () => {
    const refused = (...args: string[]): SpawnSyncReturns<string> =>
      spawnSync(process.execPath, [CLI, 'design', ...args], { encoding: 'utf8' });
    expect(refused('--out', work).stderr).toContain('design takes --grid <file> --out <dir>');
    expect(refused('--grid', SMOKE).stderr).toContain('design takes --grid <file> --out <dir>');
    expect(refused('--grid', SMOKE, '--out', work, '--threads', '0').stderr).toContain('--threads must be a whole number');
    const bad = join(work, 'bad.json');
    writeFileSync(bad, JSON.stringify({ ...JSON.parse(readFileSync(SMOKE, 'utf8')), sizes: [1500] }));
    const run = refused('--grid', bad, '--out', join(work, 'never'));
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('grid.sizes[0] must be a multiple of 1000');
  });
});
