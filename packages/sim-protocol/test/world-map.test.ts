import { describe, expect, it } from 'vitest';
import { LANDMARK_SLOTS, NO_LANDMARK, worldMapBuffers, type WorldMap } from '../src/world-map/world-map.ts';

function tinyMap(): WorldMap {
  const cells = 6;
  return {
    version: 1,
    seed: 7,
    width: 3,
    height: 2,
    template: 0,
    wind: 1,
    cold: 2,
    elevation: new Int16Array(cells),
    biome: new Uint8Array(cells),
    temperature: new Uint8Array(cells),
    moisture: new Uint8Array(cells),
    river: new Uint8Array(cells),
    receiver: new Int32Array(cells).fill(-1),
    coast: new Uint8Array(cells),
    variant: new Uint8Array(cells),
    country: new Uint8Array(cells),
    region: new Uint16Array(cells),
    market: new Uint16Array(cells),
    settlements: {
      cell: new Int32Array([4]),
      tier: new Uint8Array([0]),
      population: new Int32Array([150_000]),
      country: new Uint8Array([1]),
      region: new Uint16Array([1]),
      landmarks: new Uint8Array(LANDMARK_SLOTS).fill(NO_LANDMARK),
    },
    countries: { capital: new Int32Array([0]), colour: new Uint8Array([2]) },
    regions: { seat: new Int32Array([0]), country: new Uint8Array([1]) },
    roads: { offsets: new Int32Array([0]), cells: new Int32Array(0) },
    lanes: { offsets: new Int32Array([0]), cells: new Int32Array(0) },
    bridges: new Int32Array(0),
    wonders: { kind: new Uint8Array(0), cell: new Int32Array(0) },
    landmarks: { kind: new Uint8Array(0), cell: new Int32Array(0) },
  };
}

function views(value: unknown): ArrayBufferView[] {
  if (ArrayBuffer.isView(value)) return [value];
  if (typeof value !== 'object' || value === null) return [];
  return Object.values(value).flatMap(views);
}

describe('the world map', () => {
  it('lists every column buffer once, so one transfer moves them all', () => {
    const map = tinyMap();
    const buffers = worldMapBuffers(map);
    expect(new Set(buffers).size).toBe(buffers.length);
    expect(new Set(buffers)).toEqual(new Set(views(map).map((view) => view.buffer)));
    const moved = structuredClone(map, { transfer: buffers });
    expect(moved.settlements.population[0]).toBe(150_000);
    expect(map.elevation.byteLength).toBe(0);
  });
});
