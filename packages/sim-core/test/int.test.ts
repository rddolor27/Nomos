import { describe, expect, it } from 'vitest';
import { floorDiv, floorMod } from '../src/maths/int.ts';

describe('the integer helpers', () => {
  it('floors like Python', () => {
    const cases = [
      [7, 2, 3, 1],
      [-7, 2, -4, 1],
      [7, -2, -4, -1],
      [-7, -2, 3, -1],
      [0, 5, 0, 0],
    ];
    for (const [a, b, quotient, remainder] of cases) {
      expect([floorDiv(a, b), floorMod(a, b)], `${a} and ${b}`).toEqual([quotient, remainder]);
    }
  });
});
