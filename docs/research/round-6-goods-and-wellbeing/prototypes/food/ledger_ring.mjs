// Settlement-ledger food block: can 6 numbers stand in for an exact per-day expiry ring?
// Part 1 (accuracy): exact 32-slot days-left ring vs a 6-slot ring with slots for days-left
//   1, 2, 3, 4-6, 7-10, 11-32 (wide slots age a fraction 1/width a day, keyed stochastic rounding).
// Part 2 (staples): a year's harvest stored as dated cohorts vs a single 1/L daily loss rate.
// Part 3 (cost): ns per settlement-day for the 6-slot block, 10,000 settlements.
// Run: node ledger_ring.mjs
const Q16 = 65536;
function hash(a, b, c) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return h >>> 0;
}

// Perishable mix: [shelf days at the settlement's storage, share of demand %]
const MIX = [[3, 20], [4, 25], [7, 30], [10, 25]];
const LO = Int32Array.from([1, 2, 3, 4, 7, 11]);
const HI = Int32Array.from([1, 2, 3, 6, 10, 32]);
const NS = 6;
const AGE_Q16 = Int32Array.from([Q16, Q16, Q16, Math.floor(Q16 / 3), Math.floor(Q16 / 4), Math.floor(Q16 / 22)]);
const slotOf = (left) => { for (let s = 0; s < NS; s++) if (left <= HI[s]) return s; return NS - 1; };

function simulate(k, supplyPct, days, warm, seed) {
  const exact = new Int32Array(33), ring = new Int32Array(NS);
  const D = 1000;
  const r = { del: 0, wE: 0, wR: 0, uE: 0, uR: 0, dem: 0 };
  for (let day = 0; day < days; day++) {
    const score = day >= warm;
    if (day % k === 0) for (let m = 0; m < MIX.length; m++) {
      const q = Math.floor(k * D * MIX[m][1] * supplyPct / 10000), L = MIX[m][0];
      exact[L] += q; ring[slotOf(L)] += q; if (score) r.del += q;
    }
    let need = D;
    for (let d = 1; d <= 32 && need > 0; d++) { const t = Math.min(exact[d], need); exact[d] -= t; need -= t; }
    if (score) { r.uE += need; r.dem += D; r.wE += exact[1]; }
    for (let d = 1; d < 32; d++) exact[d] = exact[d + 1];
    exact[32] = 0;
    need = D;
    for (let s = 0; s < NS && need > 0; s++) { const t = Math.min(ring[s], need); ring[s] -= t; need -= t; }
    if (score) { r.uR += need; r.wR += ring[0]; }
    ring[0] = 0;
    for (let s = 1; s < NS; s++) {
      const x = ring[s] * AGE_Q16[s];
      let mv = Math.floor(x / Q16);
      if ((hash(seed, day, s) & 0xffff) < x - mv * Q16) mv++;
      ring[s] -= mv; ring[s - 1] += mv;
    }
  }
  const p = (x, y) => (100 * x / y).toFixed(1);
  return `k=${k} supply ${supplyPct}%: waste exact ${p(r.wE, r.del)}% vs 6-slot ${p(r.wR, r.del)}%; shortage ${p(r.uE, r.dem)}% vs ${p(r.uR, r.dem)}%`;
}

console.log('Part 1: pooled perishables (shelf 3/4/7/10 days at 20/25/30/25% of demand), 5,000 scored days');
for (const k of [1, 2, 3, 7]) for (const s of [100, 105, 115]) console.log('  ' + simulate(k, s, 5200, 200, 7));

// Part 1b: same mix, but each category's demand must be met by that category (no substitution).
function noSubstitution(k, supplyPct, days, warm) {
  const D = 1000;
  let del = 0, w = 0, u = 0, dem = 0;
  for (let m = 0; m < MIX.length; m++) {
    const L = MIX[m][0], d = Math.floor(D * MIX[m][1] / 100), left = new Int32Array(L + 1);
    for (let day = 0; day < days; day++) {
      const score = day >= warm;
      if (day % k === 0) { const q = Math.floor(k * d * supplyPct / 100); left[L] += q; if (score) del += q; }
      let need = d;
      for (let x = 1; x <= L && need > 0; x++) { const t = Math.min(left[x], need); left[x] -= t; need -= t; }
      if (score) { u += need; dem += d; w += left[1]; }
      for (let x = 1; x < L; x++) left[x] = left[x + 1];
      left[L] = 0;
    }
  }
  return `k=${k} supply ${supplyPct}%: no-substitution exact waste ${(100 * w / del).toFixed(1)}%, shortage ${(100 * u / dem).toFixed(1)}%`;
}
console.log('Part 1b: same mix with no substitution between categories');
for (const k of [1, 3, 7]) for (const s of [100, 115]) console.log('  ' + noSubstitution(k, s, 5200, 200));

