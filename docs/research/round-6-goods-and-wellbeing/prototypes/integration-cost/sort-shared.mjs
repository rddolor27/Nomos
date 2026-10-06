// Does Float64Array.prototype.sort allocate on the JS heap when the view sits on a shared
// WebAssembly.Memory (as with worker mode)? node --expose-gc sort-shared.mjs
import v8 from 'node:v8';
import { PerformanceObserver } from 'node:perf_hooks';
import { draw } from './det.mjs';

let gcs = 0;
new PerformanceObserver((l) => { gcs += l.getEntries().length; }).observe({ entryTypes: ['gc'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { node: process.version, v8: process.versions.v8, rows: [] };
for (const H of [4079, 10199, 40582]) {
  for (const shared of [false, true]) {
    const pages = Math.ceil(H * 8 / 65536);
    const mem = new WebAssembly.Memory(shared ? { initial: pages, maximum: pages, shared: true } : { initial: pages, maximum: pages });
    const a = new Float64Array(mem.buffer, 0, H);
    const fill = (k) => { for (let i = 0; i < H; i++) a[i] = draw(7, i, k, 0) * 100; };
    for (let k = 0; k < 30; k++) { fill(k); a.sort(); }
    globalThis.gc(); await sleep(30); gcs = 0;
    const h0 = v8.getHeapStatistics().used_heap_size;
    let t = 0;
    for (let k = 0; k < 50; k++) { fill(100 + k); const s = performance.now(); a.sort(); t += performance.now() - s; }
    const h1 = v8.getHeapStatistics().used_heap_size;
    await sleep(60);
    out.rows.push({ H, shared, bytes: H * 8, heapGrowthPerSort: (h1 - h0) / 50, gcEvents: gcs, msPerSort: t / 50 });
  }
}
console.log('RESULT ' + JSON.stringify(out));
