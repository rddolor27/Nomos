// Map document for the editor prototype: typed-array layers, a port of place.py's shore rule
// (tile_for) and its tidy_water constraint, and dirty-chunk tracking for GPU upload.

export const WATER = 0, GRASS = 1, MEADOW = 2, SAND = 3, PATH = 4, PAVING = 5, SOIL = 6;
export const KIND_NAMES = ['water', 'grass', 'meadow', 'sand', 'path', 'paving', 'soil'];
export const CHUNK_BITS = 5;
export const CHUNK = 1 << CHUNK_BITS;

const isOpen = (k) => k === GRASS || k === MEADOW || k === SAND;

export const TILE_NAMES = [];
const tileId = (name) => TILE_NAMES.push(name) - 1;
const T_WATER = tileId('nature/terrain_water_0');
const OUTER = [], SIDE = [], INNER = [];
for (const shore of ['sand', 'grass']) {
  OUTER.push(['ne', 'se', 'sw', 'nw'].map((c) => tileId(`scenery/shore_${shore}_${c}-outer_0`)));
  SIDE.push(['n', 'e', 's', 'w'].map((s) => tileId(`scenery/shore_${shore}_${s}_0`)));
  INNER.push(['ne', 'se', 'sw', 'nw'].map((c) => tileId(`scenery/shore_${shore}_${c}-inner_0`)));
}
const GRASS_V = [0, 1, 2].map((v) => tileId(`nature/terrain_grass_${v}`));
const MEADOW_V = [0, 1, 2].map((v) => tileId(`scenery/terrain_meadow_${v}`));
const PLAIN = [];
PLAIN[SAND] = tileId('nature/terrain_sand');
PLAIN[PATH] = tileId('nature/terrain_dirt-path');
PLAIN[PAVING] = tileId('nature/terrain_paving');
PLAIN[SOIL] = tileId('nature/terrain_soil-tilled');

export function createMap(w, h) {
  const cells = w * h;
  const cw = w >> CHUNK_BITS, ch = h >> CHUNK_BITS;
  return {
    w, h, cw, ch,
    kind: new Uint8Array(cells),
    sea: new Uint8Array(cells),
    tile: new Uint16Array(cells),
    dirty: new Uint8Array(cw * ch),
    dirtyList: new Uint32Array(cw * ch),
    dirtyCount: 0,
    tileStamp: new Uint32Array(cells),
    tileEpoch: 0,
    queue: new Int32Array(cells),
    queued: new Uint8Array(cells),
  };
}

export function mapBytes(m) {
  return m.kind.byteLength + m.sea.byteLength + m.tile.byteLength;
}

export function scratchBytes(m) {
  return m.dirty.byteLength + m.dirtyList.byteLength + m.tileStamp.byteLength + m.queue.byteLength + m.queued.byteLength;
}

function water(m, x, y) {
  return x >= 0 && y >= 0 && x < m.w && y < m.h && m.kind[y * m.w + x] === WATER;
}

export function tileFor(m, x, y) {
  const kind = m.kind[y * m.w + x];
  if (kind === WATER) return T_WATER;
  if (isOpen(kind)) {
    const shore = kind === SAND ? 0 : 1;
    const n = water(m, x, y - 1), e = water(m, x + 1, y), s = water(m, x, y + 1), w = water(m, x - 1, y);
    if (n && e) return OUTER[shore][0];
    if (s && e) return OUTER[shore][1];
    if (s && w) return OUTER[shore][2];
    if (n && w) return OUTER[shore][3];
    if (n) return SIDE[shore][0];
    if (e) return SIDE[shore][1];
    if (s) return SIDE[shore][2];
    if (w) return SIDE[shore][3];
    if (water(m, x + 1, y - 1)) return INNER[shore][0];
    if (water(m, x + 1, y + 1)) return INNER[shore][1];
    if (water(m, x - 1, y + 1)) return INNER[shore][2];
    if (water(m, x - 1, y - 1)) return INNER[shore][3];
  }
  if (kind === GRASS) return GRASS_V[(x * 7 + y * 13) % 5 % 3];
  if (kind === MEADOW) return MEADOW_V[(x * 5 + y * 3) % 3];
  return PLAIN[kind];
}

function tooThin(m, x, y) {
  const n = water(m, x, y - 1), e = water(m, x + 1, y), s = water(m, x, y + 1), w = water(m, x - 1, y);
  if ((n && s) || (e && w)) return true;
  if (n || e || s || w) return false;
  return (water(m, x + 1, y - 1) && water(m, x - 1, y + 1)) || (water(m, x - 1, y - 1) && water(m, x + 1, y + 1));
}

