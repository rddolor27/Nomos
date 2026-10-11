import { AT_DOOR, DIRECTIONS, UNREACHED, cellStepOf } from './fields.ts';

// A path is at most 32 straight runs, each a heading (a multiple of 32) and a length in cells, which is 64 bytes. The ones a
// path does not use stay 0, and a run is never 0 long, so a 0 length ends the list.
export const MAX_RUNS = 32;
export const RUN_BYTES = 2 * MAX_RUNS;
// pathRuns' answers when there is no path to take: the cell is cut off from the door, or the way needs more than MAX_RUNS runs.
export const NO_PATH = -1;
export const TOO_FAR = -2;
const HEADING_SHIFT = 5;

// Writes into out at `at`, from the cell `from`, the straight runs that walk a field's shortest way to its door, and returns how
// many. Walked forward they lead from `from` to the door, and walked backward, each heading turned half a turn, from the door home,
// so a home needs no field of its own. out holds 0s when the answer is not a count.
export function pathRuns(fields: Uint8Array, first: number, width: number, from: number, out: Uint8Array, at: number): number {
  out.fill(0, at, at + RUN_BYTES);
  let cell = from;
  let steps = fields[first + cell];
  if (steps === UNREACHED) return NO_PATH;
  let runs = 0;
  while (steps !== AT_DOOR) {
    if (runs === MAX_RUNS) {
      out.fill(0, at, at + RUN_BYTES);
      return TOO_FAR;
    }
    const k = widestStep(fields, first, cell, steps, width);
    const length = straightLength(fields, first, cell, cellStepOf(k, width), k);
    out[at + 2 * runs] = k << HEADING_SHIFT;
    out[at + 2 * runs + 1] = length;
    cell += length * cellStepOf(k, width);
    steps = fields[first + cell];
    runs++;
  }
  return runs;
}

// Cells a blob goes on in step k before the field turns it. Going straight keeps the runs few, and a run ends only where the
// field no longer has step k.
function straightLength(fields: Uint8Array, first: number, cell: number, step: number, k: number): number {
  let length = 0;
  let at = first + cell;
  while (((fields[at] >> k) & 1) === 1) {
    at += step;
    length++;
  }
  return length;
}

// Of the steps a cell has, the one whose straight run closes in on the door the most, the lowest k at a tie. A diagonal cell
// closes in by two, as it counts two in the field, so odd k weigh double.
function widestStep(fields: Uint8Array, first: number, cell: number, steps: number, width: number): number {
  let best = -1;
  let bestCloser = 0;
  for (let k = 0; k < DIRECTIONS; k++) {
    if (((steps >> k) & 1) === 0) continue;
    const closer = straightLength(fields, first, cell, cellStepOf(k, width), k) * (1 + (k & 1));
    if (closer > bestCloser) {
      best = k;
      bestCloser = closer;
    }
  }
  return best;
}
