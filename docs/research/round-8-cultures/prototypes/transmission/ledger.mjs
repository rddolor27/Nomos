// Settlement-ledger culture block (throwaway research code, round 8).
// Each settlement stores 2K Int32 counts: people by primary culture, and how many of those are "mixed"
// (hold at least one custom from another culture). Cultural regions are seeded from K hearths by
// multi-source shortest paths on a k-nearest-neighbour route graph; yearly migration (gravity over
// <= 24 neighbours, plan-then-apply), births with homogamy and conformist oblique learning, mixing and
// identity switching. All rounding is exact largest-remainder apportionment with keyed tie-breaks.
import { gzipSync } from 'node:zlib';
import { draw, machine, cpuBusy, stats, fmt, save, parseArgs, hashArrays } from './lib.mjs';

const A = parseArgs(process.argv, {
  S: 1000, K: 8, years: 100, seed: 7, variant: 'acculturate', mig: 0.045, longShare: 0.2, warm: 5, out: '', nn: 8,
});
const PRESETS = {
  // conformity a, vertical substitution, mixing hazard, switching hazard, homophily eta
  migrationOnly: { a: 0.0, sub: 0, hmix: 0.0, sw: 0.0, eta: 0.0 },
  neutral:       { a: 0.0, sub: 0, hmix: 0.05, sw: 0.0, eta: 0.4 },
  acculturate:   { a: 0.3, sub: 1, hmix: 0.05, sw: 0.1, eta: 0.4 },
  strong:        { a: 0.6, sub: 1, hmix: 0.05, sw: 0.2, eta: 0.4 },
};
const V = { ...PRESETS[A.variant] };
for (const k of Object.keys(V)) if (A[k] !== undefined) V[k] = Number(A[k]);
const S = A.S, K = A.K, SEED = A.seed >>> 0, NN = A.nn, MAXE = 24;

// ---- settlements: positions, Zipf sizes with a 200-person floor ----
const x = new Float64Array(S), y = new Float64Array(S), pop = new Int32Array(S);
let Htot = 0; for (let r = 1; r <= S; r++) Htot += 1 / r;
const TOTAL = 1200 * S; // 1.2 million people per 1,000 settlements
for (let s = 0; s < S; s++) {
  x[s] = draw(SEED, s, 0, 1) / 4294967296; y[s] = draw(SEED, s, 0, 2) / 4294967296;
  pop[s] = Math.max(200, Math.floor(TOTAL / Htot / (s + 1)));
}
// k-nearest-neighbour graph (brute force at setup), symmetrised, capped at 24 edges
const nbr = new Int32Array(S * MAXE).fill(-1), deg = new Int32Array(S), wdist = new Float64Array(S * MAXE);
function addEdge(a, b, dd) {
  for (let e = 0; e < deg[a]; e++) if (nbr[a * MAXE + e] === b) return;
  if (deg[a] >= MAXE) return;
  nbr[a * MAXE + deg[a]] = b; wdist[a * MAXE + deg[a]] = dd; deg[a]++;
}
{
  const best = new Float64Array(NN), bi = new Int32Array(NN);
  for (let a = 0; a < S; a++) {
    best.fill(Infinity); bi.fill(-1);
    for (let b = 0; b < S; b++) {
      if (b === a) continue;
      const dx = x[a] - x[b], dy = y[a] - y[b], d2 = dx * dx + dy * dy;
      if (d2 >= best[NN - 1]) continue;
      let j = NN - 1; while (j > 0 && best[j - 1] > d2) { best[j] = best[j - 1]; bi[j] = bi[j - 1]; j--; }
      best[j] = d2; bi[j] = b;
    }
    for (let j = 0; j < NN; j++) if (bi[j] >= 0) { const dd = Math.sqrt(best[j]); addEdge(a, bi[j], dd); addEdge(bi[j], a, dd); }
  }
}

// ---- hearths by farthest-point sampling, shortest-path cost from each (setup only) ----
const hearth = new Int32Array(K);
{
  const md = new Float64Array(S).fill(Infinity);
  hearth[0] = draw(SEED, 0, 0, 3) % S;
  for (let c = 1; c < K; c++) {
    const h = hearth[c - 1];
    for (let s = 0; s < S; s++) { const dx = x[s] - x[h], dy = y[s] - y[h]; md[s] = Math.min(md[s], dx * dx + dy * dy); }
    let bj = 0; for (let s = 1; s < S; s++) if (md[s] > md[bj]) bj = s;
    hearth[c] = bj;
  }
}
const cost = new Float64Array(K * S);
{
  const done = new Uint8Array(S);
  for (let c = 0; c < K; c++) {
    const base = c * S; cost.fill(Infinity, base, base + S); done.fill(0);
    cost[base + hearth[c]] = 0;
    for (let it = 0; it < S; it++) { // O(S^2) Dijkstra is fine at setup for a prototype
      let u = -1, bu = Infinity;
      for (let s = 0; s < S; s++) if (!done[s] && cost[base + s] < bu) { bu = cost[base + s]; u = s; }
      if (u < 0) break;
      done[u] = 1;
      for (let e = 0; e < deg[u]; e++) { const v = nbr[u * MAXE + e], nd = bu + wdist[u * MAXE + e]; if (nd < cost[base + v]) cost[base + v] = nd; }
    }
  }
}

