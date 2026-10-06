// Where does the 1M-agent move phase spend its time? Single-thread variants on the same dispersed state.
// Usage: node exp-move.mjs [N=1000000] [ticks=60]
import { performance } from 'node:perf_hooks';
import { makeLayout, makeArena, makeViews, buildWorld, CELL_SHIFT, RATE_H, EAT_T, ROLE_MER, ROLE_POL } from './world.mjs';
import * as K from './kernels.mjs';
import * as MT from './mt.mjs';
import { envInfo, sampleBusy } from './env.mjs';

const arg = (k, d) => { const a = process.argv.find((s) => s.startsWith(k + '=')); return a ? a.slice(k.length + 1) : d; };
const N = Number(arg('N', '1000000')), T = Number(arg('ticks', '60'));
const now = () => performance.now();
function measure(fn, { minSampleMs = 25, samples = 9, warmupMs = 250 } = {}) {
  let calls = 0; const t0 = now();
  while (calls < 3 || now() - t0 < warmupMs) { fn(); calls++; }
  const per = (now() - t0) / calls, reps = Math.max(1, Math.ceil(minSampleMs / Math.max(per, 1e-4)));
  const res = [];
  for (let s = 0; s < samples; s++) { const a = now(); for (let r = 0; r < reps; r++) fn(); res.push((now() - a) / reps); }
  res.sort((x, y) => x - y);
  return { med: +res[res.length >> 1].toFixed(3), min: +res[0].toFixed(3), max: +res[res.length - 1].toFixed(3), reps };
}

const L = makeLayout(N), mem = makeArena(L), V = makeViews(mem.buffer, L);
buildWorld(V, L, 20261005); K.bind(V, L, 20261005); MT.bindMT(V, L);
V.ctrl[MT.NWK] = 1;
for (let t = 1; t <= T; t++) MT.tick(t, 1, null, null);
const t = T + 1;
const { px, py, dest, speed, role, metab, needZ, flow, cell } = V;
const W = L.W, CW = L.CW, NC = L.NC, NT = L.NT;
const DX = new Int32Array([0, 1, 1, 0, -1, -1, -1, 0, 1]), DY = new Int32Array([0, 0, 1, 1, 1, 0, -1, -1, -1]);
const hist = new Int32Array(NC), pPol = new Int32Array(NC), pMer = new Int32Array(NC), pHun = new Int32Array(NC);
const agg4 = new Int32Array(NC * 4);
const pxc = Int32Array.from(px), pyc = Int32Array.from(py);
const dirC = new Uint8Array(N);
for (let i = 0; i < N; i++) dirC[i] = flow[dest[i] * NT + (py[i] >> 8) * W + (px[i] >> 8)];

