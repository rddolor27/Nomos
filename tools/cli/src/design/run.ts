import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { settledRecord } from '@nomos/sim-core';
import { PRESETS } from '../economy/presets.ts';
import { wholeNumber } from '../economy/run.ts';
import type { CellResult } from './cell.ts';
import { listCells, parseGrid, type Cell } from './grid.ts';
import { runPool } from './pool.ts';

const MAX_THREADS = 256;
// Two threads on the owner's machine, whose CPU full runs pinned at 100% (owner, 10 October 2026); CI uses every core but one.
const OWNER_THREADS = 2;
const HERE = dirname(fileURLToPath(import.meta.url));

// "unknown" when git is missing or this is no checkout.
function readCommit(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: HERE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'unknown';
  }
}

// Times go to stderr only, so no file depends on them.
function reportCell(result: CellResult): void {
  const perSecond = Math.round((result.days * 1_000) / result.milliseconds);
  const took = `${result.days} days in ${result.milliseconds.toFixed(0)} ms`;
  process.stderr.write(`${result.name}: sim days per second: ${perSecond} (${took}, Node ${process.version})\n`);
}

// The long cells start first and the short ones fill the gaps. The sort is stable, so equal sizes keep the grid's order.
function largestFirst(cells: readonly Cell[]): Cell[] {
  return [...cells].sort((a, b) => b.size - a.size);
}

export function defaultThreads(ci: boolean, cores: number): number {
  return ci ? Math.max(1, cores - 1) : OWNER_THREADS;
}

// A run over an older one would leave the two runs' cells in one folder, and targets would judge them together.
function requireNewOrEmpty(out: string): void {
  if (existsSync(out) && readdirSync(out).length > 0) {
    throw new RangeError(`--out ${out} must be a new or empty folder, so that no run mixes with an older one`);
  }
}

export async function runDesign(args: readonly string[]): Promise<void> {
  const { values } = parseArgs({
    args: [...args],
    options: { grid: { type: 'string' }, out: { type: 'string' }, threads: { type: 'string' } },
  });
  if (values.grid === undefined || values.out === undefined) {
    throw new RangeError('design takes --grid <file> --out <dir> [--threads N]');
  }
  const threads =
    values.threads === undefined
      ? defaultThreads(Boolean(process.env.CI), availableParallelism())
      : wholeNumber('threads', values.threads, 1, MAX_THREADS);
  const grid = parseGrid(JSON.parse(readFileSync(values.grid, 'utf8')));
  requireNewOrEmpty(values.out);
  const cells = listCells(grid);
  const record = grid.start === 'spawn' ? settledRecord(PRESETS[grid.preset]) : undefined;
  mkdirSync(values.out, { recursive: true });
  await runPool(largestFirst(cells), { out: values.out, commit: readCommit(), record }, threads, reportCell);
  process.stdout.write(`${cells.length} cells in ${values.out}\n`);
}
