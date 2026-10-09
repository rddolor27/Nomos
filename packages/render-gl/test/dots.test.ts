import { JOB_ITEMS, jobId } from '@nomos/sim-protocol';
import { expect, test } from 'vitest';
import {
  MASK_EDGE,
  MASK_FILL,
  MASK_GROUND,
  ROLES,
  ROLE_SHAPE,
  dotCentre,
  dotFill,
  dotMask,
  roleOfJob,
  type Shape,
} from '../src/dots/dots.ts';

const SHAPES: Shape[] = ['circle', 'square', 'diamond'];

function count(mask: Uint8Array, cell: number): number {
  return mask.filter((value) => value === cell).length;
}

test('draws three distinct shapes', () => {
  // [fill, circle, square, diamond] cells of fill, counted apart from dotMask by the plan's rules.
  const expected = [
    [5, 21, 25, 13],
    [7, 37, 49, 25],
    [9, 69, 81, 41],
    [11, 97, 121, 61],
  ];

  const counted = expected.map(([fill]) => [fill, ...SHAPES.map((shape) => count(dotMask(shape, fill), MASK_FILL))]);

  expect(counted).toEqual(expected);
  expect([1, 2, 3, 4, 8].map(dotFill)).toEqual([5, 7, 9, 11, 11]);
});

test('rings each shape with an edge', () => {
  const [F, E, G] = [MASK_FILL, MASK_EDGE, MASK_GROUND];
  // The plan's table for fill 5: the cell at an offset from the centre, for a citizen, a merchant and a police dot.
  const table: [dx: number, dy: number, cells: number[]][] = [
    [0, 0, [F, F, F]],
    [2, 1, [F, F, E]],
    [2, 2, [E, F, E]],
    [3, 3, [G, E, G]],
  ];
  const masks = ROLES.map((role) => dotMask(ROLE_SHAPE[role], 5));
  const centre = 3;
  const side = 7;

  const cells = table.map(([dx, dy]) => masks.map((mask) => mask[(dy + centre) * side + dx + centre]));

  expect(cells).toEqual(table.map(([, , expected]) => expected));
  expect(masks.map((mask) => [G, F, E].map((cell) => count(mask, cell)))).toEqual([
    [4, 21, 24],
    [0, 25, 24],
    [12, 13, 24],
  ]);
  expect([5, 7, 9, 11].map((fill) => dotMask('circle', fill).length)).toEqual([49, 81, 121, 169]);
});

test('maps jobs to roles', () => {
  const roles = Object.fromEntries(JOB_ITEMS.map((item) => [item, roleOfJob(jobId(item))]));

  expect(roles).toEqual({
    builder: 'citizen',
    clinic: 'citizen',
    farmer: 'citizen',
    merchant: 'merchant',
    police: 'police',
    soldier: 'citizen',
  });
  expect([roleOfJob(0), roleOfJob(255)]).toEqual(['citizen', 'citizen']);
  expect(ROLE_SHAPE).toEqual({ citizen: 'circle', merchant: 'square', police: 'diamond' });
});

test('centres a dot on its texel and subtracts the camera', () => {
  expect([1, 2, 3, 4].map((zoom) => dotCentre(10.7, 0, zoom))).toEqual([10, 21, 31, 42]);
  expect(dotCentre(10, 0, 4)).toBe(dotCentre(10.999, 0, 4));
  expect(dotCentre(10.7, 25, 4)).toBe(17);
  expect(dotCentre(-0.5, 0, 2)).toBe(-1);
});