console.log('Part 2: one harvest a year (365 days) of 365 days of demand, shelf life L, 20 years');
function harvest(L, years, mode) {
  const D = 1000, Y = 365;
  let del = 0, waste = 0, unmet = 0, dem = 0;
  const cq = new Int32Array(2), ce = new Int32Array(2);
  let pool = 0;
  const f = Math.floor(Q16 / L);
  for (let day = 0; day < years * Y; day++) {
    if (day % Y === 0) { const q = Y * D; del += q; if (mode === 'cohort') { const i = cq[0] === 0 ? 0 : 1; cq[i] = q; ce[i] = day + L; } else pool += q; }
    let need = D;
    if (mode === 'cohort') {
      const a = ce[0] <= ce[1] || cq[1] === 0 ? 0 : 1, b = 1 - a;
      for (const i of [a, b]) { const t = Math.min(cq[i], need); cq[i] -= t; need -= t; }
      for (let i = 0; i < 2; i++) if (cq[i] > 0 && ce[i] <= day + 1) { waste += cq[i]; cq[i] = 0; }
    } else {
      const t = Math.min(pool, need); pool -= t; need -= t;
      const x = pool * f; let lost = Math.floor(x / Q16);
      if ((hash(3, day, 0) & 0xffff) < x - lost * Q16) lost++;
      pool -= lost; waste += lost;
    }
    unmet += need; dem += D;
  }
  return `waste ${(100 * waste / del).toFixed(1)}%, shortage ${(100 * unmet / dem).toFixed(1)}%`;
}
for (const L of [400, 540, 730]) console.log(`  L=${L}: cohorts ${harvest(L, 20, 'cohort')} | single 1/L rate ${harvest(L, 20, 'rate')}`);

console.log('Part 3: 6-slot block update cost, 10,000 settlements');
const S = 10000;
const R = new Int32Array(S * 8), demand = new Int32Array(S), waste = new Int32Array(S), seedS = 11;
for (let i = 0; i < S; i++) { demand[i] = 100 + (hash(seedS, i, 1) % 5000); for (let s = 0; s < NS; s++) R[i * 8 + s] = hash(seedS, i, s + 2) % 20000; }
function dayStep(day) {
  for (let i = 0; i < S; i++) {
    const b = i << 3;
    let need = demand[i];
    for (let s = 0; s < NS && need > 0; s++) { const v = R[b + s], t = v < need ? v : need; R[b + s] = v - t; need -= t; }
    waste[i] += R[b];
    R[b] = 0;
    for (let s = 1; s < NS; s++) {
      const x = R[b + s] * AGE_Q16[s];
      let mv = Math.floor(x / Q16);
      if ((hash(i, day, s) & 0xffff) < x - mv * Q16) mv++;
      R[b + s] -= mv; R[b + s - 1] += mv;
    }
    R[b + 4] += demand[i] >> 1; R[b + 5] += demand[i] >> 1;
  }
}
const os = await import('node:os');
for (let d = 0; d < 200; d++) dayStep(d);
const samples = [];
for (let rep = 0; rep < 15; rep++) {
  const t0 = process.hrtime.bigint();
  for (let d = 0; d < 50; d++) dayStep(1000 + rep * 50 + d);
  samples.push(Number(process.hrtime.bigint() - t0) / 50 / S);
}
samples.sort((a, b) => a - b);
console.log(`  node ${process.version} v8 ${process.versions.v8}; ${os.cpus()[0].model.trim()}; os.loadavg ${os.loadavg().map((x) => x.toFixed(2)).join(' ')}`);
console.log(`  warm-up 200 days; 15 samples x 50 days; ns per settlement-day median ${samples[7].toFixed(1)} [${samples[0].toFixed(1)}-${samples[14].toFixed(1)}]`);
