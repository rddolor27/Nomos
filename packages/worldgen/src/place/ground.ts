import { floorDiv } from '@nomos/sim-core/kernels';
import {
  ENTITY_CIVIC,
  ENTITY_HOME,
  ENTITY_SHOP,
  ENTITY_WORKPLACE,
  WALK_BLOCKED,
  WALK_DOOR,
  WALK_OPEN,
  WALK_ROAD,
  type MapEntity,
  type MapV1,
} from '@nomos/sim-protocol/map';
import { KIND_RGB } from './kind-colours.ts';
import { CLIFFS, type Cell, type Site } from './site.ts';
import { tileFor } from './tiles.ts';

interface Footprint {
  name: string;
  tx: number;
  ty: number;
  fw: number;
  fh: number;
}

interface Placed {
  footprint: Footprint;
  door: Cell;
}

interface Cells {
  kinds: Numbering;
  frames: Numbering;
  terrain: Uint8Array;
  walk: Uint8Array;
  tiles: Uint16Array;
}

const ANIMALS: readonly string[] = ['cow', 'sheep', 'goat', 'horse', 'chicken', 'duck', 'dog', 'cat'];
const BUILT_OF_PREFIX: Readonly<Record<string, string>> = {
  house: 'home',
  work: 'workplace',
  shop: 'shop',
  civic: 'civic',
  landmark: 'landmark',
};
const ENTITY_OF_BUILT: Readonly<Record<string, MapEntity['kind']>> = {
  home: ENTITY_HOME,
  workplace: ENTITY_WORKPLACE,
  shop: ENTITY_SHOP,
  civic: ENTITY_CIVIC,
};
// export_map.py's placeholders from the plan: a home's capacity by form, and a shop's opening and closing minute.
const CAPACITY: Readonly<Record<string, number>> = {
  hut: 2,
  detached: 4,
  'row-left': 4,
  'row-middle': 4,
  'row-right': 4,
  farmhouse: 6,
  apartment: 24,
};
const STALL_HOURS: readonly [number, number] = [360, 840];
const SHOP_HOURS: readonly [number, number] = [480, 1200];
// The premises' hours (M2.7) are placeholders too: a stall keeps the generic stall's, the Bakery opens at 06:00 and closes at
// 18:00, and every other shop keeps the general shop's.
const HOURS: Readonly<Record<string, readonly [opens: number, closes: number]>> = {
  shop_general: SHOP_HOURS,
  'shop_market-stall': STALL_HOURS,
  'shop_market-stall_fish': STALL_HOURS,
  'shop_market-stall_milk': STALL_HOURS,
  'shop_market-stall_vegetables': STALL_HOURS,
  shop_bakery: [360, 1080],
  shop_draper_bolts: SHOP_HOURS,
  shop_draper_rail: SHOP_HOURS,
  'shop_fuel-store_shed': SHOP_HOURS,
  'shop_fuel-store_stack': SHOP_HOURS,
};
const NO_HOURS: readonly [number, number] = [0, 0];
// Map v1 holds no ground sprites, so a footbridge's water cells draw as the paved causeway that roads.ts's cross lays on
// other crossings; otherwise blobs would seem to walk on the river.
const PAVED_KIND = 'paving';
const PAVED_FRAME = 'nature/terrain_paving';

// Names numbered in order of first use, as export_map.py's dict.fromkeys numbers them.
class Numbering {
  readonly names: string[] = [];
  private readonly codes = new Map<string, number>();

  code(name: string): number {
    const known = this.codes.get(name);
    if (known !== undefined) return known;
    this.codes.set(name, this.names.length);
    this.names.push(name);
    return this.names.length - 1;
  }
}

// Tables are plain objects, so a key such as "constructor" must not find a member of Object.prototype.
function lookup<T>(table: Readonly<Record<string, T>>, key: string, missing: string): T {
  if (!Object.hasOwn(table, key)) throw new Error(missing);
  return table[key];
}

function builtKind(name: string): string {
  if (name === 'shop_warehouse') return 'workplace';
  return lookup(BUILT_OF_PREFIX, name.split('_')[0], `${name} is no house, work, shop, civic or landmark sprite`);
}

// Every footprinted sprite in reading order of its top-left tile, which export_map.py got by sorting. Bucketing by tile
// gives that order with no sort, and keeps the order of building among sprites that share a tile.
function footprints(site: Site): Footprint[] {
  const byCorner = new Map<number, Footprint[]>();
  for (const [name, rects] of site.places) {
    for (const [tx, ty, fw, fh] of rects) {
      const corner = site.at(tx, ty);
      const here = byCorner.get(corner) ?? [];
      here.push({ name, tx, ty, fw, fh });
      byCorner.set(corner, here);
    }
  }
  const ordered: Footprint[] = [];
  for (let c = 0; c < site.w * site.h; c++) {
    const here = byCorner.get(c);
    if (here !== undefined) ordered.push(...here);
  }
  return ordered;
}

