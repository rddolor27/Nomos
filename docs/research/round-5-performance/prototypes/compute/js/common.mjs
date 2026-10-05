// Shared helpers: integer hashing (deterministic in every engine), timing, hashing of typed arrays.
export function mix32(h) {
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16; return h >>> 0;
}
export function key3(seed, entity, tick) {
  return mix32(seed ^ mix32((entity + Math.imul(tick, 0x9E3779B9)) | 0));
}
// counter-based uniform [0,1) with 24 bits (exactly representable in f32)
export function u24(seed, i) { return (mix32(seed ^ mix32(i)) >>> 8) / 16777216; }

export const now = () => performance.now();

export function measure(fn, o = {}) {
  const minSampleMs = o.minSampleMs ?? 25, samples = o.samples ?? 9, warmupMs = o.warmupMs ?? 250, minWarm = o.minWarm ?? 5;
  let calls = 0; const t0 = now();
  while (calls < minWarm || now() - t0 < warmupMs) { fn(); calls++; }
  const per = (now() - t0) / calls;
  const reps = Math.max(1, Math.ceil(minSampleMs / Math.max(per, 1e-4)));
  const res = [];
  for (let s = 0; s < samples; s++) {
    const a = now();
    for (let r = 0; r < reps; r++) fn();
    res.push((now() - a) / reps);
  }
  res.sort((x, y) => x - y);
  return { med: res[res.length >> 1], min: res[0], max: res[res.length - 1], reps, n: samples };
}

// FNV-1a over the raw bytes of a typed array (bit-exact comparison of float results)
export function hashTA(ta) {
  const b = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength);
  let h = 0x811c9dc5;
  for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
export function hashMany(...tas) { return tas.map(hashTA).join(''); }
export function countDiff(a, b) {
  const x = new Uint32Array(a.buffer, a.byteOffset, a.byteLength >> 2), y = new Uint32Array(b.buffer, b.byteOffset, b.byteLength >> 2);
  let d = 0; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) d++; return d;
}

