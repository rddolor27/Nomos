// Guardrail tests for culture (throwaway research code, round 8).
// A toy day loop with a culture-blind offend rule, record-driven patrols, stops, arrests and a wallet.
// Culture enters only through a custom table (favourite food -> price). Tests:
//  T1 label permutation: rename culture IDs and permute the custom tables; outcomes must hash identically.
//  T2 decision swap (Galhotra et al.'s causal discrimination): change only an agent's culture and re-run
//     the crime and policing decisions from the same snapshot; no decision may change.
//  T3 group disparity over seeds: arrest and stop rates by culture against sampling noise, with
//     culture-blind and clustered housing (place can carry culture into outcomes as a proxy).
//  T4 wealth through preferences: equal against unequal custom prices.
import { draw, thr, hashArrays, save, parseArgs, machine } from './lib.mjs';

const A = parseArgs(process.argv, { N: 20000, D: 16, K: 8, days: 365, seeds: 40 });
const { N, D, K } = A;
const INIT = [60, 12, 10, 7, 5, 3, 2, 1];

function permutation(seed) { // keyed Fisher-Yates over culture labels
  const p = Uint8Array.from({ length: K }, (_, i) => i);
  for (let i = K - 1; i > 0; i--) { const j = draw(seed, i, 0, 0xbeef) % (i + 1); const t = p[i]; p[i] = p[j]; p[j] = t; }
  return p;
}

function run({ seed, perm = null, leak = 'none', housing = 'blind', prices = 'equal', snapshotDay = -1 }) {
  const label = new Uint8Array(N), base = new Uint8Array(N), dist = new Uint8Array(N);
  const income = new Int32Array(N), need = new Uint8Array(N);
  const wealth = new Float64Array(N), offN = new Int32Array(N), stopN = new Int32Array(N), arrN = new Int32Array(N);
  // custom tables are indexed by label, so renaming labels permutes them consistently
  const foodOfBase = [0, 1, 2, 3, 0, 1, 2, 3];
  const PRICE = prices === 'equal' ? [900, 900, 900, 900] : [700, 900, 1100, 1300];
  const foodOfLabel = new Uint8Array(K);
  for (let b = 0; b < K; b++) foodOfLabel[perm ? perm[b] : b] = foodOfBase[b];
  const homeOfLabel = new Uint8Array(K);
  for (let b = 0; b < K; b++) homeOfLabel[perm ? perm[b] : b] = b % D;
  let sum = 0; for (const w of INIT) sum += w;
  for (let i = 0; i < N; i++) {
    let x = draw(seed, i, 0, 1) % sum, b = 0;
    for (; b < K - 1; b++) { x -= INIT[b]; if (x < 0) break; }
    base[i] = b; label[i] = perm ? perm[b] : b;
    dist[i] = draw(seed, i, 0, 2) % D;
    if (housing === 'clustered' && b !== 0 && draw(seed, i, 0, 3) < thr(0.8)) dist[i] = homeOfLabel[label[i]];
    income[i] = 300 + (draw(seed, i, 0, 4) % 1200);
    wealth[i] = 5000;
  }
  // district opportunity: four hot districts; patrols follow recorded crime of the last 30 days
  const oppThr = new Float64Array(D); for (let d = 0; d < D; d++) oppThr[d] = thr(d < 4 ? 0.04 : 0.01);
  const rec = new Int32Array(D * 30), stopThr = new Float64Array(D);
  let snap = null;
  for (let day = 0; day < A.days; day++) {
    let tot = 0; const recD = new Int32Array(D);
    for (let d = 0; d < D; d++) { let r = 0; for (let k = 0; k < 30; k++) r += rec[d * 30 + k]; recD[d] = r; tot += r; }
    for (let d = 0; d < D; d++) stopThr[d] = thr(0.002 + (tot ? (0.02 * recD[d]) / tot : 0.02 / D));
    if (day === snapshotDay) snap = { label: label.slice(), dist: dist.slice(), need: need.slice(), stopThr: stopThr.slice() };
    const slot = day % 30; for (let d = 0; d < D; d++) rec[d * 30 + slot] = 0;
    for (let i = 0; i < N; i++) {
      const off = offendDecision(seed, i, day, need[i], dist[i], label[i], oppThr, leak);
      if (off) offN[i]++;
      const stopped = stopDecision(seed, i, day, dist[i], label[i], stopThr, leak);
      if (stopped) { stopN[i]++; if (off) { arrN[i]++; rec[dist[i] * 30 + slot]++; } }
      const price = PRICE[foodOfLabel[label[i]]];
      wealth[i] += income[i] + (off ? 300 : 0);
      if (wealth[i] >= price) { wealth[i] -= price; if (need[i] > 0) need[i]--; } else if (need[i] < 20) need[i]++;
    }
  }
  return { hash: hashArrays(offN, stopN, arrN, wealth), base, label, dist, offN, stopN, arrN, wealth, snap, oppThr };
}

