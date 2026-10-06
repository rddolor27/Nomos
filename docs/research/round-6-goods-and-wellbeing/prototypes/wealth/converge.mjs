// Convergence from an equal start: years to cover half the distance to the year-250..300 mean,
// for Gini, top-10% and top-1% shares, averaged over seeds.
import { run } from './wealth.mjs';
const base = JSON.parse(process.argv[2] || '{}');
const seeds = JSON.parse(process.argv[3] || '[1,2,3]');
const every = 5, Y = 300;
const series = { gini: [], top10: [], top1: [], bot50: [] };
for (const seed of seeds) {
  const r = run(Object.assign({}, base, { seed, years: Y, reportEvery: every, report: [] }));
  for (const k of Object.keys(series)) series[k].push(r.stats.map(s => s[k]));
}
const n = Y / every;
for (const k of Object.keys(series)) {
  const m = []; for (let i = 0; i < n; i++) m.push(series[k].reduce((a, s) => a + s[i], 0) / seeds.length);
  const tail = m.slice(n - 10); const target = tail.reduce((a, b) => a + b, 0) / tail.length;
  const start = m[0]; const half = start + (target - start) / 2, q90 = start + (target - start) * 0.9;
  const tHalf = (m.findIndex(v => (target > start ? v >= half : v <= half)) + 1) * every;
  const t90 = (m.findIndex(v => (target > start ? v >= q90 : v <= q90)) + 1) * every;
  console.log(k, 'year5', start.toFixed(3), 'y25', m[4].toFixed(3), 'y50', m[9].toFixed(3), 'y100', m[19].toFixed(3), 'y250-300', target.toFixed(3), 'half-way year', tHalf, '90% year', t90);
}
