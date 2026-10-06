// Editor tools over map.mjs: brush strokes, rectangle and flood fill, prefab stamps with footprint
// occupancy, and two undo recorders. Both recorders swap stored values with live ones, so one
// record serves undo and redo and holds a single copy of the changed data.

import { CHUNK, CHUNK_BITS, WATER, autotileAround, markDirty, tidyFrom, tidyFromSync } from './map.mjs';

export function createEditor(m, mode, deferTidy = false) {
  const cells = m.w * m.h;
  return {
    m, mode, deferTidy,
    changed: new Int32Array(cells),
    count: 0,
    strokeCells: new Int32Array(cells),
    strokeCount: 0,
    paintStamp: new Uint32Array(cells),
    stroke: 0,
    reverted: 0,
    rec: mode === 'diff' ? diffRecorder(m) : chunkRecorder(m),
    undoStack: [],
    redoStack: [],
    occ: new Uint32Array(cells),
    sprites: { frame: new Uint16Array(1 << 16), x: new Int32Array(1 << 16), y: new Int32Array(1 << 16), fw: new Uint8Array(1 << 16), fh: new Uint8Array(1 << 16), n: 0 },
  };
}

export function editorBytes(ed) {
  const s = ed.sprites;
  return ed.changed.byteLength + ed.strokeCells.byteLength + ed.paintStamp.byteLength + ed.occ.byteLength + ed.rec.scratchBytes()
    + s.frame.byteLength + s.x.byteLength + s.y.byteLength + s.fw.byteLength + s.fh.byteLength;
}

function grow(a, need) {
  if (need <= a.length) return a;
  const b = new a.constructor(Math.max(need, a.length * 2));
  b.set(a);
  return b;
}

function diffRecorder(m) {
  const touch = new Uint32Array(m.w * m.h);
  let epoch = 0, n = 0;
  let idx = new Uint32Array(4096), kind = new Uint8Array(4096), sea = new Uint8Array(4096), tile = new Uint16Array(4096);
  return {
    begin() { epoch++; n = 0; },
    before(i) {
      if (touch[i] === epoch) return;
      touch[i] = epoch;
      if (n === idx.length) { idx = grow(idx, n + 1); kind = grow(kind, n + 1); sea = grow(sea, n + 1); tile = grow(tile, n + 1); }
      idx[n] = i; kind[n] = m.kind[i]; sea[n] = m.sea[i]; tile[n] = m.tile[i];
      n++;
    },
    commit() {
      let k = 0;
      for (let e = 0; e < n; e++) {
        const i = idx[e];
        if (m.kind[i] === kind[e] && m.tile[i] === tile[e] && m.sea[i] === sea[e]) continue;
        idx[k] = i; kind[k] = kind[e]; sea[k] = sea[e]; tile[k] = tile[e];
        k++;
      }
      return { idx: idx.slice(0, k), kind: kind.slice(0, k), sea: sea.slice(0, k), tile: tile.slice(0, k) };
    },
    swap(r) {
      for (let e = 0; e < r.idx.length; e++) {
        const i = r.idx[e];
        let t = m.kind[i]; m.kind[i] = r.kind[e]; r.kind[e] = t;
        t = m.sea[i]; m.sea[i] = r.sea[e]; r.sea[e] = t;
        t = m.tile[i]; m.tile[i] = r.tile[e]; r.tile[e] = t;
        markDirty(m, i % m.w, (i / m.w) | 0);
      }
    },
    bytes(r) { return r.idx.byteLength + r.kind.byteLength + r.sea.byteLength + r.tile.byteLength; },
    scratchBytes() { return touch.byteLength + idx.byteLength + kind.byteLength + sea.byteLength + tile.byteLength; },
  };
}

