import { floorDiv } from '@nomos/sim-core/kernels';
import {
  ENTITY_CIVIC,
  ENTITY_GREEN,
  ENTITY_HOME,
  ENTITY_PLAZA,
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
import { landmarkFrame } from './landmarks.ts';
import { CLIFFS, type Cell, type Rect, type Site } from './site.ts';
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
// export_map.py's placeholders from the plan: a home's capacity by form, and a shop's opening and closing minute. A handed
// piece holds as many as its plain one.
const CAPACITY: Readonly<Record<string, number>> = {
  hut: 2,
  cabin: 3,
  detached: 4,
  'row-left': 4,
  'row-middle': 4,
  'row-right': 4,
  'townhouse-left': 6,
  'townhouse-middle': 6,
  'townhouse-right': 6,
  'corner-left': 6,
  'corner-right': 6,
  farmhouse: 6,
  apartment: 24,
};
const HANDED = '-handed';
const STALL_HOURS: readonly [number, number] = [360, 840];
const SHOP_HOURS: readonly [number, number] = [480, 1200];
// The premises' hours (M2.7) are placeholders too: a stall keeps the generic stall's, the Bakery opens at 06:00 and closes at
// 18:00, the Inn at 07:00 and 23:00, and every other shop keeps the general shop's.
const HOURS: Readonly<Record<string, readonly [opens: number, closes: number]>> = {
  shop_general: SHOP_HOURS,
  shop_inn: [420, 1380],
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

// The beds of a house, by the form in its name: house_<material>_<form>_roof-<roof>.
function bedsOf(name: string): number {
  return lookup(CAPACITY, name.split('_')[2].replace(HANDED, ''), `${name} is a house of no known form`);
}

function entityOf({ footprint: f, door }: Placed, frame: number): MapEntity {
  const kind = lookup(ENTITY_OF_BUILT, builtKind(f.name), `${f.name} makes no entity`);
  const capacity = kind === ENTITY_HOME ? bedsOf(f.name) : 0;
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

export function walkAt(site: Site, c: number, isDoor: boolean): number {
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

// The open ground or road tile of `area` nearest `target`, the first in reading order at a tie, or null where it has none. A
// door tile is no place to stand, since blobs buy there, and a wall or a prop blocks.
function openNear(cells: Cells, width: number, target: Cell, area: Rect): Cell | null {
  const [x0, y0, w, h] = area;
  let best: Cell | null = null;
  let bestCost = Number.MAX_SAFE_INTEGER;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const walk = cells.walk[y * width + x];
      const cost = Math.abs(x - target[0]) + Math.abs(y - target[1]);
      if ((walk === WALK_OPEN || walk === WALK_ROAD) && cost < bestCost) {
        best = [x, y];
        bestCost = cost;
      }
    }
  }
  return best;
}

// The rect grown by `margin` tiles each way, kept on the map.
function grown(site: Site, [x, y, w, h]: Rect, margin: number): Rect {
  const x0 = Math.max(0, x - margin);
  const y0 = Math.max(0, y - margin);
  return [x0, y0, Math.min(site.w, x + w + margin) - x0, Math.min(site.h, y + h + margin) - y0];
}

// A leisure place of M3.2 as an entity: it stands on no footprint, so its door is a tile of the place itself, and its frame
// is the ground tile there. It has no door tile in the walk grid, since nobody enters it.
function leisureEntity(
  kind: typeof ENTITY_PLAZA | typeof ENTITY_GREEN,
  [x, y, w, h]: Rect,
  [doorX, doorY]: Cell,
  cells: Cells,
  width: number,
): MapEntity {
  return { kind, x, y, w, h, doorX, doorY, frame: cells.tiles[doorY * width + doorX], capacity: 0, opens: 0, closes: 0 };
}

// The tile below the fountain's footprint, where its front faces, or the middle of the plaza where it has no fountain.
function fountainFront(site: Site): Cell {
  const fountain = site.places.get(landmarkFrame('fountain'))?.[0];
  return fountain === undefined ? [site.cx, site.cy] : [fountain[0] + floorDiv(fountain[2], 2), fountain[1] + fountain[3]];
}

// A town's plaza is its paved square, with its door in front of the fountain. A village's is its green, and its door the tile
// just below the well, which stands in the middle.
function plazaOf(site: Site, cells: Cells): MapEntity | null {
  if (site.plaza !== null) {
    const door = openNear(cells, site.w, fountainFront(site), site.plaza);
    return door === null ? null : leisureEntity(ENTITY_PLAZA, site.plaza, door, cells, site.w);
  }
  if (site.green.length === 0) return null;
  const xs = site.green.map(([x]) => x);
  const ys = site.green.map(([, y]) => y);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const green: Rect = [x0, y0, Math.max(...xs) - x0 + 1, Math.max(...ys) - y0 + 1];
  const door = openNear(cells, site.w, [site.cx, site.cy + 1], grown(site, green, 1));
  return door === null ? null : leisureEntity(ENTITY_PLAZA, green, door, cells, site.w);
}

// A walled town's greens, each with its door at the middle, which is open ground kept clear.
function greensOf(site: Site, cells: Cells): MapEntity[] {
  const greens: MapEntity[] = [];
  for (const green of site.townGreens) {
    const middle: Cell = [green[0] + floorDiv(green[2], 2), green[1] + floorDiv(green[3], 2)];
    const door = openNear(cells, site.w, middle, green);
    if (door !== null) greens.push(leisureEntity(ENTITY_GREEN, green, door, cells, site.w));
  }
  return greens;
}

// The places blobs go to for their own sake (M3.2): the plaza, then the greens. Water is not listed, since the terrain has it.
function leisureEntities(site: Site, cells: Cells): MapEntity[] {
  const plaza = plazaOf(site, cells);
  return [...(plaza === null ? [] : [plaza]), ...greensOf(site, cells)];
}

// export_map.py's town_map: a settlement's walk grid and its buildings with their doors, as map v1 holds them, then the
// leisure places of M3.2 after every building, so the premises keep their indexes.
export function groundOf(site: Site): MapV1 {
  const found = footprints(site);
  const placed = placedOf(site, found);
  const cells = cellsOf(site, builtKinds(site, found), placed);
  const standing = standingFrames(site);
  const entities = placed.map((p) => entityOf(p, cells.frames.code(frameOfSprite(standing, p.footprint.name))));
  entities.push(...leisureEntities(site, cells));
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
