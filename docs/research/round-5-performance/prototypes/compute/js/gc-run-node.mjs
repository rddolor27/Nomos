// node --expose-gc gc-run-node.mjs   |  bun gc-run-node.mjs
import { writeFileSync, readFileSync } from 'node:fs';
import { runGcSuite } from './gc-suite.mjs';
const isBun = typeof Bun !== 'undefined';
const loadavg = () => readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3).join(' ');
const engine = isBun ? `bun ${Bun.version}` : `node ${process.version} V8 ${process.versions.v8}`;
const flags = isBun ? (process.env.BUN_OPTIONS || '') : process.execArgv.join(' ');
console.log(engine, flags);
let gcHook = null;
if (!isBun) {
  const { PerformanceObserver, constants } = await import('node:perf_hooks');
  let ents = [];
  const obs = new PerformanceObserver((l) => { for (const e of l.getEntries()) ents.push(e); });
  obs.observe({ entryTypes: ['gc'] });
  const tick = () => new Promise((r) => setTimeout(r, 30));
  gcHook = {
    async start() { if (globalThis.gc) globalThis.gc(); await tick(); ents = []; },
    async stop() { await tick(); await tick(); const e = ents; ents = [];
      const kind = (x) => x.detail?.kind ?? x.kind;
      const r = { count: e.length, minor: 0, major: 0, incremental: 0, weakcb: 0, totalMs: 0, maxMs: 0 };
      for (const x of e) { const k = kind(x); if (k === constants.NODE_PERFORMANCE_GC_MINOR) r.minor++; else if (k === constants.NODE_PERFORMANCE_GC_MAJOR) r.major++; else if (k === constants.NODE_PERFORMANCE_GC_INCREMENTAL) r.incremental++; else r.weakcb++; r.totalMs += x.duration; if (x.duration > r.maxMs) r.maxMs = x.duration; }
      return r; },
  };
}
const res = await runGcSuite({ log: console.log, gcHook, loadavg });
res.engine = engine; res.flags = flags;
const tag = process.argv.find((a) => a.startsWith('tag='))?.slice(4) ?? '';
writeFileSync(new URL(`../results/gc-${isBun ? 'bun' : 'node'}${tag}.json`, import.meta.url), JSON.stringify(res, null, 1));
// bytes allocated per tick (Node only, run with large semi-space so one tick never triggers a scavenge)
if (!isBun && globalThis.gc && process.argv.includes('alloc')) {
  const v8 = await import('node:v8');
  const C = await import('./common.mjs'); const K = await import('./kernels.mjs'); const G = await import('./gc-styles.mjs');
  const N = 25000, A = C.makeAgents(N), g = A.g, NC = g * g;
  const cs = new Uint32Array(NC + 1), cur = new Uint32Array(NC), cellOf = new Uint32Array(N), sorted = new Uint32Array(N), sx = new Float32Array(N), sy = new Float32Array(N), cnt = new Uint32Array(N), ax = new Float32Array(N), ay = new Float32Array(N);
  K.gridBuildF32(A.px, A.py, N, C.INV_CELL, g, g, cellOf, cs, cur, sorted, sx, sy);
  const results = new Array(N).fill(null);
  const fns = { A: () => G.nqTyped(sx, sy, cs, g, g, C.INV_CELL, C.R2, cnt, ax, ay, 0, N), B: () => G.nqTempArrays(sx, sy, cs, g, g, C.INV_CELL, C.R2, cnt, ax, ay, 0, N),
    C: () => G.nqObjects(sx, sy, cs, g, g, C.INV_CELL, C.R2, results, 0, N), D: () => G.nqFunctional(sx, sy, cs, g, g, C.INV_CELL, C.R2, results, 0, N) };
  for (const [k, f] of Object.entries(fns)) { for (let i = 0; i < 10; i++) f(); globalThis.gc(); const b = v8.getHeapStatistics().used_heap_size; f(); const a = v8.getHeapStatistics().used_heap_size; console.log(`alloc per tick style ${k}: ${((a - b) / 1e6).toFixed(2)} MB (${((a - b) / N).toFixed(0)} B/agent)`); }
}
process.exit(0);
