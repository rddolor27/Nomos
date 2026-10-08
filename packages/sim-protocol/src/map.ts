// Map v1 (interfaces.md), little-endian: header, terrain kinds, frame names, terrain, walk, tiles, then entities.
export const MAP_MAGIC = 0x50414d4e; // "NMAP"
export const MAP_EXTENSION = '.nmap';
// Cloudflare's docs list this type as compressed, unlike application/octet-stream; whether it honours a type set
// through _headers is unverified (load-memory.md §4).
export const MAP_CONTENT_TYPE = 'application/x-protobuf';

export const WALK_BLOCKED = 0;
export const WALK_OPEN = 1;
export const WALK_ROAD = 2;
export const WALK_DOOR = 3;

export const ENTITY_HOME = 1;
export const ENTITY_WORKPLACE = 2;
export const ENTITY_SHOP = 3;
export const ENTITY_CIVIC = 4;

export const NO_FRAME = 0xffff;

const MAP_VERSION = 1;
const MAX_SIDE = 1024;
const MAX_KINDS = 255;
const MINUTES_PER_DAY = 1440;

export interface TerrainKind {
  name: string;
  rgb: number;
}

export interface MapEntity {
  kind: 1 | 2 | 3 | 4;
  x: number;
  y: number;
  w: number;
  h: number;
  doorX: number;
  doorY: number;
  frame: number;
  capacity: number;
  opens: number;
  closes: number;
}

export interface MapV1 {
  version: 1;
  width: number;
  height: number;
  kinds: TerrainKind[];
  frames: string[];
  terrain: Uint8Array;
  walk: Uint8Array;
  tiles: Uint16Array;
  entities: MapEntity[];
}

export class MapError extends Error {
  override name = 'MapError';
}

const ENTITY_KIND_NAMES: Record<MapEntity['kind'], string> = {
  [ENTITY_HOME]: 'home',
  [ENTITY_WORKPLACE]: 'workplace',
  [ENTITY_SHOP]: 'shop',
  [ENTITY_CIVIC]: 'civic',
};

interface Cursor {
  view: DataView;
  at: number;
}

interface Header {
  width: number;
  height: number;
  kindCount: number;
  frameCount: number;
  entityCount: number;
}

// Every read goes through here and checks the bytes left first, so a short buffer, such as an HTML 404 page served in
// place of the map, is a MapError and never a RangeError or half a map.
function take(cursor: Cursor, bytes: number, what: string): number {
  const start = cursor.at;
  if (bytes > cursor.view.byteLength - start) throw new MapError(`the map ends inside ${what}`);
  cursor.at = start + bytes;
  return start;
}

function readU8(cursor: Cursor, what: string): number {
  return cursor.view.getUint8(take(cursor, 1, what));
}

function readU16(cursor: Cursor, what: string): number {
  return cursor.view.getUint16(take(cursor, 2, what), true);
}

function readU32(cursor: Cursor, what: string): number {
  return cursor.view.getUint32(take(cursor, 4, what), true);
}

function readBytes(cursor: Cursor, count: number, what: string): Uint8Array {
  const { buffer, byteOffset } = cursor.view;
  return new Uint8Array(buffer, byteOffset + take(cursor, count, what), count).slice();
}

function readName(cursor: Cursor, what: string): string {
  const length = readU8(cursor, what);
  if (length === 0) throw new MapError(`${what} has an empty name`);
  const bytes = readBytes(cursor, length, what);
  if (bytes.some((code) => code > 0x7f)) throw new MapError(`${what} has a name that is not ASCII`);
  return String.fromCharCode(...bytes);
}

function requireRange(value: number, min: number, max: number, what: string): void {
  if (value < min || value > max) throw new MapError(`${what} is outside ${min}-${max}`);
}

function readHeader(cursor: Cursor): Header {
  if (readU32(cursor, 'the header') !== MAP_MAGIC) throw new MapError('not a Nomos map: it does not start with NMAP');
  const version = readU16(cursor, 'the header');
  if (version !== MAP_VERSION) throw new MapError(`map version ${version} is not supported, only ${MAP_VERSION}`);
  const width = readU16(cursor, 'the header');
  const height = readU16(cursor, 'the header');
  const kindCount = readU16(cursor, 'the header');
  const frameCount = readU16(cursor, 'the header');
  const entityCount = readU16(cursor, 'the header');
  requireRange(width, 1, MAX_SIDE, `map width ${width}`);
  requireRange(height, 1, MAX_SIDE, `map height ${height}`);
  requireRange(kindCount, 1, MAX_KINDS, `terrain kind count ${kindCount}`);
  return { width, height, kindCount, frameCount, entityCount };
}

function readKinds(cursor: Cursor, count: number): TerrainKind[] {
  const kinds: TerrainKind[] = [];
  for (let i = 0; i < count; i++) {
    const what = `terrain kind ${i}`;
    const r = readU8(cursor, what);
    const g = readU8(cursor, what);
    const b = readU8(cursor, what);
    kinds.push({ rgb: (r << 16) | (g << 8) | b, name: readName(cursor, what) });
  }
  return kinds;
}

function readFrames(cursor: Cursor, count: number): string[] {
  const frames: string[] = [];
  for (let i = 0; i < count; i++) frames.push(readName(cursor, `frame name ${i}`));
  return frames;
}

function readTiles(cursor: Cursor, cells: number): Uint16Array {
  const start = take(cursor, cells * 2, 'the tiles');
  const tiles = new Uint16Array(cells);
  for (let i = 0; i < cells; i++) tiles[i] = cursor.view.getUint16(start + i * 2, true);
  return tiles;
}

