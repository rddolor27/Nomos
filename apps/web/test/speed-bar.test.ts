import { expect, test } from 'vitest';
import { speedForKey } from '../src/panels/speed-bar.ts';

const PLAIN = { ctrlKey: false, metaKey: false, altKey: false };

test('maps the keys 1 to 3 to the speeds in order', () => {
  expect(['1', '2', '3'].map((key) => speedForKey({ key, ...PLAIN }))).toEqual([1, 4, 16]);
});

test('leaves other keys, and a digit held with Ctrl, Cmd or Alt, to the browser', () => {
  expect(['0', '4', '+', 'Enter'].map((key) => speedForKey({ key, ...PLAIN }))).toEqual([
    undefined,
    undefined,
    undefined,
    undefined,
  ]);

  const held = [{ ctrlKey: true }, { metaKey: true }, { altKey: true }];
  expect(held.map((modifier) => speedForKey({ key: '3', ...PLAIN, ...modifier }))).toEqual([undefined, undefined, undefined]);
});
