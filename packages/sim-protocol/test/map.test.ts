import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ENTITY_CIVIC,
  ENTITY_HOME,
  ENTITY_SHOP,
  ENTITY_WORKPLACE,
  MAP_CONTENT_TYPE,
  MAP_EXTENSION,
  MAP_MAGIC,
  MapError,
  NO_FRAME,
  WALK_BLOCKED,
  WALK_DOOR,
  WALK_OPEN,
  WALK_ROAD,
  parseMap,
  type MapV1,
} from '../src/index.ts';

// The header's u16 counts sit at these bytes: version 4, width 6, height 8, kinds 10, frames 12, entities 14.
const ENTITY_COUNT_AT = 14;

interface EntitySpec {
  kind: number;
  w: number;
  h: number;
  reserved: number;
  x: number;
  y: number;
  doorX: number;
  doorY: number;
  frame: number;
  a: number;
  b: number;
}

interface MapSpec {
  magic: number;
  version: number;
  width: number;
  height: number;
  kinds: { name: string; rgb: number }[];
  frames: string[];
  terrain: number[];
  walk: number[];
  tiles: number[];
  entities: EntitySpec[];
}

// The layout table of the M0.4 plan, written byte by byte and independent of src/map/map.ts.
function encode(spec: MapSpec): Uint8Array<ArrayBuffer> {
  const out: number[] = [];
  const u8 = (value: number): void => {
    out.push(value);
  };
  const u16 = (value: number): void => {
    out.push(value & 0xff, value >>> 8);
  };
  const u32 = (value: number): void => {
    u16(value & 0xffff);
    u16(value >>> 16);
  };
  const name = (text: string): void => {
    u8(text.length);
    for (let i = 0; i < text.length; i++) u8(text.charCodeAt(i));
  };

  u32(spec.magic);
  u16(spec.version);
  u16(spec.width);
  u16(spec.height);
  u16(spec.kinds.length);
  u16(spec.frames.length);
  u16(spec.entities.length);
  for (const kind of spec.kinds) {
    u8(kind.rgb >>> 16);
    u8((kind.rgb >>> 8) & 0xff);
    u8(kind.rgb & 0xff);
    name(kind.name);
  }
  spec.frames.forEach(name);
  spec.terrain.forEach(u8);
  spec.walk.forEach(u8);
  spec.tiles.forEach(u16);
  for (const entity of spec.entities) {
    u8(entity.kind);
    u8(entity.w);
    u8(entity.h);
    u8(entity.reserved);
    u16(entity.x);
    u16(entity.y);
    u16(entity.doorX);
    u16(entity.doorY);
    u16(entity.frame);
    u16(entity.a);
    u16(entity.b);
  }
  return Uint8Array.from(out);
}

