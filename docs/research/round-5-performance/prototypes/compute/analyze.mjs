// node analyze.mjs results/kernels-node-lowload.json [results/kernels-bun-lowload.json ...]
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2);
const R = files.map((f) => ({ f, d: JSON.parse(readFileSync(f, 'utf8')) }));
const fmt = (v, d = 2) => (v == null ? '-' : v.toFixed(d));
for (const { f, d } of R) {
  console.log(`\n### ${f}  engine=${d.env?.engine || d.env?.chromium || ''} simd=${d.env?.wasmSimdValidates} startup=${JSON.stringify(d.startup)}`);
  for (const N of Object.keys(d.agents)) {
    const a = d.agents[N]; const n = +N;
    console.log(`N=${N} avgCand=${fmt(a.avgCandidates, 1)} avgNb=${fmt(a.avgNeighbours, 2)} clusteredCand=${fmt(a.clusteredAvgCandidates, 1)}`);
    const rows = Object.entries(a).filter(([k, v]) => v && typeof v === 'object' && 'med' in v);
    for (const [k, v] of rows) console.log(`  ${k.padEnd(30)} med ${fmt(v.med * 1000, 1).padStart(9)} us  min ${fmt(v.min * 1000, 1).padStart(9)}  max ${fmt(v.max * 1000, 1).padStart(9)}  ns/agent(med) ${fmt(v.med * 1e6 / n, 1).padStart(7)}  load ${v.load ?? ''}`);
  }
  if (d.copy) for (const N of Object.keys(d.copy)) for (const [k, v] of Object.entries(d.copy[N])) console.log(`  copy N=${N} ${k.padEnd(26)} med ${fmt(v.med * 1000, 1)} us min ${fmt(v.min * 1000, 1)}`);
  for (const S of Object.keys(d.country)) { const c = d.country[S];
    for (const [k, v] of Object.entries(c)) if (v && typeof v === 'object' && 'med' in v) console.log(`  S=${S} ${k.padEnd(32)} med ${fmt(v.med * 1000, 1).padStart(10)} us  min ${fmt(v.min * 1000, 1).padStart(10)} max ${fmt(v.max * 1000, 1).padStart(10)}` + (S !== 'ledger' ? `  us/settlement ${fmt(v.med * 1000 / +S, 3)}` : '') + `  load ${v.load ?? ''}`);
    if (c.determinism365) console.log(`  S=${S} det365 ${JSON.stringify(c.determinism365)}`); if (c.sumsZero) console.log('  ledger sums', JSON.stringify(c.sumsZero)); }
  console.log('  determinism', JSON.stringify(d.determinism));
}
