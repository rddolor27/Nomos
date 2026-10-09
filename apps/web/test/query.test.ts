import { expect, test } from 'vitest';
import { backendFrom, seedFrom } from '../src/app/query.ts';

const random = () => 777;

test('reads the seed', () => {
  expect(seedFrom('?seed=42', random)).toBe(42);
  expect(['?seed=0', '?seed=4294967295', 'seed=7', '?x=1&seed=9&y=2'].map((search) => seedFrom(search, random))).toEqual([
    0, 4_294_967_295, 7, 9,
  ]);
});

test('draws a random seed when the parameter is missing or not a uint32', () => {
  const searches = [
    '',
    '?',
    '?x=1',
    '?seed=',
    '?seed=abc',
    '?seed=-1',
    '?seed=4294967296',
    '?seed=1.5',
    '?seed=1e3',
    '?seed=0x10',
    '?seed=%2042',
  ];

  expect(searches.map((search) => seedFrom(search, random))).toEqual(searches.map(() => 777));
});

test('reads the backend', () => {
  expect(['?canvas', '?canvas=1', '?x=1&canvas'].map(backendFrom)).toEqual(['canvas2d', 'canvas2d', 'canvas2d']);
  expect(['', '?x=1', '?seed=42', '?canvasx'].map(backendFrom)).toEqual(['auto', 'auto', 'auto', 'auto']);
});
