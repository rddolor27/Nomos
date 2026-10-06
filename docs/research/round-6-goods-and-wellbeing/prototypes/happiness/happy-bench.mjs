// Throwaway research benchmark (round 6, happiness). Not committed; lives in the session scratchpad.
// Integer life-satisfaction model: ls in milli-ladder points (0..10000) as Int16, one pass per sim day.
// Only + - * /, Math.floor, Math.imul, Math.clz32 and bit ops in per-agent code; LUTs built at start.
import { PerformanceObserver, performance } from 'node:perf_hooks';

// ---------- keyed draw (counter-based hash, plan M0/R4) ----------
function mix32(h) {
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16; return h >>> 0;
}
function draw(seed, entity, tick, stream) {
  let h = mix32(seed ^ 0x9e3779b9);
  h = mix32(h ^ entity);
  h = mix32(h ^ Math.imul(tick, 0x85ebca6b));
  return mix32(h ^ Math.imul(stream, 0xc2b2ae35));
}

// ---------- build-time LUTs (exact IEEE ops only: squaring, halving, sqrt) ----------
// log2 fraction for 1 + m/256, Q16, by repeated squaring (bit-identical in every engine).
const LOG2_FRAC = new Int32Array(256);
for (let m = 0; m < 256; m++) {
  let y = 1 + m / 256, r = 0;
  for (let b = 15; b >= 0; b--) { y = y * y; if (y >= 2) { y = y / 2; r |= 1 << b; } }
  LOG2_FRAC[m] = r;
}
function log2Q16(x) { // integer-valued x >= 1, < 2^32 here
  const u = x >>> 0;
  const p = 31 - Math.clz32(u);
  const m = p >= 8 ? (u >>> (p - 8)) & 255 : (u << (8 - p)) & 255;
  return (p << 16) + LOG2_FRAC[m];
}
// Exponential decay LUT with a power-of-two half-life in days: f = 2^(-1/H) from repeated sqrt of 0.5.
function decayLut(halfLifePow2, len) {
  let f = 0.5;
  for (let k = 0; k < halfLifePow2; k++) f = Math.sqrt(f); // 2^(-1/2^k)
  const t = new Int32Array(len);
  let v = 32768;
  for (let d = 0; d < len; d++) { t[d] = Math.floor(v); v = v * f; }
  return t;
}
const VIC_LUT = decayLut(7, 1024);   // half-life 128 days (violent: -0.40 in year 1, -0.11 in year 2, Mahuteau & Zhu)
const SCAR_LUT = decayLut(8, 2048);  // half-life 256 days after re-employment (Clark et al. scarring)

// ---------- model constants (milli-ladder points; 1000 = one Cantril step) ----------
const B_REL = 300;     // per doubling of own income vs settlement median (K&D 2010: 0.64 per ~4x)
const B_CHG = 250;     // per doubling vs own habit (Di Tella et al. 2010: 65% of first-year effect gone in 4 years)
const HAB_SHIFT = 10;  // habit EMA, half-life ~ ln2 * 2^10 = 710 days
const U_PEN = -700;    // unemployed, no adaptation (Clark et al. 2008 men; WHR 2017 ~0.6 gap)
const SCAR_PEN = -150; // after re-employment, decays (Clark et al. 2008: -0.11 at 1-2 y, ~0 at 3-4 y)
const ISO_PEN = -450;  // no friend or household contact (K&D 2010 'alone' = -0.48 ladder)
const FOOD_PEN = -150; // per missed-meal day in the last 7 (unsourced estimate; hand-off to food notes)
const FOOD_CAP = -700;
const VIOL_PEN = -800, PROP_PEN = -200; // initial victim penalties, decayed by VIC_LUT
const FEAR_W = -300;   // at maximum perceived cell danger (255); magnitude is an inference
const K_Q16 = 6182;    // inertia: 1 - 2^(-1/7) per day = half-life 7 days toward the target
const NB = 5;          // ledger bands: <4, 4-5.5, 5.5-7, 7-8.5, >=8.5
const F_EMP = 1, F_FRIEND = 2;

