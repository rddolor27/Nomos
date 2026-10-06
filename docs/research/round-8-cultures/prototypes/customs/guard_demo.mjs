// Guardrail demo: can tests prove that culture never enters crime, policing, hiring, wages or wealth rules,
// while still measuring honest, emergent differences caused by customs (evening festivals = night exposure)?
// Toy model, not Nomos's crime model. Deterministic integer draws: hash(seed, entity, tick, stream).
// Usage: node guard_demo.mjs [seeds=50] [agents=10000] [days=360]
// Env: SEED_BASE (default 1000), HASH=weak (the ad-hoc mixer from names.mjs, which skews the audit; default is a
// murmur3 finaliser after every input), ONLY=clean (T3 clean campaign only).
import { hash32 as weakHash } from './names.mjs';
const fmix = h => { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return (h ^ (h >>> 16)) >>> 0; };
const strongHash = (a, b, c, d) => fmix(fmix(fmix(fmix(a ^ 0x9e3779b9) ^ b) ^ c) ^ d);
const hash32 = process.env.HASH === 'weak' ? weakHash : strongHash;

const SEEDS = +(process.argv[2] || 50), N = +(process.argv[3] || 10000), DAYS = +(process.argv[4] || 360);
const P = 4, CELLS = 64, RES = 48, MARKET0 = 48, PARK0 = 56; // periods: 0 morning, 1 day, 2 evening, 3 night
const S = { CULT: 1, WORK: 2, HOME: 3, LEIS: 4, ATT: 5, STAY: 6, SHOP: 7, CARRY: 8, VICT: 9, STOP: 10, REPORT: 11, HIRE: 12, NIGHT: 13, DEST: 14 };
const U32 = 4294967296;
const chance = (h, p) => h < p * U32;

// Customs, indexed by culture INDEX; every culture-level draw is keyed by uid (stable under relabelling).
// Each culture: 10 festivals a year, same attendance; only timing differs (rest-day daytime vs evening).
function makeCustoms(mode) {
  const base = [{ uid: 101, timing: 'day' }, { uid: 202, timing: 'evening' }, { uid: 303, timing: 'mixed' }];
  return base.map((c, idx) => {
    const fest = new Map(); // day -> 'day' | 'evening'
    for (let k = 0; k < 10; k++) {
      let d = (idx * 11 + k * 36 + 5) % DAYS;
      let t = mode === 'allDay' ? 'day' : c.timing === 'mixed' ? (k % 2 ? 'evening' : 'day') : c.timing;
      if (t === 'day') while (d % 7 !== 6) d = (d + 1) % DAYS; // daytime festivals only on the rest day
      fest.set(d, t);
    }
    return { uid: c.uid, fest, park: PARK0 + 2 * idx, shareWeight: [50, 30, 20][idx] };
  });
}

