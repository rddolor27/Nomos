import { rnd, mix32, timeit } from './common.mjs';
// keyed RNG throughput vs sequential sfc32 (own measurement)
function sfc32(a, b, c, d) { return function () { a |= 0; b |= 0; c |= 0; d |= 0; const t = (a + b | 0) + d | 0; d = d + 1 | 0; a = b ^ b >>> 9; b = c + (c << 3) | 0; c = (c << 21 | c >>> 11); c = c + t | 0; return t >>> 0; }; }
const M = 20_000_000; let acc = 0;
let ms = timeit(() => { for (let i = 0; i < M; i++) acc ^= rnd(42, i & 1023, i >>> 10, 7); });
console.log(`keyed rnd (3x lowbias32): ${(ms * 1e6 / M).toFixed(2)} ns/draw`);
ms = timeit(() => { for (let i = 0; i < M; i++) acc ^= mix32(i * 0x9e3779b9 ^ 42); });
console.log(`single lowbias32 (derived stream): ${(ms * 1e6 / M).toFixed(2)} ns/draw`);
const g = sfc32(1, 2, 3, 4);
ms = timeit(() => { for (let i = 0; i < M; i++) acc ^= g(); });
console.log(`sequential sfc32: ${(ms * 1e6 / M).toFixed(2)} ns/draw`, acc & 1);
// quick quality smoke test: chi-square of 16 buckets over keyed stream across entities
const B = new Float64Array(16); const K = 1 << 20;
for (let i = 0; i < K; i++) B[rnd(99, i, 5, 3) >>> 28]++;
let chi = 0; for (let b = 0; b < 16; b++) chi += (B[b] - K / 16) ** 2 / (K / 16);
console.log('chi2(15 df) over 1M entities, top 4 bits:', chi.toFixed(1));
