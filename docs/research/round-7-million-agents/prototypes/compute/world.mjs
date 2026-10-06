// World layout, one shared WebAssembly.Memory arena, deterministic world generation and state hashing.
// Throwaway research code for round 7 (million agents). Integer-only replay state.

export const CHUNK = 1024;
export const TILE_SHIFT = 8;            // Q8 positions: 256 units per tile
export const CELL_SHIFT = 10;           // perception cell = 4x4 tiles
export const WS = 1024, WMASK = 1023;   // per-chunk timing wheel
export const K_ZONES = 16, N_SHOPS = 4; // zone type ((k & 3) + (k >> 2)) & 3: 0 market, 1 park, 2-3 workplace
export const MAX_WORKERS = 16;
export const CELL_BLOCK = 1024;
export const FULL = 65535, EAT_T = 26000;
export const RATE_H = 80, RATE_E = 50, RATE_S = 40, RATE_P = 70; // need units lost per tick (hunger scaled by Q7 metabolism)
export const WAGE = 900, BUY_QTY = 6;
export const S_SPAWN = 1, S_DECIDE = 2, S_WHEEL = 3;
export const ROLE_CIT = 0, ROLE_MER = 1, ROLE_POL = 2;

// lowbias32 (Chris Wellons), as in the plan's mix32.
export function mix32(h) {
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16; return h >>> 0;
}
// Keyed draw: the seed is hashed before the entity is mixed in.
export function draw(seedH, entity, tick, stream) {
  return mix32(seedH ^ mix32(((entity ^ Math.imul(stream, 0x85ebca6b)) + Math.imul(tick, 0x9e3779b9)) | 0));
}

const BYTES = { i32: 4, u32: 4, f32: 4, f64: 8, u8: 1, u16: 2 };
const CTORS = { i32: Int32Array, u32: Uint32Array, f32: Float32Array, f64: Float64Array, u8: Uint8Array, u16: Uint16Array };

export function makeLayout(N) {
  const W = 8 * Math.ceil(Math.sqrt(N) / 8);   // tiles per side, about one agent per tile
  const CW = W >> 2, NC = CW * CW, NT = W * W;
  const nChunks = Math.ceil(N / CHUNK), nCB = Math.ceil(NC / CELL_BLOCK);
  const MW = MAX_WORKERS;
  const specs = [
    ['ctrl', 'i32', 64], ['totals', 'f64', 16],
    ['px', 'i32', N], ['py', 'i32', N], ['needZ', 'i32', 4 * N], ['wnext', 'i32', N], ['cell', 'i32', N],
    ['partner', 'i32', N], ['hhOf', 'i32', N], ['sorted', 'i32', N],
    ['dest', 'u8', N], ['dirC', 'u8', N], ['role', 'u8', N], ['act', 'u8', N], ['speed', 'u8', N], ['metab', 'u8', N],
    ['homeZone', 'u8', N], ['workZone', 'u8', N], ['shopZone', 'u8', N], ['parkZone', 'u8', N],
    ['food', 'i32', N], ['cash', 'f64', N],
    // per-cell aggregates interleaved: count, police, merchants, hungry
    ['cellStart', 'i32', NC + 1], ['agg', 'i32', 4 * NC],
    ['blockSum', 'i32', nCB], ['blockStart', 'i32', nCB],
    ['wheelHead', 'i32', nChunks * WS],
    // lean mode: per-chunk dense lists of travelling agents (swap-remove), and agents decided this tick
    ['movers', 'i32', N], ['mPos', 'i32', N], ['mCount', 'i32', nChunks],
    ['decided', 'i32', N], ['dCount', 'i32', nChunks],
    ['cMeals', 'i32', nChunks], ['cDec', 'i32', nChunks], ['cSoc', 'i32', nChunks], ['cBuys', 'i32', nChunks],
    ['cSales', 'f64', nChunks * N_SHOPS],
    ['shopCash', 'f64', N_SHOPS], ['price', 'i32', N_SHOPS], ['zoneTile', 'i32', K_ZONES], ['zoneCell', 'i32', K_ZONES], ['zoneShop', 'i32', K_ZONES],
    ['lut', 'u16', 8 * 256],
    ['flow', 'u8', K_ZONES * NT],
    ['snapX', 'f32', N], ['snapY', 'f32', N], ['snapVis', 'u32', N],
    // per-worker scratch: depends on the worker count, never hashed
    ['part', 'i32', MW * NC * 4], ['off', 'i32', MW * NC],
  ];
  let off = 0; const fields = [];
  for (const [name, type, len] of specs) {
    off = (off + 63) & ~63;           // cache-line aligned, so arrays never share a line
    fields.push({ name, type, len, off });
    off += len * BYTES[type];
  }
  return { N, W, CW, NC, NT, nChunks, nCB, fields, bytes: off };
}