function seaNext(m, x, y) {
  const { w, h, sea } = m, i = y * w + x;
  return (y > 0 && sea[i - w]) || (x < w - 1 && sea[i + 1]) || (y < h - 1 && sea[i + w]) || (x > 0 && sea[i - 1]) ? 1 : 0;
}

// place.py's tidy_water exactly: raster passes, flipping in place, until nothing changes.
// The result depends on visiting order, because a flip can stop a neighbour's diagonal clause.
export function tidyAll(m) {
  let flips = 0, changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < m.h; y++) {
      for (let x = 0; x < m.w; x++) {
        const i = y * m.w + x;
        if (isOpen(m.kind[i]) && tooThin(m, x, y)) {
          m.kind[i] = WATER;
          m.sea[i] = seaNext(m, x, y);
          flips++;
          changed = true;
        }
      }
    }
  }
  return flips;
}

// The same constraint applied plan-then-apply: each pass finds every thin cell from one snapshot,
// then floods them together. The fixpoint no longer depends on visiting order, so an incremental
// run and a whole-map run agree exactly.
export function tidyAllSync(m) {
  const { w, h, kind } = m, buf = flipBuffers(m);
  let flips = 0;
  for (;;) {
    let n = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (isOpen(kind[y * w + x]) && tooThin(m, x, y)) { buf.cells[n] = y * w + x; buf.sea[n] = seaNext(m, x, y); n++; }
      }
    }
    if (!n) return flips;
    for (let f = 0; f < n; f++) { kind[buf.cells[f]] = WATER; m.sea[buf.cells[f]] = buf.sea[f]; }
    flips += n;
  }
}

export function tidyFromSync(m, changed, count, onFlip) {
  const { w, h, kind, queue, queued } = m, buf = flipBuffers(m);
  let n = 0, flips = 0;
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const j = y * w + x;
    if (queued[j] || !isOpen(kind[j])) return;
    queued[j] = 1;
    queue[n++] = j;
  };
  for (let c = 0; c < count; c++) {
    const i = changed[c], x = i % w, y = (i / w) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) push(x + dx, y + dy);
  }
  while (n) {
    let k = 0;
    for (let c = 0; c < n; c++) {
      const j = queue[c], x = j % w, y = (j / w) | 0;
      queued[j] = 0;
      if (isOpen(kind[j]) && tooThin(m, x, y)) { buf.cells[k] = j; buf.sea[k] = seaNext(m, x, y); k++; }
    }
    for (let f = 0; f < k; f++) {
      const j = buf.cells[f];
      onFlip(j, kind[j]);
      kind[j] = WATER;
      m.sea[j] = buf.sea[f];
    }
    flips += k;
    n = 0;
    for (let f = 0; f < k; f++) {
      const j = buf.cells[f], x = j % w, y = (j / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) push(x + dx, y + dy);
    }
  }
  return flips;
}

function flipBuffers(m) {
  if (!m.flip) m.flip = { cells: new Int32Array(m.w * m.h), sea: new Uint8Array(m.w * m.h) };
  return m.flip;
}

export function autotileAll(m) {
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) m.tile[y * m.w + x] = tileFor(m, x, y);
}

// Incremental tidy: a FIFO worklist seeded with the 3x3 neighbourhoods of changed cells, in the
// order given, so the same edit always floods the same cells. onFlip(i, oldKind) records undo.
export function tidyFrom(m, changed, count, onFlip) {
  const { w, h, kind, queue, queued } = m;
  let head = 0, tail = 0, flips = 0;
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const j = y * w + x;
    if (queued[j] || !isOpen(kind[j])) return;
    queued[j] = 1;
    queue[tail++] = j;
  };
  for (let c = 0; c < count; c++) {
    const i = changed[c], x = i % w, y = (i / w) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) push(x + dx, y + dy);
  }
  while (head < tail) {
    const i = queue[head++], x = i % w, y = (i / w) | 0;
    queued[i] = 0;
    if (!isOpen(kind[i]) || !tooThin(m, x, y)) continue;
    onFlip(i, kind[i]);
    kind[i] = WATER;
    m.sea[i] = seaNext(m, x, y);
    flips++;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) push(x + dx, y + dy);
  }
  return flips;
}

export function markDirty(m, x, y) {
  const c = (y >> CHUNK_BITS) * m.cw + (x >> CHUNK_BITS);
  if (!m.dirty[c]) {
    m.dirty[c] = 1;
    m.dirtyList[m.dirtyCount++] = c;
  }
}

