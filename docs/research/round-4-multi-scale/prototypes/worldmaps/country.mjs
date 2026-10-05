// Country-scale generation benchmark (author: research notes, Oct 2026).
// Seeded, deterministic pipeline: points -> Delaunay mesh -> fBm elevation -> priority-flood
// -> flow accumulation + erosion-lite -> rivers -> habitability -> Poisson-style settlement
// placement -> rank-size population -> Delaunay/MST/spanner road graph -> A* roads on mesh
// -> multi-source Dijkstra regions -> Markov names -> binary packing + gzip sizes.
import Delaunator from 'delaunator';
import { createNoise2D } from 'simplex-noise';
import FlatQueue from 'flatqueue';
import Alea from 'alea';
import { gzipSync, strToU8 } from 'fflate';
import Foswig from 'foswig';

const N = +(process.argv[2] || 10000);      // target cells
const S = +(process.argv[3] || 300);        // target settlements
const SEED = process.argv[4] || 'dot-society-42';
const POINTS = process.argv[5] || 'jitter'; // 'jitter' (no trig) or 'poisson'
const W = 1000, H = 1000;
const t = {}; let t0 = performance.now();
const lap = (k) => { const n = performance.now(); t[k] = +(n - t0).toFixed(1); t0 = n; };
const rng = Alea(SEED);

// ---------- 1. points ----------
let pts;
if (POINTS === 'poisson') {
  const { default: FPDS } = await import('fast-2d-poisson-disk-sampling');
  const r = Math.sqrt((W * H) / N) * 0.93;
  const p = new FPDS({ shape: [W, H], radius: r, tries: 20 }, rng);
  pts = p.fill();
} else {
  const side = Math.round(Math.sqrt(N)); const sp = W / side; pts = [];
  for (let j = 0; j < side; j++) for (let i = 0; i < side; i++)
    pts.push([(i + 0.5 + (rng() - 0.5) * 0.9) * sp, (j + 0.5 + (rng() - 0.5) * 0.9) * sp]);
}
const n = pts.length;
const X = new Float64Array(n), Y = new Float64Array(n);
for (let i = 0; i < n; i++) { X[i] = pts[i][0]; Y[i] = pts[i][1]; }
lap('points');

// ---------- 2. Delaunay + neighbour CSR ----------
const coords = new Float64Array(n * 2); for (let i = 0; i < n; i++) { coords[2*i] = X[i]; coords[2*i+1] = Y[i]; }
const del = new Delaunator(coords);
const { triangles, halfedges } = del;
const deg = new Uint32Array(n + 1);
for (let e = 0; e < triangles.length; e++) {
  const a = triangles[e], b = triangles[e % 3 === 2 ? e - 2 : e + 1];
  if (halfedges[e] === -1 || e < halfedges[e]) { deg[a]++; deg[b]++; }
}
const off = new Uint32Array(n + 1); for (let i = 0; i < n; i++) off[i + 1] = off[i] + deg[i];
const nb = new Uint32Array(off[n]); const fill = off.slice(0, n);
for (let e = 0; e < triangles.length; e++) {
  const a = triangles[e], b = triangles[e % 3 === 2 ? e - 2 : e + 1];
  if (halfedges[e] === -1 || e < halfedges[e]) { nb[fill[a]++] = b; nb[fill[b]++] = a; }
}
lap('delaunay+adjacency');

// ---------- 3. elevation: fBm simplex + continental falloff ----------
const noise = createNoise2D(rng), noise2 = createNoise2D(rng);
const fbm = (x, y, oct = 6) => { let a = 1, f = 1 / 250, s = 0, norm = 0;
  for (let o = 0; o < oct; o++) { s += a * noise(x * f, y * f); norm += a; a *= 0.5; f *= 2; } return s / norm; };
const h = new Float32Array(n);
for (let i = 0; i < n; i++) {
  const dx = (X[i] - W / 2) / (W / 2), dy = (Y[i] - H / 2) / (H / 2);
  const d = Math.sqrt(dx * dx + dy * dy);          // sqrt is correctly rounded -> deterministic
  h[i] = 0.55 * fbm(X[i], Y[i]) + 0.45 * (1 - d * d) - 0.12;
}
lap('elevation fBm');