export const SCRATCH = new Set(['part', 'off', 'blockSum', 'blockStart', 'ctrl', 'decided', 'dCount']);

export function makeArena(L) {
  const pages = Math.ceil(L.bytes / 65536);
  return new WebAssembly.Memory({ initial: pages, maximum: pages, shared: true });
}

export function makeViews(buffer, L) {
  const V = {};
  for (const f of L.fields) V[f.name] = new CTORS[f.type](buffer, f.off, f.len);
  return V;
}

const DXS = [0, 1, 1, 0, -1, -1, -1, 0, 1], DYS = [0, 0, 1, 1, 1, 0, -1, -1, -1];

function isBuilding(x, y) {
  const bx = x & 7, by = y & 7;
  if (bx < 2 || bx > 5 || by < 2 || by > 5) return false;
  return !(bx === 3 && by === 5); // the door is walkable
}

// BFS on an 8-connected grid without corner cutting; the flow field stores the direction (1..8) of a
// neighbour one step closer, ties broken by direction order; 0 at the target and on blocked tiles.
function buildFlow(walk, W, target, flow, base, dist, queue) {
  const NT = W * W;
  dist.fill(-1);
  let qh = 0, qt = 0;
  dist[target] = 0; queue[qt++] = target;
  while (qh < qt) {
    const t = queue[qh++], x = t % W, y = (t / W) | 0, nd = dist[t] + 1;
    for (let d = 1; d <= 8; d++) {
      const nx = x + DXS[d], ny = y + DYS[d];
      if (nx < 0 || ny < 0 || nx >= W || ny >= W) continue;
      const n = ny * W + nx;
      if (!walk[n] || dist[n] >= 0) continue;
      if ((d & 1) === 0 && (!walk[y * W + nx] || !walk[ny * W + x])) continue;
      dist[n] = nd; queue[qt++] = n;
    }
  }
  for (let t = 0; t < NT; t++) {
    let best = 0;
    const dt = dist[t];
    if (dt > 0) {
      const x = t % W, y = (t / W) | 0;
      let bd = dt;
      for (let d = 1; d <= 8; d++) {
        const nx = x + DXS[d], ny = y + DYS[d];
        if (nx < 0 || ny < 0 || nx >= W || ny >= W) continue;
        const n = ny * W + nx;
        if (!walk[n] || dist[n] < 0) continue;
        if ((d & 1) === 0 && (!walk[y * W + nx] || !walk[ny * W + x])) continue;
        if (dist[n] < bd) { bd = dist[n]; best = d; }
      }
    }
    flow[base + t] = best;
  }
}

// Response curves as Q16 tables built from polynomials (no transcendental Math).
function buildLut(lut) {
  for (let v = 0; v < 256; v++) {
    const t = v / 255;
    const c = [t, 1 - t, t * t, 1 - t * t, t * t * (3 - 2 * t), 1 - t * t * (3 - 2 * t), v < 128 ? 0.2 : 0.9, 0.5 + 0.5 * t];
    for (let k = 0; k < 8; k++) lut[k * 256 + v] = Math.round(c[k] * 65535);
  }
}

