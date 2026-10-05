// JS vs WASM (scalar / auto-vectorised / explicit SIMD) on the sim hot loops + determinism hashes + country scale.
import * as C from './common.mjs';
import * as K from './kernels.mjs';
import { loadWasm, P } from './wasmrt.mjs';
const { measure, hashMany, countDiff } = C;

export async function runKernelSuite({ scalarBytes, simdBytes, loadavg = () => null, log = console.log, sizes = [10000, 25000, 100000], settleSizes = [1000, 10000], dense10k = true, quick = false }) {
  const out = { env: {}, startup: {}, agents: {}, determinism: {}, country: {}, copy: {} };
  const simdOK = WebAssembly.validate(simdBytes);
  out.env.wasmSimdValidates = simdOK;
  const ws = await loadWasm(scalarBytes);
  const wv = simdOK ? await loadWasm(simdBytes) : null;
  out.startup = { scalarBytes: scalarBytes.byteLength, simdBytes: simdBytes.byteLength, scalarCompileMs: ws.compileMs, scalarInstMs: ws.instantiateMs, simdCompileMs: wv?.compileMs, simdInstMs: wv?.instantiateMs };
  const M = (fn, o) => measure(fn, quick ? { samples: 5, minSampleMs: 10, warmupMs: 100, ...o } : o);
  const rec = (grp, name, r) => { r.load = loadavg(); grp[name] = r; log(`[${r.load}] ` + `  ${name.padEnd(34)} med ${(r.med * 1000).toFixed(1).padStart(9)} us  [${(r.min * 1000).toFixed(1)}-${(r.max * 1000).toFixed(1)}] x${r.reps}`); };
  const U = C.makeUtilTables();
  const dt = Math.fround(0.1);

  for (const N of sizes) {
    log(`== agents N=${N}`);
    const A = C.makeAgents(N);
    const g = A.g, W = A.W, WI = W * 256, NC = g * g;
    const R = (out.agents[N] = { grid: g, world: W });
    // ---------- JS-owned state
    const J = { px: A.px.slice(), py: A.py.slice(), vx: A.vx.slice(), vy: A.vy.slice(), pxI: A.pxI.slice(), pyI: A.pyI.slice(), vxI: A.vxI.slice(), vyI: A.vyI.slice(),
      cellOf: new Uint32Array(N), cs: new Uint32Array(NC + 1), cur: new Uint32Array(NC), sorted: new Uint32Array(N), sx: new Float32Array(N), sy: new Float32Array(N), sxI: new Int32Array(N), syI: new Int32Array(N),
      cnt: new Uint32Array(N), ax: new Float32Array(N), ay: new Float32Array(N), axI: new Int32Array(N), ayI: new Int32Array(N), act: new Uint8Array(N), score: new Uint32Array(N) };
    // ---------- WASM-owned state (one copy per module)
    const mk = (w) => {
      const m = w.mark();
      const o = { m, px: w.copy(A.px), py: w.copy(A.py), vx: w.copy(A.vx), vy: w.copy(A.vy), pxI: w.copy(A.pxI), pyI: w.copy(A.pyI), vxI: w.copy(A.vxI), vyI: w.copy(A.vyI),
        cellOf: w.alloc(Uint32Array, N), cs: w.alloc(Uint32Array, NC + 1), cur: w.alloc(Uint32Array, NC), sorted: w.alloc(Uint32Array, N), sx: w.alloc(Float32Array, N), sy: w.alloc(Float32Array, N),
        sxI: w.alloc(Int32Array, N), syI: w.alloc(Int32Array, N), cnt: w.alloc(Uint32Array, N), ax: w.alloc(Float32Array, N), ay: w.alloc(Float32Array, N), axI: w.alloc(Int32Array, N), ayI: w.alloc(Int32Array, N),
        needs: w.copy(A.needs), lut: w.copy(U.lut), cons: w.copy(U.cons), wts: w.copy(U.wts), act: w.alloc(Uint8Array, N), score: w.alloc(Uint32Array, N) };
      return o;
    };
    const S1 = mk(ws), S2 = wv ? mk(wv) : null;
    const es = ws.ex, ev = wv?.ex;
    // --- movement
    rec(R, 'move.js.f32', M(() => K.moveF32(J.px, J.py, J.vx, J.vy, N, dt, W, W)));
    rec(R, 'move.js.f32.fround', M(() => K.moveF32Fround(J.px, J.py, J.vx, J.vy, N, dt, W, W)));
    rec(R, 'move.js.i32', M(() => K.moveI32(J.pxI, J.pyI, J.vxI, J.vyI, N, WI, WI)));
    rec(R, 'move.wasm.f32.scalar', M(() => es.move_f32(P(S1.px), P(S1.py), P(S1.vx), P(S1.vy), N, dt, W, W)));
    rec(R, 'move.wasm.i32.scalar', M(() => es.move_i32(P(S1.pxI), P(S1.pyI), P(S1.vxI), P(S1.vyI), N, WI, WI)));
    if (ev) {
      rec(R, 'move.wasm.f32.autovec', M(() => ev.move_f32(P(S2.px), P(S2.py), P(S2.vx), P(S2.vy), N, dt, W, W)));
      rec(R, 'move.wasm.f32.simd', M(() => ev.move_f32_simd(P(S2.px), P(S2.py), P(S2.vx), P(S2.vy), N, dt, W, W)));
      rec(R, 'move.wasm.i32.autovec', M(() => ev.move_i32(P(S2.pxI), P(S2.pyI), P(S2.vxI), P(S2.vyI), N, WI, WI)));
      rec(R, 'move.wasm.i32.simd', M(() => ev.move_i32_simd(P(S2.pxI), P(S2.pyI), P(S2.vxI), P(S2.vyI), N, WI, WI)));
    }
    // --- grid rebuild
    rec(R, 'grid.js.f32', M(() => K.gridBuildF32(J.px, J.py, N, C.INV_CELL, g, g, J.cellOf, J.cs, J.cur, J.sorted, J.sx, J.sy)));
    rec(R, 'grid.js.i32', M(() => K.gridBuildI32(J.pxI, J.pyI, N, C.QSHIFT, g, g, J.cellOf, J.cs, J.cur, J.sorted, J.sxI, J.syI)));
    rec(R, 'grid.wasm.f32.scalar', M(() => es.grid_build_f32(P(S1.px), P(S1.py), N, C.INV_CELL, g, g, P(S1.cellOf), P(S1.cs), P(S1.cur), P(S1.sorted), P(S1.sx), P(S1.sy))));
    if (ev) rec(R, 'grid.wasm.f32.autovec', M(() => ev.grid_build_f32(P(S2.px), P(S2.py), N, C.INV_CELL, g, g, P(S2.cellOf), P(S2.cs), P(S2.cur), P(S2.sorted), P(S2.sx), P(S2.sy))));
    // build the int grids too (needed for int queries)
    es.grid_build_i32(P(S1.pxI), P(S1.pyI), N, C.QSHIFT, g, g, P(S1.cellOf), P(S1.cs), P(S1.cur), P(S1.sorted), P(S1.sxI), P(S1.syI));
    rec(R, 'grid.wasm.i32.scalar', M(() => es.grid_build_i32(P(S1.pxI), P(S1.pyI), N, C.QSHIFT, g, g, P(S1.cellOf), P(S1.cs), P(S1.cur), P(S1.sorted), P(S1.sxI), P(S1.syI))));
    // --- neighbour query (float grid must be current for f32 queries: rebuild f32 last into cs)
    // separate cs arrays for float and int to keep both valid
    const csI_J = new Uint32Array(NC + 1); K.gridBuildI32(J.pxI, J.pyI, N, C.QSHIFT, g, g, J.cellOf, csI_J, J.cur, J.sorted, J.sxI, J.syI);
    K.gridBuildF32(J.px, J.py, N, C.INV_CELL, g, g, J.cellOf, J.cs, J.cur, J.sorted, J.sx, J.sy);
    const csI_1 = ws.alloc(Uint32Array, NC + 1); es.grid_build_i32(P(S1.pxI), P(S1.pyI), N, C.QSHIFT, g, g, P(S1.cellOf), P(csI_1), P(S1.cur), P(S1.sorted), P(S1.sxI), P(S1.syI));
    es.grid_build_f32(P(S1.px), P(S1.py), N, C.INV_CELL, g, g, P(S1.cellOf), P(S1.cs), P(S1.cur), P(S1.sorted), P(S1.sx), P(S1.sy));
    let csI_2 = null;
    if (ev) { csI_2 = wv.alloc(Uint32Array, NC + 1); ev.grid_build_i32(P(S2.pxI), P(S2.pyI), N, C.QSHIFT, g, g, P(S2.cellOf), P(csI_2), P(S2.cur), P(S2.sorted), P(S2.sxI), P(S2.syI));
      ev.grid_build_f32(P(S2.px), P(S2.py), N, C.INV_CELL, g, g, P(S2.cellOf), P(S2.cs), P(S2.cur), P(S2.sorted), P(S2.sx), P(S2.sy)); }
    let cand = 0; for (let i = 0; i < N; i++) { const cx = Math.min((J.sx[i] * C.INV_CELL) | 0, g - 1), cy = Math.min((J.sy[i] * C.INV_CELL) | 0, g - 1); for (let r = Math.max(cy - 1, 0); r <= Math.min(cy + 1, g - 1); r++) cand += J.cs[r * g + Math.min(cx + 1, g - 1) + 1] - J.cs[r * g + Math.max(cx - 1, 0)]; }
    R.avgCandidates = cand / N;
    rec(R, 'nq.js.f32', M(() => K.nqF32(J.sx, J.sy, J.cs, g, g, C.INV_CELL, C.R2, J.cnt, J.ax, J.ay, 0, N)));
    let nb = 0; for (let i = 0; i < N; i++) nb += J.cnt[i]; R.avgNeighbours = nb / N;
    rec(R, 'nq.js.f32.branchless', M(() => K.nqF32Branchless(J.sx, J.sy, J.cs, g, g, C.INV_CELL, C.R2, J.cnt, J.ax, J.ay, 0, N)));
    rec(R, 'nq.js.f32.fround', M(() => K.nqF32Fround(J.sx, J.sy, J.cs, g, g, C.INV_CELL, C.R2, J.cnt, J.ax, J.ay, 0, N)));
    rec(R, 'nq.js.f32.indirect', M(() => K.nqF32Indirect(J.px, J.py, J.sorted, J.cs, g, g, C.INV_CELL, C.R2, J.cnt, J.ax, J.ay, 0, N)));
    rec(R, 'nq.js.i32', M(() => K.nqI32(J.sxI, J.syI, csI_J, g, g, C.QSHIFT, C.R2I, J.cnt, J.axI, J.ayI, 0, N)));
    rec(R, 'nq.js.f32.on-wasm-memory', M(() => K.nqF32(S1.sx, S1.sy, S1.cs, g, g, C.INV_CELL, C.R2, S1.cnt, S1.ax, S1.ay, 0, N)));
    rec(R, 'nq.wasm.f32.scalar', M(() => es.nq_f32(P(S1.sx), P(S1.sy), P(S1.cs), g, g, C.INV_CELL, C.R2, P(S1.cnt), P(S1.ax), P(S1.ay), 0, N)));
    rec(R, 'nq.wasm.f64mimic.scalar', M(() => es.nq_f64m(P(S1.sx), P(S1.sy), P(S1.cs), g, g, C.INV_CELL, C.R2, P(S1.cnt), P(S1.ax), P(S1.ay), 0, N)));
    rec(R, 'nq.wasm.i32.scalar', M(() => es.nq_i32(P(S1.sxI), P(S1.syI), P(csI_1), g, g, C.QSHIFT, C.R2I, P(S1.cnt), P(S1.axI), P(S1.ayI), 0, N)));
    if (ev) {
      rec(R, 'nq.wasm.f32.autovec', M(() => ev.nq_f32(P(S2.sx), P(S2.sy), P(S2.cs), g, g, C.INV_CELL, C.R2, P(S2.cnt), P(S2.ax), P(S2.ay), 0, N)));
      rec(R, 'nq.wasm.f32.simd', M(() => ev.nq_f32_simd(P(S2.sx), P(S2.sy), P(S2.cs), g, g, C.INV_CELL, C.R2, P(S2.cnt), P(S2.ax), P(S2.ay), 0, N)));
      rec(R, 'nq.wasm.i32.autovec', M(() => ev.nq_i32(P(S2.sxI), P(S2.syI), P(csI_2), g, g, C.QSHIFT, C.R2I, P(S2.cnt), P(S2.axI), P(S2.ayI), 0, N)));
      rec(R, 'nq.wasm.i32.simd', M(() => ev.nq_i32_simd(P(S2.sxI), P(S2.syI), P(csI_2), g, g, C.QSHIFT, C.R2I, P(S2.cnt), P(S2.axI), P(S2.ayI), 0, N)));
    }
    // --- utility scoring
    let tick = 0;
    rec(R, 'util.js', M(() => K.utilScore(A.needs, N, U.lut, U.cons, U.wts, tick++, 99, J.act, J.score, 0, N, 1)));
    rec(R, 'util.js.hoisted-unrolled', M(() => K.utilScoreHoisted(A.needs, N, U.lut, U.cons, U.wts, tick++, 99, J.act, J.score, 0, N, 1)));
    rec(R, 'util.wasm.scalar', M(() => es.util_score(P(S1.needs), N, P(S1.lut), P(S1.cons), P(S1.wts), tick++, 99, P(S1.act), P(S1.score), 0, N, 1)));
    if (ev) rec(R, 'util.wasm.autovec', M(() => ev.util_score(P(S2.needs), N, P(S2.lut), P(S2.cons), P(S2.wts), tick++, 99, P(S2.act), P(S2.score), 0, N, 1)));
    // --- copy-in/copy-out vs shared memory (movement = light kernel, nq pipeline = heavy kernel)
    if (ev) {
      const cp = (out.copy[N] = {});
      rec(cp, 'move.simd.zero-copy', M(() => ev.move_f32_simd(P(S2.px), P(S2.py), P(S2.vx), P(S2.vy), N, dt, W, W)));
      rec(cp, 'copy.only.8x', M(() => { S2.px.set(J.px); S2.py.set(J.py); S2.vx.set(J.vx); S2.vy.set(J.vy); J.px.set(S2.px); J.py.set(S2.py); J.vx.set(S2.vx); J.vy.set(S2.vy); }));
      rec(cp, 'move.simd.copy-in-out', M(() => { S2.px.set(J.px); S2.py.set(J.py); S2.vx.set(J.vx); S2.vy.set(J.vy); ev.move_f32_simd(P(S2.px), P(S2.py), P(S2.vx), P(S2.vy), N, dt, W, W); J.px.set(S2.px); J.py.set(S2.py); J.vx.set(S2.vx); J.vy.set(S2.vy); }));
      rec(cp, 'grid+nq.simd.zero-copy', M(() => { ev.grid_build_f32(P(S2.px), P(S2.py), N, C.INV_CELL, g, g, P(S2.cellOf), P(S2.cs), P(S2.cur), P(S2.sorted), P(S2.sx), P(S2.sy)); ev.nq_f32_simd(P(S2.sx), P(S2.sy), P(S2.cs), g, g, C.INV_CELL, C.R2, P(S2.cnt), P(S2.ax), P(S2.ay), 0, N); }));
      rec(cp, 'grid+nq.simd.copy-in-out', M(() => { S2.px.set(J.px); S2.py.set(J.py); ev.grid_build_f32(P(S2.px), P(S2.py), N, C.INV_CELL, g, g, P(S2.cellOf), P(S2.cs), P(S2.cur), P(S2.sorted), P(S2.sx), P(S2.sy)); ev.nq_f32_simd(P(S2.sx), P(S2.sy), P(S2.cs), g, g, C.INV_CELL, C.R2, P(S2.cnt), P(S2.ax), P(S2.ay), 0, N); J.cnt.set(S2.cnt); J.ax.set(S2.ax); J.ay.set(S2.ay); J.sorted.set(S2.sorted); }));
      rec(cp, 'grid+nq.js', M(() => { K.gridBuildF32(J.px, J.py, N, C.INV_CELL, g, g, J.cellOf, J.cs, J.cur, J.sorted, J.sx, J.sy); K.nqF32(J.sx, J.sy, J.cs, g, g, C.INV_CELL, C.R2, J.cnt, J.ax, J.ay, 0, N); }));
    }
    // --- clustered distribution (towns): JS f32 and WASM SIMD nq
    {
      const B = C.makeAgents(N, 4242, true); const c = { cs: new Uint32Array(NC + 1), cur: new Uint32Array(NC) };
      K.gridBuildF32(B.px, B.py, N, C.INV_CELL, g, g, J.cellOf, c.cs, c.cur, J.sorted, J.sx, J.sy);
      let cc = 0; for (let i = 0; i < N; i++) { const cx = Math.min((J.sx[i] * C.INV_CELL) | 0, g - 1), cy = Math.min((J.sy[i] * C.INV_CELL) | 0, g - 1); for (let r = Math.max(cy - 1, 0); r <= Math.min(cy + 1, g - 1); r++) cc += c.cs[r * g + Math.min(cx + 1, g - 1) + 1] - c.cs[r * g + Math.max(cx - 1, 0)]; }
      R.clusteredAvgCandidates = cc / N;
      rec(R, 'nq.js.f32.clustered', M(() => K.nqF32(J.sx, J.sy, c.cs, g, g, C.INV_CELL, C.R2, J.cnt, J.ax, J.ay, 0, N)));
      if (ev) { S2.px.set(B.px); S2.py.set(B.py); ev.grid_build_f32(P(S2.px), P(S2.py), N, C.INV_CELL, g, g, P(S2.cellOf), P(S2.cs), P(S2.cur), P(S2.sorted), P(S2.sx), P(S2.sy));
        rec(R, 'nq.wasm.f32.simd.clustered', M(() => ev.nq_f32_simd(P(S2.sx), P(S2.sy), P(S2.cs), g, g, C.INV_CELL, C.R2, P(S2.cnt), P(S2.ax), P(S2.ay), 0, N))); }
    }
    // ---------- determinism (bit-exact) at N=25k or the first size
    if (N === 25000 || (sizes.length === 1)) {
      const D = (out.determinism[N] = {});
      const T = 200;
      const fresh = () => ({ px: A.px.slice(), py: A.py.slice(), vx: A.vx.slice(), vy: A.vy.slice() });
      const a = fresh(), b = fresh();
      for (let t = 0; t < T; t++) { K.moveF32(a.px, a.py, a.vx, a.vy, N, dt, W, W); K.moveF32Fround(b.px, b.py, b.vx, b.vy, N, dt, W, W); }
      S1.px.set(A.px); S1.py.set(A.py); S1.vx.set(A.vx); S1.vy.set(A.vy);
      for (let t = 0; t < T; t++) es.move_f32(P(S1.px), P(S1.py), P(S1.vx), P(S1.vy), N, dt, W, W);
      D.move_f32 = { js: hashMany(a.px, a.py), jsFround: hashMany(b.px, b.py), wasmScalar: hashMany(S1.px, S1.py), jsVsWasmDiffWords: countDiff(a.px, S1.px) + countDiff(a.py, S1.py) };
      if (ev) {
        S2.px.set(A.px); S2.py.set(A.py); S2.vx.set(A.vx); S2.vy.set(A.vy);
        for (let t = 0; t < T; t++) ev.move_f32_simd(P(S2.px), P(S2.py), P(S2.vx), P(S2.vy), N, dt, W, W);
        D.move_f32.wasmSimd = hashMany(S2.px, S2.py);
        S2.px.set(A.px); S2.py.set(A.py); S2.vx.set(A.vx); S2.vy.set(A.vy);
        for (let t = 0; t < T; t++) ev.move_f32(P(S2.px), P(S2.py), P(S2.vx), P(S2.vy), N, dt, W, W);
        D.move_f32.wasmAutovec = hashMany(S2.px, S2.py);
      }
      const ai = { px: A.pxI.slice(), py: A.pyI.slice(), vx: A.vxI.slice(), vy: A.vyI.slice() };
      for (let t = 0; t < T; t++) K.moveI32(ai.px, ai.py, ai.vx, ai.vy, N, WI, WI);
      S1.pxI.set(A.pxI); S1.pyI.set(A.pyI); S1.vxI.set(A.vxI); S1.vyI.set(A.vyI);
      for (let t = 0; t < T; t++) es.move_i32(P(S1.pxI), P(S1.pyI), P(S1.vxI), P(S1.vyI), N, WI, WI);
      D.move_i32 = { js: hashMany(ai.px, ai.py), wasmScalar: hashMany(S1.pxI, S1.pyI) };
      if (ev) { S2.pxI.set(A.pxI); S2.pyI.set(A.pyI); S2.vxI.set(A.vxI); S2.vyI.set(A.vyI); for (let t = 0; t < T; t++) ev.move_i32_simd(P(S2.pxI), P(S2.pyI), P(S2.vxI), P(S2.vyI), N, WI, WI); D.move_i32.wasmSimd = hashMany(S2.pxI, S2.pyI); }
      // neighbour query on identical sorted positions
      const MP = { px: b.px, py: b.py }; // moved positions (full 24-bit mantissas) - quantised initial positions make float sums exact
      K.gridBuildF32(MP.px, MP.py, N, C.INV_CELL, g, g, J.cellOf, J.cs, J.cur, J.sorted, J.sx, J.sy);
      K.nqF32(J.sx, J.sy, J.cs, g, g, C.INV_CELL, C.R2, J.cnt, J.ax, J.ay, 0, N);
      const jsH = hashMany(J.cnt, J.ax, J.ay); const jsAx = J.ax.slice(), jsCnt = J.cnt.slice();
      K.nqF32Branchless(J.sx, J.sy, J.cs, g, g, C.INV_CELL, C.R2, J.cnt, J.ax, J.ay, 0, N); const jsBl = hashMany(J.cnt, J.ax, J.ay);
      K.nqF32Fround(J.sx, J.sy, J.cs, g, g, C.INV_CELL, C.R2, J.cnt, J.ax, J.ay, 0, N); const jsFr = hashMany(J.cnt, J.ax, J.ay);
      S1.px.set(MP.px); S1.py.set(MP.py); es.grid_build_f32(P(S1.px), P(S1.py), N, C.INV_CELL, g, g, P(S1.cellOf), P(S1.cs), P(S1.cur), P(S1.sorted), P(S1.sx), P(S1.sy));
      const gridSame = hashMany(J.sorted, J.cs) === hashMany(S1.sorted, S1.cs);
      es.nq_f64m(P(S1.sx), P(S1.sy), P(S1.cs), g, g, C.INV_CELL, C.R2, P(S1.cnt), P(S1.ax), P(S1.ay), 0, N); const f64m = hashMany(S1.cnt, S1.ax, S1.ay);
      es.nq_f32(P(S1.sx), P(S1.sy), P(S1.cs), g, g, C.INV_CELL, C.R2, P(S1.cnt), P(S1.ax), P(S1.ay), 0, N); const f32s = hashMany(S1.cnt, S1.ax, S1.ay);
      D.nq_f32 = { gridIdentical: gridSame, js: jsH, jsBranchless: jsBl, jsFround: jsFr, wasmF64mimic: f64m, wasmF32scalar: f32s, jsVsF32_axDiff: countDiff(jsAx, S1.ax), jsVsF32_cntDiff: countDiff(jsCnt, S1.cnt) };
      if (ev) {
        S2.px.set(MP.px); S2.py.set(MP.py); ev.grid_build_f32(P(S2.px), P(S2.py), N, C.INV_CELL, g, g, P(S2.cellOf), P(S2.cs), P(S2.cur), P(S2.sorted), P(S2.sx), P(S2.sy));
        const sAx = S1.ax.slice(), sCnt = S1.cnt.slice();
        ev.nq_f32_simd(P(S2.sx), P(S2.sy), P(S2.cs), g, g, C.INV_CELL, C.R2, P(S2.cnt), P(S2.ax), P(S2.ay), 0, N);
        D.nq_f32.wasmF32simd = hashMany(S2.cnt, S2.ax, S2.ay); D.nq_f32.scalarVsSimd_axDiff = countDiff(sAx, S2.ax); D.nq_f32.scalarVsSimd_cntDiff = countDiff(sCnt, S2.cnt);
        ev.nq_f32(P(S2.sx), P(S2.sy), P(S2.cs), g, g, C.INV_CELL, C.R2, P(S2.cnt), P(S2.ax), P(S2.ay), 0, N); D.nq_f32.wasmF32autovec = hashMany(S2.cnt, S2.ax, S2.ay);
      }
      K.gridBuildI32(A.pxI, A.pyI, N, C.QSHIFT, g, g, J.cellOf, csI_J, J.cur, J.sorted, J.sxI, J.syI);
      K.nqI32(J.sxI, J.syI, csI_J, g, g, C.QSHIFT, C.R2I, J.cnt, J.axI, J.ayI, 0, N);
      S1.pxI.set(A.pxI); S1.pyI.set(A.pyI); es.grid_build_i32(P(S1.pxI), P(S1.pyI), N, C.QSHIFT, g, g, P(S1.cellOf), P(csI_1), P(S1.cur), P(S1.sorted), P(S1.sxI), P(S1.syI));
      es.nq_i32(P(S1.sxI), P(S1.syI), P(csI_1), g, g, C.QSHIFT, C.R2I, P(S1.cnt), P(S1.axI), P(S1.ayI), 0, N);
      D.nq_i32 = { js: hashMany(J.cnt, J.axI, J.ayI), wasmScalar: hashMany(S1.cnt, S1.axI, S1.ayI) };
      if (ev) { S2.pxI.set(A.pxI); S2.pyI.set(A.pyI); ev.grid_build_i32(P(S2.pxI), P(S2.pyI), N, C.QSHIFT, g, g, P(S2.cellOf), P(csI_2), P(S2.cur), P(S2.sorted), P(S2.sxI), P(S2.syI));
        ev.nq_i32_simd(P(S2.sxI), P(S2.syI), P(csI_2), g, g, C.QSHIFT, C.R2I, P(S2.cnt), P(S2.axI), P(S2.ayI), 0, N); D.nq_i32.wasmSimd = hashMany(S2.cnt, S2.axI, S2.ayI); }
      K.utilScore(A.needs, N, U.lut, U.cons, U.wts, 7, 99, J.act, J.score, 0, N, 1);
      es.util_score(P(S1.needs), N, P(S1.lut), P(S1.cons), P(S1.wts), 7, 99, P(S1.act), P(S1.score), 0, N, 1);
      const uj = hashMany(J.act, J.score); K.utilScoreHoisted(A.needs, N, U.lut, U.cons, U.wts, 7, 99, J.act, J.score, 0, N, 1);
      D.util = { js: uj, jsHoisted: hashMany(J.act, J.score), wasmScalar: hashMany(S1.act, S1.score) };
      if (ev) { ev.util_score(P(S2.needs), N, P(S2.lut), P(S2.cons), P(S2.wts), 7, 99, P(S2.act), P(S2.score), 0, N, 1); D.util.wasmAutovec = hashMany(S2.act, S2.score); }
      log('  determinism: ' + JSON.stringify(D));
    }
    ws.release(S1.m); if (wv) wv.release(S2.m);
  }

  // ======================= country scale
  const T8 = C.makeSettlementTables();
  for (const S of settleSizes) {
    log(`== settlements S=${S}`);
    const R = (out.country[S] = {});
    const st = C.makeSettlements(S);
    const aged = new Int32Array(32);
    const Jst = { pop: st.pop.slice(), food: st.food.slice(), price: st.price.slice(), hh: st.hh.slice(), farm: st.farm.slice(), treas: st.treas.slice(), workers: st.workers.slice() };
    const mkS = (w) => { const m = w.mark(); return { m, pop: w.copy(st.pop), food: w.copy(st.food), price: w.copy(st.price), prod: w.copy(st.prod), workers: w.alloc(Int32Array, S),
      hh: w.copy(BigInt64Array.from(st.hh, (v) => BigInt(v))), farm: w.copy(BigInt64Array.from(st.farm, (v) => BigInt(v))), treas: w.copy(BigInt64Array.from(st.treas, (v) => BigInt(v))),
      mort: w.copy(T8.mort), fert: w.copy(T8.fert) }; };
    const W1 = mkS(ws), W2 = wv ? mkS(wv) : null;
    let day = 0;
    rec(R, 'settle.js', M(() => K.settleDay(S, day++, 5, Jst.pop, Jst.food, Jst.price, st.prod, Jst.hh, Jst.farm, Jst.treas, Jst.workers, T8.mort, T8.fert, T8.aging, aged)));
    rec(R, 'settle.wasm.scalar', M(() => ws.ex.settle_day(S, day++, 5, P(W1.pop), P(W1.food), P(W1.price), P(W1.prod), P(W1.hh), P(W1.farm), P(W1.treas), P(W1.workers), P(W1.mort), P(W1.fert), T8.aging)));
    if (W2) rec(R, 'settle.wasm.autovec', M(() => wv.ex.settle_day(S, day++, 5, P(W2.pop), P(W2.food), P(W2.price), P(W2.prod), P(W2.hh), P(W2.farm), P(W2.treas), P(W2.workers), P(W2.mort), P(W2.fert), T8.aging)));
    // same-state runs: fresh state each run, settle + sparse flows per day, per-phase timing; first run = warm-up
    for (const rho of [1, 2]) {
      const E = C.makeEdges(S, rho); R['edges.rho' + rho] = E.ne; const k = (2 * rho + 1) ** 2 - 1;
      const days = S >= 10000 ? 60 : 200, runs = quick ? 3 : 6;
      const fq = new Int32Array(E.ne), mq = new Int32Array(E.ne);
      const res = { js: { settle: [], flows: [] }, wasm: { settle: [], flows: [] } };
      const m = ws.mark(); const ea = ws.copy(E.ea), eb = ws.copy(E.eb), wfq = ws.alloc(Int32Array, E.ne), wmq = ws.alloc(Int32Array, E.ne);
      for (let run = 0; run < runs; run++) {
        const j = C.makeSettlements(S); let tS = 0, tF = 0;
        for (let d = 0; d < days; d++) { const t0 = C.now(); K.settleDay(S, d, 5, j.pop, j.food, j.price, j.prod, j.hh, j.farm, j.treas, j.workers, T8.mort, T8.fert, T8.aging, aged); const t1 = C.now();
          K.flowsSparse(E.ne, E.ea, E.eb, d, 5, j.pop, j.food, j.price, j.hh, j.farm, j.workers, 26843, fq, mq); tS += t1 - t0; tF += C.now() - t1; }
        if (run > 0) { res.js.settle.push(tS / days); res.js.flows.push(tF / days); }
        W1.pop.set(st.pop); W1.food.set(st.food); W1.price.set(st.price); W1.hh.set(BigInt64Array.from(st.hh, (v) => BigInt(v))); W1.farm.set(BigInt64Array.from(st.farm, (v) => BigInt(v))); W1.treas.fill(0n);
        let uS = 0, uF = 0;
        for (let d = 0; d < days; d++) { const t0 = C.now(); ws.ex.settle_day(S, d, 5, P(W1.pop), P(W1.food), P(W1.price), P(W1.prod), P(W1.hh), P(W1.farm), P(W1.treas), P(W1.workers), P(W1.mort), P(W1.fert), T8.aging); const t1 = C.now();
          ws.ex.flows_sparse(E.ne, P(ea), P(eb), d, 5, P(W1.pop), P(W1.food), P(W1.price), P(W1.hh), P(W1.farm), P(W1.workers), 26843, P(wfq), P(wmq)); uS += t1 - t0; uF += C.now() - t1; }
        if (run > 0) { res.wasm.settle.push(uS / days); res.wasm.flows.push(uF / days); }
      }
      ws.release(m);
      const st3 = (a) => { a.sort((x, y) => x - y); return { med: a[a.length >> 1], min: a[0], max: a[a.length - 1], reps: days, n: a.length }; };
      for (const impl of ['js', 'wasm']) { rec(R, `day.k${k}.${impl}.settle`, st3(res[impl].settle)); rec(R, `day.k${k}.${impl}.flows`, st3(res[impl].flows)); }
    }
    // dense all-pairs gravity, computed on the fly (O(S^2)); stored-matrix variant only at 1k (4 MB); 10k would need 400 MB
    if (S <= 1000 || dense10k) {
      const x = new Float32Array(S), y = new Float32Array(S), mm = new Float32Array(S), p = new Float32Array(S), o = new Float32Array(S);
      for (let i = 0; i < S; i++) { x[i] = C.u24(1, i) * 1000; y[i] = C.u24(2, i) * 1000; mm[i] = 1 + C.u24(3, i) * 100; p[i] = 100 + C.u24(4, i) * 50; }
      const o2 = S > 1000 ? { samples: 3, minSampleMs: 1, warmupMs: 1, minWarm: 1 } : {};
      rec(R, 'dense.onthefly.js.f64', M(() => K.denseF64(S, x, y, mm, p, o), o2));
      const m = ws.mark(); const a = [x, y, mm, p].map((v) => ws.copy(v)); const wo = ws.alloc(Float32Array, S);
      rec(R, 'dense.onthefly.wasm.f32.scalar', M(() => ws.ex.dense_f32(S, P(a[0]), P(a[1]), P(a[2]), P(a[3]), P(wo)), o2));
      ws.release(m);
      if (wv) { const m2 = wv.mark(); const b = [x, y, mm, p].map((v) => wv.copy(v)); const vo = wv.alloc(Float32Array, S);
        rec(R, 'dense.onthefly.wasm.f32.simd', M(() => wv.ex.dense_f32_simd(S, P(b[0]), P(b[1]), P(b[2]), P(b[3]), P(vo)), o2)); wv.release(m2); }
      if (S <= 1000) { const wm = new Float32Array(S * S); for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) { const dx = x[j] - x[i], dy = y[j] - y[i]; wm[i * S + j] = mm[j] / (dx * dx + dy * dy + 1); }
        rec(R, 'dense.matrix.js', M(() => K.denseMatVec(S, wm, p, o))); }
    }
    // determinism over 365 days: settle + sparse flows (rho=1), JS vs WASM; zero-sum checks
    {
      const st2 = C.makeSettlements(S); const E = C.makeEdges(S, 1); const fq = new Int32Array(E.ne), mq = new Int32Array(E.ne);
      const money0 = st2.hh.reduce((s, v) => s + v, 0) + st2.farm.reduce((s, v) => s + v, 0) + st2.treas.reduce((s, v) => s + v, 0);
      let pop0 = 0; for (let i = 0; i < st2.pop.length; i++) pop0 += st2.pop[i];
      const t0 = C.now();
      for (let d = 0; d < 365; d++) { K.settleDay(S, d, 5, st2.pop, st2.food, st2.price, st2.prod, st2.hh, st2.farm, st2.treas, st2.workers, T8.mort, T8.fert, T8.aging, aged); K.flowsSparse(E.ne, E.ea, E.eb, d, 5, st2.pop, st2.food, st2.price, st2.hh, st2.farm, st2.workers, 26843, fq, mq); }
      const jsYearMs = C.now() - t0;
      const money1 = st2.hh.reduce((s, v) => s + v, 0) + st2.farm.reduce((s, v) => s + v, 0) + st2.treas.reduce((s, v) => s + v, 0);
      const W3 = mkS(ws); const m = ws.mark(); const ea = ws.copy(E.ea), eb = ws.copy(E.eb), wfq = ws.alloc(Int32Array, E.ne), wmq = ws.alloc(Int32Array, E.ne);
      const t1 = C.now();
      for (let d = 0; d < 365; d++) { ws.ex.settle_day(S, d, 5, P(W3.pop), P(W3.food), P(W3.price), P(W3.prod), P(W3.hh), P(W3.farm), P(W3.treas), P(W3.workers), P(W3.mort), P(W3.fert), T8.aging); ws.ex.flows_sparse(E.ne, P(ea), P(eb), d, 5, P(W3.pop), P(W3.food), P(W3.price), P(W3.hh), P(W3.farm), P(W3.workers), 26843, P(wfq), P(wmq)); }
      const wasmYearMs = C.now() - t1;
      const wmoney = Number([...W3.hh, ...W3.farm, ...W3.treas].reduce((s, v) => s + v, 0n));
      let pop1 = 0; for (let i = 0; i < st2.pop.length; i++) pop1 += st2.pop[i];
      const jsMoneyAsI64 = BigInt64Array.from(st2.hh, (v) => BigInt(v));
      R.determinism365 = { jsPopFoodPrice: hashMany(st2.pop, st2.food, st2.price), wasmPopFoodPrice: hashMany(W3.pop, W3.food, W3.price), jsHH: hashMany(jsMoneyAsI64), wasmHH: hashMany(W3.hh),
        moneyConservedJS: money0 === money1, moneyConservedWasm: wmoney === money0, pop0, pop1, jsYearMs, wasmYearMs };
      log('  determinism365: ' + JSON.stringify(R.determinism365));
      ws.release(m); ws.release(W3.m);
    }
    ws.release(W1.m); if (wv) wv.release(W2.m);
  }
  // ledger representation: apply 1M precomputed transfers between 10k accounts (integer cents)
  {
    const R = (out.country.ledger = {});
    const nacc = 10000, ntx = 1_000_000;
    const ta = new Int32Array(ntx), tb = new Int32Array(ntx), amt = new Float64Array(ntx);
    for (let t = 0; t < ntx; t++) { const h = C.mix32(t ^ 0x5151); ta[t] = h % nacc; tb[t] = C.mix32(h) % nacc; amt[t] = (h & 0xFFFFF) * 3; }
    const amtB = BigInt64Array.from(amt, (v) => BigInt(v));
    const f = new Float64Array(nacc), bb = new BigInt64Array(nacc);
    rec(R, 'ledger.js.float64-cents', M(() => K.ledgerApplyF64(f, ta, tb, amt, ntx)));
    rec(R, 'ledger.js.bigint64', M(() => K.ledgerApplyBig(bb, ta, tb, amtB, ntx), { samples: 5 }));
    const m = ws.mark(); const wb = ws.alloc(BigInt64Array, nacc); wb.fill(0n); const wta = ws.copy(ta), wtb = ws.copy(tb), wam = ws.copy(amtB);
    rec(R, 'ledger.wasm.i64', M(() => ws.ex.ledger_apply_i64(P(wb), P(wta), P(wtb), P(wam), ntx)));
    let sf = 0; for (let i = 0; i < nacc; i++) sf += f[i]; let sb = 0n; for (let i = 0; i < nacc; i++) sb += bb[i]; let sw = 0n; for (let i = 0; i < nacc; i++) sw += wb[i];
    R.sumsZero = { f64: sf, big: String(sb), wasm: String(sw) };
    ws.release(m);
  }
  return out;
}
