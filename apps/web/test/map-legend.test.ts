import { COUNTRY_COLOURS } from '@nomos/render-gl/map';
import { describe, expect, it } from 'vitest';
import { tinyWorld } from '../../../packages/render-gl/test/tiny-world.ts';
import { legendRows } from '../src/map/legend.ts';

describe('the map legend', () => {
  it("lists each country's colour, name, capital and settlement count", () => {
    const map = tinyWorld(4, 1, {
      country: new Uint8Array([1, 1, 2, 2]),
      countries: { capital: new Int32Array([1, 0]), colour: new Uint8Array([3, 0]) },
      settlements: {
        cell: new Int32Array([2, 0, 1]),
        tier: new Uint8Array([0, 0, 3]),
        population: new Int32Array([90_000, 60_000, 900]),
        country: new Uint8Array([2, 1, 1]),
        region: new Uint16Array(3),
        landmarks: new Uint8Array(9).fill(255),
      },
    });
    const names = ['country-1', 'country-2', 'capital-0', 'capital-1', 'village-2'];
    expect(legendRows(map, names)).toEqual([
      { name: 'country-1', colour: COUNTRY_COLOURS[3], capital: 'capital-1', settlements: 2 },
      { name: 'country-2', colour: COUNTRY_COLOURS[0], capital: 'capital-0', settlements: 1 },
    ]);
  });
});
