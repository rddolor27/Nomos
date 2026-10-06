// World-edit codec for share links (round 9, question 3). Node built-ins only.
// A world is (format, generator versions, seed, fingerprint, edit layers). Ops are grouped by
// stage layer, keeping their order inside a layer; ops in different layers commute because each
// layer is applied inside its own generator stage.
import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib';

export const K = {
  ELEV: 0, BIOME: 1, RIVER: 2, TOWN_ADD: 3, TOWN_MOVE: 4, TOWN_DELETE: 5, LOCK: 6, ROAD_ADD: 7,
  ROAD_REMOVE: 8, WONDER: 9, HEARTH: 10, NAME: 11, PLACE_PIN: 12, PLACE_PAINT: 13, PLACE_PROP: 14,
};
const KINDS = Object.keys(K).length;
const LAYER = [0, 1, 2, 3, 3, 3, 3, 4, 4, 5, 6, 7, 8, 8, 8];
export const LIMITS = { cells: 1 << 20, radius: 8, biomes: 11, uids: 1 << 20, wonders: 11, cultures: 8, place: 64, text: 24, path: 64 };
const NAME_CHARS = /^[A-Za-z][A-Za-z' -]*$/;

export function canonical(ops) {
  return ops.map((op, i) => [op, i])
    .sort((a, b) => LAYER[a[0].k] - LAYER[b[0].k] || (a[0].place ?? 0) - (b[0].place ?? 0) || a[1] - b[1])
    .map(([op]) => op);
}

class Out {
  constructor() { this.b = new Uint8Array(4096); this.n = 0; }
  byte(v) {
    if (this.n === this.b.length) { const g = new Uint8Array(this.b.length * 2); g.set(this.b); this.b = g; }
    this.b[this.n++] = v;
  }
  uvar(v) { while (v >= 0x80) { this.byte((v & 0x7f) | 0x80); v = Math.floor(v / 128); } this.byte(v); }
  svar(v) { this.uvar(v >= 0 ? v * 2 : -v * 2 - 1); }
  u32(v) { for (let s = 0; s < 32; s += 8) this.byte((v >>> s) & 0xff); }
  text(s) { const e = Buffer.from(s, 'latin1'); this.uvar(e.length); for (const c of e) this.byte(c); }
  bytes() { return this.b.subarray(0, this.n); }
}

class In {
  constructor(b) { this.b = b; this.i = 0; }
  byte() { if (this.i >= this.b.length) throw new Error('truncated'); return this.b[this.i++]; }
  uvar() {
    let v = 0, m = 1;
    for (let k = 0; k < 5; k++) { const c = this.byte(); v += (c & 0x7f) * m; if (c < 0x80) return v; m *= 128; }
    throw new Error('varint too long');
  }
  svar() { const u = this.uvar(); return u % 2 ? -(u + 1) / 2 : u / 2; }
  u32() { let v = 0; for (let s = 0; s < 32; s += 8) v |= this.byte() << s; return v >>> 0; }
  text(max) {
    const n = this.uvar();
    if (n > max) throw new Error('text too long');
    let s = '';
    for (let k = 0; k < n; k++) s += String.fromCharCode(this.byte());
    if (!NAME_CHARS.test(s)) throw new Error('bad name');
    return s;
  }
}

function check(ok, what) { if (!ok) throw new Error(what); }

export function encodeBinary(header, ops, delta = true) {
  const o = new Out();
  o.byte(1);
  o.uvar(header.gen);
  o.uvar(header.placeGen);
  o.u32(header.seed);
  o.u32(header.fingerprint);
  const list = canonical(ops);
  o.uvar(list.length);
  let last = 0, lx = 0, ly = 0, lastPlace = -1;
  const cell = c => { if (delta) { o.svar(c - last); last = c; } else o.uvar(c); };
  const xy = (x, y) => { if (delta) { o.svar(x - lx); o.svar(y - ly); lx = x; ly = y; } else { o.byte(x); o.byte(y); } };
  for (const op of list) {
    o.byte(op.k);
    switch (op.k) {
      case K.ELEV: cell(op.cell); o.byte(op.r); o.svar(op.v); break;
      case K.BIOME: cell(op.cell); o.byte(op.r); o.byte(op.v); break;
      case K.RIVER: cell(op.cell); o.byte(op.path.length); for (let j = 0; j < op.path.length; j += 2) o.byte(op.path[j] | ((op.path[j + 1] ?? 0) << 4)); break;
      case K.TOWN_ADD: cell(op.cell); o.byte(op.v); o.uvar(op.uid); break;
      case K.TOWN_MOVE: o.uvar(op.uid); cell(op.cell); break;
      case K.TOWN_DELETE: case K.LOCK: o.uvar(op.uid); break;
      case K.ROAD_ADD: case K.ROAD_REMOVE: o.uvar(op.uid); o.uvar(op.uid2); break;
      case K.WONDER: case K.HEARTH: o.byte(op.v); cell(op.cell); break;
      case K.NAME: o.uvar(op.uid); o.text(op.text); break;
      default: {
        if (delta) { o.svar(op.place - Math.max(lastPlace, 0)); } else o.uvar(op.place);
        if (op.place !== lastPlace) { lx = 0; ly = 0; lastPlace = op.place; }
        if (op.k === K.PLACE_PIN) { o.uvar(op.obj); xy(op.x, op.y); } else { xy(op.x, op.y); o.byte(op.v); }
      }
    }
  }
  return o.bytes();
}

export function decodeBinary(bytes, world = { cells: 6144 }) {
  const r = new In(bytes);
  check(r.byte() === 1, 'format');
  const header = { gen: r.uvar(), placeGen: r.uvar(), seed: r.u32(), fingerprint: r.u32() };
  const n = r.uvar();
  check(n <= 20000, 'too many ops');
  const ops = new Array(n);
  let last = 0, lx = 0, ly = 0, lastPlace = -1;
  const cell = () => { last += r.svar(); check(last >= 0 && last < world.cells, 'cell'); return last; };
  const xy = () => { lx += r.svar(); ly += r.svar(); check(lx >= 0 && ly >= 0 && lx < LIMITS.place && ly < LIMITS.place, 'xy'); return [lx, ly]; };
  for (let j = 0; j < n; j++) {
    const k = r.byte();
    check(k < KINDS, 'kind');
    let op;
    switch (k) {
      case K.ELEV: op = { k, cell: cell(), r: r.byte(), v: r.svar() }; check(op.r <= LIMITS.radius && Math.abs(op.v) <= 1000, 'elev'); break;
      case K.BIOME: op = { k, cell: cell(), r: r.byte(), v: r.byte() }; check(op.r <= LIMITS.radius && op.v < LIMITS.biomes, 'biome'); break;
      case K.RIVER: {
        const c = cell(), len = r.byte();
        check(len <= LIMITS.path, 'path');
        const path = [];
        for (let q = 0; q < len; q += 2) { const b = r.byte(); path.push(b & 15); if (q + 1 < len) path.push(b >> 4); }
        check(path.every(d => d < 8), 'dir');
        op = { k, cell: c, path }; break;
      }
      case K.TOWN_ADD: op = { k, cell: cell(), v: r.byte(), uid: r.uvar() }; check(op.v < 5 && op.uid < LIMITS.uids, 'town'); break;
      case K.TOWN_MOVE: op = { k, uid: r.uvar(), cell: cell() }; break;
      case K.TOWN_DELETE: case K.LOCK: op = { k, uid: r.uvar() }; break;
      case K.ROAD_ADD: case K.ROAD_REMOVE: op = { k, uid: r.uvar(), uid2: r.uvar() }; break;
      case K.WONDER: case K.HEARTH: op = { k, v: r.byte(), cell: cell() }; check(op.v < (k === K.WONDER ? LIMITS.wonders : LIMITS.cultures), 'kind value'); break;
      case K.NAME: op = { k, uid: r.uvar(), text: r.text(LIMITS.text) }; break;
      default: {
        const place = Math.max(lastPlace, 0) + r.svar();
        check(place >= 0 && place < LIMITS.uids, 'place');
        if (place !== lastPlace) { lx = 0; ly = 0; lastPlace = place; }
        if (k === K.PLACE_PIN) { const obj = r.uvar(); const [x, y] = xy(); op = { k, place, obj, x, y }; }
        else { const [x, y] = xy(); op = { k, place, x, y, v: r.byte() }; }
      }
    }
    ops[j] = op;
  }
  check(r.i === bytes.length, 'trailing bytes');
  return { header, ops };
}

// Column streams: one per field, so deflate sees runs of like values.
export function encodeColumns(header, ops) {
  const list = canonical(ops);
  const cols = { kind: new Out(), cell: new Out(), small: new Out(), value: new Out(), id: new Out(), text: new Out() };
  const h = new Out();
  h.byte(2); h.uvar(header.gen); h.uvar(header.placeGen); h.u32(header.seed); h.u32(header.fingerprint); h.uvar(list.length);
  let last = 0, lx = 0, ly = 0, lastPlace = -1;
  for (const op of list) {
    cols.kind.byte(op.k);
    if (op.cell !== undefined) { cols.cell.svar(op.cell - last); last = op.cell; }
    if (op.r !== undefined) cols.small.byte(op.r);
    if (op.v !== undefined) cols.value.svar(op.v);
    if (op.uid !== undefined) cols.id.uvar(op.uid);
    if (op.uid2 !== undefined) cols.id.uvar(op.uid2);
    if (op.path) { cols.small.byte(op.path.length); for (const d of op.path) cols.small.byte(d); }
    if (op.text !== undefined) cols.text.text(op.text);
    if (op.place !== undefined) {
      cols.id.svar(op.place - Math.max(lastPlace, 0));
      if (op.place !== lastPlace) { lx = 0; ly = 0; lastPlace = op.place; }
      if (op.obj !== undefined) cols.id.uvar(op.obj);
      cols.small.svar(op.x - lx); cols.small.svar(op.y - ly); lx = op.x; ly = op.y;
    }
  }
  const parts = [h, ...Object.values(cols)].map(c => c.bytes());
  const out = new Out();
  for (const p of parts.slice(1)) out.uvar(p.length);
  return Buffer.concat([parts[0], out.bytes(), ...parts.slice(1)]);
}

export function decodeColumns(bytes, world = { cells: 6144 }) {
  const h = new In(bytes);
  check(h.byte() === 2, 'format');
  const header = { gen: h.uvar(), placeGen: h.uvar(), seed: h.u32(), fingerprint: h.u32() };
  const n = h.uvar();
  check(n <= 20000, 'too many ops');
  const lens = Array.from({ length: 6 }, () => h.uvar());
  let at = h.i;
  const [kind, cellIn, small, value, id, text] = lens.map(len => {
    check(at + len <= bytes.length, 'truncated');
    const col = new In(bytes.subarray(at, at + len));
    at += len;
    return col;
  });
  check(at === bytes.length, 'trailing bytes');
  let last = 0, lx = 0, ly = 0, lastPlace = -1;
  const cell = () => { last += cellIn.svar(); check(last >= 0 && last < world.cells, 'cell'); return last; };
  const xy = () => { lx += small.svar(); ly += small.svar(); check(lx >= 0 && ly >= 0 && lx < LIMITS.place && ly < LIMITS.place, 'xy'); return [lx, ly]; };
  const ops = new Array(n);
  for (let j = 0; j < n; j++) {
    const k = kind.byte();
    check(k < KINDS, 'kind');
    let op;
    switch (k) {
      case K.ELEV: op = { k, cell: cell(), r: small.byte(), v: value.svar() }; check(op.r <= LIMITS.radius && Math.abs(op.v) <= 1000, 'elev'); break;
      case K.BIOME: op = { k, cell: cell(), r: small.byte(), v: value.svar() }; check(op.r <= LIMITS.radius && op.v >= 0 && op.v < LIMITS.biomes, 'biome'); break;
      case K.RIVER: {
        const c = cell(), len = small.byte();
        check(len <= LIMITS.path, 'path');
        const path = Array.from({ length: len }, () => small.byte());
        check(path.every(d => d < 8), 'dir');
        op = { k, cell: c, path }; break;
      }
      case K.TOWN_ADD: op = { k, cell: cell(), v: value.svar(), uid: id.uvar() }; check(op.v >= 0 && op.v < 5 && op.uid < LIMITS.uids, 'town'); break;
      case K.TOWN_MOVE: op = { k, uid: id.uvar(), cell: cell() }; break;
      case K.TOWN_DELETE: case K.LOCK: op = { k, uid: id.uvar() }; break;
      case K.ROAD_ADD: case K.ROAD_REMOVE: op = { k, uid: id.uvar(), uid2: id.uvar() }; break;
      case K.WONDER: case K.HEARTH: op = { k, v: value.svar(), cell: cell() }; check(op.v >= 0 && op.v < (k === K.WONDER ? LIMITS.wonders : LIMITS.cultures), 'kind value'); break;
      case K.NAME: op = { k, uid: id.uvar(), text: text.text(LIMITS.text) }; break;
      default: {
        const place = Math.max(lastPlace, 0) + id.svar();
        check(place >= 0 && place < LIMITS.uids, 'place');
        if (place !== lastPlace) { lx = 0; ly = 0; lastPlace = place; }
        if (k === K.PLACE_PIN) { const obj = id.uvar(); const [x, y] = xy(); op = { k, place, obj, x, y }; }
        else { const [x, y] = xy(); op = { k, place, x, y, v: value.svar() }; check(op.v >= 0 && op.v < 64, 'tile'); }
      }
    }
    ops[j] = op;
  }
  for (const col of [kind, cellIn, small, value, id, text]) check(col.i === col.b.length, 'column length');
  return { header, ops };
}

export function encodeJson(header, ops, compact = false) {
  const list = canonical(ops);
  const body = compact
    ? list.map(op => [op.k, op.cell ?? op.place ?? null, op.r ?? op.obj ?? null, op.v ?? null, op.uid ?? op.x ?? null, op.uid2 ?? op.y ?? null, op.text ?? op.path ?? null])
    : list;
  return Buffer.from(JSON.stringify({ v: 1, ...header, ops: body }));
}

// Per-cell override layers: the final value per edited cell instead of the brush ops that set it.
export function encodeLayers(header, ops, width) {
  const elev = new Map(), biome = new Map(), tiles = new Map(), rest = [];
  const disc = (c, r, f) => {
    const cx = c % width, cy = Math.floor(c / width);
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (x >= 0 && x < width && y >= 0 && (x - cx) ** 2 + (y - cy) ** 2 <= r * r) f(y * width + x);
    }
  };
  for (const op of canonical(ops)) {
    if (op.k === K.ELEV) disc(op.cell, op.r, c => elev.set(c, (elev.get(c) ?? 0) + op.v));
    else if (op.k === K.BIOME) disc(op.cell, op.r, c => biome.set(c, op.v));
    else if (op.k === K.PLACE_PAINT) tiles.set(op.place * 4096 + op.y * 64 + op.x, op.v);
    else rest.push(op);
  }
  const o = new Out();
  o.byte(3); o.uvar(header.gen); o.uvar(header.placeGen); o.u32(header.seed); o.u32(header.fingerprint);
  for (const layer of [elev, biome, tiles]) {
    const keys = [...layer.keys()].sort((a, b) => a - b);
    o.uvar(keys.length);
    let last = 0;
    for (const key of keys) { o.uvar(key - last); last = key; o.svar(layer.get(key)); }
  }
  const headerBytes = encodeBinary(header, []).length - 1;
  return Buffer.concat([o.bytes(), encodeBinary(header, rest).subarray(headerBytes)]);
}

