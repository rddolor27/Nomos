// Exact Zipf (zeta=1): S_k = S1/k, n = floor(S1/xmin), sum_k S1/k = N  =>  S1 = N / H_n. Solve by iteration.
function solve(N, xmin) {
  let S1 = N / 7;
  for (let it = 0; it < 200; it++) {
    const n = Math.floor(S1 / xmin); let H = 0; for (let k = 1; k <= n; k++) H += 1 / k;
    S1 = N / H;
  }
  const n = Math.floor(S1 / xmin);
  const cnt = t => Math.floor(S1 / t);
  return { N, xmin, S1: Math.round(S1), n, ge2k: cnt(2000), ge10k: cnt(10000), ge100k: cnt(100000) };
}
console.log(solve(1.2e6, 200));
console.log(solve(1e6, 200));
// Young hazard check
for (const share of [0.2, 0.22, 0.25]) console.log(share, (1 - Math.pow(1 - share, 1 / 15)).toFixed(4));
// Glaeser-Sacerdote: 1/4 + 1/5
console.log(0.25 + 0.2);
