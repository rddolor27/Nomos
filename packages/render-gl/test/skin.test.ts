import { expect, test } from 'vitest';
import { BUILT_SKINS, SKINS, autoSkin, builtSkin, skinFromQuery, type Skin } from '../src/skins/skin.ts';

type Level = 'dots' | 'town';
type Sample = [pxPerTile: number, agentsInView: number];

// The levels autoSkin picks over a run of samples, each one starting from the level before it.
function follow(start: Skin, samples: Sample[]): Level[] {
  let skin: Skin = start;
  return samples.map(([pxPerTile, agentsInView]) => {
    const level = autoSkin(skin, pxPerTile, agentsInView);
    skin = level;
    return level;
  });
}

test('reads the skin parameter', () => {
  expect(skinFromQuery('?skin=town')).toBe('town');
  expect(['?skin=dots', '?skin=blobs', 'skin=dots', '?x=1&skin=blobs&y=2'].map(skinFromQuery)).toEqual([
    'dots',
    'blobs',
    'dots',
    'blobs',
  ]);
  expect(['?skin=xyz', '?skin=', '', '?x=1'].map(skinFromQuery)).toEqual([null, null, null, null]);
});

test('falls back to dots', () => {
  expect([SKINS, BUILT_SKINS]).toEqual([['dots', 'blobs', 'town'], ['dots']]);
  expect(builtSkin('blobs')).toBe('dots');
  expect(builtSkin('town')).toBe('dots');
  expect(builtSkin('dots')).toBe('dots');
});

test('switches with hysteresis', () => {
  const cases: [current: Skin, pxPerTile: number, agentsInView: number, level: Level][] = [
    ['dots', 6.0, 100, 'dots'],
    ['dots', 6.9, 100, 'town'],
    ['town', 5.2, 100, 'town'],
    ['town', 5.0, 100, 'dots'],
    ['dots', 20, 426, 'dots'],
    ['dots', 20, 425, 'town'],
    ['town', 20, 575, 'town'],
    ['town', 20, 576, 'dots'],
  ];

  expect(cases.map(([current, px, agents]) => autoSkin(current, px, agents))).toEqual(cases.map(([, , , level]) => level));
});

test('takes the coarser of tile size and headcount', () => {
  // Tile size and headcount disagree in the first four, so dots win; the last two sit on both limits at once.
  expect([
    autoSkin('dots', 6.0, 100),
    autoSkin('dots', 20, 426),
    autoSkin('town', 5.0, 575),
    autoSkin('town', 20, 576),
    autoSkin('dots', 6.9, 425),
    autoSkin('town', 5.1, 575),
  ]).toEqual(['dots', 'dots', 'dots', 'dots', 'town', 'town']);
});

test('holds a skin inside the hysteresis band', () => {
  const zoom = [5.0, 6.0, 6.8, 6.9, 7.0, 6.5, 6.0, 5.5, 5.1, 5.0, 5.5].map((px): Sample => [px, 100]);
  const crowd = [600, 450, 425, 500, 575, 576, 500, 425].map((agents): Sample => [20, agents]);

  expect(follow('dots', zoom)).toEqual(['dots', 'dots', 'dots', 'town', 'town', 'town', 'town', 'town', 'town', 'dots', 'dots']);
  expect(follow('dots', crowd)).toEqual(['dots', 'dots', 'town', 'town', 'town', 'dots', 'dots', 'town']);
});

test('enters the town from blobs on the terms it does from dots', () => {
  expect([
    autoSkin('blobs', 6.8, 100),
    autoSkin('blobs', 6.9, 100),
    autoSkin('blobs', 20, 426),
    autoSkin('blobs', 20, 425),
  ]).toEqual(['dots', 'town', 'dots', 'town']);
});