function makeWorld(N, S, seed) {
  const w = {
    N, S,
    ls: new Int16Array(N), setPt: new Int16Array(N), habit: new Int32Array(N),
    income: new Float64Array(N),           // integer cents per day
    flags: new Uint8Array(N), missed7: new Uint8Array(N), cell: new Uint16Array(N), settle: new Uint16Array(N),
    victimDay: new Int32Array(N), victimKind: new Uint8Array(N), reempDay: new Int32Array(N),
    fear: new Uint8Array(65536),
    // per settlement: yesterday's committed aggregates (read-only during the pass) and today's accumulators
    lmed: new Int32Array(S), shared: new Int32Array(S),
    hist: new Int32Array(S * 512),       // log2 income histogram, 16 bins per octave, 32 octaves
    bands: new Int32Array(S * NB), sum: new Float64Array(S), cnt: new Int32Array(S),
    unempRateBp: new Int32Array(S), inflBp: new Int32Array(S),
  };
  for (let i = 0; i < N; i++) {
    const r0 = draw(seed, i, 0, 1), r1 = draw(seed, i, 0, 2), r2 = draw(seed, i, 0, 3), r3 = draw(seed, i, 0, 4);
    // set point ~ N(7000, ~1360) via Irwin-Hall(4) of 16-bit uniforms (setup only)
    const s4 = (r0 & 0xffff) + (r0 >>> 16) + (r1 & 0xffff) + (r1 >>> 16); // mean 131070, sd ~37837
    let sp = 7000 + Math.floor((s4 - 131070) * 1360 / 37837);
    if (sp < 1000) sp = 1000; else if (sp > 9900) sp = 9900;
    w.setPt[i] = sp; w.ls[i] = sp;
    // daily income: lognormal-ish via 2^(uniform octave spread), integer cents
    const oct = ((r2 & 0xffff) + (r2 >>> 16)) / 65536; // 0..2, triangular
    w.income[i] = Math.floor(8000 * (1 << Math.floor(oct * 2)) * (1 + (r3 & 255) / 256));
    w.habit[i] = log2Q16(w.income[i] + 1);
    let f = 0;
    if ((r3 >>> 8) % 100 >= 5) f |= F_EMP; else w.income[i] = Math.floor(w.income[i] * 4 / 10);
    if ((r3 >>> 16) % 100 >= 10) f |= F_FRIEND;
    w.flags[i] = f;
    w.cell[i] = (r2 >>> 8) & 0xffff;
    w.settle[i] = S > 1 ? (r0 >>> 20) % S : 0;
    w.victimDay[i] = -100000; w.reempDay[i] = -100000;
  }
  for (let c = 0; c < 65536; c++) w.fear[c] = draw(seed, c, 0, 9) & 63; // mostly calm, a few hot cells
  for (let s = 0; s < S; s++) { w.lmed[s] = log2Q16(8000 * 2); w.unempRateBp[s] = 500; w.inflBp[s] = 250; }
  return w;
}

// Once per settlement per day, before the agent pass: shared terms (unemployment spillover, inflation).
function settlementShared(w) {
  for (let s = 0; s < w.S; s++) {
    // -20 per percentage point of unemployment, -7 per point of annual inflation (basis points / 100)
    w.shared[s] = Math.floor((-20 * w.unempRateBp[s] - 7 * w.inflBp[s]) / 100);
  }
}