function checkTerrain(terrain: Uint8Array, kindCount: number): void {
  const bad = terrain.findIndex((kind) => kind >= kindCount);
  if (bad >= 0) throw new MapError(`terrain cell ${bad} names kind ${terrain[bad]}, but the map has ${kindCount} kinds`);
}

function checkWalk(walk: Uint8Array): void {
  const bad = walk.findIndex((value) => value > WALK_DOOR);
  if (bad >= 0) throw new MapError(`walk cell ${bad} is ${walk[bad]}, but the highest walk value is ${WALK_DOOR}`);
}

function checkTiles(tiles: Uint16Array, frameCount: number): void {
  const bad = tiles.findIndex((frame) => frame !== NO_FRAME && frame >= frameCount);
  if (bad >= 0) throw new MapError(`tile cell ${bad} names frame ${tiles[bad]}, but the map has ${frameCount} frames`);
}

function isEntityKind(value: number): value is MapEntity['kind'] {
  return value >= ENTITY_HOME && value <= ENTITY_CIVIC;
}

function homeCapacity(capacity: number, closes: number, what: string): number {
  if (capacity < 1) throw new MapError(`${what} is a home with capacity ${capacity}, but a home holds at least 1`);
  if (closes !== 0) throw new MapError(`${what} is a home with a closing minute (${closes}), but only shops have hours`);
  return capacity;
}

function checkShopHours(opens: number, closes: number, what: string): void {
  if (closes <= opens || closes > MINUTES_PER_DAY) {
    throw new MapError(
      `${what} is a shop that opens at ${opens} and closes at ${closes}, but closing must come after opening and by ${MINUTES_PER_DAY}`,
    );
  }
}

// The layout's a and b are a home's capacity, or a shop's opening and closing minute; any other entity leaves both 0.
function usageOf(kind: MapEntity['kind'], a: number, b: number, what: string): Pick<MapEntity, 'capacity' | 'opens' | 'closes'> {
  if (kind === ENTITY_HOME) return { capacity: homeCapacity(a, b, what), opens: 0, closes: 0 };
  if (kind === ENTITY_SHOP) {
    checkShopHours(a, b, what);
    return { capacity: 0, opens: a, closes: b };
  }
  if (a !== 0 || b !== 0) {
    throw new MapError(`${what} is a ${ENTITY_KIND_NAMES[kind]} with capacity or hours set (${a}, ${b})`);
  }
  return { capacity: 0, opens: 0, closes: 0 };
}

function isInside(x: number, y: number, header: Header): boolean {
  return x < header.width && y < header.height;
}

function checkPlacement(entity: MapEntity, header: Header, what: string): void {
  if (entity.w < 1 || entity.h < 1) throw new MapError(`${what} has an empty footprint`);
  if (!isInside(entity.x + entity.w - 1, entity.y + entity.h - 1, header)) {
    throw new MapError(`${what} has a footprint outside the ${header.width}x${header.height} map`);
  }
  if (!isInside(entity.doorX, entity.doorY, header)) {
    throw new MapError(`${what} has a door outside the ${header.width}x${header.height} map`);
  }
  if (entity.frame >= header.frameCount) {
    throw new MapError(`${what} names frame ${entity.frame}, but the map has ${header.frameCount} frames`);
  }
}

function readEntity(cursor: Cursor, index: number, header: Header): MapEntity {
  const what = `entity ${index}`;
  const kind = readU8(cursor, what);
  const w = readU8(cursor, what);
  const h = readU8(cursor, what);
  const reserved = readU8(cursor, what);
  const x = readU16(cursor, what);
  const y = readU16(cursor, what);
  const doorX = readU16(cursor, what);
  const doorY = readU16(cursor, what);
  const frame = readU16(cursor, what);
  const a = readU16(cursor, what);
  const b = readU16(cursor, what);
  if (!isEntityKind(kind)) throw new MapError(`${what} has kind ${kind}, but entity kinds run ${ENTITY_HOME}-${ENTITY_CIVIC}`);
  if (reserved !== 0) throw new MapError(`${what} sets its reserved byte to ${reserved}`);
  const entity: MapEntity = { kind, x, y, w, h, doorX, doorY, frame, ...usageOf(kind, a, b, what) };
  checkPlacement(entity, header, what);
  return entity;
}

function readEntities(cursor: Cursor, header: Header): MapEntity[] {
  const entities: MapEntity[] = [];
  for (let i = 0; i < header.entityCount; i++) entities.push(readEntity(cursor, i, header));
  return entities;
}

export function parseMap(buffer: ArrayBuffer): MapV1 {
  const cursor: Cursor = { view: new DataView(buffer), at: 0 };
  const header = readHeader(cursor);
  const cells = header.width * header.height;
  const kinds = readKinds(cursor, header.kindCount);
  const frames = readFrames(cursor, header.frameCount);
  const terrain = readBytes(cursor, cells, 'the terrain');
  const walk = readBytes(cursor, cells, 'the walk grid');
  const tiles = readTiles(cursor, cells);
  checkTerrain(terrain, kinds.length);
  checkWalk(walk);
  checkTiles(tiles, frames.length);
  const entities = readEntities(cursor, header);
  const trailing = cursor.view.byteLength - cursor.at;
  if (trailing > 0) throw new MapError(`the map has trailing bytes: ${trailing} after its last entity`);
  return { version: MAP_VERSION, width: header.width, height: header.height, kinds, frames, terrain, walk, tiles, entities };
}