export const deflate = b => deflateRawSync(b, { level: 9 });
export const inflate = (b, max = 1 << 20) => inflateRawSync(b, { maxOutputLength: max });
export const toUrl = b => Buffer.from(b).toString('base64url');
export const fromUrl = s => {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('bad base64url');
  return Buffer.from(s, 'base64url');
};

// The CRC32 trailer catches the ~4% of single-character corruptions that still decode (Factorio's
// map exchange strings carry one for the same reason).
export function pack(header, ops) {
  const body = encodeColumns(header, ops);
  const sum = Buffer.alloc(4);
  sum.writeUInt32LE(crc32(body));
  return Buffer.concat([body, sum]);
}

export function unpack(all, world) {
  check(all.length > 4, 'truncated');
  const body = all.subarray(0, all.length - 4);
  check(crc32(body) === all.readUInt32LE(all.length - 4), 'checksum');
  return decodeColumns(body, world);
}

export function shareLink(prefix, header, ops) {
  return prefix + toUrl(deflate(pack(header, ops)));
}

export function openLink(prefix, link, world, maxChars = 32768, maxBytes = 1 << 20) {
  if (link.length > maxChars) throw new Error('link too long');
  if (!link.startsWith(prefix)) throw new Error('unknown format');
  return unpack(inflate(fromUrl(link.slice(prefix.length)), maxBytes), world);
}