export function buildWorld(V, L, seed) {
  const { N, W, NT } = L;
  const seedH = mix32(seed);
  const walk = new Uint8Array(NT);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) walk[y * W + x] = isBuilding(x, y) ? 0 : 1;
  // zones on a jitter-free 4x4 lattice of street intersections
  for (let k = 0; k < 16; k++) {
    const kx = k & 3, ky = k >> 2;
    const zx = 8 * Math.floor(((2 * kx + 1) * W) / 64), zy = 8 * Math.floor(((2 * ky + 1) * W) / 64);
    V.zoneTile[k] = zy * W + zx;
    V.zoneCell[k] = (zy >> 2) * (W >> 2) + (zx >> 2);
  }
  const ztype = (k) => ((k & 3) + (k >> 2)) & 3;
  let shops = 0;
  for (let k = 0; k < 16; k++) V.zoneShop[k] = ztype(k) === 0 ? shops++ : -1;
  const dist = new Int32Array(NT), queue = new Int32Array(NT);
  for (let k = 0; k < K_ZONES; k++) buildFlow(walk, W, V.zoneTile[k], V.flow, k * NT, dist, queue);
  buildLut(V.lut);
  for (let s = 0; s < N_SHOPS; s++) { V.price[s] = 250 + 25 * s; V.shopCash[s] = 0; }
  // doors in row-major block order; households fill agent indices in that spatial order and never
  // straddle a 1,024-agent chunk, so meals and purchases write only chunk-owned household records
  const BW = W >> 3, nDoors = BW * BW;
  const zx = new Int32Array(16), zy = new Int32Array(16);
  for (let k = 0; k < 16; k++) { zx[k] = V.zoneTile[k] % W; zy[k] = (V.zoneTile[k] / W) | 0; }
  let i = 0, h = 0;
  while (i < N) {
    const r = draw(seedH, h, 0, S_SPAWN);
    let size = 1 + (r & 3) + ((r >>> 2) & 1);
    const room = CHUNK - (i % CHUNK);
    if (size > room) size = room;
    if (size > N - i) size = N - i;
    const door = Math.floor((i * nDoors) / N);
    const dx = (door % BW) * 8 + 3, dy = ((door / BW) | 0) * 8 + 5;
    // nearest zone overall (home district), nearest market and park, the two nearest workplaces
    let hz = 0, hd = 1e9, sz = 0, sd = 1e9, pz = 0, pd = 1e9, w1 = 0, w1d = 1e9, w2 = 0, w2d = 1e9;
    for (let k = 0; k < 16; k++) {
      const dd = Math.abs(zx[k] - dx) + Math.abs(zy[k] - dy), ty = ztype(k);
      if (dd < hd) { hd = dd; hz = k; }
      if (ty === 0 && dd < sd) { sd = dd; sz = k; }
      if (ty === 1 && dd < pd) { pd = dd; pz = k; }
      if (ty >= 2) { if (dd < w1d) { w2 = w1; w2d = w1d; w1 = k; w1d = dd; } else if (dd < w2d) { w2 = k; w2d = dd; } }
    }
    V.food[h] = 8 + ((r >>> 3) & 15);
    V.cash[h] = 40000 + ((r >>> 7) & 0xffff);
    for (let m = 0; m < size; m++, i++) {
      const a = draw(seedH, i, 0, S_SPAWN + 16), b = draw(seedH, i, 1, S_SPAWN + 16);
      V.px[i] = (dx << 8) + 64 + (a & 127);
      V.py[i] = (dy << 8) + 64 + ((a >>> 7) & 127);
      const rr = (a >>> 14) % 10000;
      V.role[i] = rr < 25 ? ROLE_POL : rr < 225 ? ROLE_MER : ROLE_CIT;   // 0.25% police, 2% merchants
      // speed scales with the map width, so trip durations in ticks do not depend on the agent count
      V.speed[i] = Math.min(255, Math.max(16, Math.round(((64 + ((a >>> 26) & 63)) * W) / 512)));
      V.metab[i] = 96 + (b & 63);
      V.homeZone[i] = hz; V.shopZone[i] = sz; V.parkZone[i] = pz;
      V.workZone[i] = ((b >>> 6) & 3) === 0 ? w2 : w1;
      const pick = (b >>> 9) & 3;
      V.dest[i] = pick === 0 ? hz : pick === 1 ? sz : pick === 2 ? V.workZone[i] : pz;
      V.act[i] = 0;
      V.hhOf[i] = h;
      V.partner[i] = -1;
      const rateH = (RATE_H * V.metab[i]) >> 7;
      const j = i << 2;
      V.needZ[j] = Math.ceil((EAT_T + ((b >>> 13) % (FULL - EAT_T))) / rateH);
      V.needZ[j + 1] = (b >>> 3) % 1300;
      V.needZ[j + 2] = (b >>> 5) % 1600;
      V.needZ[j + 3] = (b >>> 11) % 930;
    }
    h++;
  }
  const CWs = W >> 2;
  for (let a = 0; a < N; a++) {
    V.dirC[a] = V.flow[V.dest[a] * NT + (V.py[a] >> 8) * W + (V.px[a] >> 8)];
    V.cell[a] = (V.py[a] >> CELL_SHIFT) * CWs + (V.px[a] >> CELL_SHIFT);
    V.mPos[a] = -1;
  }
  for (let a = 0; a < N; a++) {
    if (V.dirC[a] === 0) continue;
    const c = (a / CHUNK) | 0, k = V.mCount[c];
    V.movers[c * CHUNK + k] = a; V.mPos[a] = k; V.mCount[c] = k + 1;
  }
  for (let a = 0; a < N; a++) {
    V.snapX[a] = V.px[a] * 0.00390625; V.snapY[a] = V.py[a] * 0.00390625;
    V.snapVis[a] = V.role[a] | (V.act[a] << 3) | (V.dest[a] << 6);
  }
  V.wheelHead.fill(-1);
  for (let a = 0; a < N; a++) {
    const c = (a / CHUNK) | 0;
    const d = 1 + (draw(seedH, a, 0, S_WHEEL) & 63);
    const s = c * WS + (d & WMASK);
    V.wnext[a] = V.wheelHead[s]; V.wheelHead[s] = a;
  }
  return { households: h };
}

