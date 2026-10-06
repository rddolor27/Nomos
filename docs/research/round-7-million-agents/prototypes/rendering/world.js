// Stand-in city for rendering tests only; not the sim. Uses Math.log/cos freely.
// 3,072 tiles a side follows round 3's sizing (1M agents ≈ 2,560²–3,240² tiles).
export const WORLD_TILES = 3072;
export const CELL = 16;
export const CELLS = WORLD_TILES / CELL;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Zipf-weighted Gaussian districts plus a 10% uniform background.
// Interleaved snapshot layout: f32 x, f32 y, u32 word = 12 bytes per agent.
export function makeCity(n, seed = 42, order = 'cell') {
  const r = rng(seed);
  const K = 48;
  const cx = [], cy = [], sd = [], cum = [];
  let total = 0;
  for (let k = 0; k < K; k++) {
    cx.push(300 + r() * (WORLD_TILES - 600));
    cy.push(300 + r() * (WORLD_TILES - 600));
    sd.push(30 + r() * 220);
    total += 1 / (k + 1);
    cum.push(total);
  }
  const buf = new ArrayBuffer(n * 12);
  const f = new Float32Array(buf), u = new Uint32Array(buf);
  for (let i = 0; i < n; i++) {
    let x, y;
    if (r() < 0.1) { x = r() * WORLD_TILES; y = r() * WORLD_TILES; }
    else {
      const t = r() * total;
      let k = 0;
      while (cum[k] < t) k++;
      const rad = Math.sqrt(-2 * Math.log(1 - r())) * sd[k], th = 2 * Math.PI * r();
      x = cx[k] + rad * Math.cos(th);
      y = cy[k] + rad * Math.sin(th);
    }
    f[3 * i] = Math.min(WORLD_TILES - 0.01, Math.max(0, x));
    f[3 * i + 1] = Math.min(WORLD_TILES - 0.01, Math.max(0, y));
    const q = r();
    const role = q < 0.0025 ? 2 : q < 0.07 ? 1 : 0;
    u[3 * i + 2] = role | (Math.floor(r() * 256) << 8);
  }
  return order === 'cell' ? sortByCell(buf, n) : { buf, cellStart: null, n };
}

// Counting sort by 16-tile cell, row-major, so each cell row is one contiguous index range.
function sortByCell(src, n) {
  const f = new Float32Array(src), u = new Uint32Array(src);
  const counts = new Uint32Array(CELLS * CELLS + 1);
  const cellOf = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    const c = ((f[3 * i + 1] / CELL) | 0) * CELLS + ((f[3 * i] / CELL) | 0);
    cellOf[i] = c;
    counts[c + 1]++;
  }
  for (let c = 0; c < CELLS * CELLS; c++) counts[c + 1] += counts[c];
  const cellStart = counts.slice();
  const out = new ArrayBuffer(n * 12);
  const of = new Float32Array(out), ou = new Uint32Array(out);
  const fill = counts.slice();
  for (let i = 0; i < n; i++) {
    const j = fill[cellOf[i]]++;
    of[3 * j] = f[3 * i]; of[3 * j + 1] = f[3 * i + 1]; ou[3 * j + 2] = u[3 * i + 2];
  }
  return { buf: out, cellStart, n };
}

// Densest 16-tile cell, used to centre district and street views.
export function densestCell(city) {
  const f = new Float32Array(city.buf);
  const counts = new Uint32Array(CELLS * CELLS);
  for (let i = 0; i < city.n; i++) counts[((f[3 * i + 1] / CELL) | 0) * CELLS + ((f[3 * i] / CELL) | 0)]++;
  let best = 0;
  for (let c = 1; c < counts.length; c++) if (counts[c] > counts[best]) best = c;
  return [(best % CELLS + 0.5) * CELL, (Math.floor(best / CELLS) + 0.5) * CELL];
}

// View presets by device pixels per tile on a 1920×1080 target.
export function views(city) {
  const c = densestCell(city);
  return {
    city: { cam: [WORLD_TILES / 2, WORLD_TILES / 2], ppt: 1080 / WORLD_TILES },
    district: { cam: c, ppt: 4 },
    street: { cam: c, ppt: 16 },
  };
}

export function visibleCount(city, view, w = 1920, h = 1080) {
  const f = new Float32Array(city.buf);
  const hw = w / 2 / view.ppt, hh = h / 2 / view.ppt;
  const x0 = view.cam[0] - hw, x1 = view.cam[0] + hw, y0 = view.cam[1] - hh, y1 = view.cam[1] + hh;
  let v = 0;
  for (let i = 0; i < city.n; i++) {
    const x = f[3 * i], y = f[3 * i + 1];
    if (x >= x0 && x < x1 && y >= y0 && y < y1) v++;
  }
  return v;
}

// One random-walk step in place; returns nothing. Stand-in for the sim's movement system.
export function step(f32, n, tick) {
  let s = (tick * 0x9e3779b1) | 0;
  for (let i = 0; i < n; i++) {
    s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + i | 0;
    const dx = ((s & 1023) - 511.5) * 0.0006, dy = (((s >>> 10) & 1023) - 511.5) * 0.0006;
    const x = f32[3 * i] + dx, y = f32[3 * i + 1] + dy;
    f32[3 * i] = x < 0 ? 0 : x >= WORLD_TILES ? WORLD_TILES - 0.01 : x;
    f32[3 * i + 1] = y < 0 ? 0 : y >= WORLD_TILES ? WORLD_TILES - 0.01 : y;
  }
}
