// node analyze2.mjs mt results/mt-node.json ... | gc results/gc-*.json | algo results/algo-*.json
import { readFileSync } from 'node:fs';
const [kind, ...files] = process.argv.slice(2);
for (const f of files) {
  let d; try { d = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { console.log(f, 'missing'); continue; }
  console.log(`\n### ${f} ${d.engine || d.env?.chromium || ''}`);
  if (kind === 'mt') {
    for (const N of Object.keys(d.scaling)) {
      const s = d.scaling[N];
      for (const mode of ['static.spin0', 'static.spin20000', 'dynamic.spin0', 'dynamic.spin20000']) {
        const base = s[mode.replace(/spin\d+/, 'spin0') + '.w1'] || s['dynamic.spin0.w1'];
        const row = [1, 2, 3, 4].map((w) => s[`${mode}.w${w}`] || (w === 1 ? base : null)).map((r) => r ? `${r.tickMs.toFixed(2)}(${(base.tickMs / r.tickMs).toFixed(2)}x nq ${(base.nqMs / r.nqMs).toFixed(2)}x)` : '-');
        if (row.some((x) => x !== '-')) console.log(`  N=${N} ${mode.padEnd(18)} ${row.join('  ')}  load ${(s[`${mode}.w4`] || {}).load || ''}`);
      }
    }
    if (d.barrier) console.log('  barrier us:', JSON.stringify(Object.fromEntries(Object.entries(d.barrier).map(([k, v]) => [k, +v.toFixed(1)]))));
    console.log('  determinism all equal:', d.determinismAllEqual);
  } else if (kind === 'gc') {
    for (const [k, r] of Object.entries(d.styles)) console.log(`  ${k.padEnd(30)} med ${r.medMs.toFixed(2)} p95 ${r.p95Ms.toFixed(2)} p99 ${r.p99Ms.toFixed(2)} max ${r.maxMs.toFixed(2)}` + (r.gc ? ` | GC n=${r.gc.count} minor ${r.gc.minor} major ${r.gc.major} total ${r.gc.totalMs.toFixed(1)} max ${r.gc.maxMs.toFixed(2)}` : '') + ` load ${r.load || ''}`);
    if (d.traceGc) { const sc = d.traceGc.filter((l) => /Scavenge|Minor/.test(l)), mc = d.traceGc.filter((l) => /Mark-Compact|Mark-sweep/.test(l)); console.log(`  traceGc lines: scavenge ${sc.length}, mark-compact ${mc.length}`); console.log('   e.g.', sc[0], '|', mc[0]); }
  } else if (kind === 'algo') {
    for (const N of Object.keys(d).filter((k) => /^\d+$/.test(k))) { const a = d[N];
      for (const [k, v] of Object.entries(a)) if (v && v.med != null) console.log(`  N=${N} ${k.padEnd(28)} med ${(v.med * 1000).toFixed(1).padStart(9)} us  min ${(v.min * 1000).toFixed(1).padStart(9)}  load ${v.load || ''}`);
      console.log(`  N=${N} thinksPerTick ${a.thinksPerTick}`); }
  }
}