// ---------------- the world ----------------
function run(seed, opts) {
  const { customs, perm = null, leak = null, logStrata = false } = opts;
  const culture = new Uint8Array(N), worker = new Uint8Array(N), home = new Uint8Array(N);
  const wealth = new Float64Array(N), victim = new Uint32Array(N), stops = new Uint32Array(N), employed = new Uint8Array(N);
  const loc = new Uint8Array(N), out = new Uint8Array(N), carry = new Uint8Array(N);
  // Culture assignment is independent of everything else (its own stream); perm relabels indices consistently.
  for (let i = 0; i < N; i++) {
    const h = hash32(seed, i, 0, S.CULT) % 100;
    let c = h < 50 ? 0 : h < 80 ? 1 : 2;
    culture[i] = perm ? perm[c] : c;
    worker[i] = hash32(seed, i, 0, S.WORK) % 100 < 80 ? 1 : 0;
    employed[i] = worker[i];
    home[i] = hash32(seed, i, 0, S.HOME) % RES;
  }
  const cust = perm ? permuteCustoms(customs, perm) : customs;
  const recorded = new Float64Array(CELLS * P * 30); // 30-day ring of recorded crime per cell-period
  const patrol = new Float64Array(CELLS * P);
  const UNITS = 12;
  // Stratified exposure/event logs: [culture][stratum] for victimisation and stops.
  const strataN = CELLS * P * 2;
  const expC = [0, 1, 2].map(() => new Float64Array(strataN)), vicC = [0, 1, 2].map(() => new Float64Array(strataN)), stpC = [0, 1, 2].map(() => new Float64Array(strataN));
  const fine = logStrata ? new Map() : null; // key (cell, tick, carry) -> per-culture [E0,E1,E2,v0,v1,v2,s0,s1,s2]
  let flipFails = 0, flipChecks = 0;

  for (let day = 0; day < DAYS; day++) {
    const rest = day % 7 === 6;
    // Patrol allocation from recorded crime over the last 30 days (largest remainder), culture-blind.
    allocatePatrol(recorded, patrol, UNITS);
    for (let per = 0; per < P; per++) {
      const tick = day * P + per;
      // 1. Behaviour (may depend on customs): where is each agent, outdoors or not, carrying goods or not.
      for (let i = 0; i < N; i++) {
        const cu = cust[culture[i]];
        const fToday = cu.fest.get(day), fTomorrow = cu.fest.get((day + 1) % DAYS);
        const attends = fToday && chance(hash32(seed, i, day, S.ATT), 0.6);
        let o = 0, l = home[i], ca = 0;
        if (per === 0) { if (worker[i] && !rest) { o = 1; l = home[i]; } }
        else if (per === 1) {
          if (attends && fToday === 'day') { o = 1; l = cu.park; }
          else if (rest ? chance(hash32(seed, i, tick, S.LEIS), 0.3) : (!worker[i] && chance(hash32(seed, i, tick, S.LEIS), 0.25))) { o = 1; l = MARKET0 + hash32(seed, i, tick, S.DEST) % 16; }
        } else if (per === 2) {
          if (attends && fToday === 'evening') { o = 1; l = cu.park; }
          else if (fTomorrow && chance(hash32(seed, i, day, S.SHOP), 0.4)) { o = 1; l = MARKET0 + hash32(seed, i, tick, S.DEST) % 8; ca = 1; }
          else if (chance(hash32(seed, i, tick, S.LEIS), 0.2)) { o = 1; l = MARKET0 + hash32(seed, i, tick, S.DEST) % 16; ca = l < PARK0 && chance(hash32(seed, i, tick, S.CARRY), 0.3) ? 1 : 0; }
        } else {
          if (attends && fToday === 'evening' && chance(hash32(seed, i, day, S.STAY), 0.5)) { o = 1; l = cu.park; }
          else if (chance(hash32(seed, i, tick, S.NIGHT), 0.03)) { o = 1; l = hash32(seed, i, tick, S.DEST) % CELLS; }
        }
        out[i] = o; loc[i] = l; carry[i] = ca;
      }
      // 2. Guarded systems: victimisation, stops, reporting, losses. They may read place, time, visible cues.
      for (let i = 0; i < N; i++) {
        if (!out[i]) continue;
        const v = victimised(seed, i, tick, per, loc[i], patrol);
        const s = stopped(seed, i, tick, per, loc[i], carry[i], patrol, leak, culture, cust, day);
        if (v) { victim[i]++; wealth[i] -= 500; if (chance(hash32(seed, i, tick, S.REPORT), 0.45)) recorded[(day % 30) * CELLS * P + loc[i] * P + per]++; }
        if (s) stops[i]++;
        const st = (loc[i] * P + per) * 2 + carry[i], c = perm ? perm.indexOf(culture[i]) : culture[i]; // log by ORIGINAL culture
        expC[c][st]++; vicC[c][st] += v; stpC[c][st] += s;
        if (fine) { const key = (loc[i] * DAYS * P + tick) * 2 + carry[i]; let a = fine.get(key); if (!a) fine.set(key, a = new Float64Array(9)); a[c]++; a[3 + c] += v; a[6 + c] += s; }
      }
      // One-step flip test (T2) on one seed, every tick: shuffle the culture column, rerun the guarded
      // decisions for this tick on the SAME behaviour state, and require identical outputs.
      if (opts.flip) {
        // Compare the integer thresholds each decision computes BEFORE its draw, not the realised yes/no:
        // a leak that shifts a rare event's threshold almost never flips a single draw.
        const shuffled = new Uint8Array(N); for (let i = 0; i < N; i++) shuffled[i] = culture[(i * 7919 + 13) % N];
        for (let i = 0; i < N; i++) {
          if (!out[i]) continue; flipChecks++;
          const a = stopQ(per, loc[i], carry[i], patrol, leak, culture, cust, day, i);
          const b = stopQ(per, loc[i], carry[i], patrol, leak, shuffled, cust, day, i);
          if (a !== b || hireQ(i, employed, culture, leak) !== hireQ(i, employed, shuffled, leak)) flipFails++;
          if (opts.flipOutcomes) {
            if (stopped(seed, i, tick, per, loc[i], carry[i], patrol, leak, culture, cust, day) !== stopped(seed, i, tick, per, loc[i], carry[i], patrol, leak, shuffled, cust, day)) opts.flipOutcomes.n++;
          }
        }
      }
    }
    // Daily economy: culture-blind income and hiring; spending composition may differ, total does not.
    for (let i = 0; i < N; i++) {
      if (!employed[i] && hired(seed, i, day, employed, culture, leak)) employed[i] = 1;
      wealth[i] += employed[i] ? 100 : 40;
    }
    // Clear tomorrow's ring slot.
    recorded.fill(0, ((day + 1) % 30) * CELLS * P, ((day + 1) % 30 + 1) * CELLS * P);
  }
  return { culture, wealth, victim, stops, employed, expC, vicC, stpC, fine, flipFails, flipChecks, perm };
}