// ---------- 4/5. priority-flood + flow accumulation + erosion-lite ----------
const isBorder = new Uint8Array(n); for (const v of del.hull) isBorder[v] = 1;
const recv = new Int32Array(n), order = new Uint32Array(n), filled = new Float32Array(n);
const flux = new Float32Array(n);
function floodAndFlow() {
  const q = new FlatQueue(); const done = new Uint8Array(n); let k = 0;
  for (let i = 0; i < n; i++) if (h[i] < 0 || isBorder[i]) { q.push(i, h[i]); done[i] = 1; recv[i] = -1; filled[i] = h[i]; }
  while (q.length) {
    const c = q.pop(); order[k++] = c;
    for (let j = off[c]; j < off[c + 1]; j++) { const m = nb[j]; if (done[m]) continue; done[m] = 1;
      filled[m] = Math.max(h[m], filled[c] + 1e-5); recv[m] = c; q.push(m, filled[m]); }
  }
  flux.fill(0);
  for (let i = n - 1; i >= 0; i--) { const c = order[i]; if (filled[c] < 0) continue;
    const rain = 1 + 0.5 * (noise2(X[c] / 300, Y[c] / 300) + 1); flux[c] += rain;
    if (recv[c] >= 0) flux[recv[c]] += flux[c]; }
}
for (let it = 0; it < 3; it++) { // erosion-lite: stream-power style incision, 3 passes
  floodAndFlow();
  for (let i = 0; i < n; i++) { if (h[i] < 0 || recv[i] < 0) continue;
    const r = recv[i], dx = X[i]-X[r], dy = Y[i]-Y[r], dist = Math.sqrt(dx*dx+dy*dy);
    const slope = Math.max(0, filled[i] - filled[r]) / dist;
    h[i] = Math.max(h[r] + 1e-5, h[i] - 0.002 * Math.sqrt(flux[i]) * slope * dist); }
}
floodAndFlow();
for (let i = 0; i < n; i++) if (h[i] >= 0) h[i] = filled[i];      // lakes filled
const riverT = Math.max(30, n / 400);
let riverCells = 0; const river = new Uint8Array(n);
for (let i = 0; i < n; i++) if (h[i] >= 0 && flux[i] > riverT) { river[i] = 1; riverCells++; }
lap('priority-flood+flow+erosion x4');

// ---------- 7. habitability ----------
const coast = new Uint8Array(n), hab = new Float32Array(n); let land = 0;
for (let i = 0; i < n; i++) { if (h[i] < 0) continue; land++;
  for (let j = off[i]; j < off[i + 1]; j++) if (h[nb[j]] < 0) { coast[i] = 1; break; } }
for (let i = 0; i < n; i++) { if (h[i] < 0 || isBorder[i]) continue;
  let slope = 0; for (let j = off[i]; j < off[i+1]; j++) slope = Math.max(slope, Math.abs(h[i] - h[nb[j]]));
  hab[i] = Math.max(0, (1 - h[i] * 1.6) * (1 - Math.min(1, slope * 12)) * (1 + (river[i] ? 0.6 : 0) + (coast[i] ? 0.35 : 0) + Math.min(0.5, Math.sqrt(flux[i]) / 40))); }
lap('habitability');

// ---------- 8. settlement placement (score-sorted greedy Poisson spacing) + rank-size ----------
const cand = []; for (let i = 0; i < n; i++) if (hab[i] > 0.05) cand.push(i);
const score = new Float32Array(n); for (const i of cand) score[i] = hab[i] * (0.6 + 0.4 * rng());
cand.sort((a, b) => score[b] - score[a] || a - b);
let spacing = 0.75 * Math.sqrt((W * H * land / n) / S); let sett = [];
while (sett.length < S && spacing > 1) {
  sett = []; const cs = spacing, gw = Math.ceil(W / cs), grid = new Map();
  for (const c of cand) { if (sett.length >= S) break;
    const gx = Math.floor(X[c] / cs), gy = Math.floor(Y[c] / cs); let ok = true;
    for (let yy = gy - 1; yy <= gy + 1 && ok; yy++) for (let xx = gx - 1; xx <= gx + 1 && ok; xx++) {
      const b = grid.get(yy * gw + xx); if (b) for (const o of b) { const dx = X[o]-X[c], dy = Y[o]-Y[c]; if (dx*dx+dy*dy < cs*cs) { ok = false; break; } } }
    if (ok) { sett.push(c); const key = gy * gw + gx; (grid.get(key) || grid.set(key, []).get(key)).push(c); } }
  if (sett.length < S) spacing *= 0.85; }