function chunkRecorder(m) {
  const per = CHUNK * CHUNK;
  const touch = new Uint32Array(m.cw * m.ch);
  let epoch = 0, n = 0;
  let ids = new Uint32Array(64), kind = new Uint8Array(64 * per), sea = new Uint8Array(64 * per), tile = new Uint16Array(64 * per);
  const rows = (c, fn) => {
    const cx = (c % m.cw) << CHUNK_BITS, cy = ((c / m.cw) | 0) << CHUNK_BITS;
    for (let r = 0; r < CHUNK; r++) fn((cy + r) * m.w + cx, r * CHUNK);
  };
  return {
    begin() { epoch++; n = 0; },
    before(i) {
      const c = (((i / m.w) | 0) >> CHUNK_BITS) * m.cw + ((i % m.w) >> CHUNK_BITS);
      if (touch[c] === epoch) return;
      touch[c] = epoch;
      if (n === ids.length) { ids = grow(ids, n + 1); kind = grow(kind, (n + 1) * per); sea = grow(sea, (n + 1) * per); tile = grow(tile, (n + 1) * per); }
      const base = n * per;
      rows(c, (src, off) => {
        kind.set(m.kind.subarray(src, src + CHUNK), base + off);
        sea.set(m.sea.subarray(src, src + CHUNK), base + off);
        tile.set(m.tile.subarray(src, src + CHUNK), base + off);
      });
      ids[n++] = c;
    },
    commit() {
      return { ids: ids.slice(0, n), kind: kind.slice(0, n * per), sea: sea.slice(0, n * per), tile: tile.slice(0, n * per) };
    },
    swap(r) {
      for (let k = 0; k < r.ids.length; k++) {
        const c = r.ids[k], base = k * per;
        rows(c, (src, off) => {
          for (let x = 0; x < CHUNK; x++) {
            const i = src + x, e = base + off + x;
            let t = m.kind[i]; m.kind[i] = r.kind[e]; r.kind[e] = t;
            t = m.sea[i]; m.sea[i] = r.sea[e]; r.sea[e] = t;
            t = m.tile[i]; m.tile[i] = r.tile[e]; r.tile[e] = t;
          }
        });
        if (!m.dirty[c]) { m.dirty[c] = 1; m.dirtyList[m.dirtyCount++] = c; }
      }
    },
    bytes(r) { return r.ids.byteLength + r.kind.byteLength + r.sea.byteLength + r.tile.byteLength; },
    scratchBytes() { return touch.byteLength + ids.byteLength + kind.byteLength + sea.byteLength + tile.byteLength; },
  };
}

export function beginEdit(ed) {
  ed.rec.begin();
  ed.stroke++;
  ed.reverted = 0;
  ed.strokeCount = 0;
}

function setKind(ed, i, k) {
  const m = ed.m;
  if (m.kind[i] === k) return;
  ed.rec.before(i);
  m.kind[i] = k;
  if (k !== WATER) m.sea[i] = 0;
  ed.paintStamp[i] = ed.stroke;
  ed.changed[ed.count++] = i;
}

function tidyChanged(ed, cells, count) {
  const m = ed.m;
  return (m.sync ? tidyFromSync : tidyFrom)(m, cells, count, (i) => {
    ed.rec.before(i);
    if (ed.paintStamp[i] === ed.stroke) ed.reverted++;
    ed.changed[ed.count++] = i;
  });
}

// Derives what follows from the cells set since the last call: tidy (unless deferred to the end
// of the edit), then tiles. With paintOnly nothing is derived, for checking against a rebuild.
function settle(ed, paintOnly) {
  const m = ed.m, stats = { painted: ed.count, flips: 0, tiles: 0 };
  if (paintOnly) {
    for (let c = 0; c < ed.count; c++) markDirty(m, ed.changed[c] % m.w, (ed.changed[c] / m.w) | 0);
  } else {
    if (ed.deferTidy) ed.strokeCells.set(ed.changed.subarray(0, ed.count), (ed.strokeCount += ed.count) - ed.count);
    else stats.flips = tidyChanged(ed, ed.changed, ed.count);
    stats.tiles = autotileAround(m, ed.changed, ed.count, (j) => ed.rec.before(j));
  }
  ed.count = 0;
  return stats;
}

// Runs the deferred tidy once over everything the edit painted, so the result depends only on
// the edit's painted cells, never on how pointer events split the stroke.
export function finishEdit(ed) {
  if (!ed.deferTidy || !ed.strokeCount) return { painted: 0, flips: 0, tiles: 0 };
  const flips = tidyChanged(ed, ed.strokeCells, ed.strokeCount);
  const tiles = autotileAround(ed.m, ed.changed, ed.count, (j) => ed.rec.before(j));
  ed.count = 0;
  ed.strokeCount = 0;
  return { painted: 0, flips, tiles };
}

function stamp(ed, cx, cy, radius, k) {
  const m = ed.m, lim = radius * radius + radius;
  for (let dy = -radius; dy <= radius; dy++) {
    const y = cy + dy;
    if (y < 0 || y >= m.h) continue;
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx;
      if (x < 0 || x >= m.w || dx * dx + dy * dy > lim) continue;
      setKind(ed, y * m.w + x, k);
    }
  }
}

// One pointer event: stamps the brush along the Bresenham line from the last cell, as LDtk's
// tools do, then tidies and re-autotiles the touched neighbourhood.
export function brushEvent(ed, x0, y0, x1, y1, radius, k, paintOnly = false) {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), err = dx + dy;
  const sx = x1 > x0 ? 1 : -1, sy = y1 > y0 ? 1 : -1;
  for (;;) {
    stamp(ed, x0, y0, radius, k);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return settle(ed, paintOnly);
}