// ---- culture block: 2K Int32 per settlement ----
const n = new Int32Array(S * K), mx = new Int32Array(S * K);
const dom0 = new Uint8Array(S);
for (let s = 0; s < S; s++) {
  let c1 = 0, c2 = 1;
  for (let c = 0; c < K; c++) if (cost[c * S + s] < cost[c1 * S + s]) c1 = c;
  c2 = c1 === 0 ? 1 : 0;
  for (let c = 0; c < K; c++) if (c !== c1 && cost[c * S + s] < cost[c2 * S + s]) c2 = c;
  const r = cost[c2 * S + s] > 0 ? cost[c1 * S + s] / cost[c2 * S + s] : 1;
  const share1 = 1 - 0.5 * r * r; // frontier towns mix; hearth towns are near-uniform
  const a1 = Math.round(pop[s] * share1);
  n[s * K + c1] = a1; n[s * K + c2] = pop[s] - a1; dom0[s] = c1;
}

// ---- exact apportionment: split `total` over K weights (doubles holding integers) ----
const wts = new Float64Array(Math.max(K, MAXE)), outv = new Int32Array(Math.max(K, MAXE)), rem = new Float64Array(Math.max(K, MAXE));
function apportion(total, m, key) {
  // systematic rounding with a keyed offset: exact total, unbiased per entry, O(m)
  let W = 0; for (let j = 0; j < m; j++) W += wts[j];
  if (W <= 0 || total <= 0) { for (let j = 0; j < m; j++) outv[j] = 0; return; }
  let acc = draw(SEED, key, 0, 77) / 4294967296, used = 0;
  for (let j = 0; j < m; j++) {
    const qq = (total * wts[j]) / W, f = Math.floor(qq);
    outv[j] = f; acc += qq - f;
    if (acc >= 1) { outv[j]++; acc -= 1; }
    used += outv[j];
  }
  fixTotal(outv, m, total - used);
}
function fixTotal(arr, m, diff) { // float residue can leave the total off by one; repair on the largest entry
  while (diff !== 0) {
    let bj = 0; for (let j = 1; j < m; j++) if (arr[j] > arr[bj]) bj = j;
    if (diff > 0) { arr[bj]++; diff--; } else { arr[bj]--; diff++; }
  }
}
// stochastic rounding of an expected count with a keyed draw
const sround = (xv, key, st) => { const f = Math.floor(xv); return f + ((draw(SEED, key, st, 99) / 4294967296) < xv - f ? 1 : 0); };

