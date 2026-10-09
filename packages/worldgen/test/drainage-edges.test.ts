import { describe, expect, it } from 'vitest';
import { rivers } from '../src/drainage/drain.ts';
import { RAIN_UNIT, RIVER_CELLS } from '../src/drainage/flood.ts';
import { type Pools, lakes, lowest } from '../src/drainage/lakes.ts';
import { neighbours, sum } from '../src/grid/grid.ts';

// Rules the 200 golden worlds barely or never see: flipping any one of them leaves most worlds unchanged. Every expected
// value is what tools/worldgen/drainage.py returns for the same input: _lakes, _lowest and rivers.
const RIM = 30;
const GRID = 12;

// A flood fills every pit to the rim, so filled is the rim, or an ocean cell's own height, since the flood seeds it.
function lakesOf(width: number, height: number, elevation: Int32Array, ocean: Uint8Array): Pools {
  return lakes(width, height, elevation, elevation.map((e) => Math.max(e, RIM)), ocean);
}

function heightOf(symbol: string): number {
  if (symbol === '.') return RIM;
  return symbol === 'o' ? RIM + 4 : Number(symbol);
}

// '.' is the rim, a digit a pit floor at that height, and 'o' an ocean cell standing above the rim.
function poolsOf(rows: readonly string[]): Pools {
  const symbols = Array.from(rows.join(''));
  const ocean = Uint8Array.from(symbols, (symbol) => (symbol === 'o' ? 1 : 0));
  return lakesOf(rows[0].length, rows.length, Int32Array.from(symbols, heightOf), ocean);
}

function picture(values: ArrayLike<number>, width: number, symbols: string): string[] {
  const rows: string[] = [];
  for (let start = 0; start < values.length; start += width) {
    rows.push(Array.from({ length: width }, (_, x) => symbols[values[start + x]]).join(''));
  }
  return rows;
}

// '.' is dry, '#' a lake cell and 'T' a terminal lake cell.
function lakePicture(pools: Pools, width: number): string[] {
  return picture(pools.lake.map((flag, i) => flag + pools.terminal[i]), width, '.#T');
}

function block(x0: number, y0: number, w: number, h: number): number[] {
  const cells: number[] = [];
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) cells.push(y * GRID + x);
  }
  return cells;
}

// What a pit of these cells, floor 0 inside the rim, becomes, and which of its cells stay dry.
function held(pit: readonly number[]): { lake: number; terminal: number; dry: number[] } {
  const elevation = new Int32Array(GRID * GRID).fill(RIM);
  for (const cell of pit) elevation[cell] = 0;
  const pools = lakesOf(GRID, GRID, elevation, new Uint8Array(elevation.length));
  return { lake: sum(pools.lake), terminal: sum(pools.terminal), dry: pit.filter((cell) => pools.lake[cell] === 0) };
}

describe('the drainage rules the goldens barely see', () => {
  it('holds a pit of 79 cells as a lake', () => {
    expect(held(block(1, 1, 8, 10).slice(0, -1))).toEqual({ lake: 79, terminal: 0, dry: [] });
  });

  it('holds a pit of MAX_LAKE, 80 cells, as a lake', () => {
    expect(held(block(1, 1, 8, 10))).toEqual({ lake: 80, terminal: 0, dry: [] });
  });

  it('holds a pit of 81 cells as a terminal lake of its lowest 80, leaving the last corner dry', () => {
    expect(held(block(1, 1, 9, 9))).toEqual({ lake: 80, terminal: 80, dry: [117] });
  });

  it('grows a terminal lake from the lowest-numbered of two equally deep cells', () => {
    const elevation = new Int32Array(100).fill(3);
    elevation[0] = 0;
    elevation[99] = 0;
    const taken = new Uint8Array(100);
    const cells = Array.from({ length: 100 }, (_, i) => i);
    for (const cell of lowest(cells, elevation, neighbours(10, 10))) taken[cell] = 1;
    // Growing from cell 99 instead takes a different 80 cells.
    expect(picture(taken, 10, '.T')).toEqual([
      'TTTTTTTTTT',
      'TTTTTTTTTT',
      'TTTTTTTTTT',
      'TTTTTTTTTT',
      'TTTTTTTTTT',
      'TTTTTTTTTT',
      'TTTTTTTTTT',
      'TTTTTTTTTT',
      '..........',
      '..........',
    ]);
  });

  it('steps a river up a size at exactly 1x, 4x and 12x the flow threshold', () => {
    const unit = RIVER_CELLS * RAIN_UNIT;
    const flow = Int32Array.from([
      12 * unit, 12 * unit, 12 * unit - 1, 12 * unit - 1,
      4 * unit, 4 * unit, 4 * unit - 1, 4 * unit - 1,
      unit, unit, unit - 1, unit - 1,
    ]);
    // One chain, so no run of river cells is a stub that gets dropped, and a size can only come from the flow.
    const receiver = Int32Array.from(flow, (_, i) => (i + 1 < flow.length ? i + 1 : -1));
    const none = new Uint8Array(flow.length);
    expect([...rivers(flow.length, 1, flow, receiver, none, none)]).toEqual([3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 0, 0]);
  });

  it('holds a pit of two cells as a lake until the shore pass, so a dry cell it helps ring joins the lake', () => {
    const pools = poolsOf([
      '......',
      '.0.00.',
      '.0....',
      '.000..',
      '......',
    ]);
    // The dry cell at (2, 2) touches five cells of the long pit and (3, 1) of the pair: six lake cells, but only while the
    // pair counts. The pair then dries up, as do the two ends of the long pit.
    expect(lakePicture(pools, 6)).toEqual([
      '......',
      '......',
      '.##...',
      '.##...',
      '......',
    ]);
  });

  it('leaves an ocean cell out of the shore pass, however many lake cells ring it', () => {
    const pools = poolsOf([
      '.....',
      '.000.',
      '.0o0.',
      '.000.',
      '.....',
    ]);
    expect(lakePicture(pools, 5)).toEqual([
      '.....',
      '.###.',
      '.#.#.',
      '.###.',
      '.....',
    ]);
  });
});