export function rectFill(ed, x0, y0, w, h, k) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setKind(ed, y * ed.m.w + x, k);
  return settle(ed, false);
}

// Every cell of one kind, map-wide: Tiled's "select same tile" followed by a fill.
export function replaceAll(ed, from, k) {
  const kind = ed.m.kind;
  for (let i = 0; i < kind.length; i++) if (kind[i] === from) setKind(ed, i, k);
  return settle(ed, false);
}

// Span flood fill over the 4-connected region of the seed's kind, with a typed-array stack.
let fillStack = new Int32Array(1 << 16);
export function floodFill(ed, sx, sy, k) {
  const m = ed.m, { w, h, kind } = m, from = kind[sy * w + sx];
  if (from === k) return settle(ed, false);
  let top = 0;
  fillStack[top++] = sy * w + sx;
  while (top > 0) {
    const i = fillStack[--top], y = (i / w) | 0;
    let x = i % w;
    if (kind[i] !== from) continue;
    while (x > 0 && kind[y * w + x - 1] === from) x--;
    let upOpen = false, downOpen = false;
    for (; x < w && kind[y * w + x] === from; x++) {
      setKind(ed, y * w + x, k);
      if (top + 2 > fillStack.length) fillStack = grow(fillStack, top + 2);
      if (y > 0) {
        const up = kind[(y - 1) * w + x] === from;
        if (up && !upOpen) fillStack[top++] = (y - 1) * w + x;
        upOpen = up;
      }
      if (y < h - 1) {
        const down = kind[(y + 1) * w + x] === from;
        if (down && !downOpen) fillStack[top++] = (y + 1) * w + x;
        downOpen = down;
      }
    }
  }
  return settle(ed, false);
}

// A prefab: terrain (255 = keep) plus footprinted buildings that need free, dry, unoccupied
// cells with a one-cell margin, as place.py's fits() asks. Returns null when a building cannot go.
export function placePrefab(ed, prefab, ox, oy) {
  const m = ed.m, { w } = m;
  for (const b of prefab.buildings) {
    for (let y = oy + b.ty - 1; y <= oy + b.ty + b.fh; y++) {
      for (let x = ox + b.tx - 1; x <= ox + b.tx + b.fw; x++) {
        if (x < 0 || y < 0 || x >= m.w || y >= m.h || ed.occ[y * w + x]) return null;
        const inside = x >= ox + b.tx && x < ox + b.tx + b.fw && y >= oy + b.ty && y < oy + b.ty + b.fh;
        if (inside && m.kind[y * w + x] === WATER && prefab.kind[(y - oy) * prefab.w + (x - ox)] === 255) return null;
      }
    }
  }
  for (let y = 0; y < prefab.h; y++) {
    for (let x = 0; x < prefab.w; x++) {
      const k = prefab.kind[y * prefab.w + x];
      if (k !== 255) setKind(ed, (oy + y) * w + ox + x, k);
    }
  }
  const stats = settle(ed, false);
  const s = ed.sprites, ids = new Uint32Array(prefab.buildings.length);
  prefab.buildings.forEach((b, j) => {
    const id = s.n++;
    s.frame[id] = b.frame; s.fw[id] = b.fw; s.fh[id] = b.fh;
    s.x[id] = (ox + b.tx) * 16 + b.fw * 8;
    s.y[id] = (oy + b.ty + b.fh) * 16 - 1;
    occupy(ed, id, id + 1);
    ids[j] = id;
  });
  return { ...stats, sprites: ids };
}

function occupy(ed, id, value) {
  const s = ed.sprites, w = ed.m.w;
  const tx = ((s.x[id] - s.fw[id] * 8) / 16) | 0, ty = (((s.y[id] + 1) / 16) | 0) - s.fh[id];
  for (let y = ty; y < ty + s.fh[id]; y++) for (let x = tx; x < tx + s.fw[id]; x++) ed.occ[y * w + x] = value;
}

export function commit(ed, sprites = null) {
  const r = ed.rec.commit();
  r.sprites = sprites;
  r.spritesLive = true;
  ed.undoStack.push(r);
  ed.redoStack.length = 0;
  return r;
}

export function undo(ed) {
  const r = ed.undoStack.pop();
  if (!r) return false;
  ed.rec.swap(r);
  if (r.sprites) for (const id of r.sprites) occupy(ed, id, 0);
  ed.redoStack.push(r);
  return true;
}

export function redo(ed) {
  const r = ed.redoStack.pop();
  if (!r) return false;
  ed.rec.swap(r);
  if (r.sprites) for (const id of r.sprites) occupy(ed, id, id + 1);
  ed.undoStack.push(r);
  return true;
}

export function recordBytes(ed, r) {
  return ed.rec.bytes(r) + (r.sprites ? r.sprites.byteLength : 0);
}