// ---- yearly step ----
const nn2 = new Int32Array(S * K), mm2 = new Int32Array(S * K); // plan buffers
const q = new Float64Array(K), o = new Float64Array(K), births = new Float64Array(K);
const A16 = V.a;
function stepYear(yr) {
  nn2.set(n); mm2.set(mx);
  // migration, planned from the start-of-year snapshot
  poolC.fill(0);
  let popT = 0; for (let s = 0; s < S; s++) popT += pop[s];
  for (let s = 0; s < S; s++) {
    const outAll = Math.floor(pop[s] * A.mig);
    const longOut = Math.floor(outAll * A.longShare);
    if (longOut > 0) {
      for (let c = 0; c < K; c++) wts[c] = n[s * K + c];
      apportion(longOut, K, s * 131 + yr + 0x5000);
      for (let c = 0; c < K; c++) { nn2[s * K + c] -= outv[c]; poolC[c] += outv[c]; const mm = Math.floor((outv[c] * mx[s * K + c]) / Math.max(1, n[s * K + c])); mm2[s * K + c] -= mm; poolM[c] += mm; }
    }
    const out = outAll - longOut;
    if (out <= 0 || deg[s] === 0) continue;
    // split the outflow by culture first (never more movers than members), then each part by gravity
    for (let c = 0; c < K; c++) wts[c] = n[s * K + c];
    apportion(out, K, s * 131 + yr);
    for (let c = 0; c < K; c++) flowTmp[c] = outv[c];
    for (let c = 0; c < K; c++) {
      const oc = flowTmp[c]; if (oc <= 0) continue;
      const mixOut = Math.floor((oc * mx[s * K + c]) / Math.max(1, n[s * K + c]));
      for (let e = 0; e < deg[s]; e++) { const t = nbr[s * MAXE + e], dd = wdist[s * MAXE + e]; wts[e] = pop[t] / (dd * dd); }
      apportion(oc, deg[s], (s * 131 + yr) * 32 + c);
      let mixLeft = mixOut;
      for (let e = 0; e < deg[s]; e++) {
        const mvd = outv[e]; if (!mvd) continue;
        const t = nbr[s * MAXE + e];
        const mm = Math.min(mixLeft, Math.floor((mvd * mixOut) / oc)); mixLeft -= mm;
        nn2[s * K + c] -= mvd; nn2[t * K + c] += mvd;
        mm2[s * K + c] -= mm; mm2[t * K + c] += mm;
      }
    }
  }
  // the national pool lands by destination population share (exact, per culture)
  for (let c = 0; c < K; c++) {
    if (poolC[c] <= 0) continue;
    for (let t = 0; t < S; t++) wtsS[t] = pop[t] * Math.sqrt(pop[t]); // long-distance movers favour big places (pop^1.5)
    apportionS(poolC[c], yr * 64 + c);
    let ml = poolM[c];
    for (let t = 0; t < S; t++) { const v = outS[t]; if (!v) continue; nn2[t * K + c] += v; const mm = Math.min(ml, Math.floor((v * poolM[c]) / poolC[c])); ml -= mm; mm2[t * K + c] += mm; }
    poolM[c] = 0;
  }
  n.set(nn2); mx.set(mm2);
  // births, deaths, mixing, switching, per settlement
  for (let s = 0; s < S; s++) {
    let P = 0; for (let c = 0; c < K; c++) P += n[s * K + c];
    pop[s] = P;
    if (P <= 0) continue;
    let s2 = 0;
    for (let c = 0; c < K; c++) { q[c] = n[s * K + c] / P; s2 += q[c] * q[c]; }
    for (let c = 0; c < K; c++) o[c] = (1 - A16) * q[c] + (A16 * q[c] * q[c]) / s2; // conformist oblique
    const B = Math.floor(P / 40);
    // deaths proportional to group size
    for (let c = 0; c < K; c++) wts[c] = n[s * K + c];
    apportion(B, K, s * 7919 + yr * 3 + 1);
    for (let c = 0; c < K; c++) {
      const dth = outv[c];
      const md = Math.floor((dth * mx[s * K + c]) / Math.max(1, n[s * K + c]));
      n[s * K + c] -= dth; mx[s * K + c] -= md;
    }
    // expected births by child culture (mean-field of the agent model)
    births.fill(0);
    let mixedBirths = 0;
    for (let c = 0; c < K; c++) {
      if (q[c] <= 0) continue;
      const pcc = V.eta + (1 - V.eta) * q[c];
      const tau = V.sub ? 0.5 + 0.4 * (1 - q[c]) : 0.9;
      const hom = q[c] * pcc, het = q[c] * (1 - pcc);
      births[c] += hom * tau;
      for (let j = 0; j < K; j++) births[j] += hom * (1 - tau) * o[j];
      if (het > 0) {
        const rest = 1 - q[c];
        births[c] += het * 0.3;
        for (let d = 0; d < K; d++) if (d !== c && rest > 0) births[d] += het * 0.3 * (q[d] / rest);
        for (let j = 0; j < K; j++) births[j] += het * 0.4 * o[j];
        mixedBirths += het;
      }
    }
    for (let c = 0; c < K; c++) wts[c] = births[c];
    apportion(B, K, s * 7919 + yr * 3 + 2);
    for (let c = 0; c < K; c++) { n[s * K + c] += outv[c]; mx[s * K + c] += Math.floor(outv[c] * mixedBirths); }
    // unmixed people pick up foreign customs; mixed people switch to the conformist choice
    for (let c = 0; c < K; c++) {
      const nc = n[s * K + c], mc = mx[s * K + c];
      const newMix = Math.min(nc - mc, sround((nc - mc) * V.hmix * (1 - q[c]), s * 64 + c, yr * 4 + 1));
      mx[s * K + c] += newMix;
      const swN = Math.min(mc + newMix, sround((mc + newMix) * V.sw * (1 - q[c]) * (1 - q[c]), s * 64 + c, yr * 4 + 2));
      if (swN <= 0) continue;
      let W = 0; for (let j = 0; j < K; j++) { wts[j] = j === c ? 0 : o[j]; W += wts[j]; }
      if (W <= 0) continue;
      apportion(swN, K, s * 7919 + yr * 3 + 3 + c * 17);
      n[s * K + c] -= swN; mx[s * K + c] -= swN;
      for (let j = 0; j < K; j++) n[s * K + j] += outv[j]; // switchers arrive unmixed in their new culture
    }
  }
}
const flowTmp = new Int32Array(Math.max(K, MAXE));
const poolC = new Float64Array(K), poolM = new Float64Array(K);
const wtsS = new Float64Array(S), outS = new Int32Array(S), remS = new Float64Array(S), ordS = new Int32Array(S);
function apportionS(total, key) {
  let W = 0; for (let t = 0; t < S; t++) W += wtsS[t];
  let acc = draw(SEED, key, 1, 78) / 4294967296, used = 0;
  for (let t = 0; t < S; t++) {
    const qq = (total * wtsS[t]) / W, f = Math.floor(qq);
    outS[t] = f; acc += qq - f;
    if (acc >= 1) { outS[t]++; acc -= 1; }
    used += outS[t];
  }
  fixTotal(outS, S, total - used);
}