const Sn = sett.length; const pop = new Uint32Array(Sn);
const P1 = 250000, q = 1.05;                                   // Zipf-like rank-size: P_k = P1 * k^-q * noise
for (let k = 0; k < Sn; k++) pop[k] = Math.max(60, Math.round(P1 * Math.pow(k + 1, -q) * (0.75 + 0.5 * rng())));
const cls = (p) => p >= 50000 ? 'city' : p >= 5000 ? 'town' : p >= 500 ? 'village' : 'hamlet';
const classCount = {}; for (const p of pop) classCount[cls(p)] = (classCount[cls(p)] || 0) + 1;
lap('settlements+rank-size');

// ---------- 9. road graph: Delaunay(settlements) -> MST (Kruskal) + greedy-spanner extras ----------
const sc = new Float64Array(Sn * 2); for (let k = 0; k < Sn; k++) { sc[2*k] = X[sett[k]]; sc[2*k+1] = Y[sett[k]]; }
const sd = new Delaunator(sc); const E = [];
for (let e = 0; e < sd.triangles.length; e++) { if (sd.halfedges[e] !== -1 && e > sd.halfedges[e]) continue;
  const a = sd.triangles[e], b = sd.triangles[e % 3 === 2 ? e - 2 : e + 1];
  E.push([a, b, Math.hypot(sc[2*a]-sc[2*b], sc[2*a+1]-sc[2*b+1])]); }
E.sort((u, v) => u[2] - v[2]);
const par = Int32Array.from({ length: Sn }, (_, i) => i); const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
const adj = Array.from({ length: Sn }, () => []); const chosen = []; const rest = [];
for (const ed of E) { const ra = find(ed[0]), rb = find(ed[1]); if (ra !== rb) { par[ra] = rb; chosen.push(ed); adj[ed[0]].push([ed[1], ed[2]]); adj[ed[1]].push([ed[0], ed[2]]); } else rest.push(ed); }
const mstEdges = chosen.length;
const graphDist = (s, g, limit) => { const d = new Map([[s, 0]]); const pq = new FlatQueue(); pq.push(s, 0);
  while (pq.length) { const c = pq.pop(), dc = d.get(c); if (c === g) return dc; if (dc > limit) return Infinity;
    for (const [m, w] of adj[c]) { const nd = dc + w; if (nd < (d.get(m) ?? Infinity)) { d.set(m, nd); pq.push(m, nd); } } } return Infinity; };
const DETOUR = 1.6;
for (const ed of rest) { if (graphDist(ed[0], ed[1], ed[2] * DETOUR) > ed[2] * DETOUR) { chosen.push(ed); adj[ed[0]].push([ed[1], ed[2]]); adj[ed[1]].push([ed[0], ed[2]]); } }
lap('road graph (DT+MST+spanner)');

// ---------- 10. A* roads on the mesh with terrain cost and road reuse discount ----------
const onRoad = new Uint8Array(n); let roadCellsTotal = 0, expanded = 0; const roads = [];
const stepCost = (a, b) => { if (h[b] < 0) return Infinity; const dx = X[a]-X[b], dy = Y[a]-Y[b], d = Math.sqrt(dx*dx+dy*dy);
  return d * (1 + 25 * Math.abs(h[a] - h[b]) + 3 * Math.max(0, h[b] - 0.45)) * (river[b] && !river[a] ? 3 : 1) * (onRoad[b] ? 0.5 : 1); };
