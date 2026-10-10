import { Worker } from 'node:worker_threads';
import type { CellResult, RunContext } from './cell.ts';
import type { Cell } from './grid.ts';

const WORKER = new URL('./worker.ts', import.meta.url);

// A fresh worker for each cell, so nothing a cell leaves behind can reach the next and a cell's bytes cannot depend on
// which worker ran it. Node delivers a worker's last message before its exit event.
function runInWorker(cell: Cell, context: RunContext, live: Set<Worker>): Promise<CellResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER, { workerData: { cell, ...context } });
    live.add(worker);
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', (code) => {
      live.delete(worker);
      reject(new Error(`${cell.name}: the worker exited with code ${code} without reporting`));
    });
  });
}

// Runs the cells in the order given on up to `threads` workers, each lane taking the next cell when its worker is done. A
// failure ends the other workers and rejects, so the caller exits with a code of 1.
export async function runPool(
  cells: readonly Cell[],
  context: RunContext,
  threads: number,
  onResult: (result: CellResult) => void,
): Promise<void> {
  const live = new Set<Worker>();
  let next = 0;
  let failed = false;

  async function lane(): Promise<void> {
    while (!failed && next < cells.length) onResult(await runInWorker(cells[next++], context, live));
  }

  try {
    await Promise.all(Array.from({ length: Math.min(threads, cells.length) }, lane));
  } catch (error) {
    failed = true;
    for (const worker of live) void worker.terminate();
    throw error;
  }
}