// Row 1 holds a home, a workplace, a shop and a civic building, each one tile, with a door tile (walk 3) below it.
const base: MapSpec = {
  magic: 0x50414d4e,
  version: 1,
  width: 5,
  height: 4,
  kinds: [
    { name: 'grass', rgb: 0x4caa3c },
    { name: 'home', rgb: 0x8b3a62 },
    { name: 'workplace', rgb: 0x5a6578 },
    { name: 'shop', rgb: 0xe6d3a3 },
    { name: 'civic', rgb: 0xa0a8b8 },
  ],
  frames: [
    'nature/terrain_grass_0',
    'houses/house_row_0',
    'buildings/shop_general',
    'buildings/work_forge',
    'buildings/civic_town-hall',
  ],
  terrain: [0, 0, 0, 0, 0, 1, 2, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  walk: [1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 3, 3, 3, 3, 2, 1, 1, 1, 1, 1],
  tiles: [0, 0, 0, 0, 0xffff, 1, 3, 2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  entities: [
    { kind: 1, w: 1, h: 1, reserved: 0, x: 0, y: 1, doorX: 0, doorY: 2, frame: 1, a: 3, b: 0 },
    { kind: 2, w: 1, h: 1, reserved: 0, x: 1, y: 1, doorX: 1, doorY: 2, frame: 3, a: 0, b: 0 },
    { kind: 3, w: 1, h: 1, reserved: 0, x: 2, y: 1, doorX: 2, doorY: 2, frame: 2, a: 480, b: 1200 },
    { kind: 4, w: 1, h: 1, reserved: 0, x: 3, y: 1, doorX: 3, doorY: 2, frame: 4, a: 0, b: 0 },
  ],
};

const HOME = 0;
const WORKPLACE = 1;
const SHOP = 2;
const CIVIC = 3;

const parsedBase: MapV1 = {
  version: 1,
  width: 5,
  height: 4,
  kinds: base.kinds,
  frames: base.frames,
  terrain: Uint8Array.from(base.terrain),
  walk: Uint8Array.from(base.walk),
  tiles: Uint16Array.from(base.tiles),
  entities: [
    { kind: 1, x: 0, y: 1, w: 1, h: 1, doorX: 0, doorY: 2, frame: 1, capacity: 3, opens: 0, closes: 0 },
    { kind: 2, x: 1, y: 1, w: 1, h: 1, doorX: 1, doorY: 2, frame: 3, capacity: 0, opens: 0, closes: 0 },
    { kind: 3, x: 2, y: 1, w: 1, h: 1, doorX: 2, doorY: 2, frame: 2, capacity: 0, opens: 480, closes: 1200 },
    { kind: 4, x: 3, y: 1, w: 1, h: 1, doorX: 3, doorY: 2, frame: 4, capacity: 0, opens: 0, closes: 0 },
  ],
};

// What tools/worldgen/mapfile.py wrote to fixtures/tiny.nmap, decoded by hand from its bytes: every walk value, one
// NO_FRAME tile, a home of capacity 3 and a shop open 480-1200.
const tiny: MapV1 = {
  version: 1,
  width: 3,
  height: 2,
  kinds: [
    { name: 'grass', rgb: 0x4caa3c },
    { name: 'path', rgb: 0xa86c3c },
    { name: 'home', rgb: 0x7a4a86 },
    { name: 'shop', rgb: 0xccc4b0 },
  ],
  frames: [
    'buildings/shop_general',
    'houses/house_cottage_detached_roof-terracotta',
    'nature/terrain_dirt-path',
    'nature/terrain_grass_0',
  ],
  terrain: Uint8Array.from([2, 3, 0, 1, 1, 1]),
  walk: Uint8Array.from([0, 0, 1, 3, 3, 2]),
  tiles: Uint16Array.from([3, 3, 3, 2, 2, 0xffff]),
  entities: [
    { kind: 1, x: 0, y: 0, w: 1, h: 1, doorX: 0, doorY: 1, frame: 1, capacity: 3, opens: 0, closes: 0 },
    { kind: 3, x: 1, y: 0, w: 1, h: 1, doorX: 1, doorY: 1, frame: 0, capacity: 0, opens: 480, closes: 1200 },
  ],
};

function withEntity(spec: MapSpec, index: number, change: Partial<EntitySpec>): MapSpec {
  return { ...spec, entities: spec.entities.map((entity, i) => (i === index ? { ...entity, ...change } : entity)) };
}

function withCell(spec: MapSpec, field: 'terrain' | 'walk' | 'tiles', index: number, value: number): MapSpec {
  return { ...spec, [field]: spec[field].map((cell, i) => (i === index ? value : cell)) };
}

function patchedU16(bytes: Uint8Array, offset: number, value: number): Uint8Array {
  const copy = bytes.slice();
  new DataView(copy.buffer).setUint16(offset, value, true);
  return copy;
}

function cells(count: number, value: number): number[] {
  return new Array<number>(count).fill(value);
}

function kindsNamed(count: number): MapSpec['kinds'] {
  return Array.from({ length: count }, (_, i) => ({ name: `k${i}`, rgb: i }));
}

function fileBytes(name: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));
}

