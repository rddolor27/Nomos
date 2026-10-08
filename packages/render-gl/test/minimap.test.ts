import { readFileSync } from 'node:fs';
import { parseMap } from '@nomos/sim-protocol';
import { expect, test } from 'vitest';
import { contrastRatio, edgeFor, minimapPixels } from '../src/index.ts';

const FIXTURE = new URL('../../sim-protocol/test/fixtures/tiny.nmap', import.meta.url);

test('colours each tile by its kind', () => {
  const map = parseMap(new Uint8Array(readFileSync(FIXTURE)).buffer);
  const pixels = minimapPixels(map);
  expect(pixels).toHaveLength(map.width * map.height * 4);
  for (let i = 0; i < map.terrain.length; i++) {
    const rgb = map.kinds[map.terrain[i]].rgb;
    const alpha = edgeFor(rgb) === 'outline' ? 0 : 255;
    expect([...pixels.subarray(i * 4, i * 4 + 4)]).toEqual([rgb >> 16, (rgb >> 8) & 255, rgb & 255, alpha]);
  }
});

test('chooses the edge with more contrast', () => {
  expect(edgeFor(0x4caa3c)).toBe('outline');
  expect(edgeFor(0x464c5e)).toBe('rim');
});

test('measures contrast as WCAG 2 does', () => {
  expect(contrastRatio(0x000000, 0xffffff)).toBeCloseTo(21, 10);
  expect(contrastRatio(0x4caa3c, 0x4caa3c)).toBe(1);
  expect(contrastRatio(0x020202, 0xf6f0de)).toBe(contrastRatio(0xf6f0de, 0x020202));
});
