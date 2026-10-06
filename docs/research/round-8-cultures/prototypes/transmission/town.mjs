// Agent-level culture transmission in one town (throwaway research code, round 8).
// Each person: primary culture (u8) + five customs packed as 4-bit culture-of-origin nibbles (u32).
// Customs: 0 food, 1 festival, 2 music, 3 naming (all four adoptable), 4 home region (vertical only).
// Vertical at birth (both parents, cultural substitution), oblique and horizontal learning from
// n demonstrators with conformity, keyed draws only, plan-then-apply so visiting order cannot matter.
import { draw, thr, machine, cpuBusy, stats, fmt, save, parseArgs, hashArrays } from './lib.mjs';

const A = parseArgs(process.argv, {
  N: 10000, years: 100, seed: 1, K: 8, D: 16, P: 30, contact: 'district', variant: 'baseline',
  warm: 5, tag: '', out: '', reverse: 0, bench: 1, gccheck: 0,
});

const PRESETS = {
  // vertical substitution, conformity a, assortation r, immigration share, partner homophily,
  // chain placement weight, yearly move rate, initial clustering of minorities
  neutral:  { sub: 0, a: 0.0, r: 0.0, mIn: 0.0,  mOut: 0.0,  hom: 0.2, homX: 0.4, chainW: 0, move: 0.08, initClust: 0.5, lead: 0.75, consist: 1 },
  conform:  { sub: 0, a: 0.3, r: 0.0, mIn: 0.0,  mOut: 0.0,  hom: 0.2, homX: 0.4, chainW: 0, move: 0.08, initClust: 0.5, lead: 0.75, consist: 1 },
  consub:   { sub: 1, a: 0.3, r: 0.0, mIn: 0.0,  mOut: 0.0,  hom: 0.2, homX: 0.4, chainW: 0, move: 0.08, initClust: 0.5, lead: 0.75, consist: 1 },
  baseline: { sub: 1, a: 0.3, r: 0.0, mIn: 0.005, mOut: 0.005, hom: 0.2, homX: 0.4, chainW: 0, move: 0.08, initClust: 0.5, lead: 0.75, consist: 1 },
  enclave:  { sub: 1, a: 0.3, r: 0.6, mIn: 0.005, mOut: 0.005, hom: 0.8, homX: 0.2, chainW: 8, move: 0.02, initClust: 0.9, lead: 0.75, consist: 1 },
};
const V = { ...PRESETS[A.variant] };
for (const k of Object.keys(V)) if (A[k] !== undefined) V[k] = Number(A[k]);

const N = A.N, K = A.K, D = A.D, P = A.P, F = 5, FA = 4, NDEM = 5, DAYS = 365, FR = 8;
const SEED = A.seed >>> 0;
const FRIENDS = A.contact === 'friends';

// Yearly copying-event rates per adoptable custom (food, festival, music, naming); music is
// youth-heavy. Vertical fidelity for a rare variant (f1) per custom incl. home region; f0 for a
// variant that is the local majority; fm for parents who differ.
const H_ADULT = [0.03, 0.01, 0.01, 0.025];
const H_YOUTH = [0.03, 0.01, 0.15, 0.025];
const F1 = [0.9, 0.95, 0.5, 0.9, 0.95];
const F0 = 0.5, FM = 0.6;
const INIT = [0.60, 0.12, 0.10, 0.07, 0.05, 0.03, 0.02, 0.01];
const IMMIX = [0, 3, 2, 2, 1, 1, 1, 1];

// Gate per check: one custom chosen of four, then evaluated with prob 4*h*P/365.
const gateA = new Float64Array(FA), gateY = new Float64Array(FA);
for (let k = 0; k < FA; k++) { gateA[k] = thr(Math.min(1, 4 * H_ADULT[k] * P / DAYS)); gateY[k] = thr(Math.min(1, 4 * H_YOUTH[k] * P / DAYS)); }
const A16 = Math.round(V.a * 65536), R_THR = thr(V.r), HOM_THR = thr(V.hom), MOVE_THR = thr(V.move);
const HOM_STEP = Math.floor((thr(Math.min(1, V.hom + V.homX)) - HOM_THR) / 4);
const MATCH_THR = thr(0.3), SWITCH_THR = thr(0.25), COUPLE_THR = thr(0.6), CLUST_THR = thr(V.initClust);
const F1_16 = F1.map((x) => Math.round(x * 65536)), F0_16 = Math.round(F0 * 65536), FM_THR = thr(FM);
const LEAD_THR = thr(V.lead);
// consistency: people who still hold most of their own customs change more slowly (x0.5 at 4 of 4,
// x1 at 3, x1.5 at 2, x2 at 0-1), applied as a gate multiplier in eighths
const KEEP_MUL8 = V.consist ? [16, 16, 12, 8, 4] : [8, 8, 8, 8, 8];

