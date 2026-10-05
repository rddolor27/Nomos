// Aggregate (stock-flow) settlement model: one daily tick for N settlements, integer cents, zero-sum ledger with MINT.
// Own measurement. Usage: node bench_agg.mjs
import { rnd, stochRound, binomApprox, timeit } from './common.mjs';
import zlib from 'node:zlib';

function makeWorld(N, seed) {
  const side = Math.ceil(Math.sqrt(N));
  const w = {
    N, seed, side,
    E: new Int32Array(N), U: new Int32Array(N), P: new Int32Array(N), J: new Int32Array(N), // people by role/state
    H: new Float64Array(N), F: new Float64Array(N), G: new Float64Array(N),               // money (integer cents)
    price: new Int32Array(N), wage: new Int32Array(N), inv: new Float64Array(N),
    attract: new Int32Array(N), trueCrime: new Int32Array(N), recCrime: new Int32Array(N),
    nb: new Int32Array(N * 4),
    outMig: new Int32Array(N), outMigTo: new Int32Array(N), outMigMoney: new Float64Array(N), outTrade: new Float64Array(N),
    MINT: 0,
  };
  let popTot = 0;
  for (let s = 0; s < N; s++) {
    const pop = Math.floor(400000 / (s + 1)) + 50 + (rnd(seed, s, 0, 99) % 200);    // Zipf-like sizes: villages..cities
    const P = Math.floor(pop * 23 / 10000) + 1, U = Math.floor(pop * 6 / 100), E = pop - P - U;
    w.E[s] = E; w.U[s] = U; w.P[s] = P; w.J[s] = 0; popTot += pop;
    w.H[s] = pop * 50000; w.F[s] = pop * 100000; w.G[s] = pop * 10000;
    w.price[s] = 1000; w.wage[s] = 12000; w.inv[s] = E * 20;
    const x = s % side, y = Math.floor(s / side);
    w.nb[4*s] = ((x + 1) % side) + y * side; w.nb[4*s+1] = ((x + side - 1) % side) + y * side;
    w.nb[4*s+2] = x + ((y + 1) % side) * side; w.nb[4*s+3] = x + ((y + side - 1) % side) * side;
    for (let k = 0; k < 4; k++) if (w.nb[4*s+k] >= N) w.nb[4*s+k] = s; // ragged last row -> self
  }
  let sum = 0; for (let s = 0; s < N; s++) sum += w.H[s] + w.F[s] + w.G[s];
  w.MINT = -sum; w.popTot = popTot;
  return w;
}

function tick(w, t) {
  const { N, seed, E, U, P, J, H, F, G, price, wage, inv, attract, trueCrime, recCrime, nb, outMig, outMigTo, outMigMoney, outTrade } = w;
  // Pass 1: local flows (each settlement touches only itself -> order-independent)
  for (let s = 0; s < N; s++) {
    let e = E[s], u = U[s]; const p = P[s]; let j = J[s];
    const pop = e + u + p + j;
    const wg = wage[s];
    const liquid = F[s] > 30 * wg * e;
    const hires = binomApprox(u, liquid ? 3277 : 655, rnd(seed, s, t, 1), rnd(seed, s, t, 2));      // 5% / 1% per day
    const seps  = binomApprox(e, liquid ? 655 : 1966, rnd(seed, s, t, 3), rnd(seed, s, t, 4));      // 1% / 3%
    e += hires - seps; u += seps - hires;
    let pay = e * wg; if (pay > F[s]) pay = F[s]; F[s] -= pay; H[s] += pay;
    const tax = Math.floor(pay / 5); H[s] -= tax; G[s] += tax;
    let pol = p * wg; if (pol > G[s]) pol = G[s]; G[s] -= pol; H[s] += pol;
    const pr = price[s];
    let units = Math.floor(Math.floor(H[s] / 50) / pr); if (units > inv[s]) units = inv[s];
    const spend = units * pr; H[s] -= spend; F[s] += spend; inv[s] = inv[s] - units + e * 4;
    const r5 = rnd(seed, s, t, 5);
    if ((r5 & 3) === 0) { // ~1/4 of days: Lengnick-like price revision when inventory is outside a band
      const d = Math.floor(pr * ((r5 >>> 8) % 200) / 10000);
      if (inv[s] > 40 * e) price[s] = pr - d > 1 ? pr - d : 1; else if (inv[s] < 10 * e) price[s] = pr + d;
    }
    // crime: base 0.5 per mille/day + unemployment push - police deterrence (16.16 fixed point)
    let rate = 33 + Math.floor(655 * u / (pop + 1)) - Math.floor(65536 * p / (pop + 1) * 2);
    if (rate < 0) rate = 0;
    const thefts = binomApprox(e + u, rate, rnd(seed, s, t, 6), rnd(seed, s, t, 7));
    let stolen = thefts * 1500; if (stolen > F[s]) stolen = F[s]; F[s] -= stolen; H[s] += stolen;
    const rec = stochRound(thefts, 29491, rnd(seed, s, t, 8));                   // 45% reported
    let arrests = stochRound(rec, 2621 + Math.min(20000, p * 65536 * 4 / (pop + 1)), rnd(seed, s, t, 9));
    if (arrests > u) arrests = u; u -= arrests; j += arrests;
    const rel = stochRound(j, 1092, rnd(seed, s, t, 10)); j -= rel; u += rel;   // ~1/60 per day
    attract[s] = attract[s] - (attract[s] >> 4) + thefts * 256;
    trueCrime[s] += thefts; recCrime[s] += rec;
    E[s] = e; U[s] = u; J[s] = j;
  }
  // Pass 2: plan cross-settlement flows from a fixed snapshot (read-only) -> order-independent
  for (let s = 0; s < N; s++) {
    const u = U[s], pop = E[s] + u + P[s] + J[s];
    const mig = stochRound(u, 131, rnd(seed, s, t, 11));            // 0.2%/day of unemployed consider moving
    let best = s, bw = wage[s];
    for (let k = 0; k < 4; k++) { const n = nb[4*s+k]; if (wage[n] > bw) { bw = wage[n]; best = n; } }
    outMig[s] = best === s ? 0 : mig; outMigTo[s] = best;
    outMigMoney[s] = outMig[s] > 0 ? Math.floor(H[s] * outMig[s] / pop) : 0;
    outTrade[s] = Math.floor(F[s] / 1000);                          // exports-for-imports net flow to neighbour 0
  }
  // Pass 3: apply (integer adds commute exactly)
  for (let s = 0; s < N; s++) {
    const m = outMig[s];
    if (m > 0) { const d = outMigTo[s]; U[s] -= m; U[d] += m; H[s] -= outMigMoney[s]; H[d] += outMigMoney[s]; }
    const tr = outTrade[s], d0 = nb[4*s]; F[s] -= tr; F[d0] += tr;
  }
}