chosen.sort((u, v) => (pop[v[0]] * pop[v[1]]) / (v[2] * v[2]) - (pop[u[0]] * pop[u[1]]) / (u[2] * u[2]));
const g = new Float64Array(n), from = new Int32Array(n), stamp = new Uint32Array(n); let st = 0;
for (const [a, b] of chosen) { st++; const s0 = sett[a], s1 = sett[b]; const pq = new FlatQueue();
  g[s0] = 0; from[s0] = -1; stamp[s0] = st; pq.push(s0, 0); let found = false;
  while (pq.length) { const c = pq.pop(); expanded++; if (c === s1) { found = true; break; }
    for (let j = off[c]; j < off[c + 1]; j++) { const m = nb[j]; const w = stepCost(c, m); if (w === Infinity) continue;
      const ng = g[c] + w; if (stamp[m] !== st || ng < g[m]) { stamp[m] = st; g[m] = ng; from[m] = c;
        const dx = X[m]-X[s1], dy = Y[m]-Y[s1]; pq.push(m, ng + 0.5 * Math.sqrt(dx*dx+dy*dy)); } } }
  if (!found) continue; const path = []; for (let c = s1; c !== -1; c = from[c]) { path.push(c); if (!onRoad[c]) { onRoad[c] = 1; roadCellsTotal++; } }
  roads.push(path.reverse()); }
lap('A* roads on mesh');

// ---------- 11. regions: multi-source Dijkstra from capitals over terrain cost ----------
const K = Math.max(4, Math.round(Sn / 40)); const caps = [];
for (let k = 0; k < Sn && caps.length < K; k++) { const c = sett[k]; if (caps.every(o => Math.hypot(X[o]-X[c], Y[o]-Y[c]) > W / Math.sqrt(K) * 0.6)) caps.push(c); }
const region = new Uint16Array(n).fill(65535), rd = new Float64Array(n).fill(Infinity); const rq = new FlatQueue();
caps.forEach((c, r) => { region[c] = r; rd[c] = 0; rq.push(c, 0); });
while (rq.length) { const c = rq.pop(); for (let j = off[c]; j < off[c + 1]; j++) { const m = nb[j]; if (h[m] < 0) continue;
  const dx = X[c]-X[m], dy = Y[c]-Y[m]; const w = Math.sqrt(dx*dx+dy*dy) * (1 + 40 * Math.abs(h[c]-h[m])) * (river[m] ? 2 : 1);
  if (rd[c] + w < rd[m]) { rd[m] = rd[c] + w; region[m] = region[c]; rq.push(m, rd[m]); } } }
let borderEdges = 0; for (let i = 0; i < n; i++) for (let j = off[i]; j < off[i+1]; j++) { const m = nb[j]; if (m > i && h[i] >= 0 && h[m] >= 0 && region[i] !== region[m]) borderEdges++; }
lap('regions (multi-source Dijkstra)');

// ---------- 12. names: order-3 Markov over an invented corpus (no real-world/IP lists) ----------
const syl = ['al','bar','bel','cor','dun','el','fen','gal','har','is','kel','lor','mar','nor','ol','pen','quin','ros','sel','tor','ul','vel','wyn','yar','zen','bri','cal','dor','ev','fal','gor','hol','ith','jor','lin','mor'];
const suf = ['ford','wick','ton','by','mere','stead','holm','dale','gate','well','burn','moor','haven','croft','ley'];
const corpus = []; const nr = Alea(SEED + ':names');
for (let i = 0; i < 400; i++) { const a = syl[Math.floor(nr() * syl.length)], b = syl[Math.floor(nr() * syl.length)];
  corpus.push(nr() < 0.6 ? a + b + suf[Math.floor(nr() * suf.length)] : a + b); }
const chain = new Foswig(3, corpus); const names = new Set();
const deny = new Set(['littleroot','pallet','viridian','pewter','cerulean','oldale','petalburg']); // stand-in denylist
while (names.size < Sn) { const w = chain.generate({ minLength: 4, maxLength: 12, allowDuplicates: false, maxAttempts: 50, random: nr });
  if (!deny.has(w)) names.add(w[0].toUpperCase() + w.slice(1)); }
const nameArr = [...names];
lap('names (Foswig order-3)');

// ---------- 13. serialisation sizes ----------
const q16 = (v, max) => Math.max(0, Math.min(65535, Math.round(v / max * 65535)));
const cellBin = new Uint8Array(n * 9); const dv = new DataView(cellBin.buffer);
for (let i = 0; i < n; i++) { dv.setUint16(9*i, q16(X[i], W), true); dv.setUint16(9*i+2, q16(Y[i], H), true);
  dv.setInt16(9*i+4, Math.round(h[i] * 10000), true); dv.setUint8(9*i+6, river[i] | (coast[i] << 1) | (onRoad[i] << 2)); dv.setUint16(9*i+7, region[i], true); }
