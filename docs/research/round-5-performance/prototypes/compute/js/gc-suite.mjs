// GC behaviour: per-tick time distribution for each allocation style; optional GC event hook (Node perf_hooks).
import * as C from './common.mjs';
import * as K from './kernels.mjs';
import * as G from './gc-styles.mjs';
export async function runGcSuite({ log = console.log, gcHook = null, loadavg = () => null, N = 25000, ticks = 200 }) {
  const A = C.makeAgents(N); const g = A.g, NC = g * g;
  const cs = new Uint32Array(NC + 1), cur = new Uint32Array(NC), cellOf = new Uint32Array(N), sorted = new Uint32Array(N), sx = new Float32Array(N), sy = new Float32Array(N);
  const cnt = new Uint32Array(N), ax = new Float32Array(N), ay = new Float32Array(N);
  K.gridBuildF32(A.px, A.py, N, C.INV_CELL, g, g, cellOf, cs, cur, sorted, sx, sy);
  const results = new Array(N).fill(null); const history = new Array(10 * N).fill(null);
  const styles = {
    'A.typed-alloc-free': (t) => G.nqTyped(sx, sy, cs, g, g, C.INV_CELL, C.R2, cnt, ax, ay, 0, N),
    'B.temp-array-per-agent': (t) => G.nqTempArrays(sx, sy, cs, g, g, C.INV_CELL, C.R2, cnt, ax, ay, 0, N),
    'C.objects-per-neighbour': (t) => G.nqObjects(sx, sy, cs, g, g, C.INV_CELL, C.R2, results, 0, N),
    'D.closures-filter-map-reduce': (t) => G.nqFunctional(sx, sy, cs, g, g, C.INV_CELL, C.R2, results, 0, N),
    'E.typed+retained-history': (t) => G.nqTypedWithHistory(sx, sy, cs, g, g, C.INV_CELL, C.R2, cnt, ax, ay, 0, N, history, t),
  };
  const out = { N, ticks, styles: {} };
  for (const [name, fn] of Object.entries(styles)) {
    for (let t = 0; t < 20; t++) fn(t); // warm-up (JIT)
    if (gcHook) await gcHook.start();
    const times = new Float64Array(ticks);
    const t0 = C.now(); const tStart = t0;
    for (let t = 0; t < ticks; t++) { const a = C.now(); fn(t + 20); times[t] = C.now() - a; }
    const wall = C.now() - t0;
    const gc = gcHook ? await gcHook.stop() : null;
    const s = Array.from(times).sort((x, y) => x - y);
    const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
    const r = { tStartMs: tStart, tEndMs: C.now(), load: loadavg(), medMs: q(0.5), p95Ms: q(0.95), p99Ms: q(0.99), maxMs: s[s.length - 1], minMs: s[0], wallMs: wall, gc };
    out.styles[name] = r;
    log(`[${r.load}] ${name.padEnd(30)} med ${r.medMs.toFixed(2)} p95 ${r.p95Ms.toFixed(2)} p99 ${r.p99Ms.toFixed(2)} max ${r.maxMs.toFixed(2)} ms` + (gc ? ` | GC n=${gc.count} (minor ${gc.minor}, major ${gc.major}, incr ${gc.incremental}) total ${gc.totalMs.toFixed(1)} ms, max pause ${gc.maxMs.toFixed(2)} ms` : ''));
  }
  return out;
}