// The per-agent day-boundary pass. Reads yesterday's aggregates, writes ls/habit and today's accumulators.
function happinessDay(w, day) {
  const N = w.N, ls = w.ls, setPt = w.setPt, habit = w.habit, income = w.income, flags = w.flags;
  const missed7 = w.missed7, cell = w.cell, settle = w.settle, fear = w.fear, lmed = w.lmed, shared = w.shared;
  const victimDay = w.victimDay, victimKind = w.victimKind, reempDay = w.reempDay;
  const hist = w.hist, bands = w.bands, sum = w.sum, cnt = w.cnt;
  for (let i = 0; i < N; i++) {
    const s = settle[i];
    const L = log2Q16(income[i] + 1);
    let dRel = L - lmed[s];
    if (dRel > 262144) dRel = 262144; else if (dRel < -262144) dRel = -262144; // clamp at +-4 doublings
    let h = habit[i];
    let dChg = L - h;
    if (dChg > 262144) dChg = 262144; else if (dChg < -262144) dChg = -262144;
    habit[i] = h + ((L - h) >> HAB_SHIFT);
    let t = setPt[i] + ((dRel * B_REL) >> 16) + ((dChg * B_CHG) >> 16) + shared[s];
    const f = flags[i];
    if ((f & F_EMP) === 0) t += U_PEN;
    else {
      const ds = day - reempDay[i];
      if (ds < 2048) t += (SCAR_PEN * SCAR_LUT[ds]) >> 15;
    }
    if ((f & F_FRIEND) === 0) t += ISO_PEN;
    let fp = FOOD_PEN * missed7[i];
    if (fp < FOOD_CAP) fp = FOOD_CAP;
    t += fp;
    const dv = day - victimDay[i];
    if (dv < 1024) t += ((victimKind[i] === 1 ? VIOL_PEN : PROP_PEN) * VIC_LUT[dv]) >> 15;
    t += (FEAR_W * fear[cell[i]]) >> 8;
    if (t < 0) t = 0; else if (t > 10000) t = 10000;
    let x = ls[i];
    x += ((t - x) * K_Q16) >> 16;
    ls[i] = x;
    // fold into today's settlement accumulators (no extra sweep): mean, bands, income histogram
    sum[s] += x; cnt[s]++;
    const b = x < 4000 ? 0 : x < 5500 ? 1 : x < 7000 ? 2 : x < 8500 ? 3 : 4;
    bands[s * NB + b]++;
    hist[(s << 9) + (L >> 12)]++;
  }
}

// Branchless variant: LUTs padded with a zero tail so 'days since' is clamped by min() arithmetic,
// flags turned into masks, bands by a 128-unit LUT. Same results as happinessDay (checked by hash).
const VIC_Z = new Int32Array(1025); VIC_Z.set(VIC_LUT); VIC_Z[1024] = 0;
const SCAR_Z = new Int32Array(2049); SCAR_Z.set(SCAR_LUT); SCAR_Z[2048] = 0;
const BAND_X = new Uint8Array(10001); // exact band per milli-ladder value (10 KB)
for (let x = 0; x <= 10000; x++) BAND_X[x] = x < 4000 ? 0 : x < 5500 ? 1 : x < 7000 ? 2 : x < 8500 ? 3 : 4;
const VPEN = Int32Array.from([PROP_PEN, VIOL_PEN]);
function happinessDayB(w, day) {
  const N = w.N, ls = w.ls, setPt = w.setPt, habit = w.habit, income = w.income, flags = w.flags;
  const missed7 = w.missed7, cell = w.cell, settle = w.settle, fear = w.fear, lmed = w.lmed, shared = w.shared;
  const victimDay = w.victimDay, victimKind = w.victimKind, reempDay = w.reempDay;
  const hist = w.hist, bands = w.bands, sum = w.sum, cnt = w.cnt;
  for (let i = 0; i < N; i++) {
    const s = settle[i];
    const L = log2Q16(income[i] + 1);
    let dRel = L - lmed[s];
    dRel = dRel > 262144 ? 262144 : dRel; dRel = dRel < -262144 ? -262144 : dRel;
    const h = habit[i];
    let dChg = L - h;
    dChg = dChg > 262144 ? 262144 : dChg; dChg = dChg < -262144 ? -262144 : dChg;
    habit[i] = h + ((L - h) >> HAB_SHIFT);
    const f = flags[i];
    const emp = f & F_EMP, fr = (f & F_FRIEND) >> 1;
    let ds = day - reempDay[i]; ds = ds - ((ds - 2048) & ((2048 - ds) >> 31)); // min(ds, 2048)
    let dv = day - victimDay[i]; dv = dv - ((dv - 1024) & ((1024 - dv) >> 31)); // min(dv, 1024)
    let fp = FOOD_PEN * missed7[i]; fp = fp < FOOD_CAP ? FOOD_CAP : fp;
    let t = setPt[i] + ((dRel * B_REL) >> 16) + ((dChg * B_CHG) >> 16) + shared[s]
      + (1 - emp) * U_PEN + emp * ((SCAR_PEN * SCAR_Z[ds]) >> 15)
      + (1 - fr) * ISO_PEN + fp
      + ((VPEN[victimKind[i]] * VIC_Z[dv]) >> 15)
      + ((FEAR_W * fear[cell[i]]) >> 8);
    t = t < 0 ? 0 : t; t = t > 10000 ? 10000 : t;
    let x = ls[i];
    x += ((t - x) * K_Q16) >> 16;
    ls[i] = x;
    sum[s] += x; cnt[s]++;
    bands[s * NB + BAND_X[x]]++;
    hist[(s << 9) + (L >> 12)]++;
  }
}

