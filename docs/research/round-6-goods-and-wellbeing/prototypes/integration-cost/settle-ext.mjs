// Country scale: the settlement-ledger extension for goods, happiness and wealth as an aggregate
// settlement-day (L2), measured on its own for 1k and 10k settlements. Three representations:
//   full-sr    - food stocks by 8 categories x 4 quality bands x 3 age bands, ageing by stochastic rounding;
//   full-carry - the same cells, ageing with a deterministic per-cell remainder instead of draws;
//   lean-sr    - 8 categories x 3 age bands with a mean quality per category.
//   lean-fast  - lean-sr, but one keyed draw per settlement-day and one hash round per rounding decision;
//   ring       - perishables as exact expiry-day rings (8 slots, the same identity as agent food lots, so
//                folding lots into it is exact), long-life goods as one stock each, a mean quality per
//                category, fast draws; age bands for the UI are derived from the ring on demand;
//   flat-carry - floor case: one stock per category with deterministic spoilage carry, fast draws;
//   social-only- just the happiness, wealth and resource part (no goods), to split the cost.
// All variants carry 8 non-food resources, happiness mean + set point + 5 bands, 8 wealth bands
// (households and integer cents), an income reference and the top-10% share.
import os from 'node:os';
import { draw, mix32, log2Q16, fnv } from './det.mjs';

const C = 8, Q = 4, A = 3, R = 8, HB = 5, WB = 8;
const PROD = Int32Array.from([60, 50, 40, 30, 15, 40, 50, 20]);        // portions per 100 people a day, by category
const EAT = Int32Array.from([62, 50, 38, 28, 14, 40, 48, 18]);
const Q_SHARE = Int32Array.from([20, 40, 28, 12]);                     // % of production by quality band
const AGE_Q16 = new Int32Array(C * A);                                 // share moving to the next band (or spoiling) a day
const SHELF = [3, 6, 8, 4, 2, 7, 180, 365];
for (let c = 0; c < C; c++) for (let a = 0; a < A; a++) AGE_Q16[c * A + a] = Math.min(65535, Math.floor(65536 * 3 / SHELF[c] / (a === 2 ? 2 : 1)));
const RES_NET = Int32Array.from([3, -2, 1, 0, -1, 2, 1, -1]);
const RATE_DIV = 10000;

const PERISH = 6, SLOTS = 8;  // categories 0-5 have shelf lives <= 8 days; 6 and 7 are long-life

function layout(S, variant) {
  const lean = variant === 'lean-sr' || variant === 'lean-fast';
  const flat = variant === 'flat-carry' || variant === 'social-only';
  const cells = variant === 'ring' ? PERISH * SLOTS + (C - PERISH) : lean ? C * A : flat ? C : C * Q * A;
  const f = {
    pop: new Int32Array(S), incomePC: new Float64Array(S),
    stock: new Int32Array(S * cells), carry: variant === 'full-carry' || flat ? new Uint16Array(S * cells) : null,
    meanQ: lean || variant === 'ring' ? new Int32Array(S * C) : null,
    waste: new Int32Array(S * C), eaten: new Int32Array(S * C), short: new Int32Array(S * C), res: new Int32Array(S * R),
    hMean: new Int32Array(S), hSet: new Int32Array(S), hBand: new Int32Array(S * HB),
    wCount: new Int32Array(S * WB), wCents: new Float64Array(S * WB), incRef: new Int32Array(S), top10: new Int32Array(S),
  };
  const ext = ['stock', 'carry', 'meanQ', 'waste', 'eaten', 'short', 'res', 'hMean', 'hSet', 'hBand', 'wCount', 'wCents', 'incRef', 'top10'];
  let numbers = 0, bytes = 0;
  for (const k of ext) if (f[k]) { numbers += f[k].length / S; bytes += f[k].byteLength / S; }
  return { f, cells, numbersPerSettlement: numbers, bytesPerSettlement: bytes };
}