// Names repeat, so a door belongs to the footprint it lies just below. A stall the plaza builds has none, and nor has a
// dock, so each takes the tile below its middle, where Site.settle puts one. A dock's lies in the water it stands at.
function doorOf(site: Site, f: Footprint): Cell {
  for (const door of site.doors) {
    if (door.name === f.name && door.y === f.ty + f.fh && f.tx <= door.x && door.x < f.tx + f.fw) return [door.x, door.y];
  }
  return [f.tx + floorDiv(f.fw, 2), f.ty + f.fh];
}

function checkDoor(site: Site, name: string, [x, y]: Cell): void {
  if (!site.inside(x, y) || site.big[site.at(x, y)] === 1) {
    throw new Error(`the door of ${name} at (${x}, ${y}) is off the map or on a footprint`);
  }
}

function placedOf(site: Site, found: readonly Footprint[]): Placed[] {
  const placed: Placed[] = [];
  for (const footprint of found) {
    if (!Object.hasOwn(ENTITY_OF_BUILT, builtKind(footprint.name))) continue;
    const door = doorOf(site, footprint);
    checkDoor(site, footprint.name, door);
    placed.push({ footprint, door });
  }
  return placed;
}

function entityOf({ footprint: f, door }: Placed, frame: number): MapEntity {
  const kind = lookup(ENTITY_OF_BUILT, builtKind(f.name), `${f.name} makes no entity`);
  const form = f.name.split('_')[2];
  const capacity = kind === ENTITY_HOME ? lookup(CAPACITY, form, `${f.name} is a house of no known form`) : 0;
  const [opens, closes] = kind === ENTITY_SHOP ? lookup(HOURS, f.name, `${f.name} has no opening hours`) : NO_HOURS;
  return { kind, x: f.tx, y: f.ty, w: f.fw, h: f.fh, doorX: door[0], doorY: door[1], frame, capacity, opens, closes };
}

// The built kind of every footprint cell, null elsewhere.
function builtKinds(site: Site, found: readonly Footprint[]): (string | null)[] {
  const built = new Array<string | null>(site.w * site.h).fill(null);
  for (const f of found) {
    const kind = builtKind(f.name);
    for (let y = f.ty; y < f.ty + f.fh; y++) {
      for (let x = f.tx; x < f.tx + f.fw; x++) built[site.at(x, y)] = kind;
    }
  }
  return built;
}

function walkAt(site: Site, c: number, isDoor: boolean): number {
  if (isDoor) return WALK_DOOR;
  const solid = site.solid[c];
  if (site.big[c] === 1 || (solid !== null && !ANIMALS.includes(solid))) return WALK_BLOCKED;
  if (site.road[c] === 1) return WALK_ROAD;
  const kind = site.kind[c];
  return kind === 'water' || CLIFFS.includes(kind) ? WALK_BLOCKED : WALK_OPEN;
}

// Per cell, row by row: its terrain kind, its walk value and its ground tile's frame. The kinds and frames are numbered
// by first use.
function cellsOf(site: Site, built: readonly (string | null)[], placed: readonly Placed[]): Cells {
  const n = site.w * site.h;
  const cells: Cells = {
    kinds: new Numbering(),
    frames: new Numbering(),
    terrain: new Uint8Array(n),
    walk: new Uint8Array(n),
    tiles: new Uint16Array(n),
  };
  const isDoor = new Uint8Array(n);
  for (const { door } of placed) isDoor[site.at(door[0], door[1])] = 1;
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) {
      const c = site.at(x, y);
      const kind = built[c] ?? site.kind[c];
      const bridge = kind === 'water' && site.road[c] === 1;
      const [category, name] = tileFor(site, x, y);
      cells.terrain[c] = cells.kinds.code(bridge ? PAVED_KIND : kind);
      cells.walk[c] = walkAt(site, c, isDoor[c] === 1);
      cells.tiles[c] = cells.frames.code(bridge ? PAVED_FRAME : `${category}/${name}`);
    }
  }
  return cells;
}

// The frame of each standing sprite by name, which is how an entity names its building's frame.
function standingFrames(site: Site): Map<string, string> {
  const frames = new Map<string, string>();
  for (const s of site.standing) frames.set(s.name, `${s.category}/${s.name}`);
  return frames;
}

function frameOfSprite(standing: ReadonlyMap<string, string>, name: string): string {
  const frame = standing.get(name);
  if (frame === undefined) throw new Error(`${name} has no standing sprite`);
  return frame;
}

// export_map.py's town_map: a settlement's walk grid and its buildings with their doors, as map v1 holds them.
export function groundOf(site: Site): MapV1 {
  const found = footprints(site);
  const placed = placedOf(site, found);
  const cells = cellsOf(site, builtKinds(site, found), placed);
  const standing = standingFrames(site);
  const entities = placed.map((p) => entityOf(p, cells.frames.code(frameOfSprite(standing, p.footprint.name))));
  const kinds = cells.kinds.names.map((name) => ({
    name,
    rgb: lookup(KIND_RGB, name, `terrain kind ${name} has no colour: add it to tools/sprites/kind_colours.py and rerun it`),
  }));
  return {
    version: 1,
    width: site.w,
    height: site.h,
    kinds,
    frames: cells.frames.names,
    terrain: cells.terrain,
    walk: cells.walk,
    tiles: cells.tiles,
    entities,
  };
}