// State (struct of arrays, preallocated; nothing below allocates per tick).
const alive = new Uint8Array(N), age = new Uint8Array(N), life = new Uint8Array(N);
const dist = new Uint8Array(N), prim = new Uint8Array(N), cust = new Uint32Array(N);
const partner = new Int32Array(N).fill(-1), gen = new Uint8Array(N), heri = new Uint8Array(N);
const yrsIn = new Uint8Array(N), stamp = new Uint16Array(N);
const friend = new Int32Array(FRIENDS ? N * FR : 1).fill(-1);
const fstamp = new Uint16Array(FRIENDS ? N * FR : 1);
const cnt = new Int32Array(D * F * K), snap = new Int32Array(D * F * K);
const dtot = new Int32Array(D), dsnap = new Int32Array(D), pcnt = new Int32Array(D * K), psnap = new Int32Array(D * K);
const freeList = new Int32Array(N); let nfree = 0;
const chgI = new Int32Array(N), chgV = new Uint32Array(N); let nchg = 0;
const tally = new Int32Array(K), cum = new Int32Array(K + 1);
// partnering and friend-list scratch
const listAll = new Int32Array(N), listCul = new Int32Array(N);
const startAll = new Int32Array(D + 1), lenAll = new Int32Array(D);
const startCul = new Int32Array(D * K + 1), lenCul = new Int32Array(D * K);
const posAll = new Int32Array(N), posCul = new Int32Array(N);
let aliveCount = 0;

// Yearly tallies, plus cumulative ones over the second half of the run
const cumX = new Float64Array(10), cumP = new Float64Array(4), cumG = new Float64Array(6);
let mxNative = 0, mxNativeEx = 0, mxG1 = 0, mxG1Ex = 0, mxG2 = 0, mxG2Ex = 0, mxG3 = 0, mxG3Ex = 0, mxM0 = 0, mxM0Ex = 0, switches = 0;

const nib = (c, k) => (c >>> (k << 2)) & 15;
const setNib = (c, k, v) => ((c & ~(15 << (k << 2))) | (v << (k << 2))) >>> 0;

function addCounts(i, sign) {
  const d = dist[i], c = cust[i];
  for (let k = 0; k < F; k++) cnt[(d * F + k) * K + nib(c, k)] += sign;
  dtot[d] += sign; pcnt[d * K + prim[i]] += sign;
}

function pickCulture(u, w) { // weighted pick over K from an integer weight table
  let s = 0; for (let c = 0; c < K; c++) s += w[c];
  let x = u % s;
  for (let c = 0; c < K; c++) { x -= w[c]; if (x < 0) return c; }
  return K - 1;
}

// Sample a variant for custom k in district d from n demonstrators drawn from snapshot counts,
// with Mesoudi's (2018) conformity rule (a = 0 is unbiased copying of one random demonstrator).
function learnDistrict(d, k, i, tick, stream) {
  const base = (d * F + k) * K, tot = dsnap[d];
  if (tot <= 0) return -1;
  if (A16 === 0) {
    let x = draw(SEED, i, tick, stream) % tot;
    for (let c = 0; c < K; c++) { x -= snap[base + c]; if (x < 0) return c; }
    return K - 1;
  }
  for (let c = 0; c < K; c++) tally[c] = 0;
  for (let j = 0; j < NDEM; j++) {
    let x = draw(SEED, i, tick, stream + j) % tot;
    let c = 0;
    for (; c < K - 1; c++) { x -= snap[base + c]; if (x < 0) break; }
    tally[c]++;
  }
  return conformPick(i, tick, stream + NDEM);
}

function learnFriends(i, k, tick, stream) {
  for (let c = 0; c < K; c++) tally[c] = 0;
  let got = 0;
  const b = i * FR;
  const n = A16 === 0 ? 1 : NDEM;
  for (let j = 0; j < n; j++) {
    const s = draw(SEED, i, tick, stream + j) & 7;
    const f = friend[b + s];
    if (f < 0 || !alive[f] || stamp[f] !== fstamp[b + s]) continue;
    tally[nib(cust[f], k)]++; got++;
  }
  if (got === 0) return -1;
  if (A16 === 0) { for (let c = 0; c < K; c++) if (tally[c]) return c; }
  return conformPickN(i, tick, stream + NDEM, got);
}

