import { run } from './wealth.mjs';
const base = JSON.parse(process.argv[2] || '{}');
const grid = JSON.parse(process.argv[3] || '[{}]');
const rep = JSON.parse(process.argv[4] || '[100,200,300]');
for (const g of grid) {
  const r = run(Object.assign({ report: rep, years: Math.max(...rep) }, base, g));
  const s = r.stats.map(x => `${x.t}:G${x.gini} T10 ${x.top10} T1 ${x.top1} B50 ${x.bot50} le0 ${x.le0} own ${x.own} mW/mY ${x.medW_medY} MW/MY ${x.meanW_meanY} a ${x.alpha} iG ${x.incGini}`).join(' | ');
  console.log(JSON.stringify(g), '=>', s, '| cash', r.cashSum, 'loan', r.loanGap);
}
