// Where does a wealth-tax threshold of 4x mean net worth sit in each preset, and in the SCF?
import { run } from './wealth.mjs';
const presets = {
  E: { saveQ: [0, 20000, 60000, 90000, 180000], sigma: 0.9, sigRisky: 250000, creditMult: 1000000, dischargeYears: 7, shockProb: 150000, shockMult: 900000, rtSwitch: 50000, mpcIBands: [70000, 45000, 28000, 20000, 17000] },
  U: { saveQ: [0, 20000, 60000, 90000, 180000], sigma: 0.9, sigRisky: 250000, creditMult: 1000000, dischargeYears: 7, shockProb: 170000, shockMult: 950000, rtSwitch: 70000, mpcIBands: [70000, 45000, 24000, 15000, 12000] },
};
for (const [k, p] of Object.entries(presets)) {
  const r = run(Object.assign({ seed: 1, years: 200, report: [200] }, p));
  const nw = r.A.nw; let s = 0; for (const v of nw) s += v; const mean = s / nw.length;
  let above = 0; for (const v of nw) if (v > 4 * mean) above++;
  console.log(k, 'share of households above 4x mean NW', (above / nw.length).toFixed(3), JSON.stringify(r.stats[0]));
}