function ledgerSum(w) { let s = w.MINT; for (let i = 0; i < w.N; i++) s += w.H[i] + w.F[i] + w.G[i]; return s; }
function popSum(w) { let s = 0; for (let i = 0; i < w.N; i++) s += w.E[i] + w.U[i] + w.P[i] + w.J[i]; return s; }
function hashWorld(w) { let h = 0; for (const a of [w.E, w.U, w.J, w.price]) for (let i = 0; i < a.length; i++) h = Math.imul(h ^ a[i], 0x01000193) >>> 0; for (const a of [w.H, w.F]) for (let i = 0; i < a.length; i++) h = Math.imul(h ^ (a[i] % 4294967296), 0x01000193) >>> 0; return h; }

const out = [];
for (const N of [1000, 10000, 100000, 1000000]) {
  const w = makeWorld(N, 12345);
  const warm = N >= 1000000 ? 3 : 20;
  for (let t = 1; t <= warm; t++) tick(w, t);
  const reps = N >= 1000000 ? 10 : (N >= 100000 ? 30 : 200);
  let tt = warm;
  const ms = timeit(() => { tick(w, ++tt); }, reps);
  const lz = ledgerSum(w), pz = popSum(w);
  out.push({ N, msPerTick: +ms.toFixed(3), nsPerSettlementTick: +(ms * 1e6 / N).toFixed(1), settlementTicksPerSec: Math.round(N / ms * 1000), ledgerSumZero: lz === 0, popConserved: pz === w.popTot, popTot: w.popTot });
}
console.table(out);

// Determinism / order-independence check: run settlements in a different memory layout? -> same seed twice gives same hash
const a = makeWorld(10000, 777), b = makeWorld(10000, 777);
for (let t = 1; t <= 365; t++) { tick(a, t); tick(b, t); }
console.log('same-seed hash equal after 365 days:', hashWorld(a) === hashWorld(b), hashWorld(a).toString(16), 'ledger zero:', ledgerSum(a) === 0);

// Save size for 10k settlements after a simulated year
const arrays = [a.E, a.U, a.P, a.J, a.H, a.F, a.G, a.price, a.wage, a.inv, a.attract, a.trueCrime, a.recCrime];
const raw = Buffer.concat(arrays.map(x => Buffer.from(x.buffer, x.byteOffset, x.byteLength)));
const gz = zlib.gzipSync(raw, { level: 6 });
const br = zlib.brotliCompressSync(raw);
console.log(`10k settlements state: raw ${raw.length} B (${(raw.length / 10000).toFixed(0)} B/settlement), gzip-6 ${gz.length} B, brotli ${br.length} B`);
