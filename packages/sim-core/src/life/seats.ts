import { CELL_HIDDEN, type Life } from './store.ts';

// Where a blob stands out of doors is a cell it holds (M3.2 polish): its seat on its own doorstep, or its spot in a site, which it
// holds from the tick it chooses it, on its way there too, until the stay ends. A blob chooses the cell with the fewest holders
// that it can stand on, a free one when there is one, so a crowd spreads over the tiles before any two share a tile. The counts
// are in Life.holds, which the hash and a checkpoint carry, and a blob's own cell is in Life.seat.

// A cell's count stops short of CELL_HIDDEN. The most blobs one cell holds is a big household's on its doorstep, 24.
export const MAX_HELD = 254;
// No cell of the rectangle can be stood on.
export const NO_CELL = -1;

export function holdCell(life: Life, cell: number): void {
  if (life.holds[cell] < MAX_HELD) life.holds[cell]++;
}

// A hidden cell has no holders to give up, and a free one none to lose.
export function releaseCell(life: Life, cell: number): void {
  const held = life.holds[cell];
  if (held > 0 && held < CELL_HIDDEN) life.holds[cell] = held - 1;
}

// The cell of the rectangle (left, top, across, rows) with the fewest holders, among those the grid lets a blob stand on, scanning
// in reading order from the cell `first` and wrapping round, so that the first free cell from a keyed start wins and the first of
// the least held when none is free. A cell can be stood on when grid[base + cell] is not `blocked`, which is the walk grid with 0
// blocked, or a site's flow field with UNREACHED. A hidden cell is never chosen, being past every count.
export function leastHeldCell(
  holds: Uint8Array,
  grid: Uint8Array,
  base: number,
  blocked: number,
  width: number,
  left: number,
  top: number,
  across: number,
  rows: number,
  first: number,
): number {
  const tiles = across * rows;
  let column = first % across;
  let row = (first - column) / across;
  let best = NO_CELL;
  let bestHeld = CELL_HIDDEN;
  for (let n = 0; n < tiles; n++) {
    const cell = (top + row) * width + left + column;
    const held = holds[cell];
    if (held < bestHeld && grid[base + cell] !== blocked) {
      best = cell;
      bestHeld = held;
      if (held === 0) break;
    }
    column = (column + 1) % across;
    if (column === 0) row = (row + 1) % rows;
  }
  return best;
}
