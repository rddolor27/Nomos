function hamiltonF(total, weights) {
  const n = weights.length; let W = 0; for (const w of weights) W += w;
  const out = new Float64Array(n), rem = new Float64Array(n); let s = 0;
  for (let i = 0; i < n; i++) { const q = Math.floor(total * weights[i] / W); out[i] = q; s += q; rem[i] = total * weights[i] - q * W; }
  const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => rem[j] - rem[i] || i - j);
  for (let k = 0; k < total - s; k++) out[order[k]] += 1;
  return out;
}
function hamiltonB(total, weights) {
  const n = weights.length; let W = 0n; for (const w of weights) W += BigInt(w);
  const T = BigInt(total);
  const out = new Array(n), rem = new Array(n); let s = 0n;
  for (let i = 0; i < n; i++) { const p = T * BigInt(weights[i]); const q = p / W; out[i] = q; s += q; rem[i] = p - q * W; }
  const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => (rem[j] > rem[i]) ? 1 : (rem[j] < rem[i]) ? -1 : i - j);
  for (let k = 0n; k < T - s; k++) out[order[Number(k)]] += 1n;
  return out;
}
const pops = Array.from({ length: 10000 }, (_, i) => Math.floor(400000 / (i + 1)) + 50);
const total = 98_765_432_101;
const f = hamiltonF(total, pops), b = hamiltonB(total, pops);
let diff = 0, maxd = 0, sumF = 0; for (let i = 0; i < pops.length; i++) { sumF += f[i]; const d = Math.abs(f[i] - Number(b[i])); if (d) diff++; if (d > maxd) maxd = d; }
let overflow = 0; for (const w of pops) if (total * w >= 2 ** 53) overflow++;
console.log({ settlementsDiffering: diff, maxDiffCents: maxd, sumExact: sumF === total, productsAbove2pow53: overflow });