function permuteCustoms(customs, perm) { const out = new Array(customs.length); for (let c = 0; c < customs.length; c++) out[perm[c]] = customs[c]; return out; }

function allocatePatrol(recorded, patrol, units) {
  patrol.fill(0); const tot = new Float64Array(CELLS * P); let sum = 0;
  for (let d = 0; d < 30; d++) for (let k = 0; k < CELLS * P; k++) { tot[k] += recorded[d * CELLS * P + k]; }
  for (let k = 0; k < CELLS * P; k++) sum += tot[k];
  if (sum === 0) return;
  let given = 0; const rem = [];
  for (let k = 0; k < CELLS * P; k++) { const q = units * tot[k] / sum; patrol[k] = Math.floor(q); given += patrol[k]; rem.push([q - patrol[k], k]); }
  rem.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let j = 0; given < units; j++, given++) patrol[rem[j][1]]++;
}

const BASE_V = [1.0e-4, 0.5e-4, 2.0e-4, 6.0e-4];
function cellMultV(l, per) { if (l >= PARK0) return [1, 0.8, 1.2, 2.0][per]; if (l >= MARKET0) return [1, 1.2, 1.5, 1.0][per]; return 1; }
function victimised(seed, i, tick, per, l, patrol) {
  const u = Math.min(patrol[l * P + per], 1);
  return chance(hash32(seed, i, tick, S.VICT), BASE_V[per] * cellMultV(l, per) * (1 - 0.3 * u)) ? 1 : 0;
}
// Each guarded decision computes an integer threshold (ppm), then compares one keyed draw against it.
function stopQ(per, l, ca, patrol, leak, culture, cust, day, i) {
  let q = 4000 * patrol[l * P + per] * (1 + ca); // ppm; police see place, time and carried goods only
  if (leak === 'id' && culture[i] === 1 && per >= 2) q = Math.floor(q * 5 / 4);                   // L2 reads the id
  if (leak === 'custom' && cust[culture[i]].fest.get(day) === 'evening' && per >= 2) q = Math.floor(q * 5 / 4); // L1 reads a custom
  return q;
}
function stopped(seed, i, tick, per, l, ca, patrol, leak, culture, cust, day) {
  return hash32(seed, i, tick, S.STOP) % 1000000 < stopQ(per, l, ca, patrol, leak, culture, cust, day, i) ? 1 : 0;
}
function hireQ(i, employed, culture, leak) {
  if (employed[i]) return 0;
  return leak === 'hire' && culture[i] === 2 ? 8000 : 10000; // ppm per day
}
function hired(seed, i, t, employed, culture, leak) { return hash32(seed, i, t, S.HIRE) % 1000000 < hireQ(i, employed, culture, leak) ? 1 : 0; }