function conformPick(i, tick, stream) { return conformPickN(i, tick, stream, NDEM); }
function conformPickN(i, tick, stream, n) {
  let kmax = 0, mu = 0;
  for (let c = 0; c < K; c++) { const t = tally[c]; if (t > kmax) { kmax = t; mu = 1; } else if (t === kmax && t > 0) mu++; }
  let s = 0;
  for (let c = 0; c < K; c++) {
    const t = tally[c];
    let x = Math.floor((t * (65536 - A16)) / n);
    if (t === kmax && t > 0) x += Math.floor(A16 / mu);
    s += x; cum[c + 1] = s;
  }
  const u = draw(SEED, i, tick, stream) >>> 16;
  if (u >= s) return -1;
  for (let c = 0; c < K; c++) if (u < cum[c + 1]) return c;
  return -1;
}

// ---- day boundary: horizontal adoption for agents due today (stride slots i = r mod P) ----
function dayPass(yr, day, offY) {
  snap.set(cnt); dsnap.set(dtot); psnap.set(pcnt);
  const tick = yr * DAYS + day;
  const r = (((day - offY) % P) + P) % P;
  nchg = 0;
  const last = r + Math.floor((N - 1 - r) / P) * P;
  for (let idx = r; idx < N; idx += P) {
    const i = A.reverse ? last - (idx - r) : idx;
    if (!alive[i] || age[i] < 3) continue;
    const u = draw(SEED, i, tick, 1);
    const k = u & 3;
    const g = draw(SEED, i, tick, 2);
    const youth = age[i] >= 10 && age[i] <= 24;
    const base = youth ? gateY[k] : gateA[k];
    if (g >= base * 2) continue; // fast reject at the largest consistency multiplier
    const c0 = cust[i], p0 = prim[i];
    let keep = 0; for (let j = 0; j < FA; j++) if (nib(c0, j) === p0) keep++;
    if (g >= (base / 8) * KEEP_MUL8[keep]) continue;
    if (R_THR > 0 && draw(SEED, i, tick, 3) < R_THR) continue; // assorted demonstrators share own variant
    const v = FRIENDS ? learnFriends(i, k, tick, 10) : learnDistrict(dist[i], k, i, tick, 10);
    if (v < 0) continue;
    const c = cust[i];
    if (nib(c, k) === v) continue;
    chgI[nchg] = i; chgV[nchg] = setNib(c, k, v); nchg++;
  }
  for (let j = 0; j < nchg; j++) { const i = chgI[j]; addCounts(i, -1); cust[i] = chgV[j]; addCounts(i, 1); }
}

// ---- yearly phase ----
function kill(i) {
  addCounts(i, -1);
  alive[i] = 0; aliveCount--;
  const p = partner[i];
  if (p >= 0) partner[p] = -1;
  partner[i] = -1;
  freeList[nfree++] = i;
}

function spawnSlot() { return nfree > 0 ? freeList[--nfree] : -1; }

function placeDistrict(c, u) {
  if (V.chainW <= 0) return u % D;
  // weight 1 + chainW * share of culture c in district (fixed point, from snapshot prim counts)
  let s = 0;
  for (let d = 0; d < D; d++) { const t = dsnap[d] > 0 ? Math.floor((psnap[d * K + c] * 65536) / dsnap[d]) : 0; s += 65536 + V.chainW * t; }
  let x = u % s;
  for (let d = 0; d < D; d++) { const t = dsnap[d] > 0 ? Math.floor((psnap[d * K + c] * 65536) / dsnap[d]) : 0; x -= 65536 + V.chainW * t; if (x < 0) return d; }
  return D - 1;
}

function newPerson(i, c, a, d, g, h, customs) {
  alive[i] = 1; aliveCount++; age[i] = a; dist[i] = d; prim[i] = c; cust[i] = customs;
  partner[i] = -1; gen[i] = g; heri[i] = h; yrsIn[i] = 0; stamp[i] = (stamp[i] + 1) & 0xffff;
  life[i] = 55 + (draw(SEED, i, stamp[i], 40) % 40);
  if (FRIENDS) { const b = i * FR; for (let s = 0; s < FR; s++) friend[b + s] = -1; }
  addCounts(i, 1);
}

function uniformCustoms(c) { let v = 0; for (let k = 0; k < F; k++) v = setNib(v, k, c); return v >>> 0; }

