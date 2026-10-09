import { describe, expect, it } from 'vitest';
import { BAND, BORDER, DECK, RAIL, RIVER, ROAD, buildOverlay, type Overlay } from '../src/map.ts';
import { tinyWorld } from './tiny-world.ts';

function row(o: Overlay, y: number, x0: number, x1: number): number[] {
  return [...o.pixels.subarray(y * o.width + x0, y * o.width + x1 + 1)];
}

function column(o: Overlay, x: number, y0: number, y1: number): number[] {
  const out: number[] = [];
  for (let y = y0; y <= y1; y++) out.push(o.pixels[y * o.width + x]);
  return out;
}

const TWO = { country: new Uint8Array([1, 2]), countries: { capital: new Int32Array([0, 1]), colour: new Uint8Array([0, 1]) } };
const FLOW = { river: new Uint8Array([1, 0, 0]), receiver: new Int32Array([1, -1, -1]) };
const ROAD_0_1 = { roads: { offsets: new Int32Array([0, 2]), cells: new Int32Array([0, 1]) } };
const BRIDGED = { roads: { offsets: new Int32Array([0, 3]), cells: new Int32Array([0, 1, 2]) }, bridges: new Int32Array([1]) };

describe('the map overlay', () => {
  it("draws borders on cell edges, as test_worldgen.py checks the previews'", () => {
    const narrow = buildOverlay(tinyWorld(2, 1, TWO), 'country');
    for (let y = 0; y < 8; y++) expect(row(narrow, y, 5, 9)).toEqual([0, BAND, BORDER, BAND + 1, 0]);
    const wide = buildOverlay(tinyWorld(2, 1, TWO), 'region');
    for (let y = 0; y < 16; y++) expect(row(wide, y, 12, 19)).toEqual([0, BAND, BAND, BORDER, BORDER, BAND + 1, BAND + 1, 0]);
    const stacked = buildOverlay(tinyWorld(1, 2, TWO), 'country');
    for (let x = 0; x < 8; x++) expect(column(stacked, x, 5, 9)).toEqual([0, BAND, BORDER, BAND + 1, 0]);
    const coast = buildOverlay(tinyWorld(3, 1, { ...TWO, country: new Uint8Array([1, 0, 2]) }), 'country');
    expect(coast.pixels.every((value) => value === 0)).toBe(true);
  });

  it('draws a river from centre to centre, a pixel wider at size 3', () => {
    const thin = buildOverlay(tinyWorld(3, 1, FLOW), 'country');
    expect(row(thin, 4, 3, 13)).toEqual([0, ...Array<number>(9).fill(RIVER), 0]);
    expect(thin.pixels.filter((value) => value === RIVER)).toHaveLength(9);
    const broad = buildOverlay(tinyWorld(3, 1, { ...FLOW, river: new Uint8Array([3, 0, 0]) }), 'region');
    expect(row(broad, 8, 7, 27)).toEqual([0, ...Array<number>(19).fill(RIVER), 0]);
    expect(broad.pixels.filter((value) => value === RIVER)).toHaveLength(57);
  });

  it('dashes roads, and draws them over sea lanes', () => {
    const dotted = [ROAD, 0, ROAD, 0, ROAD, 0, ROAD, 0, ROAD];
    expect(row(buildOverlay(tinyWorld(2, 1, ROAD_0_1), 'country'), 4, 4, 12)).toEqual(dotted);
    const both = { ...ROAD_0_1, lanes: ROAD_0_1.roads };
    expect(row(buildOverlay(tinyWorld(2, 1, both), 'country'), 4, 4, 12)).toEqual(dotted);
    const region = row(buildOverlay(tinyWorld(2, 1, ROAD_0_1), 'region'), 8, 7, 26);
    expect(region).toEqual([0, 3, 3, 3, 0, 3, 3, 3, 0, 3, 3, 3, 0, 3, 3, 3, 0, 3, 3, 0].map((v) => (v ? ROAD : 0)));
  });

  it('lays a bridge deck along its road, with a rail round it', () => {
    const level = buildOverlay(tinyWorld(3, 1, BRIDGED), 'country');
    expect(row(level, 3, 10, 13)).toEqual([RAIL, RAIL, RAIL, RAIL]);
    expect(row(level, 4, 10, 13)).toEqual([RAIL, DECK, DECK, RAIL]);
    expect(row(level, 5, 10, 13)).toEqual([RAIL, RAIL, RAIL, RAIL]);
    const upright = buildOverlay(tinyWorld(1, 3, BRIDGED), 'country');
    expect(column(upright, 4, 10, 13)).toEqual([RAIL, DECK, DECK, RAIL]);
    expect(row(upright, 10, 3, 5)).toEqual([RAIL, RAIL, RAIL]);
  });
});
