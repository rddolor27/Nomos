import { describe, expect, it } from 'vitest';
import { floorDiv, floorMod, isqrt } from '../src/maths/int.ts';

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

  it("roots like Python's math.isqrt", () => {
    const cases = [
      [0, 0], [1, 1], [2, 1], [3, 1], [4, 2], [15, 3], [16, 4], [17, 4], [99, 9], [100, 10],
      [2_147_483_647, 46_340], [2_147_483_648, 46_340], [999_999_999_999, 999_999], [1_000_000_000_000, 1_000_000],
      [4_503_599_627_370_495, 67_108_863],
    ];
    for (const [n, root] of cases) expect(isqrt(n), String(n)).toBe(root);
    expect(() => isqrt(-1)).toThrow(RangeError);
  });
});