function vertical(child, p1, p2, d, yr) {
  let out = 0;
  const base0 = d * F * K, tot = dsnap[d];
  // a mixed couple's child follows one lead parent for most customs (bundled, not per-custom coin flips)
  const leadFirst = (draw(SEED, child, yr, 49) & 1) === 1;
  for (let k = 0; k < F; k++) {
    const v1 = nib(cust[p1], k), v2 = nib(cust[p2], k);
    let v = -1;
    if (v1 === v2) {
      let tau = F1_16[k];
      if (V.sub && tot > 0) {
        const q = Math.floor((snap[base0 + k * K + v1] * 65536) / tot);
        tau = F0_16 + Math.floor(((F1_16[k] - F0_16) * (65536 - q)) / 65536);
      }
      if ((draw(SEED, child, yr, 50 + k) >>> 16) < tau) v = v1;
    } else if (draw(SEED, child, yr, 50 + k) < FM_THR) {
      const lead = draw(SEED, child, yr, 60 + k) < LEAD_THR;
      v = lead === leadFirst ? v1 : v2;
    }
    if (v < 0) { // oblique: learn from adults of the district
      v = learnDistrict(d, k, child, yr, 100 + k * 8);
      if (v < 0) v = v1;
    }
    out = setNib(out, k, v);
  }
  return out >>> 0;
}

function yearly(yr) {
  snap.set(cnt); dsnap.set(dtot); psnap.set(pcnt);
  // aging, deaths
  for (let i = 0; i < N; i++) {
    if (!alive[i]) continue;
    age[i]++; if (gen[i] === 1 && yrsIn[i] < 255) yrsIn[i]++;
    if (age[i] >= life[i]) kill(i);
  }
  // emigration (random people leave)
  if (V.mOut > 0) { const t = thr(V.mOut); for (let i = 0; i < N; i++) if (alive[i] && draw(SEED, i, yr, 30) < t) kill(i); }
  const imm = Math.round(V.mIn * N);
  let births = N - aliveCount - imm; if (births < 0) births = 0;
  // births: parents are a partnered person aged 20-45 and their partner
  for (let b = 0; b < births; b++) {
    let p1 = -1;
    for (let t = 0; t < 24; t++) {
      const j = draw(SEED, b, yr, 200 + t) % N;
      if (alive[j] && age[j] >= 20 && age[j] <= 45 && partner[j] >= 0) { p1 = j; break; }
    }
    if (p1 < 0) for (let t = 0; t < 24; t++) { const j = draw(SEED, b, yr, 240 + t) % N; if (alive[j] && age[j] >= 20 && age[j] <= 45) { p1 = j; break; } }
    if (p1 < 0) break;
    const p2 = partner[p1] >= 0 ? partner[p1] : p1;
    const i = spawnSlot(); if (i < 0) break;
    const d = dist[p1];
    const customs = vertical(i, p1, p2, d, yr);
    let pc = prim[p1] === prim[p2] ? prim[p1] : ((draw(SEED, i, yr, 70) & 1) ? prim[p1] : prim[p2]);
    let g = 0, h = heri[p1];
    const g1 = gen[p1], g2 = gen[p2];
    if (g1 > 0 || g2 > 0) {
      const gm = g1 === 0 ? g2 : g2 === 0 ? g1 : Math.min(g1, g2);
      g = Math.min(9, gm + 1); h = (g1 > 0 && (g2 === 0 || g1 <= g2)) ? heri[p1] : heri[p2];
    }
    newPerson(i, pc, 0, d, g, h, customs);
  }
  // immigration: adults of other cultures, often arriving as same-culture couples
  for (let m = 0; m < imm; m++) {
    const i = spawnSlot(); if (i < 0) break;
    const c = pickCulture(draw(SEED, m, yr, 300), IMMIX);
    const d = placeDistrict(c, draw(SEED, m, yr, 301));
    newPerson(i, c, 20 + (draw(SEED, m, yr, 302) % 20), d, 1, c, uniformCustoms(c));
    if (m + 1 < imm && draw(SEED, m, yr, 303) < COUPLE_THR) {
      const j = spawnSlot(); if (j < 0) break;
      newPerson(j, c, 20 + (draw(SEED, m, yr, 304) % 20), d, 1, c, uniformCustoms(c));
      partner[i] = j; partner[j] = i; m++;
    }
  }
  // residential moves (households), culture-blind unless chainW > 0
  snap.set(cnt); dsnap.set(dtot); psnap.set(pcnt);
  for (let i = 0; i < N; i++) {
    if (!alive[i] || draw(SEED, i, yr, 400) >= MOVE_THR) continue;
    const p = partner[i];
    if (p >= 0 && p < i) continue;
    const d = placeDistrict(prim[i], draw(SEED, i, yr, 401));
    addCounts(i, -1); dist[i] = d; addCounts(i, 1);
    if (p >= 0) { addCounts(p, -1); dist[p] = d; addCounts(p, 1); }
  }
  partnering(yr);
  // identity follows practice: switch primary when >= 3 of 4 adoptable customs come from one other culture
  for (let i = 0; i < N; i++) {
    if (!alive[i] || age[i] < 16) continue;
    const c = cust[i], p = prim[i];
    let own = 0; for (let k = 0; k < FA; k++) if (nib(c, k) === p) own++;
    if (own > 1) continue;
    for (let k = 0; k < FA; k++) {
      const x = nib(c, k); if (x === p) continue;
      let n = 0; for (let j = 0; j < FA; j++) if (nib(c, j) === x) n++;
      if (n >= 3) {
        if (draw(SEED, i, yr, 500) < SWITCH_THR) { pcnt[dist[i] * K + p]--; prim[i] = x; pcnt[dist[i] * K + x]++; switches++; }
        break;
      }
    }
  }
  if (FRIENDS) refillFriends(yr);
}