function metrics(yr) {
  let T = 0; const tot = new Float64Array(K);
  for (let s = 0; s < S; s++) for (let c = 0; c < K; c++) { tot[c] += n[s * K + c]; T += n[s * K + c]; }
  let ht = 0; for (let c = 0; c < K; c++) { const p = tot[c] / T; ht += p * p; } ht = 1 - ht;
  let hs = 0, encW = 0, pure = 0, keepDom = 0, mixedT = 0;
  for (let s = 0; s < S; s++) {
    let P = 0; for (let c = 0; c < K; c++) P += n[s * K + c];
    if (!P) continue;
    let t = 0, dm = 0, dc = 0;
    for (let c = 0; c < K; c++) { const p = n[s * K + c] / P; t += p * p; if (n[s * K + c] > dm) { dm = n[s * K + c]; dc = c; } mixedT += mx[s * K + c]; }
    hs += (P / T) * (1 - t); encW += (P / T) * (1 / t);
    if (dm >= 0.9 * P) pure++;
    if (dc === dom0[s]) keepDom++;
  }
  const order = Array.from({ length: S }, (_, i) => i).sort((a, b) => pop[b] - pop[a]);
  const encOf = (sid) => { let P = 0, t = 0; for (let c = 0; c < K; c++) P += n[sid * K + c]; for (let c = 0; c < K; c++) { const p = n[sid * K + c] / P; t += p * p; } return 1 / t; };
  let top10 = 0; for (let j = 0; j < 10; j++) top10 += encOf(order[j]) / 10;
  let small = 0, ns = 0; for (let j = Math.floor(S / 2); j < S; j++) { small += encOf(order[j]); ns++; }
  return { yr, encCapital: +encOf(order[0]).toFixed(3), encTop10: +top10.toFixed(3), encSmallHalf: +(small / ns).toFixed(3), gst: +((ht - hs) / ht).toFixed(4), encWithin: +encW.toFixed(3), encNational: +(1 / (1 - ht)).toFixed(3), sharePure90: +(pure / S).toFixed(3), keepsDominant: +(keepDom / S).toFixed(3), mixedShare: +(mixedT / T).toFixed(4), total: T };
}

const busyBefore = await cpuBusy(1000);
const traj = [metrics(0)], tStep = [];
for (let yr = 1; yr <= A.years; yr++) {
  const t0 = process.hrtime.bigint();
  stepYear(yr);
  const ns = Number(process.hrtime.bigint() - t0);
  if (yr > A.warm) tStep.push(ns / S);
  if (yr % 10 === 0 || yr === 1) traj.push(metrics(yr));
}
const busyAfter = await cpuBusy(1000);
const res = {
  args: A, variant: V, machine: machine(), cpuBusyBefore: busyBefore, cpuBusyAfter: busyAfter,
  timing: { warmupYears: A.warm, samples: tStep.length, nsPerSettlementYear: stats(tStep), nsPerSettlementDayAmortised: stats(tStep.map((v) => v / 365)) },
  bytesPerSettlement: 2 * K * 4,
  saveGzipBytes: gzipSync(Buffer.concat([Buffer.from(n.buffer), Buffer.from(mx.buffer)]), { level: 9 }).length,
  stateHash: hashArrays(n, mx),
  trajectory: traj,
};
const name = A.out || `ledger-${A.variant}-S${S}-mig${A.mig}-long${A.longShare}-s${SEED}.json`;
save(name, res);
const f = traj[traj.length - 1];
console.log(`${name}: busy ${busyBefore}/${busyAfter} | ${fmt(res.timing.nsPerSettlementYear, ' ns/settlement-yr')} | gst ${traj[0].gst} -> ${f.gst} | encWithin ${traj[0].encWithin} -> ${f.encWithin} | pure90 ${traj[0].sharePure90} -> ${f.sharePure90} | keepsDominant ${f.keepsDominant} | encCapital ${traj[0].encCapital} -> ${f.encCapital} | top10 ${f.encTop10} | smallHalf ${f.encSmallHalf} | mixed ${f.mixedShare} | hash ${res.stateHash}`);