// Word-wise FNV-style hash over every canonical array (scratch arrays excluded).
export function hashState(buffer, L) {
  let h = 0x811c9dc5 | 0;
  for (const f of L.fields) {
    if (SCRATCH.has(f.name)) continue;
    const nb = f.len * BYTES[f.type], nw = nb >> 2;
    const w32 = new Int32Array(buffer, f.off, nw);
    for (let k = 0; k < nw; k++) h = Math.imul(h ^ w32[k], 16777619);
    const u8 = new Uint8Array(buffer, f.off + (nw << 2), nb - (nw << 2));
    for (let k = 0; k < u8.length; k++) h = Math.imul(h ^ u8[k], 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function hashFields(buffer, L, names) {
  const out = {};
  for (const f of L.fields) {
    if (!names.includes(f.name)) continue;
    let h = 0x811c9dc5 | 0;
    const nb = f.len * BYTES[f.type], nw = nb >> 2;
    const w32 = new Int32Array(buffer, f.off, nw);
    for (let k = 0; k < nw; k++) h = Math.imul(h ^ w32[k], 16777619);
    const u8 = new Uint8Array(buffer, f.off + (nw << 2), nb - (nw << 2));
    for (let k = 0; k < u8.length; k++) h = Math.imul(h ^ u8[k], 16777619);
    out[f.name] = (h >>> 0).toString(16).padStart(8, '0');
  }
  return out;
}

export function moneyTotal(V, households) {
  let s = 0;
  for (let h = 0; h < households; h++) s += V.cash[h];
  for (let k = 0; k < N_SHOPS; k++) s += V.shopCash[k];
  return s;
}
