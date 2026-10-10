import type { WorldMap } from '@nomos/sim-protocol/world-map';

// A grassland world of one country, with nothing on it; a test patches in what it needs.
export function tinyWorld(width: number, height: number, patch: Partial<WorldMap> = {}): WorldMap {
  const cells = width * height;
  const none = (): WorldMap['roads'] => ({ offsets: new Int32Array([0]), cells: new Int32Array(0) });
  return {
    version: 1,
    seed: 1,
    width,
    height,
    template: 0,
    wind: 0,
    cold: 0,
    elevation: new Int16Array(cells).fill(100),
    biome: new Uint8Array(cells).fill(2),
    temperature: new Uint8Array(cells).fill(120),
    moisture: new Uint8Array(cells).fill(120),
    river: new Uint8Array(cells),
    receiver: new Int32Array(cells).fill(-1),
    coast: new Uint8Array(cells),
    variant: new Uint8Array(cells),
    country: new Uint8Array(cells).fill(1),
    region: new Uint16Array(cells).fill(1),
    market: new Uint16Array(cells).fill(1),
    settlements: {
      cell: new Int32Array(0),
      tier: new Uint8Array(0),
      population: new Int32Array(0),
      country: new Uint8Array(0),
      region: new Uint16Array(0),
      landmarks: new Uint8Array(0),
    },
    countries: { capital: new Int32Array([0]), colour: new Uint8Array([0]) },
    regions: { seat: new Int32Array([0]), country: new Uint8Array([1]) },
    roads: none(),
    lanes: none(),
    roadClass: new Uint8Array(0),
    bridges: new Int32Array(0),
    wonders: { kind: new Uint8Array(0), cell: new Int32Array(0) },
    landmarks: { kind: new Uint8Array(0), cell: new Int32Array(0) },
    ...patch,
  };
}