function init(S, L, seed) {
  const { f, cells } = L;
  for (let s = 0; s < S; s++) {
    const p = 200 + (draw(seed, s, 0, 1) % 20000);
    f.pop[s] = p; f.incomePC[s] = 8000 + (draw(seed, s, 0, 2) % 12000);
    for (let k = 0; k < cells; k++) f.stock[s * cells + k] = (p * 3) >> 2;
    if (f.meanQ) for (let c = 0; c < C; c++) f.meanQ[s * C + c] = 1 << 8;
    f.hMean[s] = 0; f.hSet[s] = 13107; for (let b = 0; b < HB; b++) f.hBand[s * HB + b] = (p / HB) | 0;
    for (let b = 0; b < WB; b++) { const n = (p / WB) | 0; f.wCount[s * WB + b] = n; f.wCents[s * WB + b] = n * 10000 * (1 << (2 * b)); }
    for (let r = 0; r < R; r++) f.res[s * R + r] = p;
    f.incRef[s] = log2Q16(f.incomePC[s]);
  }
}

// x * rate / 65536 rounded stochastically (exact: x < 2^31, rate < 2^16). The random 16 bits come
// from the full keyed draw, or (fast) from one hash round over a per-settlement-day key.
let fastKey = -1;
function srQ16(x, rate, seed, s, day, stream) {
  const v = x * rate, whole = Math.floor(v / 65536), frac = v - whole * 65536;
  const bits = fastKey >= 0 ? mix32(fastKey ^ Math.imul(stream + 1, 0x9e3779b9)) : draw(seed, s, day, stream);
  return (bits & 0xffff) < frac ? whole + 1 : whole;
}

function socialSide(f, s, day, seed, shortTotal, pop) {
  // happiness: log income vs the reference, food shortfall, decay toward the set point; band shifts
  const L = log2Q16(f.incomePC[s] + 1);
  let dI = L - f.incRef[s];
  if (dI > 262144) dI = 262144; else if (dI < -262144) dI = -262144;
  const shortQ16 = pop > 0 ? Math.floor(shortTotal * 65536 / (pop * 3)) : 0;
  const m = f.hMean[s];
  const drive = ((dI * 8) >> 8) - (shortQ16 >> 3);
  f.hMean[s] = m + (((f.hSet[s] - m) * 26) >> 8) + drive;
  f.incRef[s] = (f.incRef[s] * 7 + L) >> 3;
  const hb = s * HB, up = drive > 0 ? Math.min(65535, drive * 4) : 0, dn = drive < 0 ? Math.min(65535, -drive * 4) : 0;
  for (let b = 0; b < HB; b++) {
    const n = f.hBand[hb + b];
    if (up > 0 && b < HB - 1) { const mv = srQ16(n, up, seed, s, day, 200 + b); f.hBand[hb + b] -= mv; f.hBand[hb + b + 1] += mv; }
    else if (dn > 0 && b > 0) { const mv = srQ16(n, dn, seed, s, day, 210 + b); f.hBand[hb + b] -= mv; f.hBand[hb + b - 1] += mv; }
  }
  // wealth bands: interest (exact division), up/down mobility with cents moved pro rata (exact floor)
  const wb = s * WB;
  let total = 0, topC = 0;
  for (let b = WB - 1; b >= 0; b--) {
    const k = wb + b, n = f.wCount[k];
    let cents = f.wCents[k];
    cents += Math.floor(cents / RATE_DIV);
    if (n > 0 && b < WB - 1) {
      const mv = srQ16(n, 655, seed, s, day, 220 + b);
      if (mv > 0) { const cm = Math.floor(cents * mv / n); cents -= cm; f.wCount[k] = n - mv; f.wCount[k + 1] += mv; f.wCents[k + 1] += cm; }
    }
    f.wCents[k] = cents;
    total += cents; if (b >= WB - 2) topC += cents;
  }
  f.top10[s] = total > 0 ? Math.floor(topC / total * 65536) : 0;
  for (let r = 0; r < R; r++) { const v = f.res[s * R + r] + ((pop * RES_NET[r]) >> 6); f.res[s * R + r] = v < 0 ? 0 : v; }
}

