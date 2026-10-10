import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { PRESETS } from '../economy/presets.ts';
import { wholeNumber } from '../economy/run.ts';
import { settledRecord, type CellResult } from './cell.ts';
import { listCells, parseGrid, type Cell } from './grid.ts';
import { runPool } from './pool.ts';

const MAX_THREADS = 256;
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

export async function runDesign(args: readonly string[]): Promise<void> {
  const { values } = parseArgs({
    args: [...args],
    options: { grid: { type: 'string' }, out: { type: 'string' }, threads: { type: 'string' } },
  });
  if (values.grid === undefined || values.out === undefined) {
    throw new RangeError('design takes --grid <file> --out <dir> [--threads N]');
  }
  const threads =
    values.threads === undefined ? Math.max(1, availableParallelism() - 1) : wholeNumber('threads', values.threads, 1, MAX_THREADS);
  const grid = parseGrid(JSON.parse(readFileSync(values.grid, 'utf8')));
  const cells = listCells(grid);
  const record = grid.start === 'spawn' ? settledRecord(PRESETS[grid.preset]) : undefined;
  mkdirSync(values.out, { recursive: true });
  await runPool(largestFirst(cells), { out: values.out, commit: readCommit(), record }, threads, reportCell);
  process.stdout.write(`${cells.length} cells in ${values.out}\n`);
}
