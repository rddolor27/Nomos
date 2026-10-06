// CPU-side snapshot costs in Node (V8), no browser: pack passes, visible gathers, binning, copies.
// Run: node node-bench.mjs [n]
import os from 'node:os';
import { makeCity, CELL, CELLS, views } from './world.js';

const n = +(process.argv[2] || 1000000);
const WARM = 5, SAMPLES = 15;
const times = (fn) => {
  for (let i = 0; i < WARM; i++) fn();
  const t = [];
  for (let i = 0; i < SAMPLES; i++) { const t0 = performance.now(); fn(); t.push(performance.now() - t0); }
  t.sort((a, b) => a - b);
  return { med: +t[SAMPLES >> 1].toFixed(3), min: +t[0].toFixed(3), max: +t[SAMPLES - 1].toFixed(3) };
};
const cpu0 = os.cpus().map((c) => c.times);

const city = makeCity(n, 42, 'cell');
const f = new Float32Array(city.buf), u = new Uint32Array(city.buf);
const x = new Int32Array(n), y = new Int32Array(n), w = new Uint32Array(n);
for (let i = 0; i < n; i++) { x[i] = Math.round(f[3 * i] * 256); y[i] = Math.round(f[3 * i + 1] * 256); w[i] = u[3 * i + 2]; }
const px = x.slice(), py = y.slice();

function packFull(buf) {
  const of = new Float32Array(buf, 0, 3 * n), ou = new Uint32Array(buf, 0, 3 * n), q = 1 / 256;
  for (let i = 0, j = 0; i < n; i++, j += 3) { of[j] = x[i] * q; of[j + 1] = y[i] * q; ou[j + 2] = w[i]; }
}
// 8-byte records: u16 x, y in 1/16 tile (covers 4,096 tiles) plus the u32 word.
function packU16(buf) {
  const o16 = new Uint16Array(buf, 0, 4 * n), o32 = new Uint32Array(buf, 0, 2 * n);
  for (let i = 0; i < n; i++) { o16[4 * i] = x[i] >> 4; o16[4 * i + 1] = y[i] >> 4; o32[2 * i + 1] = w[i]; }
}
const v = views(city).district;
const hw = 960 / v.ppt, hh = 540 / v.ppt;
const X0 = (v.cam[0] - hw) * 256, X1 = (v.cam[0] + hw) * 256, Y0 = (v.cam[1] - hh) * 256, Y1 = (v.cam[1] + hh) * 256;
function packVisibleScan(buf) {
  const of = new Float32Array(buf), ou = new Uint32Array(buf), q = 1 / 256;
  let c = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i], yi = y[i];
    if (xi < X0 || xi >= X1 || yi < Y0 || yi >= Y1) continue;
    const j = 5 * c++;
    of[j] = px[i] * q; of[j + 1] = py[i] * q; of[j + 2] = xi * q; of[j + 3] = yi * q; ou[j + 4] = w[i];
  }
  return c;
}
// Agents stored in cell order (as the sim's grid rebuild can emit them): visit only the cell rows in view.
const cx0 = Math.max(0, Math.floor((v.cam[0] - hw) / CELL)), cx1 = Math.min(CELLS - 1, Math.floor((v.cam[0] + hw) / CELL));
const cy0 = Math.max(0, Math.floor((v.cam[1] - hh) / CELL)), cy1 = Math.min(CELLS - 1, Math.floor((v.cam[1] + hh) / CELL));
function packVisibleCells(buf) {
  const of = new Float32Array(buf), ou = new Uint32Array(buf), q = 1 / 256, cs = city.cellStart;
  let c = 0;
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let i = cs[cy * CELLS + cx0], e = cs[cy * CELLS + cx1 + 1]; i < e; i++) {
      const j = 5 * c++;
      of[j] = px[i] * q; of[j + 1] = py[i] * q; of[j + 2] = x[i] * q; of[j + 3] = y[i] * q; ou[j + 4] = w[i];
    }
  }
  return c;
}
const bins = new Uint32Array(256 * 256);
function bin256() { bins.fill(0); for (let i = 0; i < n; i++) bins[(y[i] >> 12) * 256 + (x[i] >> 12)]++; }
const cellCounts = new Uint16Array(CELLS * CELLS), cellOut = new Uint16Array(CELLS * CELLS);
function copyCellCounts() { cellOut.set(cellCounts); }

const ab = new ArrayBuffer(12 * n), sab = new SharedArrayBuffer(12 * n), ab8 = new ArrayBuffer(8 * n), sab8 = new SharedArrayBuffer(8 * n);
const vis = new ArrayBuffer(20 * n), visS = new SharedArrayBuffer(20 * n);
const srcBytes = new Uint8Array(city.buf), abBytes = new Uint8Array(ab), sabBytes = new Uint8Array(sab);
const result = {
  n, node: process.version, cpu: os.cpus()[0].model.trim(), threads: os.cpus().length, warmup: WARM, samples: SAMPLES,
  visibleDistrict: packVisibleScan(vis), visibleViaCells: packVisibleCells(vis),
  packFull12_AB: times(() => packFull(ab)),
  packFull12_SAB: times(() => packFull(sab)),
  packU16_8_AB: times(() => packU16(ab8)),
  packU16_8_SAB: times(() => packU16(sab8)),
  packVisibleScan20_SAB: times(() => packVisibleScan(visS)),
  packVisibleCells20_SAB: times(() => packVisibleCells(visS)),
  bin256: times(bin256),
  copyCellCounts192sq: times(copyCellCounts),
  memcpy12_AB_to_AB: times(() => abBytes.set(srcBytes)),
  memcpy12_AB_to_SAB: times(() => sabBytes.set(srcBytes)),
};
const cpu1 = os.cpus().map((c) => c.times);
let idle = 0, total = 0;
for (let i = 0; i < cpu0.length; i++) for (const k of Object.keys(cpu0[i])) { const d = cpu1[i][k] - cpu0[i][k]; total += d; if (k === 'idle') idle += d; }
result.busyPctAllCores = +(100 * (1 - idle / total)).toFixed(1);
console.log(JSON.stringify(result, null, 1));
