// Zoom-in (disaggregate aggregate -> agents) and zoom-out (fold agents -> aggregate) with exact integer conservation.
// Also: "alignment by sorting" re-sync of a cached micro-state to a newer aggregate. Own measurement.
import { rnd, ZLUT, timeit } from './common.mjs';

// 12-bit lognormal-ish wealth weights from the inverse-normal LUT: w = round(exp(sigma*z)) scaled into 1..4095.
// (Built once; in production ship as data generated at build time.)
const WLUT = (() => { const t = new Uint16Array(4096); for (let i = 0; i < 4096; i++) { const v = Math.exp(0.9 * ZLUT[i]); t[i] = Math.max(1, Math.min(4095, Math.round(v * 300))); } return t; })();

function spawn(agg, seed, sid, epoch) {
  const { E, U, P, M, J, H } = agg; const N = E + U + P + M + J;
  const role = new Uint8Array(N), money = new Float64Array(N), home = new Int32Array(N), w = new Uint16Array(N);
  // 1) roles by exact counts, then keyed Fisher-Yates shuffle
  let k = 0; for (const [r, c] of [[0, E], [1, U], [2, P], [3, M], [4, J]]) for (let i = 0; i < c; i++) role[k++] = r;
  for (let i = N - 1; i > 0; i--) { const j = rnd(seed, sid, epoch, i) % (i + 1); const t = role[i]; role[i] = role[j]; role[j] = t; }
  // 2) homes: uniform over residential tiles (stand-in for LDtk capacity-weighted sampling)
  for (let i = 0; i < N; i++) home[i] = rnd(seed ^ 0x51ed, sid, epoch, i) % 20000;
  // 3) money: floor(H * w_i / W) is exact while H * 4095 < 2^53; leftover cents (< N) go +1 to a keyed subset
  let Wt = 0; for (let i = 0; i < N; i++) { w[i] = WLUT[rnd(seed ^ 0xbeef, sid, epoch, i) & 4095]; Wt += w[i]; }
  if (H * 4095 >= 2 ** 53) throw new Error('use BigInt path');
  let s = 0; for (let i = 0; i < N; i++) { const b = Math.floor(H * w[i] / Wt); money[i] = b; s += b; }
  let left = H - s; // 0 <= left < N
  const start = rnd(seed, sid, epoch, -1) % N;
  for (let i = 0; left > 0; i++, left--) money[(start + i * 7919) % N] += 1; // stride over a prime -> distinct while N not multiple of 7919
  return { N, role, money, home };
}
function fold(a) {
  const c = [0, 0, 0, 0, 0]; let H = 0;
  for (let i = 0; i < a.N; i++) { c[a.role[i]]++; H += a.money[i]; }
  return { E: c[0], U: c[1], P: c[2], M: c[3], J: c[4], H };
}
// Re-sync cached agents to a newer aggregate: flip the |delta| employed<->unemployed agents with the highest keyed score.
function align(a, target, seed, sid, epoch) {
  const cur = fold(a); let delta = target.U - cur.U; // >0: need more unemployed
  if (delta === 0) return 0;
  const from = delta > 0 ? 0 : 1, to = delta > 0 ? 1 : 0; delta = Math.abs(delta);
  const keys = []; for (let i = 0; i < a.N; i++) if (a.role[i] === from) keys.push((rnd(seed, sid, epoch, i) >>> 1) * 2097152 + i); // score|index packed < 2^53
  const ka = Float64Array.from(keys).sort(); // ascending; take the top `delta`
  for (let q = ka.length - 1, n = 0; n < delta; q--, n++) a.role[ka[q] % 2097152] = to;
  return delta;
}

const rows = [];
for (const N of [10000, 100000, 1000000]) {
  const agg = { E: Math.round(N * 0.88), U: Math.round(N * 0.06), P: Math.round(N * 0.0023), M: Math.round(N * 0.04), J: 0, H: N * 523_417 + 13 };
  agg.J = N - agg.E - agg.U - agg.P - agg.M;
  let a; const msSpawn = timeit(() => { a = spawn(agg, 2026, 7, 1); }, N >= 1000000 ? 3 : 10);
  let f; const msFold = timeit(() => { f = fold(a); }, 10);
  const exact = f.H === agg.H && f.E === agg.E && f.U === agg.U && f.P === agg.P && f.M === agg.M && f.J === agg.J;
  const target = { ...agg, U: agg.U + Math.round(N * 0.01), E: agg.E - Math.round(N * 0.01) };
  let flipped; const msAlign = timeit(() => { const b = { ...a, role: a.role.slice() }; flipped = align(b, target, 2026, 7, 2); }, 3);
  // determinism: same (seed, settlement, epoch) -> identical micro-state
  const a2 = spawn(agg, 2026, 7, 1); let same = true; for (let i = 0; i < N; i++) if (a2.money[i] !== a.money[i] || a2.role[i] !== a.role[i]) { same = false; break; }
  // wealth inequality of spawned agents (Gini) as a sanity check of the weight table
  const m = Array.from(a.money).sort((x, y) => x - y); let cum = 0, wsum = 0; for (let i = 0; i < m.length; i++) { cum += m[i]; wsum += (i + 1) * m[i]; }
  const gini = (2 * wsum) / (m.length * cum) - (m.length + 1) / m.length;
  rows.push({ agents: N, spawnMs: +msSpawn.toFixed(1), foldMs: +msFold.toFixed(2), alignMs: +msAlign.toFixed(1), flipped, exactConservation: exact, deterministic: same, gini: +gini.toFixed(3) });
}
console.table(rows);

// Largest-remainder (Hamilton) apportionment of a national transfer to settlements, exact in integer cents
function hamilton(total, weights) {
  const n = weights.length; let W = 0; for (const w of weights) W += w;
  const out = new Float64Array(n), rem = new Float64Array(n); let s = 0;
  for (let i = 0; i < n; i++) { const q = Math.floor(total * weights[i] / W); out[i] = q; s += q; rem[i] = total * weights[i] - q * W; }
  const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => rem[j] - rem[i] || i - j); // ties by index
  for (let k = 0; k < total - s; k++) out[order[k]] += 1;
  return out;
}
const pops = Array.from({ length: 10000 }, (_, i) => Math.floor(400000 / (i + 1)) + 50);
let alloc; const msH = timeit(() => { alloc = hamilton(98_765_432_101, pops); }, 5);
console.log(`Hamilton apportionment of 98,765,432,101 cents over 10k settlements: ${msH.toFixed(2)} ms, exact: ${alloc.reduce((x, y) => x + y, 0) === 98_765_432_101}`);
