// Paired policy experiments: identical keyed draws until year B, then a policy applies from B.
// Reports deltas against the no-policy control at B+10, B+25, B+50, mean over seeds.
import { run } from './wealth.mjs';
const base = JSON.parse(process.argv[2] || '{}');
const policies = JSON.parse(process.argv[3] || '[]');
const B = +(process.argv[4] || 200), seeds = JSON.parse(process.argv[5] || '[1,2,3]');
const H = [B, B + 10, B + 25, B + 50];
const keys = ['gini', 'top10', 'top1', 'bot50', 'le0', 'own', 'medW_medY', 'meanW_meanY', 'taxShareY'];
function avg(rows) { const o = {}; for (const k of keys) o[k] = rows.reduce((a, r) => a + r[k], 0) / rows.length; return o; }
const ctrl = seeds.map(seed => run(Object.assign({}, base, { seed, years: B + 50, report: H })).stats);
const cAvg = H.map((_, i) => avg(ctrl.map(s => s[i])));
console.log('control', JSON.stringify(base));
H.forEach((t, i) => console.log(`  t=${t}`, keys.map(k => `${k} ${cAvg[i][k].toFixed(3)}`).join(' ')));
for (const p of policies) {
  const runs = seeds.map(seed => run(Object.assign({}, base, p, { seed, years: B + 50, report: H, policyFrom: B })).stats);
  console.log('policy', JSON.stringify(p));
  for (let i = 1; i < H.length; i++) {
    const pv = avg(runs.map(s => s[i]));
    // seed spread of the paired difference for gini and top10
    const dg = runs.map((s, j) => s[i].gini - ctrl[j][i].gini), dt = runs.map((s, j) => s[i].top10 - ctrl[j][i].top10);
    console.log(`  +${H[i] - B}y`, keys.map(k => `d${k} ${(pv[k] - cAvg[i][k]).toFixed(3)}`).join(' '),
      `| dGini range [${Math.min(...dg).toFixed(3)},${Math.max(...dg).toFixed(3)}] dTop10 range [${Math.min(...dt).toFixed(3)},${Math.max(...dt).toFixed(3)}]`);
  }
}
