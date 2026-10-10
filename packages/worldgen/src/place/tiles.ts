import { floorMod } from '@nomos/sim-core/kernels';
import { CLIFFS, OPEN, type Site } from './site.ts';

type Tile = readonly [category: string, name: string];
type Side = readonly [name: string, dx: number, dy: number];

const SIDES: readonly Side[] = [
  ['n', 0, -1],
  ['e', 1, 0],
  ['s', 0, 1],
  ['w', -1, 0],
];
const CORNERS: readonly Side[] = [
  ['ne', 1, -1],
  ['se', 1, 1],
  ['sw', -1, 1],
  ['nw', -1, -1],
];
const NATURE_TILES: Readonly<Record<string, string>> = {
  sand: 'terrain_sand',
  paving: 'terrain_paving',
  path: 'terrain_dirt-path',
  soil: 'terrain_soil-tilled',
  stone: 'terrain_cut-stone',
};
// Road kinds drawn in two variants, mixed by position.
const VARIED_TILES: Readonly<Record<string, string>> = { cobble: 'terrain_cobbles', gravel: 'terrain_gravel' };

// The shore rule of tools/sprites/showcase_wonders.py: a land tile takes its shape from its water neighbours.
export function tileFor(site: Site, x: number, y: number): Tile {
  const kind = site.kind[site.at(x, y)];
  if (kind === 'water') return ['nature', 'terrain_water_0'];
  if (OPEN.includes(kind)) {
    const shore = shoreTile(site, x, y, kind === 'sand' ? 'sand' : 'grass');
    if (shore !== null) return ['scenery', shore];
  }
  return dryTile(kind, x, y);
}

function shoreTile(site: Site, x: number, y: number, shore: string): string | null {
  const wet = new Set<string>();
  for (const [side, dx, dy] of SIDES) {
    if (site.water(x + dx, y + dy)) wet.add(side);
  }
  for (const [corner] of CORNERS) {
    if (wet.has(corner[0]) && wet.has(corner[1])) return `shore_${shore}_${corner}-outer_0`;
  }
  for (const [side] of SIDES) {
    if (wet.has(side)) return `shore_${shore}_${side}_0`;
  }
  for (const [corner, dx, dy] of CORNERS) {
    if (site.water(x + dx, y + dy)) return `shore_${shore}_${corner}-inner_0`;
  }
  return null;
}

function dryTile(kind: string, x: number, y: number): Tile {
  if (kind === 'grass') return ['nature', `terrain_grass_${floorMod(floorMod(x * 7 + y * 13, 5), 3)}`];
  if (kind === 'meadow') return ['scenery', `terrain_meadow_${floorMod(x * 5 + y * 3, 3)}`];
  if (kind === 'cliff_face') return ['scenery', `cliff_face_${floorMod(x * 3 + y, 2)}`];
  if (kind === 'cliff_foot-water') return ['scenery', 'cliff_foot-water_0'];
  if (CLIFFS.includes(kind)) return ['scenery', kind];
  const varied = VARIED_TILES[kind];
  if (varied) return ['nature', `${varied}_${floorMod(floorMod(x * 7 + y * 13, 5), 2)}`];
  return ['nature', NATURE_TILES[kind] ?? kind];
}