function reset() { px.set(pxc); py.set(pyc); }
// A: full phase as benchmarked (flow lookup + 4 separate per-cell arrays + hunger test)
function A() {
  hist.fill(0); pPol.fill(0); pMer.fill(0); pHun.fill(0);
  for (let i = 0; i < N; i++) {
    let x = px[i], y = py[i];
    const tx = x >> 8, ty = y >> 8, dir = flow[dest[i] * NT + ty * W + tx];
    if (dir !== 0) { const sp = speed[i], tcx = ((tx + DX[dir]) << 8) + 128, tcy = ((ty + DY[dir]) << 8) + 128;
      let d = tcx - x; x += d > sp ? sp : d < -sp ? -sp : d; d = tcy - y; y += d > sp ? sp : d < -sp ? -sp : d; px[i] = x; py[i] = y; }
    const c = (y >> CELL_SHIFT) * CW + (x >> CELL_SHIFT); cell[i] = c; hist[c]++;
    const r = role[i]; if (r === ROLE_POL) pPol[c]++; else if (r === ROLE_MER) pMer[c]++;
    if ((needZ[i << 2] - t) * ((RATE_H * metab[i]) >> 7) < EAT_T) pHun[c]++;
  }
}
// B: no flow lookup and no movement (cells + histograms + hunger only)
function B() {
  hist.fill(0); pPol.fill(0); pMer.fill(0); pHun.fill(0);
  for (let i = 0; i < N; i++) {
    const x = px[i], y = py[i];
    const c = (y >> CELL_SHIFT) * CW + (x >> CELL_SHIFT); cell[i] = c; hist[c]++;
    const r = role[i]; if (r === ROLE_POL) pPol[c]++; else if (r === ROLE_MER) pMer[c]++;
    if ((needZ[i << 2] - t) * ((RATE_H * metab[i]) >> 7) < EAT_T) pHun[c]++;
  }
}
// C: movement only (flow lookup), no cells or histograms
function C() {
  for (let i = 0; i < N; i++) {
    let x = px[i], y = py[i];
    const tx = x >> 8, ty = y >> 8, dir = flow[dest[i] * NT + ty * W + tx];
    if (dir !== 0) { const sp = speed[i], tcx = ((tx + DX[dir]) << 8) + 128, tcy = ((ty + DY[dir]) << 8) + 128;
      let d = tcx - x; x += d > sp ? sp : d < -sp ? -sp : d; d = tcy - y; y += d > sp ? sp : d < -sp ? -sp : d; px[i] = x; py[i] = y; }
  }
}
// D: full phase with interleaved per-cell aggregates (4 ints per cell, one cache line per agent)
function D() {
  agg4.fill(0);
  for (let i = 0; i < N; i++) {
    let x = px[i], y = py[i];
    const tx = x >> 8, ty = y >> 8, dir = flow[dest[i] * NT + ty * W + tx];
    if (dir !== 0) { const sp = speed[i], tcx = ((tx + DX[dir]) << 8) + 128, tcy = ((ty + DY[dir]) << 8) + 128;
      let d = tcx - x; x += d > sp ? sp : d < -sp ? -sp : d; d = tcy - y; y += d > sp ? sp : d < -sp ? -sp : d; px[i] = x; py[i] = y; }
    const c = (y >> CELL_SHIFT) * CW + (x >> CELL_SHIFT); cell[i] = c; const o = c << 2; agg4[o]++;
    const r = role[i]; if (r === ROLE_POL) agg4[o + 1]++; else if (r === ROLE_MER) agg4[o + 2]++;
    if ((needZ[i << 2] - t) * ((RATE_H * metab[i]) >> 7) < EAT_T) agg4[o + 3]++;
  }
}
// E: D plus a cached direction per agent, looked up in the flow field only when the tile changes
function E() {
  agg4.fill(0);
  for (let i = 0; i < N; i++) {
    let x = px[i], y = py[i];
    const dir = dirC[i];
    if (dir !== 0) { const tx = x >> 8, ty = y >> 8, sp = speed[i], tcx = ((tx + DX[dir]) << 8) + 128, tcy = ((ty + DY[dir]) << 8) + 128;
      let d = tcx - x; x += d > sp ? sp : d < -sp ? -sp : d; d = tcy - y; y += d > sp ? sp : d < -sp ? -sp : d; px[i] = x; py[i] = y;
      const nx = x >> 8, ny = y >> 8;
      if (nx !== tx || ny !== ty) dirC[i] = flow[dest[i] * NT + ny * W + nx]; }
    const c = (y >> CELL_SHIFT) * CW + (x >> CELL_SHIFT); cell[i] = c; const o = c << 2; agg4[o]++;
    const r = role[i]; if (r === ROLE_POL) agg4[o + 1]++; else if (r === ROLE_MER) agg4[o + 2]++;
    if ((needZ[i << 2] - t) * ((RATE_H * metab[i]) >> 7) < EAT_T) agg4[o + 3]++;
  }
}
// F: E without the hunger test (hunger aggregate dropped)
function F() {
  agg4.fill(0);
  for (let i = 0; i < N; i++) {
    let x = px[i], y = py[i];
    const dir = dirC[i];
    if (dir !== 0) { const tx = x >> 8, ty = y >> 8, sp = speed[i], tcx = ((tx + DX[dir]) << 8) + 128, tcy = ((ty + DY[dir]) << 8) + 128;
      let d = tcx - x; x += d > sp ? sp : d < -sp ? -sp : d; d = tcy - y; y += d > sp ? sp : d < -sp ? -sp : d; px[i] = x; py[i] = y;
      const nx = x >> 8, ny = y >> 8;
      if (nx !== tx || ny !== ty) dirC[i] = flow[dest[i] * NT + ny * W + nx]; }
    const c = (y >> CELL_SHIFT) * CW + (x >> CELL_SHIFT); cell[i] = c; const o = c << 2; agg4[o]++;
    const r = role[i]; if (r === ROLE_POL) agg4[o + 1]++; else if (r === ROLE_MER) agg4[o + 2]++;
  }
}
// G: streaming lower bound: read px, py, write cell
function G() { for (let i = 0; i < N; i++) cell[i] = (py[i] >> CELL_SHIFT) * CW + (px[i] >> CELL_SHIFT); }
// H: flow lookup every tick, branch-free clamps and branch-free interleaved counters
function H() {
  agg4.fill(0);
  for (let i = 0; i < N; i++) {
    let x = px[i], y = py[i];
    const tx = x >> 8, ty = y >> 8, dir = flow[dest[i] * NT + ty * W + tx], sp = speed[i];
    let d = ((tx + DX[dir]) << 8) + 128 - x, h = d - sp; d -= h & ~(h >> 31); h = d + sp; d -= h & (h >> 31); x += d;
    d = ((ty + DY[dir]) << 8) + 128 - y; h = d - sp; d -= h & ~(h >> 31); h = d + sp; d -= h & (h >> 31); y += d;
    px[i] = x; py[i] = y;
    const c = (y >> CELL_SHIFT) * CW + (x >> CELL_SHIFT); cell[i] = c; const o = c << 2;
    const r = role[i];
    agg4[o]++; agg4[o + 1] += (r >> 1) & 1; agg4[o + 2] += r & 1;
    agg4[o + 3] += ((needZ[i << 2] - t) * ((RATE_H * metab[i]) >> 7) - EAT_T) >>> 31;
  }
}
// I: H with the cached direction (flow lookup only on a tile change)
function I() {
  agg4.fill(0);
  for (let i = 0; i < N; i++) {
    let x = px[i], y = py[i];
    const tx = x >> 8, ty = y >> 8, dir = dirC[i], sp = speed[i];
    let d = ((tx + DX[dir]) << 8) + 128 - x, h = d - sp; d -= h & ~(h >> 31); h = d + sp; d -= h & (h >> 31); x += d;
    d = ((ty + DY[dir]) << 8) + 128 - y; h = d - sp; d -= h & ~(h >> 31); h = d + sp; d -= h & (h >> 31); y += d;
    px[i] = x; py[i] = y;
    const nx = x >> 8, ny = y >> 8;
    if (nx !== tx || ny !== ty) dirC[i] = flow[dest[i] * NT + ny * W + nx];
    const c = (y >> CELL_SHIFT) * CW + (x >> CELL_SHIFT); cell[i] = c; const o = c << 2;
    const r = role[i];
    agg4[o]++; agg4[o + 1] += (r >> 1) & 1; agg4[o + 2] += r & 1;
    agg4[o + 3] += ((needZ[i << 2] - t) * ((RATE_H * metab[i]) >> 7) - EAT_T) >>> 31;
  }
}

const out = { env: envInfo(), N, warmTicks: T, idleBusyCpus: await sampleBusy(1000), variants: {} };
for (const [name, fn] of [['A_full_as_benchmarked', A], ['B_no_flow_no_move', B], ['C_move_only', C], ['D_interleaved_aggregates', D], ['E_D_plus_cached_direction', E], ['F_E_without_hunger_test', F], ['G_stream_cells_only', G], ['H_branchfree_flow_each_tick', H], ['I_branchfree_cached_direction', I]]) {
  reset();
  const r = measure(fn);
  out.variants[name] = r;
  console.log(`${name.padEnd(28)} ${r.med} ms [${r.min}-${r.max}]  ${(r.med * 1e6 / N).toFixed(1)} ns/agent`);
}
out.afterBusyCpus = await sampleBusy(1000);
console.log(JSON.stringify({ idle: out.idleBusyCpus, after: out.afterBusyCpus }));
import('node:fs').then((fs) => fs.writeFileSync(new URL(`./results/exp-move-${N}.json`, import.meta.url), JSON.stringify(out, null, 1)));
