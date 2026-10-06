// Cost of one annual wealth step per household (all balance-sheet updates, taxes, turnover,
// redistribution), after warm-up. Reports median [min-max] over samples, ns per household-year.
import { run } from './wealth.mjs';
const N = +(process.argv[2] || 10000), warm = 20, samples = 30;
const r = run({ N, years: 1, saveQ: [0, 20000, 60000, 90000, 180000], sigma: 0.9, sigRisky: 250000, creditMult: 1000000, dischargeYears: 7, shockProb: 150000, shockMult: 900000, rtSwitch: 50000, mpcIBands: [70000, 45000, 28000, 20000, 17000], wealthTax: 10000, wealthTaxThreshMult: 4000000, estateTax: 400000, estateThreshMult: 4000000 });
let t = 2;
for (let i = 0; i < warm; i++) r.step(t++);
const xs = [];
for (let i = 0; i < samples; i++) { const a = performance.now(); r.step(t++); xs.push((performance.now() - a) * 1e6 / N); }
xs.sort((a, b) => a - b);
console.log(`N=${N} ns per household-year: median ${xs[samples >> 1].toFixed(1)} [${xs[0].toFixed(1)}-${xs[samples - 1].toFixed(1)}], warm-up ${warm}, samples ${samples}`);