function failureOf(bytes: Uint8Array): Error | null {
  try {
    parseMap(bytes.slice().buffer);
    return null;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

type Rejection = [label: string, bytes: Uint8Array, message: RegExp];

function spec(label: string, map: MapSpec, message: RegExp): Rejection {
  return [label, encode(map), message];
}

function truncations(bytes: Uint8Array): Rejection[] {
  return Array.from(bytes, (_, length): Rejection => [`cut after ${length} of ${bytes.length} bytes`, bytes.slice(0, length), /ends inside/]);
}

function rejections(): Rejection[] {
  const valid = encode(base);
  const text = (html: string): Uint8Array => new TextEncoder().encode(html);
  return [
    ['an HTML page', text('<!doctype html>'), /not a Nomos map/],
    ['a longer HTML page', text('<!doctype html><html><title>404 Not Found</title></html>'), /not a Nomos map/],
    ['an empty buffer', new Uint8Array(0), /ends inside the header/],
    spec('a wrong magic number', { ...base, magic: 0x6f64213c }, /not a Nomos map/),
    spec('version 0', { ...base, version: 0 }, /version 0/),
    spec('version 2', { ...base, version: 2 }, /version 2/),
    spec('width 0', { ...base, width: 0 }, /width 0/),
    spec('width 1025', { ...base, width: 1025 }, /width 1025/),
    spec('height 0', { ...base, height: 0 }, /height 0/),
    spec('height 1025', { ...base, height: 1025 }, /height 1025/),
    spec('no terrain kinds', { ...base, kinds: [] }, /terrain kind count 0/),
    spec('256 terrain kinds', { ...base, kinds: kindsNamed(256) }, /terrain kind count 256/),
    spec('a kind name that is not ASCII', { ...base, kinds: [{ name: 'grés', rgb: 0 }, ...base.kinds.slice(1)] }, /ASCII/),
    spec('a frame name that is not ASCII', { ...base, frames: ['nature/gräs', ...base.frames.slice(1)] }, /ASCII/),
    spec('an empty kind name', { ...base, kinds: [{ name: '', rgb: 0 }, ...base.kinds.slice(1)] }, /terrain kind 0 has an empty name/),
    spec('an empty frame name', { ...base, frames: ['', ...base.frames.slice(1)] }, /frame name 0 has an empty name/),
    spec('a terrain index past the kinds', withCell(base, 'terrain', 7, 5), /terrain cell 7/),
    spec('the highest terrain index', withCell(base, 'terrain', 7, 255), /terrain cell 7/),
    spec('a walk value of 4', withCell(base, 'walk', 3, 4), /walk cell 3/),
    spec('a tile index past the frames', withCell(base, 'tiles', 6, 5), /tile cell 6/),
    spec('the tile index just below NO_FRAME', withCell(base, 'tiles', 6, 0xfffe), /tile cell 6/),
    spec('entity kind 0', withEntity(base, HOME, { kind: 0 }), /entity 0 has kind 0/),
    spec('entity kind 5', withEntity(base, HOME, { kind: 5 }), /entity 0 has kind 5/),
    spec('a set reserved byte', withEntity(base, WORKPLACE, { reserved: 1 }), /entity 1 .*reserved/),
    spec('a footprint past the right edge', withEntity(base, CIVIC, { x: 4, w: 2 }), /entity 3 .*footprint/),
    spec('a footprint past the bottom edge', withEntity(base, CIVIC, { y: 3, h: 2 }), /entity 3 .*footprint/),
    spec('a footprint 0 wide', withEntity(base, CIVIC, { w: 0 }), /entity 3 .*footprint/),
    spec('a footprint 0 high', withEntity(base, CIVIC, { h: 0 }), /entity 3 .*footprint/),
    spec('a door past the right edge', withEntity(base, CIVIC, { doorX: 5 }), /entity 3 .*door/),
    spec('a door past the bottom edge', withEntity(base, CIVIC, { doorY: 4 }), /entity 3 .*door/),
    spec('a frame past the frames', withEntity(base, CIVIC, { frame: 5 }), /entity 3 .*frame/),
    spec('a home of capacity 0', withEntity(base, HOME, { a: 0 }), /entity 0 .*capacity 0/),
    spec('a home with a closing minute', withEntity(base, HOME, { b: 7 }), /entity 0 .*home.*closing/),
    spec('a shop that closes before it opens', withEntity(base, SHOP, { a: 600, b: 500 }), /entity 2 .*closes at 500/),
    spec('a shop that closes as it opens', withEntity(base, SHOP, { a: 600, b: 600 }), /entity 2 .*closes at 600/),
    spec('a shop that closes after midnight', withEntity(base, SHOP, { a: 600, b: 1441 }), /entity 2 .*closes at 1441/),
    spec('a workplace with a capacity', withEntity(base, WORKPLACE, { a: 4 }), /entity 1 .*workplace/),
    spec('a civic building with hours', withEntity(base, CIVIC, { a: 480, b: 1200 }), /entity 3 .*civic/),
    ['a trailing byte', Uint8Array.from([...valid, 0]), /trailing bytes/],
    ['one entity too many', patchedU16(valid, ENTITY_COUNT_AT, 5), /ends inside entity 4/],
    ['one entity too few', patchedU16(valid, ENTITY_COUNT_AT, 3), /trailing bytes/],
    ...truncations(valid),
  ];
}

describe('parseMap', () => {
  it('pins the constants the format fixes', () => {
    expect(MAP_MAGIC).toBe(0x50414d4e);
    expect([WALK_BLOCKED, WALK_OPEN, WALK_ROAD, WALK_DOOR]).toEqual([0, 1, 2, 3]);
    expect([ENTITY_HOME, ENTITY_WORKPLACE, ENTITY_SHOP, ENTITY_CIVIC]).toEqual([1, 2, 3, 4]);
    expect(NO_FRAME).toBe(0xffff);
    expect(MAP_EXTENSION).toBe('.nmap');
    expect(MAP_CONTENT_TYPE).toBe('application/x-protobuf');
  });

  it('reads the Python fixture', () => {
    expect(parseMap(fileBytes('tiny.nmap').buffer)).toEqual(tiny);
  });

  it('reads every field, splitting a and b by entity kind', () => {
    expect(parseMap(encode(base).buffer)).toEqual(parsedBase);
  });

  it('copies its arrays', () => {
    const bytes = encode(base);
    const map = parseMap(bytes.buffer);

    bytes.fill(0);

    expect(map).toEqual(parsedBase);
    expect([map.terrain.buffer, map.walk.buffer, map.tiles.buffer]).not.toContain(bytes.buffer);
  });

  it('rejects broken maps with MapError', () => {
    expect(failureOf(encode(base))).toBeNull();

    const missed = rejections().flatMap(([label, bytes, message]) => {
      const error = failureOf(bytes);
      if (error instanceof MapError && error.name === 'MapError' && message.test(error.message)) return [];
      return [`${label}: ${error === null ? 'parsed' : `${error.name}: ${error.message}`}`];
    });

    expect(missed).toEqual([]);
  });

  it('accepts the limits of every range', () => {
    const row = { terrain: cells(1024, 0), walk: cells(1024, 1), tiles: cells(1024, 0xffff), entities: [] };
    const longName = 'x'.repeat(255);
    const limits: [string, MapSpec][] = [
      ['1024 wide', { ...base, ...row, width: 1024, height: 1 }],
      ['1024 high', { ...base, ...row, width: 1, height: 1024 }],
      ['255 kinds', withCell({ ...base, kinds: kindsNamed(255) }, 'terrain', 7, 254)],
      ['a 255-character name', { ...base, kinds: [{ name: longName, rgb: 0xffffff }, ...base.kinds.slice(1)] }],
      ['no frames, tiles or entities', { ...base, frames: [], tiles: cells(20, 0xffff), entities: [] }],
      ['a footprint on the last row and column', withEntity(base, CIVIC, { x: 3, y: 2, w: 2, h: 2, doorX: 4, doorY: 3 })],
      ['a shop open all day', withEntity(base, SHOP, { a: 0, b: 1440 })],
      ['a shop open the last minute', withEntity(base, SHOP, { a: 1439, b: 1440 })],
      ['a home of capacity 65535', withEntity(base, HOME, { a: 65535 })],
    ];

    const refused = limits.flatMap(([label, map]) => {
      const error = failureOf(encode(map));
      return error === null ? [] : [`${label}: ${error.message}`];
    });

    expect(refused).toEqual([]);
  });
});
