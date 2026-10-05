// Multi-worker tick: SharedArrayBuffer state, Atomics barrier, static grid-strip or dynamic chunk scheduling,
// per-chunk partial sums reduced in chunk order (deterministic for any worker count).
import * as C from './common.mjs';
import * as K from './kernels.mjs';
export const EPOCH = 0, JOBI = 1, DONE = 2, CHUNK = 3, TICK = 4, MODE = 5, SPIN = 6, NW = 7;
export const J_NOOP = 0, J_NQ = 1, J_MOVEUTIL = 2, J_EXIT = 9;
const sab = (T, n) => new T(new SharedArrayBuffer(Math.max(1, n) * T.BYTES_PER_ELEMENT));
export function allocShared(N, chunk = 1024) {
  const A = C.makeAgents(N); const U = C.makeUtilTables(); const g = A.g, NC = g * g;
  const nChunks = Math.ceil(N / chunk);
  const S = { N, g, W: A.W, chunk, nChunks,
    px: sab(Float32Array, N), py: sab(Float32Array, N), vx: sab(Float32Array, N), vy: sab(Float32Array, N),
    cellOf: sab(Uint32Array, N), cs: sab(Uint32Array, NC + 1), cur: sab(Uint32Array, NC), sorted: sab(Uint32Array, N), sx: sab(Float32Array, N), sy: sab(Float32Array, N),
    cnt: sab(Uint32Array, N), ax: sab(Float32Array, N), ay: sab(Float32Array, N),
    needs: sab(Uint8Array, 5 * N), lut: sab(Uint16Array, U.lut.length), cons: sab(Uint8Array, U.cons.length), wts: sab(Uint16Array, U.wts.length),
    act: sab(Uint8Array, N), score: sab(Uint32Array, N), partial: sab(Float64Array, nChunks), partialI: sab(Int32Array, nChunks), ctrl: sab(Int32Array, 32) };
  S.px.set(A.px); S.py.set(A.py); S.vx.set(A.vx); S.vy.set(A.vy); S.needs.set(A.needs); S.lut.set(U.lut); S.cons.set(U.cons); S.wts.set(U.wts);
  S.init = A;
  return S;
}
export function resetShared(S) { const A = S.init; S.px.set(A.px); S.py.set(A.py); S.vx.set(A.vx); S.vy.set(A.vy); }
const dt = Math.fround(0.1);
function runChunk(S, job, c, tick) {
  const i0 = c * S.chunk, i1 = Math.min(S.N, i0 + S.chunk);
  if (job === J_NQ) {
    K.nqF32(S.sx, S.sy, S.cs, S.g, S.g, C.INV_CELL, C.R2, S.cnt, S.ax, S.ay, i0, i1);
    let s = 0, k = 0; const ax = S.ax, cnt = S.cnt;
    for (let i = i0; i < i1; i++) { s += ax[i]; k = (k + cnt[i]) | 0; }
    S.partial[c] = s; S.partialI[c] = k;
  } else if (job === J_MOVEUTIL) {
    K.moveF32Range(S.px, S.py, S.vx, S.vy, i0, i1, dt, S.W, S.W);
    K.utilScoreHoisted(S.needs, S.N, S.lut, S.cons, S.wts, tick, 99, S.act, S.score, i0, i1, 1);
  }
}
export function doWork(S, job, w, nw) {
  const ctrl = S.ctrl, tick = ctrl[TICK];
  if (job === J_NOOP) return;
  if (ctrl[MODE] === 0) { // static contiguous strips (sorted order = row-major cells = horizontal grid strips)
    const c0 = Math.floor(w * S.nChunks / nw), c1 = Math.floor((w + 1) * S.nChunks / nw);
    for (let c = c0; c < c1; c++) runChunk(S, job, c, tick);
  } else { // dynamic: grab chunks from a shared counter (robust to big.LITTLE / busy cores; results unchanged)
    for (;;) { const c = Atomics.add(ctrl, CHUNK, 1); if (c >= S.nChunks) break; runChunk(S, job, c, tick); }
  }
}
function waitChange(ctrl, idx, old, spin) {
  for (let k = 0; k < spin; k++) if (Atomics.load(ctrl, idx) !== old) return;
  while (Atomics.load(ctrl, idx) === old) Atomics.wait(ctrl, idx, old, 1000);
}
// helper loop (runs inside a worker; blocks). Reads the starting epoch BEFORE signalling ready (no missed phase).
export function helperLoop(S, w, onReady) {
  const ctrl = S.ctrl; let seen = Atomics.load(ctrl, EPOCH);
  if (onReady) onReady();
  for (;;) {
    waitChange(ctrl, EPOCH, seen, ctrl[SPIN]);
    seen = Atomics.load(ctrl, EPOCH);
    const job = ctrl[JOBI];
    if (job === J_EXIT) return;
    const nw = ctrl[NW];
    if (w >= nw) continue;               // inactive helper: must NOT touch DONE (overshoot = deadlock)
    doWork(S, job, w, nw);
    if (Atomics.add(ctrl, DONE, 1) + 1 === nw - 1) Atomics.notify(ctrl, DONE);
  }
}
// coordinator side: run one parallel phase with nw workers (coordinator is worker 0)
export function phase(S, job) {
  const ctrl = S.ctrl, nw = ctrl[NW];
  ctrl[JOBI] = job; Atomics.store(ctrl, CHUNK, 0); Atomics.store(ctrl, DONE, 0);
  if (nw > 1) { Atomics.add(ctrl, EPOCH, 1); Atomics.notify(ctrl, EPOCH); }
  doWork(S, job, 0, nw);
  if (nw > 1) { const spin = ctrl[SPIN]; let d;
    for (let k = 0; k < spin; k++) if (Atomics.load(ctrl, DONE) >= nw - 1) return;
    const tEnd = C.now() + 5000;
    while ((d = Atomics.load(ctrl, DONE)) < nw - 1) { Atomics.wait(ctrl, DONE, d, 50); if (C.now() > tEnd) throw new Error(`barrier timeout: DONE=${d} expected ${nw - 1}`); } }
}
export function tickMT(S, tick, tm) {
  S.ctrl[TICK] = tick;
  const t0 = C.now();
  phase(S, J_MOVEUTIL);
  const t1 = C.now();
  K.gridBuildF32(S.px, S.py, S.N, C.INV_CELL, S.g, S.g, S.cellOf, S.cs, S.cur, S.sorted, S.sx, S.sy);
  const t2 = C.now();
  phase(S, J_NQ);
  let s = 0, k = 0; for (let c = 0; c < S.nChunks; c++) { s += S.partial[c]; k = (k + S.partialI[c]) | 0; } // fixed order
  const t3 = C.now();
  if (tm) { tm[0] += t1 - t0; tm[1] += t2 - t1; tm[2] += t3 - t2; }
  return s;
}
export async function runMT({ log, loadavg = () => null, spawnHelper, sizes = [10000, 25000, 100000], workers = [1, 2, 3, 4], ticks = 40, runs = 5 }) {
  const out = { barrier: {}, scaling: {}, determinism: {} };
  for (const N of sizes) {
    const S = allocShared(N);
    const helpers = [];
    for (let w = 1; w < 4; w++) helpers.push(await spawnHelper(S, w));
    await new Promise((r) => setTimeout(r, 300));
    out.scaling[N] = {}; out.determinism[N] = {};
    for (const mode of [0, 1]) for (const spin of [0, 20000]) for (const nw of workers) {
      if (nw === 1 && spin !== 0) continue;
      S.ctrl[MODE] = mode; S.ctrl[SPIN] = spin; S.ctrl[NW] = nw;
      // barrier cost: empty phases
      if (N === sizes[0] && mode === 1) { const B = 2000; for (let i = 0; i < 200; i++) phase(S, J_NOOP); const t0 = C.now(); for (let i = 0; i < B; i++) phase(S, J_NOOP); out.barrier[`w${nw}.spin${spin}`] = ((C.now() - t0) / B) * 1000; }
      const per = [], ph = [];
      let red = 0;
      for (let r = 0; r < runs; r++) {
        resetShared(S); const tm = [0, 0, 0];
        const t0 = C.now(); for (let t = 0; t < ticks; t++) red = tickMT(S, t, tm); const el = (C.now() - t0) / ticks;
        if (r > 0) { per.push(el); ph.push(tm.map((v) => v / ticks)); }
      }
      per.sort((a, b) => a - b); const med = per[per.length >> 1];
      const phm = [0, 1, 2].map((k) => { const a = ph.map((p) => p[k]).sort((x, y) => x - y); return a[a.length >> 1]; });
      const key = `${mode ? 'dynamic' : 'static'}.spin${spin}.w${nw}`;
      out.scaling[N][key] = { load: loadavg(), tickMs: med, min: per[0], max: per[per.length - 1], moveUtilMs: phm[0], gridMs: phm[1], nqMs: phm[2] };
      out.determinism[N][key] = C.hashMany(S.px, S.py, S.cnt, S.ax, S.ay, S.act, S.score) + ':' + red;
      log(`[load ${loadavg()}] N=${N} ${key.padEnd(22)} tick ${med.toFixed(3)} ms [${per[0].toFixed(3)}-${per[per.length - 1].toFixed(3)}] moveUtil ${phm[0].toFixed(3)} grid ${phm[1].toFixed(3)} nq ${phm[2].toFixed(3)}`);
    }
    S.ctrl[NW] = 4; S.ctrl[JOBI] = J_EXIT; Atomics.add(S.ctrl, EPOCH, 1); Atomics.notify(S.ctrl, EPOCH);
    for (const h of helpers) await h.done;
  }
  log('barrier (us per empty phase): ' + JSON.stringify(out.barrier));
  const allSame = Object.values(out.determinism).every((m) => new Set(Object.values(m)).size === 1);
  out.determinismAllEqual = allSame; log('determinism identical across worker counts/modes: ' + allSame);
  return out;
}