function buildLists(pred) { // counting sort of eligible people by district and by (district, primary)
  lenAll.fill(0); lenCul.fill(0);
  for (let i = 0; i < N; i++) if (pred(i)) { lenAll[dist[i]]++; lenCul[dist[i] * K + prim[i]]++; }
  startAll[0] = 0; for (let d = 0; d < D; d++) startAll[d + 1] = startAll[d] + lenAll[d];
  startCul[0] = 0; for (let x = 0; x < D * K; x++) startCul[x + 1] = startCul[x] + lenCul[x];
  lenAll.fill(0); lenCul.fill(0);
  for (let i = 0; i < N; i++) {
    posAll[i] = -1; posCul[i] = -1;
    if (!pred(i)) continue;
    const d = dist[i], x = d * K + prim[i];
    posAll[i] = startAll[d] + lenAll[d]; listAll[posAll[i]] = i; lenAll[d]++;
    posCul[i] = startCul[x] + lenCul[x]; listCul[posCul[i]] = i; lenCul[x]++;
  }
}

function removeFromLists(i) {
  const d = dist[i], x = d * K + prim[i];
  let p = posAll[i], last = startAll[d] + lenAll[d] - 1, j = listAll[last];
  listAll[p] = j; posAll[j] = p; lenAll[d]--; posAll[i] = -1;
  p = posCul[i]; last = startCul[x] + lenCul[x] - 1; j = listCul[last];
  listCul[p] = j; posCul[j] = p; lenCul[x]--; posCul[i] = -1;
}

const isSingle = (i) => alive[i] === 1 && partner[i] < 0 && age[i] >= 18 && age[i] <= 50;
function partnering(yr) {
  buildLists(isSingle);
  for (let i = 0; i < N; i++) {
    if (posAll[i] < 0) continue;
    if (draw(SEED, i, yr, 600) >= MATCH_THR) continue;
    const d = dist[i];
    // homophily rises with how many of the four adoptable customs still come from one's own culture
    let keep = 0; for (let k = 0; k < FA; k++) if (nib(cust[i], k) === prim[i]) keep++;
    const own = draw(SEED, i, yr, 601) < HOM_THR + keep * HOM_STEP;
    const x = d * K + prim[i];
    const len = own ? lenCul[x] : lenAll[d];
    if (len < 2) continue;
    let j = -1;
    for (let t = 0; t < 4; t++) {
      const r = draw(SEED, i, yr, 602 + t) % len;
      const cand = own ? listCul[startCul[x] + r] : listAll[startAll[d] + r];
      if (cand !== i) { j = cand; break; }
    }
    if (j < 0) continue;
    if (prim[j] !== prim[i]) { // mutual consent: the other person applies their own homophily too
      let kj = 0; for (let k = 0; k < FA; k++) if (nib(cust[j], k) === prim[j]) kj++;
      if (draw(SEED, j, yr, 610 + (i & 7)) < HOM_THR + kj * HOM_STEP) continue;
    }
    removeFromLists(i); removeFromLists(j);
    partner[i] = j; partner[j] = i;
    const ex = prim[i] !== prim[j];
    tallyMatch(i, ex); tallyMatch(j, ex);
  }
}

function tallyMatch(q, ex) {
  if (heri[q] === 0 && gen[q] === 0) { mxNative++; if (ex) mxNativeEx++; }
  else if (gen[q] === 1) { mxG1++; if (ex) mxG1Ex++; }
  else if (gen[q] === 2) { mxG2++; if (ex) mxG2Ex++; }
  else if (gen[q] >= 3) { mxG3++; if (ex) mxG3Ex++; }
  else { mxM0++; if (ex) mxM0Ex++; }
}

