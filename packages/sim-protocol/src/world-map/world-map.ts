// The world M8.1's generator makes and M8.3's views draw (interfaces.md, The world map). Every code is an index into
// one of these tables, which keep tools/worldgen's order. A leaf module, so the generator imports it without the rest.
export const WORLDGEN_VERSION = 1;

export const WORLD_SIZES = { standard: [96, 64], large: [192, 128] } as const;
export type WorldSize = keyof typeof WORLD_SIZES;

export const TEMPLATE_NAMES = ['continent', 'peninsula', 'coast', 'archipelago', 'twin-isles'] as const;
export const SIDE_NAMES = ['n', 'e', 's', 'w'] as const;
export const BIOME_NAMES = [
  'ocean',
  'lake',
  'grassland',
  'farmland',
  'forest-deciduous',
  'forest-conifer',
  'marsh',
  'sand',
  'hills',
  'mountain',
  'peak',
  'snow',
] as const;
export const COAST_NAMES = ['inland', 'beach', 'cliffs'] as const;
export const TIER_NAMES = ['capital', 'city', 'town', 'village', 'hamlet'] as const;
export const WONDER_NAMES = [
  'waterfall',
  'giant-tree',
  'sea-arch',
  'stone-arch',
  'hot-springs',
  'geyser',
  'crystal-cave',
  'caldera-lake',
  'canyon-view',
  'glacier',
  'dune',
] as const;
export const LANDMARK_NAMES = [
  'lighthouse',
  'viaduct',
  'observatory',
  'clock-tower',
  'glasshouse',
  'library',
  'amphitheatre',
  'windmill',
  'garden-terraces',
  'fountain',
] as const;
export const LANDMARK_SLOTS = 3;
export const NO_LANDMARK = 255;

// Path p is cells[offsets[p]] up to cells[offsets[p + 1] - 1].
export interface PathTable {
  offsets: Int32Array;
  cells: Int32Array;
}

export interface WorldMap {
  version: number;
  seed: number;
  width: number;
  height: number;
  template: number;
  wind: number;
  cold: number;
  elevation: Int16Array;
  biome: Uint8Array;
  temperature: Uint8Array;
  moisture: Uint8Array;
  river: Uint8Array;
  receiver: Int32Array;
  coast: Uint8Array;
  variant: Uint8Array;
  country: Uint8Array;
  region: Uint16Array;
  market: Uint16Array;
  settlements: {
    cell: Int32Array;
    tier: Uint8Array;
    population: Int32Array;
    country: Uint8Array;
    region: Uint16Array;
    landmarks: Uint8Array;
  };
  countries: { capital: Int32Array; colour: Uint8Array };
  regions: { seat: Int32Array; country: Uint8Array };
  roads: PathTable;
  lanes: PathTable;
  bridges: Int32Array;
  wonders: { kind: Uint8Array; cell: Int32Array };
  landmarks: { kind: Uint8Array; cell: Int32Array };
}

export type MapAppMessage = { type: 'generate'; seed: number; size: WorldSize };
export type MapWorkerMessage = { type: 'world'; map: WorldMap; names: string[]; stageMs: Record<string, number> };

// Every column owns its buffer, so each is listed once and the map worker can transfer them all.
export function worldMapBuffers(map: WorldMap): ArrayBuffer[] {
  const { settlements: s, countries, regions, roads, lanes, wonders, landmarks } = map;
  const views: ArrayBufferView[] = [
    map.elevation,
    map.biome,
    map.temperature,
    map.moisture,
    map.river,
    map.receiver,
    map.coast,
    map.variant,
    map.country,
    map.region,
    map.market,
    s.cell,
    s.tier,
    s.population,
    s.country,
    s.region,
    s.landmarks,
    countries.capital,
    countries.colour,
    regions.seat,
    regions.country,
    roads.offsets,
    roads.cells,
    lanes.offsets,
    lanes.cells,
    map.bridges,
    wonders.kind,
    wonders.cell,
    landmarks.kind,
    landmarks.cell,
  ];
  return views.map((view) => view.buffer as ArrayBuffer);
}
