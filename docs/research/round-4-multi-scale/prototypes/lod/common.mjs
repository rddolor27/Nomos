// Shared helpers for the LOD benchmarks (own measurements, Node 22 / V8).
// Counter-based (keyed) RNG: value depends only on (seed, entity, tick, stream),
// never on call order -> results independent of iteration order / which entities are simulated.
export function mix32(x) { // "lowbias32" integer hash (C. Wellons, hash-prospector)
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15; x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16; return x >>> 0;
}
export function rnd(seed, entity, tick, stream) { // uint32
  return mix32(mix32(mix32(seed ^ entity) ^ tick) ^ (stream + 0x9e3779b9));
}
// Expected value in 16.16 fixed point -> integer count with correct mean (stochastic rounding).
export function stochRound(n, p16, r) { // n * p16 / 65536, p16 in [0,65536]
  const prod = n * p16;             // exact integer (< 2^53)
  const base = Math.floor(prod / 65536);
  const frac = prod - base * 65536;
  return base + (((r & 0xffff) < frac) ? 1 : 0);
}
// Inverse-normal LUT (would be generated at build time and shipped as data; Math.log here is only for building it).
export const ZLUT = (() => {
  const t = new Float64Array(4096);
  // Acklam approximation for the inverse normal CDF
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549671010738239e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  for (let i = 0; i < 4096; i++) {
    const p = (i + 0.5) / 4096; let q, r, x;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    else if (p <= 1 - 0.02425) { q = p - 0.5; r = q*q; x = (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1); }
    else { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    t[i] = x;
  }
  return t;
})();
// Binomial-like draw: normal approximation with sqrt (exactly specified in ECMAScript) + table; small means use stochastic rounding.
export function binomApprox(n, p16, r1, r2) {
  const mean = n * p16 / 65536;
  if (mean < 8) return stochRound(n, p16, r1);
  const sd = Math.sqrt(mean * (1 - p16 / 65536));
  let k = Math.floor(mean + sd * ZLUT[r1 & 4095] + ((r2 & 0xffff) / 65536));
  if (k < 0) k = 0; if (k > n) k = n;
  return k;
}
export function timeit(fn, reps = 1) { const t0 = process.hrtime.bigint(); for (let i = 0; i < reps; i++) fn(i); return Number(process.hrtime.bigint() - t0) / 1e6 / reps; }
