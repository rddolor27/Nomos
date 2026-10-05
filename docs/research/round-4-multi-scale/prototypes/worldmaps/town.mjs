// On-demand settlement interior generator benchmark: deterministic from (worldSeed, settlementId),
// integer-only RNG (no Math.sin/cos), entries derived from country-level road bearings.
import FlatQueue from 'flatqueue';
import { gzipSync } from 'fflate';

const fnv = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
function sfc32(a, b, c, d) { return () => { a |= 0; b |= 0; c |= 0; d |= 0; const t = (a + b | 0) + d | 0; d = d + 1 | 0;
  a = b ^ b >>> 9; b = c + (c << 3) | 0; c = (c << 21 | c >>> 11); c = c + t | 0; return (t >>> 0) / 4294967296; }; }
const rngFor = (key) => { const s = fnv(key); const r = sfc32(s, s ^ 0x9e3779b9, s * 3 | 0, 0xdeadbeef); for (let i = 0; i < 12; i++) r(); return r; };

// tile codes
const GRASS = 0, ROAD = 1, PLAZA = 2, WATER = 3, BRIDGE = 4, STREET = 5, BUILDING = 6, YARD = 7;
// prefab catalogue stand-in for LDtk prefab levels: [id, w, h, zone]
const PREFABS = [];
let pid = 1; for (const [w, hgt, z] of [[5,5,'res'],[6,5,'res'],[7,6,'res'],[8,8,'res'],[10,8,'res'],[8,6,'shop'],[10,10,'shop'],[12,10,'market'],[12,12,'police'],[14,12,'civic'],[16,16,'civic'],[6,6,'shop']]) PREFABS.push({ id: pid++, w, h: hgt, zone: z });