// ---------------- world/agent setup (constant density: 4 agents per 8x8 cell, radius = cell)
export const CELL = 8, INV_CELL = 0.125, R2 = 64, QSHIFT = 11 /* cell = 8 units * 256 (Q8) = 2^11 */, R2I = 2048 * 2048;
export function makeAgents(N, seed = 12345, clustered = false) {
  const g = Math.ceil(Math.sqrt(N / 4)); const W = g * CELL;
  const px = new Float32Array(N), py = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
  const nTown = 20;
  for (let i = 0; i < N; i++) {
    if (clustered && (i & 1)) { // half the agents live in 20 towns (radius ~24 units)
      const t = mix32(seed ^ 0x55 ^ i) % nTown;
      const cx = (0.1 + 0.8 * u24(seed ^ 0x77, t)) * W, cy = (0.1 + 0.8 * u24(seed ^ 0x99, t)) * W;
      const ox = (u24(seed + 3, i) + u24(seed + 4, i) + u24(seed + 5, i) - 1.5) * 32;
      const oy = (u24(seed + 6, i) + u24(seed + 7, i) + u24(seed + 8, i) - 1.5) * 32;
      px[i] = Math.min(Math.max(cx + ox, 0), W - 0.01); py[i] = Math.min(Math.max(cy + oy, 0), W - 0.01);
    } else { px[i] = u24(seed, i) * W; py[i] = u24(seed + 1, i) * W; }
    vx[i] = u24(seed + 2, i) * 2 - 1; vy[i] = u24(seed + 9, i) * 2 - 1;
  }
  const pxI = new Int32Array(N), pyI = new Int32Array(N), vxI = new Int32Array(N), vyI = new Int32Array(N);
  for (let i = 0; i < N; i++) { pxI[i] = Math.floor(px[i] * 256); pyI[i] = Math.floor(py[i] * 256); vxI[i] = Math.round(vx[i] * 25.6); vyI[i] = Math.round(vy[i] * 25.6); }
  const needs = new Uint8Array(5 * N);
  for (let i = 0; i < 5 * N; i++) needs[i] = mix32(seed ^ 0xBEEF ^ i) & 255;
  return { N, g, W, px, py, vx, vy, pxI, pyI, vxI, vyI, needs };
}
// utility tables: 8 response curves (integer/polynomial, no transcendental functions), 6 actions x 3 considerations
export function makeUtilTables() {
  const lut = new Uint16Array(8 * 256);
  for (let v = 0; v < 256; v++) {
    const t = v / 255;
    const c = [t, 1 - t, t * t, 1 - t * t, t * t * (3 - 2 * t), 1 - t * t * (3 - 2 * t), v < 128 ? 0.2 : 0.9, 0.5 + 0.5 * t];
    for (let k = 0; k < 8; k++) lut[k * 256 + v] = Math.round(c[k] * 65535);
  }
  const cons = new Uint8Array([0,0, 1,3, 3,7,  1,2, 0,5, 4,7,  2,4, 3,1, 0,3,  2,1, 4,0, 1,7,  4,4, 3,7, 1,3,  3,1, 2,6, 0,7]);
  const wts = new Uint16Array([255, 220, 200, 180, 160, 240]);
  return { lut, cons, wts };
}
// settlements: 32 cohorts (16 five-year bands x 2 sexes), daily rates in Q28
export function makeSettlementTables() {
  const q = [0.01, 0.001, 0.0005, 0.0007, 0.001, 0.0012, 0.0015, 0.002, 0.003, 0.005, 0.008, 0.012, 0.02, 0.035, 0.06, 0.12];
  const mort = new Int32Array(32);
  for (let a = 0; a < 32; a++) mort[a] = Math.round(q[a & 15] / 365 * 268435456);
  const fr = [0, 0, 0, 0.02, 0.1, 0.12, 0.1, 0.06, 0.02, 0.005, 0, 0, 0, 0, 0, 0];
  const fert = new Int32Array(16);
  for (let b = 0; b < 16; b++) fert[b] = Math.round(fr[b] / 365 * 268435456);
  const aging = Math.round(268435456 / (5 * 365));
  return { mort, fert, aging };
}
export function makeSettlements(S, seed = 777) {
  const pop = new Int32Array(S * 32), food = new Int32Array(S), price = new Int32Array(S), prod = new Int32Array(S), workers = new Int32Array(S);
  const hh = new Float64Array(S), farm = new Float64Array(S), treas = new Float64Array(S);
  for (let s = 0; s < S; s++) {
    const size = 200 + (mix32(seed ^ s) % 20000);
    let tot = 0;
    for (let a = 0; a < 32; a++) { const p = Math.floor(size * (1 - (a & 15) / 18) / 9); pop[s * 32 + a] = p; tot += p; }
    food[s] = tot * 20; price[s] = 100 + (mix32(seed ^ 0x1234 ^ s) % 200); prod[s] = 65536 + 13000 + (mix32(seed ^ 0x777 ^ s) % 9000);
    hh[s] = 1e9; farm[s] = 2e8; treas[s] = 0;
  }
  return { S, pop, food, price, prod, workers, hh, farm, treas };
}
// lattice graph: settlements on an L x L lattice; undirected edges to neighbours within Chebyshev radius rho (s < t once)
export function makeEdges(S, rho) {
  const L = Math.ceil(Math.sqrt(S)); const ea = [], eb = [];
  for (let s = 0; s < S; s++) {
    const x = s % L, y = (s / L) | 0;
    for (let dy = -rho; dy <= rho; dy++) for (let dx = -rho; dx <= rho; dx++) {
      const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= L) continue; const t = Y * L + X; if (t <= s || t >= S) continue;
      ea.push(s); eb.push(t);
    }
  }
  return { ne: ea.length, ea: Int32Array.from(ea), eb: Int32Array.from(eb) };
}