// ---------------- measurement ----------------
function stateHash(r) { // hash of every non-culture outcome column
  let h = 0x811c9dc5;
  const mix = x => { h = Math.imul(h ^ (x >>> 0), 16777619); h = Math.imul(h ^ ((x / U32) >>> 0), 16777619); };
  for (let i = 0; i < N; i++) { mix(r.wealth[i]); mix(r.victim[i]); mix(r.stops[i]); mix(r.employed[i]); }
  return (h >>> 0).toString(16);
}
function perCapita(r, field) { const s = [0, 0, 0], n = [0, 0, 0]; for (let i = 0; i < N; i++) { const c = r.perm ? r.perm.indexOf(r.culture[i]) : r.culture[i]; s[c] += r[field][i]; n[c]++; } return s.map((x, c) => x / n[c]); }
function mhLogRR(E, Ev, a, b) { // Mantel-Haenszel rate ratio culture a vs b over strata (person-time form)
  let num = 0, den = 0;
  for (let s = 0; s < E[a].length; s++) { const T = E[a][s] + E[b][s]; if (!T || !E[a][s] || !E[b][s]) continue; num += Ev[a][s] * E[b][s] / T; den += Ev[b][s] * E[a][s] / T; }
  return Math.log(num / den);
}
function mhFine(fine, off, a, b, perMin = 0) {
  let num = 0, den = 0;
  for (const [key, v] of fine) {
    if (perMin && ((key >> 1) % (DAYS * P)) % P < perMin) continue; // optional: evening and night strata only
    const T = v[a] + v[b]; if (!v[a] || !v[b]) continue; num += v[off + a] * v[b] / T; den += v[off + b] * v[a] / T;
  }
  return Math.log(num / den);
}
function kitagawa(r, field, a, b) { // per-capita gap = exposure part + rate part, over coarse strata
  const Ev = field === 'victim' ? r.vicC : r.stpC; const n = [0, 0, 0];
  for (let i = 0; i < N; i++) n[r.perm ? r.perm.indexOf(r.culture[i]) : r.culture[i]]++;
  let expo = 0, rate = 0;
  for (let s = 0; s < r.expC[a].length; s++) {
    const ea = r.expC[a][s] / n[a], eb = r.expC[b][s] / n[b];
    const ra = r.expC[a][s] ? Ev[a][s] / r.expC[a][s] : 0, rb = r.expC[b][s] ? Ev[b][s] / r.expC[b][s] : 0;
    expo += (ea - eb) * (ra + rb) / 2; rate += (ra - rb) * (ea + eb) / 2;
  }
  return { expo, rate };
}
const meanCI = xs => { const m = xs.reduce((s, x) => s + x, 0) / xs.length; const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); const h = 2.01 * sd / Math.sqrt(xs.length); return [m, m - h, m + h]; };
const fmt = ([m, lo, hi]) => `${Math.exp(m).toFixed(3)} [${Math.exp(lo).toFixed(3)}-${Math.exp(hi).toFixed(3)}]`;

// ---------------- the tests ----------------
const t0 = performance.now();
const customs = makeCustoms('asSpecified'), customsDay = makeCustoms('allDay');
const report = { node: process.version, seeds: SEEDS, agents: N, days: DAYS };

// T1: relabelling equivariance (bit-exact) on 3 seeds, clean and with each planted leak.
const PERM = [2, 0, 1];
report.T1 = {}; report.hash = process.env.HASH === 'weak' ? 'weak' : 'strong';
if (!process.env.ONLY) for (const leak of [null, 'custom', 'id', 'hire']) {
  let same = 0; for (let s = 1; s <= 3; s++) { const a = run(s, { customs, leak }), b = run(s, { customs, perm: PERM, leak }); same += stateHash(a) === stateHash(b); }
  report.T1[leak || 'clean'] = `${same}/3 identical`;
}
// T2: one-step flip test.
report.T2 = {};
if (!process.env.ONLY) for (const leak of [null, 'custom', 'id', 'hire']) {
  const fo = { n: 0 }; const r = run(1, { customs, leak, flip: true, flipOutcomes: fo });
  report.T2[leak || 'clean'] = `thresholds changed in ${r.flipFails} of ${r.flipChecks} outdoor agent-ticks; realised stops changed in ${fo.n}`;
}