const isAlive = (i) => alive[i] === 1;
function refillFriends(yr) {
  buildLists(isAlive);
  for (let i = 0; i < N; i++) {
    if (!alive[i]) continue;
    const b = i * FR, d = dist[i], x = d * K + prim[i];
    for (let s = 0; s < FR; s++) {
      const f = friend[b + s];
      if (f >= 0 && alive[f] && stamp[f] === fstamp[b + s]) continue;
      const own = draw(SEED, i, yr * FR + s, 700) < HOM_THR;
      const len = own ? lenCul[x] : lenAll[d];
      if (len < 2) continue;
      const r = draw(SEED, i, yr * FR + s, 701) % len;
      const cand = own ? listCul[startCul[x] + r] : listAll[startAll[d] + r];
      if (cand === i) continue;
      friend[b + s] = cand; fstamp[b + s] = stamp[cand];
    }
  }
}

// ---- initial population ----
function init() {
  const w = INIT.slice(0, K).map((x) => Math.round(x * 10000));
  for (let i = N - 1; i >= 0; i--) freeList[nfree++] = i;
  dsnap.fill(1);
  for (let n = 0; n < N; n++) {
    const i = spawnSlot();
    const c = pickCulture(draw(SEED, n, 0xfff0, 1), w);
    let d = draw(SEED, n, 0xfff0, 2) % D;
    if (c !== 0 && draw(SEED, n, 0xfff0, 3) < CLUST_THR) d = c % D;
    newPerson(i, c, draw(SEED, n, 0xfff0, 4) % 80, d, 0, c, uniformCustoms(c));
    life[i] = Math.max(age[i] + 1, life[i]);
  }
  snap.set(cnt); dsnap.set(dtot); psnap.set(pcnt);
  partnering(0);
  if (FRIENDS) refillFriends(0);
}

// ---- metrics (not timed as culture cost) ----
function metrics(yr) {
  const pc = new Float64Array(K), cc = new Float64Array(F * K);
  let mixed = 0, mixedNoMusic = 0;
  const foreign = new Float64Array(FA + 1);
  const g1b = new Float64Array(8), g2 = [0, 0, 0], g3 = [0, 0, 0];
  const prof = [0, 0, 0, 0];
  for (let i = 0; i < N; i++) {
    if (!alive[i]) continue;
    const c = cust[i];
    pc[prim[i]]++;
    let o = nib(c, 0), m = 0, m4 = 0;
    for (let k = 0; k < F; k++) { const v = nib(c, k); cc[k * K + v]++; if (v !== o) { m = 1; if (k !== 2) m4 = 1; } }
    mixed += m; mixedNoMusic += m4;
    let fo = 0; for (let k = 0; k < FA; k++) if (nib(c, k) !== prim[i]) fo++;
    foreign[fo]++;
    const h = heri[i];
    if (h === 0) continue;
    let keep = 0; for (let k = 0; k < FA; k++) if (nib(c, k) === h) keep++;
    const food = nib(c, 0) === h ? 1 : 0;
    if (gen[i] === 1) { const b = yrsIn[i] < 5 ? 0 : yrsIn[i] < 10 ? 1 : yrsIn[i] < 20 ? 2 : 3; g1b[b * 2] += food; g1b[b * 2 + 1]++; }
    if (age[i] >= 6 && age[i] <= 15) {
      if (gen[i] === 2) { g2[0] += food; g2[1] += keep / FA; g2[2]++; }
      if (gen[i] === 3) { g3[0] += food; g3[1] += keep / FA; g3[2]++; }
    }
    if (gen[i] >= 2 && age[i] >= 13 && age[i] <= 18) {
      let host = 0; for (let k = 0; k < FA; k++) if (nib(c, k) === 0) host++;
      if (keep === FA) prof[0]++; else if (host === FA) prof[1]++; else if (keep > 0) prof[2]++; else prof[3]++;
    }
  }
  const tot = aliveCount;
  let s2 = 0; for (let c = 0; c < K; c++) { const p = pc[c] / tot; s2 += p * p; }
  const enc = 1 / s2;
  const encC = [];
  for (let k = 0; k < F; k++) { let t = 0; for (let c = 0; c < K; c++) { const p = cc[k * K + c] / tot; t += p * p; } encC.push(+(1 / t).toFixed(3)); }
  // G_ST of primary culture across districts, and mean dissimilarity of minorities
  let hs = 0;
  for (let d = 0; d < D; d++) { if (!dtot[d]) continue; let t = 0; for (let c = 0; c < K; c++) { const p = pcnt[d * K + c] / dtot[d]; t += p * p; } hs += (dtot[d] / tot) * (1 - t); }
  const ht = 1 - s2, gst = ht > 0 ? (ht - hs) / ht : 0;
  let dsum = 0, dw = 0;
  for (let c = 1; c < K; c++) {
    if (pc[c] < 50) continue;
    let x = 0; for (let d = 0; d < D; d++) x += Math.abs(pcnt[d * K + c] / pc[c] - (dtot[d] - pcnt[d * K + c]) / (tot - pc[c]));
    dsum += 0.5 * x * pc[c]; dw += pc[c];
  }
  const profN = prof[0] + prof[1] + prof[2] + prof[3];
  const r = {
    yr, alive: tot, hostShare: +(pc[0] / tot).toFixed(4), enc: +enc.toFixed(3), encCustoms: encC,
    mixedShare: +(mixed / tot).toFixed(4), mixedNoMusic: +(mixedNoMusic / tot).toFixed(4),
    foreignCustoms0to4: Array.from(foreign, (x) => +(x / tot).toFixed(3)),
    hostVariantShare: [0, 1, 2, 3, 4].map((k) => +(cc[k * K] / tot).toFixed(4)), gst: +gst.toFixed(4), dissim: dw ? +(dsum / dw).toFixed(4) : null,
    g1FoodBy5_10_20: [0, 1, 2, 3].map((b) => (g1b[b * 2 + 1] ? +(g1b[b * 2] / g1b[b * 2 + 1]).toFixed(3) : null)),
    g2Child: g2[2] ? { food: +(g2[0] / g2[2]).toFixed(3), all: +(g2[1] / g2[2]).toFixed(3), n: g2[2] } : null,
    g3Child: g3[2] ? { food: +(g3[0] / g3[2]).toFixed(3), all: +(g3[1] / g3[2]).toFixed(3), n: g3[2] } : null,
    exogamy: { native: mxNative ? +(mxNativeEx / mxNative).toFixed(3) : null, g1: mxG1 ? +(mxG1Ex / mxG1).toFixed(3) : null, g2: mxG2 ? +(mxG2Ex / mxG2).toFixed(3) : null, g3plus: mxG3 ? +(mxG3Ex / mxG3).toFixed(3) : null, establishedMinority: mxM0 ? +(mxM0Ex / mxM0).toFixed(3) : null, nG1: mxG1, nG2: mxG2 },
    teenProfiles: profN ? { heritage: +(prof[0] / profN).toFixed(3), host: +(prof[1] / profN).toFixed(3), mixed: +(prof[2] / profN).toFixed(3), other: +(prof[3] / profN).toFixed(3), n: profN } : null,
    switches,
    primShares: Array.from(pc, (x) => +(x / tot).toFixed(4)),
  };
  if (yr > A.years / 2) {
    const xs = [mxNative, mxNativeEx, mxG1, mxG1Ex, mxG2, mxG2Ex, mxG3, mxG3Ex, mxM0, mxM0Ex];
    for (let j = 0; j < 10; j++) cumX[j] += xs[j];
    for (let j = 0; j < 4; j++) cumP[j] += prof[j];
    cumG[0] += g2[0]; cumG[1] += g2[1]; cumG[2] += g2[2]; cumG[3] += g3[0]; cumG[4] += g3[1]; cumG[5] += g3[2];
  }
  mxNative = mxNativeEx = mxG1 = mxG1Ex = mxG2 = mxG2Ex = mxG3 = mxG3Ex = mxM0 = mxM0Ex = switches = 0;
  return r;
}

