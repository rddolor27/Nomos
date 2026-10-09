import { describe, expect, it } from 'vitest';
import { tinyWorld } from '../../../packages/render-gl/test/tiny-world.ts';
import { cameraOn, goToGroups, placeInFocus, placeInfo, placeUnder } from '../src/map/goto.ts';

// Two countries on a 10 x 10 world. Settlements in id order, as [x, y, country]: country 2's capital is id 1, and id 3
// sits two cells east of id 0. A giant tree, place 5, stands at (9, 4) in country 2.
const PLACES = [
  [2, 2, 1],
  [7, 7, 2],
  [6, 6, 2],
  [4, 2, 1],
  [8, 1, 2],
];

const TREE = 4 * 10 + 9;

function twoCountries(): ReturnType<typeof tinyWorld> {
  const country = new Uint8Array(100).fill(1);
  country[TREE] = 2;
  return tinyWorld(10, 10, {
    country,
    wonders: { kind: Uint8Array.of(1), cell: Int32Array.of(TREE) },
    countries: { capital: new Int32Array([0, 1]), colour: new Uint8Array([0, 1]) },
    settlements: {
      cell: Int32Array.from(PLACES, ([x, y]) => y * 10 + x),
      tier: new Uint8Array([0, 0, 2, 3, 4]),
      population: new Int32Array([9000, 8000, 900, 300, 100]),
      country: Uint8Array.from(PLACES, (place) => place[2]),
      region: new Uint16Array(5),
      landmarks: new Uint8Array(15).fill(255),
    },
  });
}

const NAMES = ['country-1', 'country-2', 'capital-0', 'capital-1', 'town-2', 'village-3', 'hamlet-4'];

describe('going to a settlement', () => {
  const map = twoCountries();

  it("lists each country's capital first, then its other settlements by id", () => {
    expect(goToGroups(map, NAMES)).toEqual([
      { country: 'country-1', places: [{ id: 0, name: 'capital-0' }, { id: 3, name: 'village-3' }] },
      {
        country: 'country-2',
        places: [
          { id: 1, name: 'capital-1' },
          { id: 2, name: 'town-2' },
          { id: 4, name: 'hamlet-4' },
        ],
      },
    ]);
  });

  it("centres the view on the settlement's cell, at the step nearest 64 CSS px a cell", () => {
    expect(cameraOn(map, 1, 640, 480, 1)).toEqual({ x: 7.5 - 5, y: 7.5 - 3.75, cellPx: 64 });
    expect(cameraOn(map, 1, 640, 480, 1.5).cellPx).toBe(96);
    expect(cameraOn(map, 1, 640, 480, 2).cellPx).toBe(128);
    // 80 device px lies as near 64 as 96, and the tie goes to the wider view; 192 passes the ladder's top.
    expect(cameraOn(map, 1, 640, 480, 1.25).cellPx).toBe(64);
    expect(cameraOn(map, 1, 640, 480, 3).cellPx).toBe(128);
  });

  it('finds the settlement nearest a tap, within 1.5 cells', () => {
    const camera = { x: 0, y: 0, cellPx: 16 };
    expect(placeUnder(map, camera, 2.5 * 16, 2.5 * 16, 1)).toBe(0);
    expect(placeUnder(map, camera, 3.9 * 16, 2.5 * 16, 1)).toBe(3);
    expect(placeUnder(map, camera, 7.1 * 16, 7.1 * 16, 1)).toBe(1);
    expect(placeUnder(map, camera, 0.5 * 16, 9.5 * 16, 1)).toBe(-1);
  });

  it('gives the tie between two settlements to the lower id, the larger place', () => {
    expect(placeUnder(map, { x: 0, y: 0, cellPx: 16 }, 3.5 * 16, 2.5 * 16, 1)).toBe(0);
  });

  it('reaches 12 CSS px when a cell is smaller than 8', () => {
    // A tap at (0.5, 7.5) lies 5.39 cells from id 0, the nearest. At 4 device px a cell, 12 CSS px is 6 cells at DPR 2
    // but only 3 at DPR 1.
    const camera = { x: 0, y: 0, cellPx: 4 };
    expect(placeUnder(map, camera, 0.5 * 4, 7.5 * 4, 2)).toBe(0);
    expect(placeUnder(map, camera, 0.5 * 4, 7.5 * 4, 1)).toBe(-1);
  });
});

describe('entering a place', () => {
  const map = twoCountries();

  it('finds a wonder too, numbered after the settlements', () => {
    expect(placeUnder(map, { x: 0, y: 0, cellPx: 16 }, 9.2 * 16, 4.9 * 16, 1)).toBe(5);
  });

  it("centres the view on a wonder's cell, as on a settlement's", () => {
    expect(cameraOn(map, 5, 640, 480, 1)).toEqual({ x: 9.5 - 5, y: 4.5 - 3.75, cellPx: 64 });
  });

  it("holds in focus the place at the view's centre, or none", () => {
    expect(placeInFocus(map, cameraOn(map, 1, 640, 480, 1), 640, 480, 1)).toBe(1);
    expect(placeInFocus(map, cameraOn(map, 5, 640, 480, 1), 640, 480, 1)).toBe(5);
    expect(placeInFocus(map, { x: -10, y: -10, cellPx: 64 }, 640, 480, 1)).toBe(-1);
  });

  it('tells a settlement by name, tier, population and country, and a wonder by its kind', () => {
    expect(placeInfo(map, NAMES, 2)).toEqual({ place: 2, name: 'town-2', kind: 'town', population: 900, country: 'country-2' });
    expect(placeInfo(map, NAMES, 5)).toEqual({ place: 5, name: 'Giant tree', kind: 'wonder', population: 0, country: 'country-2' });
  });
});
