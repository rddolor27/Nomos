// Prints CPU_RATE=<n> so CDP CPU throttling targets the same device class on any CI runner.
// Uses Lighthouse's BenchmarkIndex (core/lib/page-functions.js computeBenchmarkIndex). On the reference VM used for
// the budgets (BenchmarkIndex ~1580 unthrottled), 4x throttling gave ~375 = Lighthouse "mid-tier mobile" bracket.
import { chromium } from 'playwright';
const TARGET = +(process.env.TARGET_BENCHMARK_INDEX || 375);
const b = await chromium.launch(); const p = await b.newPage(); await p.setContent('<!doctype html><title>cal</title>');
const bi = [];
for (let i = 0; i < 3; i++) bi.push(await p.evaluate(() => {
  const gc = () => { const s0 = Date.now(); let it = 0; while (Date.now() - s0 < 500) { let s = ''; for (let j = 0; j < 10000; j++) s += 'a'; if (s.length === 1) throw 0; it++; } return Math.round(it / 10 / ((Date.now() - s0) / 1000)); };
  const nogc = () => { const A = [], B = []; for (let i = 0; i < 100000; i++) A[i] = B[i] = i; const s0 = Date.now(); let it = 0; while (it % 10 !== 0 || Date.now() - s0 < 500) { const s = it % 2 === 0 ? A : B, t = it % 2 === 0 ? B : A; for (let j = 0; j < s.length; j++) t[j] = s[j]; it++; } return Math.round(it / 10 / ((Date.now() - s0) / 1000)); };
  return (gc() + nogc()) / 2;
}));
await b.close();
const med = bi.sort((x, y) => x - y)[1]; const rate = Math.min(10, Math.max(1, Math.round((med / TARGET) * 2) / 2));
console.log(`BENCHMARK_INDEX=${med}`); console.log(`CPU_RATE=${rate}`);
