import { describe, expect, it } from 'vitest';
import { tinyWorld } from '../../../packages/render-gl/test/tiny-world.ts';
import { labelSet, placeLabels } from '../src/map/labels.ts';

function twoCountries(): ReturnType<typeof tinyWorld> {
  const country = new Uint8Array(100).map((_, cell) => (cell % 10 < 5 ? 1 : 2));
  return tinyWorld(10, 10, {
    country,
    countries: { capital: new Int32Array([0, 1]), colour: new Uint8Array([0, 1]) },
    settlements: {
      cell: new Int32Array([22, 27, 23, 77]),
      tier: new Uint8Array([0, 1, 3, 4]),
      population: new Int32Array([90_000, 60_000, 900, 100]),
      country: new Uint8Array([1, 2, 1, 2]),
      region: new Uint16Array(4),
      landmarks: new Uint8Array(12).fill(255),
    },
  });
}

describe('label placement', () => {
  const set = labelSet(twoCountries());
  set.width.fill(40);
  set.height.fill(12);
  const x = new Float64Array(set.count);
  const y = new Float64Array(set.count);

  it('takes countries first, then settlements by tier and id', () => {
    expect([...set.name]).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('labels countries, capitals and cities in the Country view', () => {
    expect(placeLabels(set, 'country', { x: 0, y: 0, cellPx: 16 }, 1, 160, 160, x, y)).toBe(4);
    expect([...x]).toEqual([20, 100, 20, 100, Number.NaN, Number.NaN]);
    expect([...y]).toEqual([74, 74, 48, 48, Number.NaN, Number.NaN]);
  });

  it('labels every settlement in the Region view, dropping one that would overlap', () => {
    expect(placeLabels(set, 'region', { x: 0, y: 0, cellPx: 16 }, 1, 160, 160, x, y)).toBe(3);
    expect([...x]).toEqual([Number.NaN, Number.NaN, 20, 100, Number.NaN, 100]);
    expect([...y]).toEqual([Number.NaN, Number.NaN, 48, 48, Number.NaN, 128]);
  });

  it('hides labels off the view', () => {
    expect(placeLabels(set, 'region', { x: 20, y: 0, cellPx: 16 }, 1, 160, 160, x, y)).toBe(0);
  });
});