function dayFull(S, L, day, seed, useCarry) {
  const { f, cells } = L;
  const stock = f.stock, carry = f.carry;
  for (let s = 0; s < S; s++) {
    const pop = f.pop[s], base = s * cells;
    let shortTotal = 0;
    for (let c = 0; c < C; c++) {
      const cb = base + c * Q * A;
      const prod = Math.floor(pop * PROD[c] / 100);
      for (let q = 0; q < Q; q++) stock[cb + q * A] += Math.floor(prod * Q_SHARE[q] / 100);
      let wasted = 0;
      for (let q = 0; q < Q; q++) {
        for (let a = A - 1; a >= 0; a--) {
          const k = cb + q * A + a, x = stock[k];
          if (x === 0) continue;
          const rate = AGE_Q16[c * A + a];
          let mv;
          if (useCarry) { const v = x * rate + carry[k]; mv = Math.floor(v / 65536); carry[k] = v - mv * 65536; }
          else mv = srQ16(x, rate, seed, s, day, k - base);
          stock[k] = x - mv;
          if (a === A - 1) wasted += mv; else stock[k + 1] += mv;
        }
      }
      f.waste[s * C + c] = wasted;
      let need = Math.floor(pop * EAT[c] / 100), got = 0;
      for (let a = A - 1; a >= 0 && need > 0; a--) for (let q = Q - 1; q >= 0 && need > 0; q--) {
        const k = cb + q * A + a, x = stock[k], take = x < need ? x : need;
        stock[k] = x - take; need -= take; got += take;
      }
      f.eaten[s * C + c] = got; f.short[s * C + c] = need; shortTotal += need;
    }
    socialSide(f, s, day, seed, shortTotal, pop);
  }
}

function dayRing(S, L, day, seed) {
  const { f, cells } = L;
  const stock = f.stock, meanQ = f.meanQ;
  const today = day & 7;
  for (let s = 0; s < S; s++) {
    const pop = f.pop[s], base = s * cells;
    fastKey = draw(seed, s, day, 0);
    let shortTotal = 0;
    for (let c = 0; c < C; c++) {
      const prod = Math.floor(pop * PROD[c] / 100);
      let need = Math.floor(pop * EAT[c] / 100), got = 0, wasted = 0, old = 0;
      if (c < PERISH) {
        const rb = base + c * SLOTS;
        wasted = stock[rb + today]; stock[rb + today] = 0;
        for (let k = 1; k <= SHELF[c]; k++) old += stock[rb + ((day + k) & 7)];
        stock[rb + ((day + SHELF[c]) & 7)] += prod;
        for (let k = 1; k <= SHELF[c] && need > 0; k++) {
          const i = rb + ((day + k) & 7), x = stock[i], take = x < need ? x : need;
          stock[i] = x - take; need -= take; got += take;
        }
      } else {
        const i = base + PERISH * SLOTS + (c - PERISH);
        old = stock[i];
        const x = old + prod;
        wasted = srQ16(x, Math.floor(65536 / SHELF[c]), seed, s, day, 100 + c);
        const left = x - wasted, take = left < need ? left : need;
        stock[i] = left - take; need -= take; got = take;
      }
      if (old + prod > 0) meanQ[s * C + c] = Math.floor((meanQ[s * C + c] * old + 384 * prod) / (old + prod));
      f.waste[s * C + c] = wasted; f.eaten[s * C + c] = got; f.short[s * C + c] = need; shortTotal += need;
    }
    socialSide(f, s, day, seed, shortTotal, pop);
  }
  fastKey = -1;
}

function dayLean(S, L, day, seed, fast) {
  const { f, cells } = L;
  const stock = f.stock, meanQ = f.meanQ;
  for (let s = 0; s < S; s++) {
    const pop = f.pop[s], base = s * cells;
    fastKey = fast ? draw(seed, s, day, 0) : -1;
    let shortTotal = 0;
    for (let c = 0; c < C; c++) {
      const cb = base + c * A;
      const prod = Math.floor(pop * PROD[c] / 100);
      const old = stock[cb] + stock[cb + 1] + stock[cb + 2];
      if (old + prod > 0) meanQ[s * C + c] = Math.floor((meanQ[s * C + c] * old + 384 * prod) / (old + prod));
      stock[cb] += prod;
      let wasted = 0;
      for (let a = A - 1; a >= 0; a--) {
        const k = cb + a, x = stock[k];
        if (x === 0) continue;
        const mv = srQ16(x, AGE_Q16[c * A + a], seed, s, day, k - base);
        stock[k] = x - mv;
        if (a === A - 1) wasted += mv; else stock[k + 1] += mv;
      }
      f.waste[s * C + c] = wasted;
      let need = Math.floor(pop * EAT[c] / 100), got = 0;
      for (let a = A - 1; a >= 0 && need > 0; a--) { const k = cb + a, x = stock[k], take = x < need ? x : need; stock[k] = x - take; need -= take; got += take; }
      f.eaten[s * C + c] = got; f.short[s * C + c] = need; shortTotal += need;
    }
    socialSide(f, s, day, seed, shortTotal, pop);
  }
  fastKey = -1;
}

