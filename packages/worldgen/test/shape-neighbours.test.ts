import { describe, expect, it } from 'vitest';
import { neighbours } from '../src/grid/grid.ts';
import { oceanOf, smooth, tidy } from '../src/terrain/shape.ts';

// '#' is land, and '~' an ocean cell in an expected picture. Every expected picture is what tools/worldgen/terrain.py
// returns for the same input: _smooth, _tidy and the ocean lines of shape.
function bitmap(rows: string[]): Uint8Array {
  return Uint8Array.from(rows.join(''), (c) => (c === '#' ? 1 : 0));
}

function picture(cells: Uint8Array, width: number, on = '#'): string[] {
  const rows: string[] = [];
  for (let start = 0; start < cells.length; start += width) {
    rows.push(Array.from(cells.subarray(start, start + width), (v) => (v === 0 ? '.' : on)).join(''));
  }
  return rows;
}

describe('the neighbour choices the goldens barely see', () => {
  it('smooths from the old cells, never from cells it has already changed', () => {
    const land = [
      '.....',
      '.###.',
      '.##..',
      '.#...',
      '.....',
    ];
    // Updating in place lets the first erosion run on through every cell and leaves no land at all.
    expect(picture(smooth(bitmap(land), neighbours(5, 5)), 5)).toEqual([
      '.....',
      '..#..',
      '.##..',
      '.....',
      '.....',
    ]);
  });

  it('sinks a land cell that touches land only diagonally, since islands join by their four sides', () => {
    const land = [
      '#.....',
      '.####.',
      '.####.',
      '.####.',
      '.####.',
      '......',
    ];
    // The corner cell meets the block only at (1, 1), so it is an island of one cell. Eight-neighbour parts keep it.
    expect(picture(tidy(bitmap(land), 6, 6), 6)).toEqual([
      '......',
      '.###..',
      '.####.',
      '.####.',
      '..##..',
      '......',
    ]);
  });

  it('keeps a pond that touches the sea only diagonally, since water joins by all eight neighbours', () => {
    const land = [
      '.####.',
      '#...#.',
      '#..##.',
      '#.###.',
      '#####.',
      '......',
    ];
    // Smoothing leaves (1, 1) as a pond of one cell that meets the corner cell, the sea, only at (0, 0). Four-neighbour
    // parts take it for an enclosed pond and fill it.
    expect(picture(tidy(bitmap(land), 6, 6), 6)).toEqual([
      '.####.',
      '#.###.',
      '#####.',
      '#####.',
      '####..',
      '......',
    ]);
  });

  it('counts a lake that touches the sea only diagonally as ocean, and a walled-in lake as not', () => {
    const land = [
      '............',
      '..####.####.',
      '.#...#.#..#.',
      '.#...#.#..#.',
      '.#...#.#..#.',
      '.#####.####.',
      '............',
    ];
    // The left lake meets the sea through its cut corner (1, 1); the right lake has a whole wall round it.
    expect(picture(oceanOf(bitmap(land), 12, 7), 12, '~')).toEqual([
      '~~~~~~~~~~~~',
      '~~....~....~',
      '~.~~~.~....~',
      '~.~~~.~....~',
      '~.~~~.~....~',
      '~.....~....~',
      '~~~~~~~~~~~~',
    ]);
  });
});