// After the pass: commit settlement aggregates (median log income from the histogram, O(bins)).
function commitDay(w) {
  for (let s = 0; s < w.S; s++) {
    const base = s << 9, half = w.cnt[s] >> 1;
    let acc = 0, k = 0;
    for (; k < 512; k++) { acc += w.hist[base + k]; if (acc > half) break; }
    w.lmed[s] = (k << 12) + 2048;
    for (let k2 = 0; k2 < 512; k2++) w.hist[base + k2] = 0;
    for (let b = 0; b < NB; b++) w.bands[s * NB + b] = 0;
    w.sum[s] = 0; w.cnt[s] = 0;
  }
}

// Daily exogenous churn so the branches are exercised (job loss/gain, victimisation, meals).
function churn(w, seed, day) {
  const n = w.N >> 8; // ~0.4% of agents touched per day
  for (let j = 0; j < n; j++) {
    const i = draw(seed, j, day, 11) % w.N;
    const r = draw(seed, i, day, 12);
    if ((r & 7) === 0) { w.flags[i] ^= F_EMP; if (w.flags[i] & F_EMP) w.reempDay[i] = day; }
    else if ((r & 7) === 1) { w.victimDay[i] = day; w.victimKind[i] = (r >>> 3) & 1; }
    else if ((r & 7) === 2) { w.missed7[i] = (r >>> 4) % 4; }
    else if ((r & 7) === 3) { w.income[i] = Math.floor(w.income[i] * (96 + ((r >>> 4) & 7)) / 100); }
  }
}

function hashLs(w) {
  let h = 0x811c9dc5;
  const b = new Uint8Array(w.ls.buffer);
  for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

function median(a) { const s = Float64Array.from(a).sort(); return s[s.length >> 1]; }

// ---------- settlement-ledger happiness block (aggregate tier, no agents) ----------
// State per settlement: mean (milli-ladder), habit of log median income, 5 band counts, population.
// Band shares come from a LUT of a normal distribution (sd 1.9 ladder) indexed by mean in 0.05 steps,
// mixed for employed and unemployed sub-populations, then apportioned exactly (largest remainder).
function buildBandLut() { // build-time: erf via series is fine here (tooling); per-day code only reads it
  const cuts = [4.0, 5.5, 7.0, 8.5];
  const lut = new Int32Array(201 * NB);
  const cdf = (z) => { // Abramowitz-Stegun 7.1.26 (build time only)
    const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2);
    return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
  };
  for (let m = 0; m <= 200; m++) {
    const mu = m * 0.05;
    let prev = 0, tot = 0;
    for (let b = 0; b < NB - 1; b++) {
      const c = cdf((cuts[b] - mu) / 1.9);
      lut[m * NB + b] = Math.round((c - prev) * 32768);
      tot += lut[m * NB + b];
      prev = c;
    }
    lut[m * NB + NB - 1] = 32768 - tot; // rows sum to exactly 32768
  }
  return lut;
}
const BAND_LUT = buildBandLut();

