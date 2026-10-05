// Multi-worker WASM: one shared WebAssembly.Memory, one instance per worker (own shadow stack), same Atomics barrier.
import * as C from './common.mjs';
const EPOCH = 0, JOBI = 1, DONE = 2, CHUNK = 3, TICK = 4, MODE = 5, SPIN = 6, NW = 7;
export const J_NOOP = 0, J_NQF = 1, J_MOVEUTIL = 2, J_NQI = 3, J_EXIT = 9;
const dt = Math.fround(0.1);
export async function instantiate(module, memory, stackTop) {
  const inst = await WebAssembly.instantiate(module, { env: { memory } });
  inst.exports.__stack_pointer.value = stackTop; return inst.exports;
}
export function makeLayout(N, chunk = 1024) {
  const g = Math.ceil(Math.sqrt(N / 4)), NC = g * g; let top = 4 << 20; // stacks 1MB..4MB region below
  const a = (bytes) => { const p = top; top = (top + bytes + 63) & ~63; return p; };
  const L = { N, g, W: g * C.CELL, chunk, nChunks: Math.ceil(N / chunk), px: a(4 * N), py: a(4 * N), vx: a(4 * N), vy: a(4 * N), pxI: a(4 * N), pyI: a(4 * N),
    cellOf: a(4 * N), cs: a(4 * (NC + 1)), csI: a(4 * (NC + 1)), cur: a(4 * NC), sorted: a(4 * N), sx: a(4 * N), sy: a(4 * N), sxI: a(4 * N), syI: a(4 * N),
    cnt: a(4 * N), ax: a(4 * N), ay: a(4 * N), axI: a(4 * N), ayI: a(4 * N), needs: a(5 * N), lut: a(2 * 2048), cons: a(64), wts: a(64), act: a(N), score: a(4 * N) };
  L.end = top; // stacks: 512 KB per worker inside [1MB, 3MB], top = (1<<20) + (w+1)*(512<<10)
  return L;
}
export function initData(memory, L) {
  const A = C.makeAgents(L.N), U = C.makeUtilTables(), b = memory.buffer;
  new Float32Array(b, L.px, L.N).set(A.px); new Float32Array(b, L.py, L.N).set(A.py); new Float32Array(b, L.vx, L.N).set(A.vx); new Float32Array(b, L.vy, L.N).set(A.vy);
  new Int32Array(b, L.pxI, L.N).set(A.pxI); new Int32Array(b, L.pyI, L.N).set(A.pyI);
  new Uint8Array(b, L.needs, 5 * L.N).set(A.needs); new Uint16Array(b, L.lut, 2048).set(U.lut); new Uint8Array(b, L.cons, 36).set(U.cons); new Uint16Array(b, L.wts, 6).set(U.wts);
}
function runChunk(ex, L, job, c, tick) {
  const i0 = c * L.chunk, i1 = Math.min(L.N, i0 + L.chunk);
  if (job === J_NQF) ex.nq_f32_simd(L.sx, L.sy, L.cs, L.g, L.g, C.INV_CELL, C.R2, L.cnt, L.ax, L.ay, i0, i1);
  else if (job === J_NQI) ex.nq_i32_simd(L.sxI, L.syI, L.csI, L.g, L.g, C.QSHIFT, C.R2I, L.cnt, L.axI, L.ayI, i0, i1);
  else if (job === J_MOVEUTIL) { const o = i0 * 4; ex.move_f32_simd(L.px + o, L.py + o, L.vx + o, L.vy + o, i1 - i0, dt, L.W, L.W); ex.util_score(L.needs, L.N, L.lut, L.cons, L.wts, tick, 99, L.act, L.score, i0, i1, 1); }
}
function doWork(ex, L, ctrl, job, w, nw) {
  if (job === J_NOOP) return; const tick = ctrl[TICK];
  for (;;) { const c = Atomics.add(ctrl, CHUNK, 1); if (c >= L.nChunks) break; runChunk(ex, L, job, c, tick); }
}
export function helperLoop(ex, L, ctrl, w, onReady) {
  let seen = Atomics.load(ctrl, EPOCH); if (onReady) onReady();
  for (;;) {
    const spin = ctrl[SPIN]; let k = 0; while (k < spin && Atomics.load(ctrl, EPOCH) === seen) k++;
    while (Atomics.load(ctrl, EPOCH) === seen) Atomics.wait(ctrl, EPOCH, seen, 1000);
    seen = Atomics.load(ctrl, EPOCH); const job = ctrl[JOBI]; if (job === J_EXIT) return;
    const nw = ctrl[NW]; if (w >= nw) continue;
    doWork(ex, L, ctrl, job, w, nw);
    if (Atomics.add(ctrl, DONE, 1) + 1 === nw - 1) Atomics.notify(ctrl, DONE);
  }
}
export function phase(ex, L, ctrl, job) {
  const nw = ctrl[NW]; ctrl[JOBI] = job; Atomics.store(ctrl, CHUNK, 0); Atomics.store(ctrl, DONE, 0);
  if (nw > 1) { Atomics.add(ctrl, EPOCH, 1); Atomics.notify(ctrl, EPOCH); }
  doWork(ex, L, ctrl, job, 0, nw);
  if (nw > 1) { const spin = ctrl[SPIN]; for (let k = 0; k < spin; k++) if (Atomics.load(ctrl, DONE) >= nw - 1) return;
    const tEnd = C.now() + 5000; let d; while ((d = Atomics.load(ctrl, DONE)) < nw - 1) { Atomics.wait(ctrl, DONE, d, 50); if (C.now() > tEnd) throw new Error('barrier timeout'); } }
}
export async function runMTW({ log, loadavg = () => null, module, spawnHelper, sizes = [25000, 100000], ticks = 40, runs = 6 }) {
  const out = { scaling: {}, determinism: {} };
  for (const N of sizes) {
    const L = makeLayout(N);
    const memory = new WebAssembly.Memory({ initial: Math.ceil(L.end / 65536) + 16, maximum: 4096, shared: true });
    const ctrl = new Int32Array(new SharedArrayBuffer(64));
    const ex = await instantiate(module, memory, (1 << 20) + (512 << 10));
    initData(memory, L);
    const init = new Uint8Array(memory.buffer.slice(L.px, L.vy + 4 * N)); // px..vy snapshot (contiguous)
    const helpers = []; for (let w = 1; w < 4; w++) helpers.push(await spawnHelper({ module, memory, L, ctrl, w }));
    out.scaling[N] = {}; out.determinism[N] = {};
    for (const spin of [0, 20000]) for (const nw of [1, 2, 3, 4]) {
      if (nw === 1 && spin) continue;
      ctrl[SPIN] = spin; ctrl[NW] = nw; ctrl[MODE] = 1;
      const per = [], ph = [];
      for (let r = 0; r < runs; r++) {
        new Uint8Array(memory.buffer, L.px, init.length).set(init);
        const tm = [0, 0, 0, 0]; const t0 = C.now();
        for (let t = 0; t < ticks; t++) {
          ctrl[TICK] = t; const a = C.now(); phase(ex, L, ctrl, J_MOVEUTIL); const b = C.now();
          ex.grid_build_f32(L.px, L.py, N, C.INV_CELL, L.g, L.g, L.cellOf, L.cs, L.cur, L.sorted, L.sx, L.sy); const c = C.now();
          phase(ex, L, ctrl, J_NQF); const d = C.now();
          tm[0] += b - a; tm[1] += c - b; tm[2] += d - c;
        }
        const el = (C.now() - t0) / ticks; if (r > 0) { per.push(el); ph.push(tm.map((v) => v / ticks)); }
      }
      per.sort((x, y) => x - y); const med = per[per.length >> 1];
      const phm = [0, 1, 2].map((k) => { const a = ph.map((p) => p[k]).sort((x, y) => x - y); return a[a.length >> 1]; });
      const key = `dynamic.spin${spin}.w${nw}`;
      out.scaling[N][key] = { load: loadavg(), tickMs: med, min: per[0], max: per[per.length - 1], moveUtilMs: phm[0], gridMs: phm[1], nqMs: phm[2] };
      const b = memory.buffer; out.determinism[N][key] = C.hashMany(new Uint8Array(b, L.px, 8 * N), new Uint8Array(b, L.cnt, 12 * N), new Uint8Array(b, L.act, N), new Uint8Array(b, L.score, 4 * N));
      log(`[load ${loadavg()}] WASM-SIMD N=${N} ${key.padEnd(18)} tick ${med.toFixed(3)} ms [${per[0].toFixed(3)}-${per[per.length - 1].toFixed(3)}] moveUtil ${phm[0].toFixed(3)} grid ${phm[1].toFixed(3)} nq ${phm[2].toFixed(3)}`);
    }
    ctrl[NW] = 4; ctrl[JOBI] = J_EXIT; Atomics.add(ctrl, EPOCH, 1); Atomics.notify(ctrl, EPOCH);
    for (const h of helpers) await h.done;
  }
  out.determinismAllEqual = Object.values(out.determinism).every((m) => new Set(Object.values(m)).size === 1);
  log('WASM multi-worker determinism identical across worker counts: ' + out.determinismAllEqual);
  return out;
}
