import { run } from './wealth.mjs';
const args = JSON.parse(process.argv[2] || '{}');
const t0 = performance.now();
const r = run(Object.assign({ report: [50, 100, 200, 300, 400] }, args));
const ms = performance.now() - t0;
for (const s of r.stats) console.log(JSON.stringify(s));
console.log('cashSum', r.cashSum, 'loanGap', r.loanGap, 'ms', ms.toFixed(0));
