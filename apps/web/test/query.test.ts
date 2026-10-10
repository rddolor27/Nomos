import { expect, test } from 'vitest';
import { backendFrom, devFrom, seedFrom } from '../src/app/query.ts';

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

test('reads the developer flag, which only dev=1 turns on', () => {
  expect(['?dev=1', '?x=1&dev=1', 'dev=1'].map(devFrom)).toEqual([true, true, true]);
  expect(['', '?dev', '?dev=0', '?dev=true', '?dev=11', '?developer=1'].map(devFrom)).toEqual(Array(6).fill(false));
});