const settJSON = JSON.stringify(sett.map((c, k) => ({ id: k, cell: c, x: +X[c].toFixed(1), y: +Y[c].toFixed(1), pop: pop[k], cls: cls(pop[k]), name: nameArr[k], region: region[c] })));
const roadsJSON = JSON.stringify(roads);
// delta+varint pack of road cell sequences
const vb = []; const pushV = (v) => { v = (v << 1) ^ (v >> 31); while (v > 127) { vb.push((v & 127) | 128); v >>>= 7; } vb.push(v); };
for (const r of roads) { pushV(r.length); let prev = 0; for (const c of r) { pushV(c - prev); prev = c; } }
const roadsBin = Uint8Array.from(vb);
const edgesJSON = JSON.stringify(chosen.map(e => [e[0], e[1], Math.round(e[2])]));
const size = (u8) => ({ raw: u8.length, gz: gzipSync(u8, { level: 9 }).length });
const sizes = { cellsBin: size(cellBin), settlementsJSON: size(strToU8(settJSON)), roadsCellsJSON: size(strToU8(roadsJSON)), roadsVarint: size(roadsBin), routeGraphJSON: size(strToU8(edgesJSON)) };
lap('serialise+gzip');

// determinism fingerprint
let hsh = 2166136261 >>> 0; const mix = (v) => { hsh ^= v; hsh = Math.imul(hsh, 16777619) >>> 0; };
for (let i = 0; i < n; i++) mix(Math.round(h[i] * 1e6)); for (const r of roads) for (const c of r) mix(c); for (const s of nameArr) for (const ch of s) mix(ch.charCodeAt(0));
const total = Object.entries(t).filter(([k]) => k !== 'serialise+gzip').reduce((a, [, v]) => a + v, 0);
console.log(JSON.stringify({ N, points: POINTS, cells: n, landCells: land, riverCells, settlements: Sn, classCount, mstEdges, roadEdges: chosen.length,
  roadPaths: roads.length, roadCells: roadCellsTotal, astarExpanded: expanded, regions: caps.length, borderEdges,
  sampleNames: nameArr.slice(0, 8), ms: t, msTotalGen: +total.toFixed(1), sizes, fingerprint: hsh.toString(16) }));
if (process.env.DUMP) {
  const fs = await import('fs');
  const cls8 = new Uint8Array(n);
  for (let i = 0; i < n; i++) cls8[i] = h[i] < -0.08 ? 0 : h[i] < 0 ? 1 : onRoad[i] ? 7 : river[i] ? 2 : h[i] > 0.55 ? 6 : h[i] > 0.38 ? 5 : (noise2(X[i]/120, Y[i]/120) > 0.25 ? 4 : 3);
  sett.forEach(c => { cls8[c] = 8; });
  fs.writeFileSync(process.env.DUMP, JSON.stringify({ n, X: Array.from(X), Y: Array.from(Y), cls: Array.from(cls8), region: Array.from(region), h: Array.from(h, v => Math.round(v * 1000)) }));
  // column-wise per-cell payload without coordinates (regenerable from seed)
  const hq = new Uint8Array(n); for (let i = 0; i < n; i++) hq[i] = Math.max(0, Math.min(255, Math.round((h[i] + 1) * 127.5)));
  const flags = new Uint8Array(n); for (let i = 0; i < n; i++) flags[i] = river[i] | (coast[i] << 1) | (onRoad[i] << 2);
  const reg = new Uint8Array(region.buffer);
  const cat = new Uint8Array(n * 4); cat.set(hq, 0); cat.set(flags, n); cat.set(reg, 2 * n);
  console.error(JSON.stringify({ columnar_noXY: { raw: cat.length, gz: gzipSync(cat, { level: 9 }).length }, elevU8: { raw: n, gz: gzipSync(hq, { level: 9 }).length }, flags: { gz: gzipSync(flags, { level: 9 }).length }, regionU16: { gz: gzipSync(reg, { level: 9 }).length } }));
}
