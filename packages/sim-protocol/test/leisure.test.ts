import { readFileSync } from 'node:fs';
import { MAX_SITES, SITE_GREEN, SITE_PLAZA, SITE_WATER } from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import {
  ENTITY_GREEN,
  ENTITY_PLAZA,
  WALK_BLOCKED,
  WALK_OPEN,
  WATER_APART,
  WATER_SITES,
  leisureOf,
  parseMap,
  premisesOf,
  type MapEntity,
  type MapV1,
} from '../src/index.ts';

const townFile = new URL('../../../assets/maps/town.nmap', import.meta.url);

function door(site: { kind: number; doorX: number; doorY: number }): [number, number, number] {
  return [site.kind, site.doorX, site.doorY];
}

// A size by size map of open ground in which `water` cells are river and `walls` are blocked, and whose entities are given.
function mapOf(size: number, water: (x: number, y: number) => boolean, walls: (x: number, y: number) => boolean, entities: MapEntity[]): MapV1 {
  const terrain = new Uint8Array(size * size);
  const walk = new Uint8Array(size * size).fill(WALK_OPEN);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      terrain[y * size + x] = water(x, y) ? 1 : 0;
      if (water(x, y) || walls(x, y)) walk[y * size + x] = WALK_BLOCKED;
    }
  }
  const kinds = [
    { name: 'grass', rgb: 0x4caa3c },
    { name: 'water', rgb: 0x3c7cd0 },
  ];
  return { version: 1, width: size, height: size, kinds, frames: ['nature/terrain_grass_0'], terrain, walk, tiles: new Uint16Array(size * size), entities };
}

function leisure(kind: MapEntity['kind'], x: number, y: number, w: number, h: number, doorX: number, doorY: number): MapEntity {
  return { kind, x, y, w, h, doorX, doorY, frame: 0, capacity: 0, opens: 0, closes: 0 };
}

describe('the leisure sites of a map', () => {
  it("are Highcourt's plaza at its fountain, its three greens, and three banks of the river, beside its 22 premises", () => {
    const town = parseMap(new Uint8Array(readFileSync(townFile)).buffer);

    const sites = leisureOf(town);

    expect(sites.map(door)).toEqual([
      [SITE_PLAZA, 88, 59],
      [SITE_GREEN, 131, 24],
      [SITE_GREEN, 41, 24],
      [SITE_GREEN, 132, 19],
      [SITE_WATER, 44, 59],
      [SITE_WATER, 47, 50],
      [SITE_WATER, 45, 70],
    ]);
    // The plaza covers its 28 by 8 tiles and a green its 6 by 4, and a bank is one tile.
    expect(sites.map((site) => [site.w, site.h])).toEqual([[28, 8], [6, 4], [6, 4], [6, 4], [1, 1], [1, 1], [1, 1]]);
    expect(premisesOf(town).length + sites.length).toBeLessThanOrEqual(MAX_SITES);
    expect(sites.every((site) => site.goods === 0 && !site.stall)).toBe(true);
  });

  it('leave out a green walled in and a bank across the river, keep banks apart, and are none without a plaza', () => {
    const size = 40;
    // A river down the whole map at x = 20, so the plaza at its east reaches no bank on the west.
    const river = (x: number): boolean => x === 20;
    // A pocket in the north-west corner, walled in by the map's edge and walls at x = 2 and y = 2.
    const pocket = (x: number, y: number): boolean => (x === 2 && y <= 2) || (y === 2 && x <= 2);
    const plaza = leisure(ENTITY_PLAZA, 28, 18, 5, 5, 30, 20);
    const open = leisure(ENTITY_GREEN, 34, 30, 4, 3, 35, 31);
    const shut = leisure(ENTITY_GREEN, 0, 0, 2, 2, 1, 1);
    const town = mapOf(size, river, pocket, [plaza, open, shut]);

    const sites = leisureOf(town);

    // The nearest bank to the plaza, then the nearest 12 or more from it, two tiles equally far on either side, of which the
    // first in reading order is taken, then the nearest 12 or more from both.
    expect(sites.map(door)).toEqual([
      [SITE_PLAZA, 30, 20],
      [SITE_GREEN, 35, 31],
      [SITE_WATER, 21, 20],
      [SITE_WATER, 21, 8],
      [SITE_WATER, 21, 32],
    ]);
    const banks = sites.filter((site) => site.kind === SITE_WATER);
    expect(banks.length).toBeLessThanOrEqual(WATER_SITES);
    for (const bank of banks) {
      for (const other of banks) {
        if (other !== bank) expect(Math.abs(bank.doorX - other.doorX) + Math.abs(bank.doorY - other.doorY)).toBeGreaterThanOrEqual(WATER_APART);
      }
    }
    expect(leisureOf(mapOf(size, river, pocket, [open, shut]))).toEqual([]);
  });
});