function measure(fn, { minSampleMs = 25, samples = 9, warmupMs = 250, minWarm = 5 } = {}) {
  let calls = 0; const t0 = performance.now();
  while (calls < minWarm || performance.now() - t0 < warmupMs) { fn(); calls++; }
  const per = (performance.now() - t0) / calls;
  const reps = Math.max(1, Math.ceil(minSampleMs / Math.max(per, 1e-4)));
  const res = [];
  for (let s = 0; s < samples; s++) { const a = performance.now(); for (let r = 0; r < reps; r++) fn(); res.push((performance.now() - a) / reps); }
  res.sort((x, y) => x - y);
  return { med: res[res.length >> 1], min: res[0], max: res[res.length - 1], reps, n: samples, warmCalls: calls };
}

// Floor case: one stock per category, spoilage as a fixed daily share with a deterministic remainder.
function dayFlat(S, L, day, seed) {
  const { f, cells } = L;
  const stock = f.stock, carry = f.carry;
  for (let s = 0; s < S; s++) {
    const pop = f.pop[s], base = s * cells;
    fastKey = draw(seed, s, day, 0);
    let shortTotal = 0;
    for (let c = 0; c < C; c++) {
      const k = base + c, x = stock[k] + Math.floor(pop * PROD[c] / 100);
      const v = x * AGE_Q16[c * A + 2] + carry[k], mv = Math.floor(v / 65536);
      carry[k] = v - mv * 65536;
      const left = x - mv;
      let need = Math.floor(pop * EAT[c] / 100);
      const take = left < need ? left : need;
      stock[k] = left - take; need -= take;
      f.waste[s * C + c] = mv; f.eaten[s * C + c] = take; f.short[s * C + c] = need; shortTotal += need;
    }
    socialSide(f, s, day, seed, shortTotal, pop);
  }
  fastKey = -1;
}

function daySocialOnly(S, L, day, seed) {
  for (let s = 0; s < S; s++) { fastKey = draw(seed, s, day, 0); socialSide(L.f, s, day, seed, 0, L.f.pop[s]); }
  fastKey = -1;
}

const run = (variant, S, L, day, seed) => {
  if (variant === 'ring') dayRing(S, L, day, seed);
  else if (variant === 'flat-carry') dayFlat(S, L, day, seed);
  else if (variant === 'social-only') daySocialOnly(S, L, day, seed);
  else if (variant === 'lean-sr' || variant === 'lean-fast') dayLean(S, L, day, seed, variant === 'lean-fast');
  else dayFull(S, L, day, seed, variant === 'full-carry');
};
const hashOf = (L) => { let h = 0x811c9dc5; for (const k of ['stock', 'waste', 'eaten', 'hMean', 'hBand', 'wCount', 'wCents', 'top10', 'res']) h = fnv(h, L.f[k]); return h.toString(16); };

const out = { env: { node: process.version, v8: process.versions.v8, cpu: os.cpus()[0].model.trim(), loadavg: os.loadavg() }, rows: [] };
for (const variant of ['full-sr', 'full-carry', 'lean-sr', 'lean-fast', 'ring', 'flat-carry', 'social-only']) {
  for (const S of [1000, 10000]) {
    const L = layout(S, variant); init(S, L, 7);
    let day = 1;
    const m = measure(() => run(variant, S, L, day++, 7));
    const a = layout(S, variant), b = layout(S, variant); init(S, a, 7); init(S, b, 7);
    for (let d = 1; d <= 365; d++) { run(variant, S, a, d, 7); run(variant, S, b, d, 7); }
    let pop = 0, shortT = 0, eatT = 0; for (let s = 0; s < S; s++) pop += a.f.pop[s];
    for (let k = 0; k < a.f.short.length; k++) { shortT += a.f.short[k]; eatT += a.f.eaten[k]; }
    out.rows.push({ variant, S, numbersPerSettlement: L.numbersPerSettlement, bytesPerSettlement: L.bytesPerSettlement, msPerDay: m, usPerSettlement: { med: m.med * 1000 / S, min: m.min * 1000 / S, max: m.max * 1000 / S }, year: { hashA: hashOf(a), hashB: hashOf(b), identical: hashOf(a) === hashOf(b), shortShare: shortT / (shortT + eatT) } });
  }
}
console.log('RESULT ' + JSON.stringify(out));
