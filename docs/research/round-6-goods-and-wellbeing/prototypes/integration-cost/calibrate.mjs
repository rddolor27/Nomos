// Calibration against the R5 reference machine (RM): re-runs two R5 kernels (integer movement and the
// float grid rebuild, transcribed from round-5 prototypes/compute/js/kernels.mjs with the same agent
// setup and the same measure() method) and divides R5's Node 22 medians by this machine's.
// R5's numbers are read as data from its results JSON; no R5 code is imported.
import { readFileSync } from 'node:fs';
import os from 'node:os';

const R5 = JSON.parse(readFileSync(new URL('../../../round-5-performance/prototypes/compute/results/kernels-node-lowload.json', import.meta.url), 'utf8'));
const R5C = JSON.parse(readFileSync(new URL('../../../round-5-performance/prototypes/compute/results/kernels-chromium.json', import.meta.url), 'utf8'));

function mix32(h) { h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16; return h >>> 0; }
const u24 = (seed, i) => (mix32(seed ^ mix32(i)) >>> 8) / 16777216;

function makeAgents(N, seed = 12345) {
  const g = Math.ceil(Math.sqrt(N / 4)), W = g * 8;
  const px = new Float32Array(N), py = new Float32Array(N), pxI = new Int32Array(N), pyI = new Int32Array(N), vxI = new Int32Array(N), vyI = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    px[i] = u24(seed, i) * W; py[i] = u24(seed + 1, i) * W;
    const vx = u24(seed + 2, i) * 2 - 1, vy = u24(seed + 9, i) * 2 - 1;
    pxI[i] = Math.floor(px[i] * 256); pyI[i] = Math.floor(py[i] * 256); vxI[i] = Math.round(vx * 25.6); vyI[i] = Math.round(vy * 25.6);
  }
  return { g, W, px, py, pxI, pyI, vxI, vyI };
}

function moveI32(px, py, vx, vy, n, w, h) {
  const w2 = 2 * w - 1, h2 = 2 * h - 1;
  for (let i = 0; i < n; i++) {
    const x = (px[i] + vx[i]) | 0, y = (py[i] + vy[i]) | 0;
    const lx = x < 0, hx = x >= w, ly = y < 0, hy = y >= h;
    px[i] = lx ? -x : hx ? w2 - x : x;
    py[i] = ly ? -y : hy ? h2 - y : y;
    if (lx || hx) vx[i] = -vx[i];
    if (ly || hy) vy[i] = -vy[i];
  }
}

function gridBuildF32(px, py, n, invCell, gw, gh, cellOf, cs, cursor, sorted, sx, sy) {
  const nc = gw * gh;
  cs.fill(0, 0, nc + 1);
  for (let i = 0; i < n; i++) {
    let cx = (px[i] * invCell) | 0, cy = (py[i] * invCell) | 0;
    if (cx > gw - 1) cx = gw - 1; if (cy > gh - 1) cy = gh - 1;
    const c = cy * gw + cx; cellOf[i] = c; cs[c + 1]++;
  }
  for (let c = 0; c < nc; c++) cs[c + 1] += cs[c];
  cursor.set(cs.subarray(0, nc));
  for (let i = 0; i < n; i++) {
    const c = cellOf[i]; const k = cursor[c]; cursor[c] = k + 1;
    sorted[k] = i; sx[k] = px[i]; sy[k] = py[i];
  }
}

function measure(fn, { minSampleMs = 25, samples = 9, warmupMs = 250, minWarm = 5 } = {}) {
  let calls = 0; const t0 = performance.now();
  while (calls < minWarm || performance.now() - t0 < warmupMs) { fn(); calls++; }
  const per = (performance.now() - t0) / calls;
  const reps = Math.max(1, Math.ceil(minSampleMs / Math.max(per, 1e-4)));
  const res = [];
  for (let s = 0; s < samples; s++) { const a = performance.now(); for (let r = 0; r < reps; r++) fn(); res.push((performance.now() - a) / reps); }
  res.sort((x, y) => x - y);
  return { med: res[res.length >> 1], min: res[0], max: res[res.length - 1], reps, n: samples };
}

const out = { env: { node: process.version, v8: process.versions.v8, cpu: os.cpus()[0].model.trim(), logicalCpus: os.cpus().length, loadavg: os.loadavg() }, rows: [] };
for (const N of [10000, 25000, 100000]) {
  const A = makeAgents(N), g = A.g, WI = A.W * 256, NC = g * g;
  const cellOf = new Uint32Array(N), cs = new Uint32Array(NC + 1), cur = new Uint32Array(NC), sorted = new Uint32Array(N), sx = new Float32Array(N), sy = new Float32Array(N);
  const mv = measure(() => moveI32(A.pxI, A.pyI, A.vxI, A.vyI, N, WI, WI));
  const gr = measure(() => gridBuildF32(A.px, A.py, N, 0.125, g, g, cellOf, cs, cur, sorted, sx, sy));
  for (const [name, here] of [['move.js.i32', mv], ['grid.js.f32', gr]]) {
    const rm = R5.agents[N][name], rmc = R5C.agents[N][name];
    out.rows.push({ N, kernel: name, hereMs: here, rmNode22Ms: { med: rm.med, min: rm.min }, rmChromiumMs: { med: rmc.med, min: rmc.min }, ratioMed: rm.med / here.med, ratioMin: rm.min / here.min, ratioChromiumMin: rmc.min / here.min });
  }
}
const geo = (xs) => Math.exp(xs.reduce((a, x) => a + Math.log(x), 0) / xs.length);
out.factorNodeMed = geo(out.rows.map((r) => r.ratioMed));
out.factorNodeMin = geo(out.rows.map((r) => r.ratioMin));
out.factorChromiumMin = geo(out.rows.map((r) => r.ratioChromiumMin));
console.log('RESULT ' + JSON.stringify(out));
