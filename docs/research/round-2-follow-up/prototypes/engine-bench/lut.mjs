// Deterministic LUT sin: table built with @stdlib sin (NOT Math.sin), linear interpolation with + - * and Math.floor only.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ssin = require('@stdlib/math-base-special-sin');
const tag = typeof Deno !== 'undefined' ? 'v8new' : (typeof Bun !== 'undefined') ? 'jsc' : 'v8';
const N = 4096, TWO_PI = 6.283185307179586, INV = N / TWO_PI;
const T = new Float64Array(N + 1); for (let i = 0; i <= N; i++) T[i] = ssin(i * TWO_PI / N);
function lutSin(x) { let t = x * INV; t -= Math.floor(t / N) * N; const i = Math.floor(t); const f = t - i; return T[i] + (T[i + 1] - T[i]) * f; }
const xs = new Float64Array(new Uint8Array(readFileSync('out/in_sin_small.bin')).buffer);
const o = new Float64Array(xs.length); for (let i = 0; i < xs.length; i++) o[i] = lutSin(xs[i]);
writeFileSync(`out/${tag}_lut.bin`, Buffer.from(o.buffer));
let maxErr = 0; for (let i = 0; i < xs.length; i++) maxErr = Math.max(maxErr, Math.abs(o[i] - ssin(xs[i])));
function bench(f) { let s = 0; for (let w = 0; w < 3; w++) for (let i = 0; i < xs.length; i++) s += f(xs[i]); const r = []; for (let k = 0; k < 9; k++) { const t0 = performance.now(); for (let rep = 0; rep < 10; rep++) for (let i = 0; i < xs.length; i++) s += f(xs[i]); r.push((performance.now() - t0) * 1e6 / (xs.length * 10)); } r.sort((a, b) => a - b); return [r[4].toFixed(1), s]; }
const lb = new Function('f','xs','return function(){ let s=0; for(let rep=0;rep<10;rep++) for(let i=0;i<xs.length;i++) s+=f(xs[i]); return s; }');
console.log(tag, 'LUT(4096, linear) sin ns/call =', bench(lutSin)[0], '| stdlib sin =', bench(ssin)[0], '| Math.sin =', bench(Math.sin)[0], '| max |LUT - sin| =', maxErr.toExponential(2));
