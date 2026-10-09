import { readFileSync } from 'node:fs';
import { parseMap } from '@nomos/sim-protocol';
import { expect, test } from 'vitest';
import { BACKGROUND, OUTLINE, RIM, contrastRatio, edgeFor } from '../src/dots/colour.ts';

const TOWN = new URL('../../../assets/maps/town.nmap', import.meta.url);

function edgeContrast(ground: number): number {
  return contrastRatio(ground, edgeFor(ground) === 'outline' ? OUTLINE : RIM);
}

function hex(rgb: number): string {
  return `#${rgb.toString(16).padStart(6, '0')}`;
}

test('gives every ground an edge of at least 3:1', () => {
  const town = parseMap(new Uint8Array(readFileSync(TOWN)).buffer);
  const grounds = [...town.kinds.map((kind) => kind.rgb), BACKGROUND];

  expect(grounds.filter((ground) => edgeContrast(ground) < 3).map(hex)).toEqual([]);
});

// The plan's "by construction" figure: #020202 and #F6F0DE bracket every luminance, and a grey of every level
// spans that range.
test('keeps 4.26:1 on every grey', () => {
  const greys = Array.from({ length: 256 }, (_, level) => level * 0x010101);

  expect(Math.min(...greys.map(edgeContrast))).toBeGreaterThanOrEqual(4.26);
});
