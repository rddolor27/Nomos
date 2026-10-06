// Does running the day-boundary code on a tiny dummy world at start-up remove the cold-JIT cost of
// the real world's first day boundaries? node jit-prewarm.mjs N=100000 warm=0|1
import { makeSim, advance, dayBoundary, bindAll } from './sim.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')));
const N = +(args.N ?? 100000), warm = args.warm === '1';
const t0 = performance.now();
if (warm) {
  const d = makeSim({ N: 1024, seed: 1, tpd: 1440, mode: 'wheel' });
  for (let k = 0; k < 40; k++) { d.day++; dayBoundary(d, null); }
  for (let j = 0; j < 2000; j++) advance(d);
}
const warmMs = performance.now() - t0;
const w = makeSim({ N, seed: 42, tpd: 1440, mode: 'wheel' });
bindAll(w);
const days = [];
for (let d = 0; d < 5; d++) {
  for (let j = 1; j < w.tpd; j++) advance(w);
  w.t++; w.day++;
  const a = performance.now(); dayBoundary(w, null); days.push(performance.now() - a);
}
console.log('RESULT ' + JSON.stringify({ N, warm, warmMs, firstDays: days }));