function makeLedger(S, seed) {
  return {
    S, pop: Int32Array.from({ length: S }, (_, s) => 200 + (draw(seed, s, 0, 21) % 20000)),
    unemp: new Int32Array(S), base: new Int32Array(S), mean: new Int32Array(S), meanU: new Int32Array(S),
    lmed: new Int32Array(S), habit: new Int32Array(S), inflBp: new Int32Array(S), crimeQ8: new Int32Array(S),
    foodBp: new Int32Array(S), bands: new Int32Array(S * NB), rem: new Int32Array(NB),
  };
}
function initLedger(L, seed) {
  for (let s = 0; s < L.S; s++) {
    L.unemp[s] = Math.floor(L.pop[s] * (3 + (draw(seed, s, 0, 22) % 6)) / 100);
    L.base[s] = 6800 + (draw(seed, s, 0, 23) % 600); L.mean[s] = L.base[s];
    L.lmed[s] = log2Q16(16000); L.habit[s] = L.lmed[s]; L.inflBp[s] = 250; L.crimeQ8[s] = 20; L.foodBp[s] = 800;
  }
}
function ledgerHappinessDay(L, seed, day) {
  const S = L.S, rem = L.rem;
  for (let s = 0; s < S; s++) {
    // exogenous daily wiggle of the median income so the habit term moves
    const r = draw(seed, s, day, 24);
    L.lmed[s] += ((r & 255) - 128) * 8;
    const pop = L.pop[s], u = L.unemp[s];
    const uBp = Math.floor(u * 10000 / pop);
    let dChg = L.lmed[s] - L.habit[s];
    if (dChg > 262144) dChg = 262144; else if (dChg < -262144) dChg = -262144;
    L.habit[s] += (L.lmed[s] - L.habit[s]) >> HAB_SHIFT;
    // settlement target for the employed; unemployed add U_PEN. Food and fear terms use shares.
    const common = L.base[s] + ((dChg * B_CHG) >> 16) + Math.floor((-20 * uBp - 7 * L.inflBp[s]) / 100)
      + Math.floor(FOOD_PEN * 2 * L.foodBp[s] / 10000) + ((FEAR_W * L.crimeQ8[s]) >> 8);
    let me = L.mean[s]; me += ((common - me) * K_Q16) >> 16; L.mean[s] = me;
    let mu = L.meanU[s]; mu += ((common + U_PEN - mu) * K_Q16) >> 16; L.meanU[s] = mu;
    let ie = Math.floor(me / 50), iu = Math.floor(mu / 50);
    if (ie < 0) ie = 0; else if (ie > 200) ie = 200;
    if (iu < 0) iu = 0; else if (iu > 200) iu = 200;
    // exact apportionment of pop into 5 bands: employed by LUT(ie), unemployed by LUT(iu)
    const e = pop - u;
    let given = 0;
    for (let b = 0; b < NB; b++) {
      const q = e * BAND_LUT[ie * NB + b] + u * BAND_LUT[iu * NB + b]; // < 2^31 for pop < 32768
      const c = q >> 15;
      L.bands[s * NB + b] = c; rem[b] = q & 32767; given += c;
    }
    for (let left = pop - given; left > 0; left--) { // largest remainder, ties by index
      let best = 0;
      for (let b = 1; b < NB; b++) if (rem[b] > rem[best]) best = b;
      L.bands[s * NB + best]++; rem[best] = -1;
    }
  }
}

// ---------- benchmark driver ----------
let gcCount = 0;
const obs = new PerformanceObserver((list) => { gcCount += list.getEntries().length; });
obs.observe({ entryTypes: ['gc'] });

