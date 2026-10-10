import { parentPort, workerData } from 'node:worker_threads';
import { runCell, writeCell, type CellResult, type RunContext } from './cell.ts';
import type { Cell } from './grid.ts';

// Runs one cell and exits. pool.ts starts a fresh worker for each cell.
if (parentPort === null) throw new Error('worker.ts runs inside a worker thread, started by pool.ts');
const { cell, out, commit, record } = workerData as RunContext & { readonly cell: Cell };
const run = runCell(cell, record);
writeCell(out, cell, run, commit);
const result: CellResult = { name: cell.name, days: cell.days, milliseconds: run.milliseconds };
parentPort.postMessage(result);