// ---- run ----
const busyBefore = await cpuBusy(1000);
init();
const traj = [metrics(0)];
const tDay = [], tYear = [], tDayPass = [];
for (let yr = 1; yr <= A.years; yr++) {
  const offY = draw(SEED, 0, yr, 900) % P;
  const t0 = process.hrtime.bigint();
  for (let day = 0; day < DAYS; day++) {
    const a0 = (day & 31) === 0 ? process.hrtime.bigint() : 0n;
    dayPass(yr, day, offY);
    if (a0) tDayPass.push(Number(process.hrtime.bigint() - a0) / 1e3);
  }
  const t1 = process.hrtime.bigint();
  yearly(yr);
  const t2 = process.hrtime.bigint();
  if (yr > A.warm) { tDay.push(Number(t1 - t0) / 1e6); tYear.push(Number(t2 - t1) / 1e6); }
  if (yr % 5 === 0 || yr === 1) traj.push(metrics(yr)); else metrics(yr);
}
const busyAfter = await cpuBusy(1000);

let gcCheck = null;
if (A.gccheck && typeof globalThis.gc === 'function') {
  // heap growth over 3,650 untimed day passes after a forced collection (no allocation expected)
  for (let y = 0; y < 3; y++) for (let d = 0; d < 365; d++) dayPass(A.years + 1 + y, d, (y * 5) % P);
  const runs = [];
  for (const yrs of [10, 100]) { // flat growth across window sizes means one-off code, not per-pass garbage
    globalThis.gc();
    const h0 = process.memoryUsage().heapUsed;
    for (let y = 0; y < yrs; y++) for (let d = 0; d < 365; d++) dayPass(A.years + 10 + y, d, (y * 7) % P);
    runs.push({ dayPasses: yrs * 365, heapGrowthBytes: process.memoryUsage().heapUsed - h0 });
  }
  gcCheck = runs;
  console.log('gccheck', JSON.stringify(gcCheck));
}
let verticalBench = null;
if (A.bench) {
  snap.set(cnt); dsnap.set(dtot); psnap.set(pcnt);
  const pairs = new Int32Array(4096); let np = 0;
  for (let i = 0; i < N && np < 4096; i++) if (alive[i] && partner[i] >= 0) pairs[np++] = i;
  let sink = 0; const samples = [];
  for (let rep = 0; rep < 12; rep++) {
    const t0 = process.hrtime.bigint();
    for (let j = 0; j < 100000; j++) { const p1 = pairs[j % np]; sink ^= vertical(j & 0xffff, p1, partner[p1], dist[p1], 1000 + rep); }
    const ns = Number(process.hrtime.bigint() - t0) / 100000;
    if (rep >= 3) samples.push(ns);
  }
  verticalBench = { nsPerBirth: stats(samples), warmupReps: 3, callsPerSample: 100000, sink };
}
const perPersonDayPassNs = tDay.map((ms) => (ms * 1e6) / N);
const perPersonYearlyNs = tYear.map((ms) => (ms * 1e6) / N);
const res = {
  args: A, variant: V, machine: machine(), cpuBusyBefore: busyBefore, cpuBusyAfter: busyAfter,
  timing: {
    warmupYears: A.warm, samples: tDay.length,
    horizontalMsPerYear: stats(tDay), yearlyPhaseMsPerYear: stats(tYear),
    horizontalNsPerPersonYear: stats(perPersonDayPassNs), yearlyNsPerPersonYear: stats(perPersonYearlyNs),
    dayPassUs: stats(tDayPass.slice(Math.floor(tDayPass.length * A.warm / A.years))),
    verticalBench,
    gcCheck,
  },
  bytesPerPerson: { prim: 1, customs: 4, friends: FRIENDS ? FR * 4 + FR * 2 : 0, metricsOnly: 'gen 1, heri 1, yrsIn 1' },
  stateHash: hashArrays(alive, age, dist, prim, cust, partner),
  secondHalf: {
    exogamy: { native: +(cumX[1] / cumX[0]).toFixed(3), g1: +(cumX[3] / cumX[2]).toFixed(3), g2: +(cumX[5] / cumX[4]).toFixed(3), g3plus: +(cumX[7] / cumX[6]).toFixed(3), establishedMinority: +(cumX[9] / cumX[8]).toFixed(3), n: [cumX[0], cumX[2], cumX[4], cumX[6], cumX[8]] },
    teenProfiles: (() => { const t = cumP[0] + cumP[1] + cumP[2] + cumP[3]; return { heritage: +(cumP[0] / t).toFixed(3), host: +(cumP[1] / t).toFixed(3), mixed: +(cumP[2] / t).toFixed(3), other: +(cumP[3] / t).toFixed(3), personYears: t }; })(),
    g2ChildRetention: { food: +(cumG[0] / cumG[2]).toFixed(3), all: +(cumG[1] / cumG[2]).toFixed(3), personYears: cumG[2] },
    g3ChildRetention: { food: +(cumG[3] / cumG[5]).toFixed(3), all: +(cumG[4] / cumG[5]).toFixed(3), personYears: cumG[5] },
  },
  trajectory: traj,
};
const name = A.out || `town-${A.variant}-${A.contact}-N${N}-P${P}-s${SEED}${A.reverse ? '-rev' : ''}${A.tag ? '-' + A.tag : ''}.json`;
save(name, res);
const last = traj[traj.length - 1];
console.log(`${name}: busy ${busyBefore}/${busyAfter} | horiz ${fmt(res.timing.horizontalNsPerPersonYear, ' ns/person-yr')} | yearly ${fmt(res.timing.yearlyNsPerPersonYear, ' ns/person-yr')} | dayPass ${fmt(res.timing.dayPassUs, ' us')} | vertical ${verticalBench ? fmt(verticalBench.nsPerBirth, ' ns/birth') : '-'}`);
console.log(`  2nd half: ${JSON.stringify(res.secondHalf)}`);
console.log(`  yr${last.yr}: host ${last.hostShare} enc ${last.enc} encC ${last.encCustoms} mixed ${last.mixedShare} gst ${last.gst} dissim ${last.dissim} g2 ${JSON.stringify(last.g2Child)} g3 ${JSON.stringify(last.g3Child)} exo ${JSON.stringify(last.exogamy)} hash ${res.stateHash}`);