// Re-derives tiles in the 3x3 neighbourhood of each changed cell, each cell at most once.
// onTile(i, oldTile) records undo before a tile changes.
export function autotileAround(m, changed, count, onTile) {
  const { w, h, tile, tileStamp } = m;
  const epoch = ++m.tileEpoch;
  let updates = 0;
  for (let c = 0; c < count; c++) {
    const i = changed[c], x0 = i % w, y0 = (i / w) | 0;
    for (let y = y0 - 1; y <= y0 + 1; y++) {
      if (y < 0 || y >= h) continue;
      for (let x = x0 - 1; x <= x0 + 1; x++) {
        if (x < 0 || x >= w) continue;
        const j = y * w + x;
        if (tileStamp[j] === epoch) continue;
        tileStamp[j] = epoch;
        const t = tileFor(m, x, y);
        if (t !== tile[j]) {
          onTile(j, tile[j]);
          tile[j] = t;
          markDirty(m, x, y);
          updates++;
        }
      }
    }
  }
  return updates;
}

// Stands in for one texSubImage2D per dirty 32x32 chunk. WebGL2 can read the sub-rectangle in
// place with UNPACK_ROW_LENGTH and UNPACK_SKIP_*, so this copy is an upper bound on CPU work.
export function flushDirty(m, staging) {
  const { w, tile, dirty, dirtyList } = m;
  let bytes = 0;
  for (let d = 0; d < m.dirtyCount; d++) {
    const c = dirtyList[d], cx = (c % m.cw) << CHUNK_BITS, cy = ((c / m.cw) | 0) << CHUNK_BITS;
    for (let r = 0; r < CHUNK; r++) staging.set(tile.subarray((cy + r) * w + cx, (cy + r) * w + cx + CHUNK), r * CHUNK);
    dirty[c] = 0;
    bytes += CHUNK * CHUNK * 2;
  }
  const chunks = m.dirtyCount;
  m.dirtyCount = 0;
  return { chunks, bytes };
}

// lowbias32 and the seed-first keyed draw of tools/worldgen/rng.py, for reproducible test strokes.
export function mix(x) {
  x >>>= 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

export function draw(seed, stream, ...key) {
  let h = mix(mix(seed ^ 0x9e3779b9) ^ stream);
  for (const k of key) h = mix(h ^ (k >>> 0));
  return h;
}

// A synthetic 1,024^2-class place: lakes and channels from blurred keyed noise, meadow drifts,
// sand near water and a few paved and dirt roads. Only the mix of kinds matters for timing.
export function synthesize(m, seed) {
  const { w, h, kind } = m;
  const cell = 48;
  const lattice = (gx, gy, s) => draw(seed, s, gx, gy) >>> 16;
  const smooth = (x, y, s, size) => {
    const gx = (x / size) | 0, gy = (y / size) | 0, fx = x % size, fy = y % size;
    const a = lattice(gx, gy, s), b = lattice(gx + 1, gy, s), c = lattice(gx, gy + 1, s), d = lattice(gx + 1, gy + 1, s);
    const top = a + (((b - a) * fx) / size | 0), bottom = c + (((d - c) * fx) / size | 0);
    return top + (((bottom - top) * fy) / size | 0);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = (smooth(x, y, 1, cell) * 3 + smooth(x, y, 2, cell >> 2)) >> 2;
      const meadow = smooth(x, y, 3, 32);
      kind[y * w + x] = v < 25000 ? WATER : meadow > 40000 ? MEADOW : GRASS;
    }
  }
  for (let r = 0; r < 24; r++) {
    const vertical = r & 1, at = 20 + (draw(seed, 9, r) % (vertical ? w - 40 : h - 40));
    const k = r % 3 === 0 ? PAVING : PATH;
    for (let t = 0; t < (vertical ? h : w); t++) {
      for (let wdt = 0; wdt < 2; wdt++) {
        const x = vertical ? at + wdt : t, y = vertical ? t : at + wdt;
        if (kind[y * w + x] !== WATER) kind[y * w + x] = k;
      }
    }
  }
  tidyAll(m);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if ((kind[i] === GRASS || kind[i] === MEADOW) && nearWater(m, x, y, 2)) kind[i] = SAND;
    }
  }
  tidyAll(m);
  autotileAll(m);
}

function nearWater(m, x, y, r) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (water(m, x + dx, y + dy)) return true;
  return false;
}