// The two rules under contract: they may read need, place and keyed draws; never culture.
function offendThreshold(need, d, lab, oppThr, leak) {
  if (need < 2) return 0;
  let t = oppThr[d];
  if (leak === 'id' && lab === 2) t *= 1.5; // a deliberate leak: a raw culture-ID read
  return t;
}
function offendDecision(seed, i, day, need, d, lab, oppThr, leak) {
  const t = offendThreshold(need, d, lab, oppThr, leak);
  const key = leak === 'key' ? (lab << 24) ^ i : i; // a deliberate leak: a draw keyed on culture
  return t > 0 && draw(seed, key, day, 10) < t;
}
function stopDecision(seed, i, day, d, lab, stopThr, leak) {
  const key = leak === 'key' ? (lab << 24) ^ i : i;
  return draw(seed, key, day, 11) < stopThr[d];
}

const out = { machine: machine(), args: A };

// T1: label permutation, clean against two leaks
const t1 = {};
for (const leak of ['none', 'id', 'key']) {
  let same = 0;
  for (let s = 1; s <= 10; s++) {
    const a = run({ seed: s, leak }), b = run({ seed: s, leak, perm: permutation(s) });
    if (a.hash === b.hash) same++;
  }
  t1[leak] = `${same}/10 seeds hash-identical under label permutation`;
}
out.T1_labelPermutation = t1;

// T2: decision-level swap from a day-180 snapshot
const t2 = {};
for (const leak of ['none', 'id', 'key']) {
  const r = run({ seed: 3, leak, snapshotDay: 180 });
  const sn = r.snap; let changed = 0, total = 0;
  for (let i = 0; i < N; i++) {
    const alt = (sn.label[i] + 1 + (draw(3, i, 0, 0xcafe) % (K - 1))) % K; // any other culture
    for (const fn of [0, 1]) {
      const a = fn ? stopDecision(3, i, 180, sn.dist[i], sn.label[i], sn.stopThr, leak) : offendDecision(3, i, 180, sn.need[i], sn.dist[i], sn.label[i], r.oppThr, leak);
      const b = fn ? stopDecision(3, i, 180, sn.dist[i], alt, sn.stopThr, leak) : offendDecision(3, i, 180, sn.need[i], sn.dist[i], alt, r.oppThr, leak);
      total++; if (a !== b) changed++;
    }
  }
  let thrChanged = 0;
  for (let i = 0; i < N; i++) {
    const alt = (sn.label[i] + 1 + (draw(3, i, 0, 0xcafe) % (K - 1))) % K;
    if (offendThreshold(sn.need[i], sn.dist[i], sn.label[i], r.oppThr, leak) !== offendThreshold(sn.need[i], sn.dist[i], alt, r.oppThr, leak)) thrChanged++;
  }
  t2[leak] = { changedDecisions: changed, of: total, causalDiscriminationScore: +(changed / total).toFixed(5), changedPreDrawThresholds: thrChanged, ofAgents: N };
}
out.T2_decisionSwap = t2;

// T3/T4: group rates over seeds, by the culture's identity (base), with chi-square against equal rates
function groupTest(housing, prices) {
  // agent-level units (offending clusters within agents, so person-day counts overstate significance)
  const M = N * A.seeds;
  const cult = new Uint8Array(M), ever = new Uint8Array(M), stp = new Float64Array(M), arr = new Uint8Array(M), wl = new Float64Array(M);
  for (let s = 1; s <= A.seeds; s++) {
    const r = run({ seed: 1000 + s, housing, prices });
    for (let i = 0; i < N; i++) { const m = (s - 1) * N + i; cult[m] = r.base[i]; ever[m] = r.offN[i] > 0 ? 1 : 0; stp[m] = r.stopN[i]; arr[m] = r.arrN[i] > 0 ? 1 : 0; wl[m] = r.wealth[i]; }
  }
  const gap = (lab, v) => { // max/min of group means
    const sum = new Float64Array(K), c = new Float64Array(K);
    for (let m = 0; m < M; m++) { sum[lab[m]] += v[m]; c[lab[m]]++; }
    let mn = Infinity, mx = -Infinity; for (let b = 0; b < K; b++) { const x = sum[b] / c[b]; if (x < mn) mn = x; if (x > mx) mx = x; }
    return { means: Array.from(sum, (x, b) => +(x / c[b]).toPrecision(4)), maxMin: mn > 0 ? mx / mn : Infinity };
  };
  const shuffled = new Uint8Array(M);
  const test = (v) => { // randomization test: how often a label shuffle gives a gap at least as large
    const obs = gap(cult, v);
    let ge = 0; const R = 200;
    for (let rep = 0; rep < R; rep++) {
      shuffled.set(cult);
      for (let m = M - 1; m > 0; m--) { const j = draw(rep + 1, m, 0, 0xdead) % (m + 1); const t = shuffled[m]; shuffled[m] = shuffled[j]; shuffled[j] = t; }
      if (gap(shuffled, v).maxMin >= obs.maxMin) ge++;
    }
    return { means: obs.means, maxMin: +obs.maxMin.toFixed(3), pShuffle: +((ge + 1) / (R + 1)).toFixed(4) };
  };
  return { housing, prices, seeds: A.seeds, agents: M, everOffended: test(ever), stopsPerAgent: test(stp), everArrested: test(arr), wealth: test(wl) };
}
out.T3_blindHousing_equalPrices = groupTest('blind', 'equal');
out.T3_clusteredHousing_equalPrices = groupTest('clustered', 'equal');
out.T4_blindHousing_unequalPrices = groupTest('blind', 'unequal');
save('guard.json', out);
console.log(JSON.stringify(out, null, 1));
