import { describe, expect, it } from 'vitest';
import { REDRAW_TICKS, STAND, firstRedraw, offWall, wanderTo } from '../src/movement/steer.ts';

// Draw words built by hand: the low 4 bits are the roll, the next two nibbles the turn's halves, the top byte a start.
function word(start: number, minus: number, plus: number, roll: number): number {
  return ((start << 24) | (minus << 8) | (plus << 4) | roll) >>> 0;
}

describe('the wander rule', () => {
  it('stops a walker on a roll of 0, and turns it by plus minus minus on any other', () => {
    expect(wanderTo(100, true, word(0xab, 3, 9, 0))).toBe(STAND);
    expect(wanderTo(100, true, word(0xab, 3, 5, 1))).toBe(102);
    expect(wanderTo(100, true, word(0xab, 9, 9, 15))).toBe(100);
    expect(wanderTo(5, true, word(0, 15, 0, 7))).toBe(246);
    expect(wanderTo(250, true, word(0, 0, 15, 2))).toBe(9);
  });

  it('starts an idler on rolls 0 to 2, on the heading in the top byte, and keeps it standing on any other', () => {
    expect([0, 1, 2].map((roll) => wanderTo(100, false, word(0xab, 3, 5, roll)))).toEqual([171, 171, 171]);
    expect(wanderTo(100, false, word(0xab, 3, 5, 3))).toBe(STAND);
    expect(wanderTo(100, false, word(0xab, 3, 5, 15))).toBe(STAND);
  });

  it('redraws blob i on ticks where tick + i is a multiple of 16', () => {
    expect(REDRAW_TICKS).toBe(16);
    expect([0, 1, 2, 15, 16, 17, 31, 32].map(firstRedraw)).toEqual([0, 15, 14, 1, 0, 15, 1, 0]);
  });

  it('leaves a wall at half the angle it met it, rounded up, mirrored away from it', () => {
    // Walls along x, met through a row edge, then walls along y, met through a column edge.
    expect([16, 17, 0, 32, 112, 240].map((heading) => offWall(heading, true))).toEqual([88, 88, 160, 80, 40, 168]);
    expect([48, 224, 192, 64, 200].map((heading) => offWall(heading, false))).toEqual([232, 16, 96, 224, 28]);
  });
});