// T3/T4: paired seeds; per-capita ratios (raw), MH ratios by coarse and fine strata, Kitagawa split.
function campaign(label, cs, leak) {
  const raw = { v1: [], v2: [], s1: [], s2: [], w1: [], w2: [] }, mhC = { v1: [], v2: [], s1: [], s2: [] }, mhF = { v1: [], v2: [], s1: [], s2: [] }, kit = { vExpo: [], vRate: [], sExpo: [], sRate: [] };
  for (let s = 1; s <= SEEDS; s++) {
    const r = run(+(process.env.SEED_BASE || 1000) + s, { customs: cs, leak, logStrata: true });
    const v = perCapita(r, 'victim'), st = perCapita(r, 'stops'), w = perCapita(r, 'wealth');
    raw.v1.push(Math.log(v[1] / v[0])); raw.v2.push(Math.log(v[2] / v[0])); raw.s1.push(Math.log(st[1] / st[0])); raw.s2.push(Math.log(st[2] / st[0]));
    raw.w1.push(w[1] - w[0]); raw.w2.push(w[2] - w[0]);
    mhC.v1.push(mhLogRR(r.expC, r.vicC, 1, 0)); mhC.s1.push(mhLogRR(r.expC, r.stpC, 1, 0)); mhC.s2.push(mhLogRR(r.expC, r.stpC, 2, 0)); mhC.v2.push(mhLogRR(r.expC, r.vicC, 2, 0));
    mhF.v1.push(mhFine(r.fine, 3, 1, 0)); mhF.s1.push(mhFine(r.fine, 6, 1, 0)); mhF.s2.push(mhFine(r.fine, 6, 2, 0)); mhF.v2.push(mhFine(r.fine, 3, 2, 0)); mhF.s1en ??= []; mhF.s1en.push(mhFine(r.fine, 6, 1, 0, 2));
    const kv = kitagawa(r, 'victim', 1, 0), ks = kitagawa(r, 'stops', 1, 0); kit.vExpo.push(kv.expo); kit.vRate.push(kv.rate); kit.sExpo.push(ks.expo); kit.sRate.push(ks.rate);
  }
  const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
  perSeed[label] = { raw, mhC, mhF };
  report[label] = {
    raw_victim_ratio_c1_vs_c0: fmt(meanCI(raw.v1)), raw_victim_ratio_c2_vs_c0: fmt(meanCI(raw.v2)),
    raw_stop_ratio_c1_vs_c0: fmt(meanCI(raw.s1)), raw_stop_ratio_c2_vs_c0: fmt(meanCI(raw.s2)),
    wealth_gap_cents_c1_minus_c0: meanCI(raw.w1).map(x => +x.toFixed(1)), wealth_gap_cents_c2_minus_c0: meanCI(raw.w2).map(x => +x.toFixed(1)),
    mh_coarse_victim_c1: fmt(meanCI(mhC.v1)), mh_coarse_stop_c1: fmt(meanCI(mhC.s1)), mh_coarse_stop_c2: fmt(meanCI(mhC.s2)),
    mh_fine_victim_c1: fmt(meanCI(mhF.v1)), mh_coarse_victim_c2: fmt(meanCI(mhC.v2)), mh_fine_victim_c2: fmt(meanCI(mhF.v2)), mh_fine_stop_c1: fmt(meanCI(mhF.s1)), mh_fine_stop_c2: fmt(meanCI(mhF.s2)), mh_fine_stop_c1_evening_night: fmt(meanCI(mhF.s1en)),
    kitagawa_victim_c1_minus_c0_per_capita: { exposure: +mean(kit.vExpo).toFixed(5), rate: +mean(kit.vRate).toFixed(5) },
    kitagawa_stop_c1_minus_c0_per_capita: { exposure: +mean(kit.sExpo).toFixed(5), rate: +mean(kit.sRate).toFixed(5) },
  };
}
const perSeed = {};
campaign('T3_clean', customs, null);
if (!process.env.ONLY) { campaign('T3_leak_id', customs, 'id'); campaign('T4_all_daytime_festivals', customsDay, null); }
// Paired seeds: the same seeds give the same agents, jobs and homes, so differences isolate the change.
const pair = (A, B, f) => meanCI(perSeed[A][f[0]][f[1]].map((x, k) => x - perSeed[B][f[0]][f[1]][k]));
if (!process.env.ONLY) report.paired = {
  evening_vs_daytime_raw_victim_ratio_c1: fmt(pair('T3_clean', 'T4_all_daytime_festivals', ['raw', 'v1'])),
  evening_vs_daytime_raw_stop_ratio_c1: fmt(pair('T3_clean', 'T4_all_daytime_festivals', ['raw', 's1'])),
  evening_vs_daytime_wealth_gap_c1_cents: pair('T3_clean', 'T4_all_daytime_festivals', ['raw', 'w1']).map(x => +x.toFixed(1)),
  leak_vs_clean_mh_fine_stop_c1: fmt(pair('T3_leak_id', 'T3_clean', ['mhF', 's1'])),
  leak_vs_clean_raw_stop_c1: fmt(pair('T3_leak_id', 'T3_clean', ['raw', 's1'])),
};
report.seconds = +((performance.now() - t0) / 1000).toFixed(1);
console.log(JSON.stringify(report, null, 1));