export function generateSettlement({ worldSeed, id, size, bearings, river = false, coast = false }) {
  const rnd = rngFor(`${worldSeed}/settlement/${id}`);
  const W = size, H = size, g = new Uint8Array(W * H), bld = new Uint16Array(W * H);
  const at = (x, y) => y * W + x;
  // 1. water: river as a seeded random walk across the map; coast strip on one side
  if (river) { let x = Math.floor(W * (0.3 + 0.4 * rnd())); for (let y = 0; y < H; y++) { x = Math.max(2, Math.min(W - 4, x + Math.floor(rnd() * 3) - 1));
    for (let k = 0; k < Math.max(2, W >> 6); k++) g[at(x + k, y)] = WATER; } }
  if (coast) for (let y = 0; y < H; y++) for (let x = 0; x < Math.floor(W * 0.12); x++) g[at(x, y)] = WATER;
  // 2. plaza
  const ps = Math.max(6, W >> 4), cx = (W >> 1) - (ps >> 1), cy = (H >> 1) - (ps >> 1);
  for (let y = cy; y < cy + ps; y++) for (let x = cx; x < cx + ps; x++) g[at(x, y)] = PLAZA;
  // 3. main roads: border entry per country-road bearing -> A* to plaza with turn penalty; bridges over water
  const entry = (deg) => { // integer bearing in degrees -> border tile, no trig: walk the square perimeter
    const p = ((deg % 360) + 360) % 360, per = 2 * (W + H) - 4, k = Math.floor(p / 360 * per);
    if (k < W) return [k, 0]; if (k < W + H - 1) return [W - 1, k - W + 1]; if (k < 2 * W + H - 2) return [W - 1 - (k - (W + H - 1)), H - 1]; return [0, H - 1 - (k - (2 * W + H - 2))]; };
  const goal = [cx + (ps >> 1), cy + (ps >> 1)];
  let expanded = 0;
  for (const b of bearings) { const [sx, sy] = entry(b); const S = W * H * 4; const gc = new Float32Array(S).fill(Infinity), prev = new Int32Array(S).fill(-1);
    const pq = new FlatQueue(); const s0 = at(sx, sy) * 4; gc[s0] = 0; pq.push(s0, 0); let end = -1;
    const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
    while (pq.length) { const st = pq.pop(); expanded++; const c = st >> 2, d = st & 3, x = c % W, y = (c / W) | 0;
      if (g[c] === PLAZA || (x === goal[0] && y === goal[1])) { end = st; break; }
      for (let nd = 0; nd < 4; nd++) { const nx = x + DX[nd], ny = y + DY[nd]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nc = at(nx, ny), tile = g[nc]; const w = (tile === WATER ? 12 : tile === ROAD ? 0.4 : 1) + (nd !== d ? 2.5 : 0);
        const ns = nc * 4 + nd, ng = gc[st] + w; if (ng < gc[ns]) { gc[ns] = ng; prev[ns] = st; pq.push(ns, ng + 0.4 * (Math.abs(nx - goal[0]) + Math.abs(ny - goal[1]))); } } }
    for (let st = end; st >= 0; st = prev[st]) { const c = st >> 2; if (g[c] === PLAZA) continue; const isW = g[c] === WATER || g[c] === BRIDGE;
      g[c] = isW ? BRIDGE : ROAD; const x = c % W, y = (c / W) | 0; // widen to 2 tiles
      if (x + 1 < W && g[c + 1] !== PLAZA) g[c + 1] = (g[c + 1] === WATER || g[c + 1] === BRIDGE) ? BRIDGE : ROAD; if (y + 1 < H && g[c + W] !== PLAZA && W > 64) g[c + W] = (g[c + W] === WATER || g[c + W] === BRIDGE) ? BRIDGE : ROAD; } }
  // 4. blocks: recursive BSP with 2-tile streets (towns/cities); villages keep only main roads
  const blocks = [];
  const split = (x0, y0, x1, y1, depth) => { const w = x1 - x0, h = y1 - y0;
    if ((w <= 18 && h <= 18) || w < 12 || h < 12 || depth > 14) { blocks.push([x0, y0, x1, y1]); return; }
    const vert = w > h ? true : w < h ? false : rnd() < 0.5;
    if (vert) { const sx = x0 + Math.floor(w * (0.35 + 0.3 * rnd())); for (let y = y0; y < y1; y++) for (let k = 0; k < 2; k++) if (g[at(sx + k, y)] === GRASS) g[at(sx + k, y)] = STREET;
      split(x0, y0, sx, y1, depth + 1); split(sx + 2, y0, x1, y1, depth + 1); }
    else { const sy = y0 + Math.floor(h * (0.35 + 0.3 * rnd())); for (let x = x0; x < x1; x++) for (let k = 0; k < 2; k++) if (g[at(x, sy + k)] === GRASS) g[at(x, sy + k)] = STREET;
      split(x0, y0, x1, sy, depth + 1); split(x0, sy + 2, x1, y1, depth + 1); } };
  if (W > 64) { const m = Math.floor(W * 0.08); split(m, m, W - m, H - m, 0); }
  else { for (let y = 2; y < H - 8; y += 9) for (let x = 2; x < W - 8; x += 9) blocks.push([x, y, x + 8, y + 8]); }
  // 5. prefab fill by zone (distance to plaza) and quotas
  let placed = 0; const quota = { police: Math.max(1, W >> 7), market: 1, civic: W >= 256 ? 2 : W >= 128 ? 1 : 0 };
  for (const [x0, y0, x1, y1] of blocks) { const bx = (x0 + x1) >> 1, by = (y0 + y1) >> 1; const dist = Math.abs(bx - goal[0]) + Math.abs(by - goal[1]);
    let zone = dist < W * 0.18 ? 'shop' : 'res';
    for (const z of ['market', 'police', 'civic']) if (quota[z] > 0 && dist < W * 0.35 && rnd() < 0.25) { zone = z; break; }
    // pack prefabs into the block row by row (1-tile yards between them)
    let y = y0 + 1; while (y < y1 - 4) { let x = x0 + 1, rowH = 0;
      while (x < x1 - 4) { const fits = PREFABS.filter(p => p.zone === zone && x + p.w <= x1 - 1 && y + p.h <= y1 - 1);
        const choice = fits.length ? fits[Math.floor(rnd() * fits.length)] : null;
        if (!choice) break; let free = true;
        for (let yy = y; yy < y + choice.h && free; yy++) for (let xx = x; xx < x + choice.w; xx++) if (g[at(xx, yy)] !== GRASS) { free = false; break; }
        if (free) { for (let yy = y; yy < y + choice.h; yy++) for (let xx = x; xx < x + choice.w; xx++) { g[at(xx, yy)] = BUILDING; bld[at(xx, yy)] = choice.id; }
          placed++; if (quota[zone] !== undefined) { quota[zone]--; zone = dist < W * 0.18 ? 'shop' : 'res'; } }
        x += choice.w + 1; rowH = Math.max(rowH, choice.h); }
      y += Math.max(rowH, 5) + 1; } }
  return { W, H, ground: g, buildings: bld, placed, blocks: blocks.length, expanded };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fp = (u8) => { let h = 2166136261 >>> 0; for (let i = 0; i < u8.length; i++) { h ^= u8[i]; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
  for (const [label, size, bearings, river, coast] of [['village', 48, [10, 200], false, false], ['town', 128, [0, 95, 230], true, false], ['city', 256, [5, 80, 170, 260, 300], true, true]]) {
    const times = []; let out;
    for (let r = 0; r < 7; r++) { const t0 = performance.now(); out = generateSettlement({ worldSeed: 'dot-society-42', id: 17, size, bearings, river, coast }); times.push(performance.now() - t0); }
    const again = generateSettlement({ worldSeed: 'dot-society-42', id: 17, size, bearings, river, coast });
    const layers = new Uint8Array(out.ground.length * 3); layers.set(out.ground, 0); layers.set(new Uint8Array(out.buildings.buffer), out.ground.length);
    console.log(JSON.stringify({ label, size, firstMs: +times[0].toFixed(1), medianWarmMs: +times.slice(1).sort((a, b) => a - b)[3].toFixed(1), prefabsPlaced: out.placed, blocks: out.blocks, astarExpanded: out.expanded,
      rawLayerBytes: layers.length, gzBytes: gzipSync(layers, { level: 9 }).length, deterministic: fp(out.ground) === fp(again.ground) && fp(new Uint8Array(out.buildings.buffer)) === fp(new Uint8Array(again.buildings.buffer)) }));
    if (label === 'city' && process.env.PNG) { const fs = await import('fs'); fs.writeFileSync(process.env.PNG, out.ground); }
  }
}