function benchAgents(N, S, warm, samples, daysPerSample, kern) {
  const seed = 42;
  const w = makeWorld(N, S, seed);
  let day = 0;
  for (; day < warm; day++) { churn(w, seed, day); settlementShared(w); kern(w, day); commitDay(w); }
  const per = [];
  const gc0 = gcCount;
  for (let k = 0; k < samples; k++) {
    let acc = 0;
    for (let d = 0; d < daysPerSample; d++, day++) {
      churn(w, seed, day);
      const t0 = performance.now();
      settlementShared(w); kern(w, day); commitDay(w);
      acc += performance.now() - t0;
    }
    per.push(acc / daysPerSample);
  }
  return { N, S, med: median(per), min: Math.min(...per), max: Math.max(...per), gc: gcCount - gc0, hash: hashLs(w) };
}

function benchLedger(S, warm, samples, daysPerSample) {
  const seed = 7;
  const L = makeLedger(S, seed); initLedger(L, seed);
  let day = 0;
  for (; day < warm; day++) ledgerHappinessDay(L, seed, day);
  const per = [];
  const gc0 = gcCount;
  for (let k = 0; k < samples; k++) {
    const t0 = performance.now();
    for (let d = 0; d < daysPerSample; d++, day++) ledgerHappinessDay(L, seed, day);
    per.push((performance.now() - t0) / daysPerSample);
  }
  // invariant: bands sum to population in every settlement
  let ok = true;
  for (let s = 0; s < S; s++) { let t = 0; for (let b = 0; b < NB; b++) t += L.bands[s * NB + b]; if (t !== L.pop[s]) ok = false; }
  return { S, med: median(per), min: Math.min(...per), max: Math.max(...per), gc: gcCount - gc0, bandsSumToPop: ok };
}

// Order-independence check: process agents in a keyed shuffled order, compare the hash with in-order.
function orderCheck(N) {
  const seed = 42, w1 = makeWorld(N, 4, seed), w2 = makeWorld(N, 4, seed);
  for (let day = 0; day < 60; day++) {
    churn(w1, seed, day); settlementShared(w1); happinessDay(w1, day); commitDay(w1);
    churn(w2, seed, day); settlementShared(w2);
    // shuffled: permute arrays into a new order, run, permute back (setup-only allocation; not timed)
    const perm = Int32Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) { const j = draw(seed, i, day, 31) % (i + 1); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    const keys = ['ls', 'setPt', 'habit', 'income', 'flags', 'missed7', 'cell', 'settle', 'victimDay', 'victimKind', 'reempDay'];
    const saved = {};
    for (const k of keys) { const a = w2[k], b = new a.constructor(N); for (let i = 0; i < N; i++) b[i] = a[perm[i]]; saved[k] = a; w2[k] = b; }
    happinessDay(w2, day);
    for (const k of keys) { const a = w2[k], o = saved[k]; for (let i = 0; i < N; i++) o[perm[i]] = a[i]; w2[k] = o; }
    commitDay(w2);
  }
  return hashLs(w1) === hashLs(w2);
}

const mode = process.argv[2] || 'all';
if (mode === 'all' || mode === 'agents') {
  for (const [N, S] of [[10000, 1], [25000, 1], [100000, 1], [100000, 64]]) {
    const kern = process.argv[3] === 'B' ? happinessDayB : happinessDay;
    const r = benchAgents(N, S, 200, 9, 50, kern);
    console.log(JSON.stringify({ kind: 'agents', kernel: process.argv[3] === 'B' ? 'branchless' : 'branchy', ...r, nsPerAgent: +(r.med * 1e6 / N).toFixed(2) }));
  }
}
if (mode === 'all' || mode === 'ledger') {
  for (const S of [1000, 10000]) {
    const r = benchLedger(S, 200, 9, 50);
    console.log(JSON.stringify({ kind: 'ledger', ...r, nsPerSettlementDay: +(r.med * 1e6 / S).toFixed(1) }));
  }
}
if (mode === 'all' || mode === 'order') {
  console.log(JSON.stringify({ kind: 'order-independent', ok: orderCheck(20000) }));
}
obs.disconnect();
