import { expect, test } from 'vitest';
import { formatCount } from '../src/panels/hud.ts';

test('groups the digits of a count in threes, as en formatting does', () => {
  const counts = [0, 7, 999, 1_000, 10_000, 161_280, 1_234_567, 4_294_967_295];

  expect(counts.map(formatCount)).toEqual(counts.map((count) => count.toLocaleString('en')));
});
