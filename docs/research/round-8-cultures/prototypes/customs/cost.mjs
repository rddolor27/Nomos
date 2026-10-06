// Cost of customs: per-agent bytes and daily blend, settlement culture block, migration split, save size.
// Usage: node cost.mjs
// Timings: 3 warm-up runs, then 9 samples; median [min-max]. Zero allocation inside timed loops.
import zlib from 'node:zlib';
import { hash32 } from './names.mjs';

const K = 8;          // culture slots (4-8 cultures per country)
const D = 7;          // Δβ entries: 6 food categories + 1 wares/services split
const cultureDelta = new Int32Array(K * D); // ppm of the neutral share, rows sum to zero
for (let c = 0; c < K; c++) {
  let s = 0;
  for (let k = 0; k < D - 1; k++) { const v = (hash32(7, c, k, 0) % 50001) - 25000; cultureDelta[c * D + k] = v; s += v; }
  cultureDelta[c * D + D - 1] = -s; // keep the row summing to zero
}
const median = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
function bench(fn, label, unitCount, unit) {
  for (let w = 0; w < 3; w++) fn();
  const t = [];
  for (let r = 0; r < 9; r++) { const t0 = process.hrtime.bigint(); fn(); t.push(Number(process.hrtime.bigint() - t0) / 1e6); }
  const per = x => (x * 1e6 / unitCount).toFixed(2);
  console.log(`${label}: ${median(t).toFixed(3)} ms [${Math.min(...t).toFixed(3)}-${Math.max(...t).toFixed(3)}] = ${per(median(t))} ns per ${unit} [${per(Math.min(...t))}-${per(Math.max(...t))}]`);
  return median(t);
}

// ---------- 1. Agent tier: household blend of Δβ at the day boundary ----------
for (const N of [10000, 25000, 100000]) {
  // Agents spawned household by household (adjacent indices), mean 2.46 per household as in round 6.
  const culture = new Uint8Array(N), culture2 = new Uint8Array(N), mix = new Uint8Array(N), adult = new Uint8Array(N);
  const hhStart = new Int32Array(N + 1); let H = 0;
  for (let i = 0; i < N;) {
    const size = 1 + (hash32(1, i, 0, 0) % 4) + (hash32(1, i, 1, 0) % 2 ? 0 : -0); // 1-4
    const sz = Math.min(size, N - i); hhStart[H++] = i;
    const hc = hash32(2, H, 0, 0) % 6;
    for (let j = 0; j < sz; j++) {
      culture[i + j] = hash32(3, i + j, 0, 0) % 10 < 8 ? hc : hash32(3, i + j, 1, 0) % 6;
      culture2[i + j] = hash32(4, i + j, 0, 0) % 5 === 0 ? 1 + (hash32(4, i + j, 1, 0) % 6) : 0; // 0 = none
      mix[i + j] = hash32(5, i + j, 0, 0) & 0xff; // four 2-bit domain selectors (food, festival, music, naming)
      adult[i + j] = j < 2 ? 1 : 0;
    }
    i += sz;
  }
  hhStart[H] = N;
  const hhDelta = new Int32Array(H * D), acc = new Int32Array(D);
  const blend = () => {
    for (let h = 0; h < H; h++) {
      acc.fill(0); let n = 0;
      for (let i = hhStart[h]; i < hhStart[h + 1]; i++) {
        if (!adult[i]) continue;
        const sel = mix[i] & 3, c2 = culture2[i]; // food domain selector: 0 own, 1 second, 2 half-half
        const a = culture[i] * D, b = (c2 ? c2 - 1 : culture[i]) * D;
        if (sel === 2 && c2) { for (let k = 0; k < D; k++) acc[k] += (cultureDelta[a + k] + cultureDelta[b + k]) >> 1; }
        else { const base = sel === 1 && c2 ? b : a; for (let k = 0; k < D; k++) acc[k] += cultureDelta[base + k]; }
        n++;
      }
      // Mean over adults, then put the rounding remainder on the last entry so the row still sums to zero.
      let s = 0; const o = h * D;
      for (let k = 0; k < D - 1; k++) { const v = n ? Math.trunc(acc[k] / n) : 0; hhDelta[o + k] = v; s += v; }
      hhDelta[o + D - 1] = -s;
    }
  };
  bench(blend, `blend N=${N} (${H} households)`, N, 'agent');
}
console.log('Per-agent bytes: culture 1 + second culture 1 + domain mix 1 + birth (naming) culture 1 + home region 2 = 6 B; household Δβ cache Int16 x 7 = 14 B per household (optional).');

// ---------- 2. Country tier: settlement culture counts, migration split, demand shares, save size ----------
const S = 10000, NB = 24;
const counts = new Int32Array(S * K), pop = new Int32Array(S);
// Synthetic country: settlements on a jittered grid, 6 hearths, dominant culture by nearest hearth, a mixed
// border band, then 30 years of migration mixing applied crudely (5% of people per decade drawn from neighbours).
const side = Math.ceil(Math.sqrt(S)), hx = [], hy = [];
for (let c = 0; c < 6; c++) { hx.push(hash32(9, c, 0, 0) % side); hy.push(hash32(9, c, 1, 0) % side); }
for (let s = 0; s < S; s++) {
  const x = s % side, y = (s / side) | 0;
  let best = 0, bd = 1e9, second = 0, sd = 1e9;
  for (let c = 0; c < 6; c++) { const d = (x - hx[c]) ** 2 + (y - hy[c]) ** 2; if (d < bd) { second = best; sd = bd; best = c; bd = d; } else if (d < sd) { second = c; sd = d; } }
  const p = 200 + (hash32(10, s, 0, 0) % 20000) * ((hash32(10, s, 1, 0) % 50) === 0 ? 20 : 1); // a few big towns
  pop[s] = p;
  const border = Math.sqrt(sd) - Math.sqrt(bd); // grid units from the boundary
  const share2 = border < 3 ? Math.floor(p * (3 - border) / 6) : 0;
  counts[s * K + best] = p - share2; counts[s * K + second] += share2;
}
// Neighbours: the 24 nearest grid cells (CSR as in round 5).
const nbr = new Int32Array(S * NB);
for (let s = 0; s < S; s++) { const x = s % side, y = (s / side) | 0; let k = 0; for (let dy = -2; dy <= 2 && k < NB; dy++) for (let dx = -2; dx <= 2 && k < NB; dx++) { if (!dx && !dy) continue; const nx = Math.min(side - 1, Math.max(0, x + dx)), ny = Math.min(side - 1, Math.max(0, y + dy)); nbr[s * NB + k++] = Math.min(S - 1, ny * side + nx); } }
// Monthly migration: 0.4% of each settlement leaves, split evenly over neighbours; each flow carries culture
// counts by largest remainder (ties by index), planned from a read-only copy, then applied.
const flowOut = new Int32Array(S * K), flowIn = new Int32Array(S * K), rem = new Float64Array(K), part = new Int32Array(K);
const movedBy = new Float64Array(K), stockBy = new Float64Array(K);
let MODE = 'largest', month = 0;
function migrateMonth() {
  flowOut.fill(0); flowIn.fill(0); month++;
  for (let s = 0; s < S; s++) {
    const total = Math.floor(pop[s] * 4 / 1000); if (!total) continue;
    for (let c = 0; c < K; c++) stockBy[c] += counts[s * K + c];
    for (let j = 0; j < NB; j++) {
      const f = Math.floor(total / NB) + (j < total % NB ? 1 : 0); if (!f) continue;
      // split f across cultures in proportion to counts[s]: whole parts first, then the leftover people
      let given = 0;
      for (let c = 0; c < K; c++) { const q = f * counts[s * K + c] / pop[s]; part[c] = Math.floor(q); rem[c] = q - part[c]; given += part[c]; }
      if (MODE === 'largest') {
        // deterministic largest remainder, ties by index
        while (given < f) { let bi = 0; for (let c = 1; c < K; c++) if (rem[c] > rem[bi]) bi = c; part[bi]++; rem[bi] = -1; given++; }
      } else {
        // keyed stochastic rounding: each leftover person picks a culture with probability ∝ remainder
        let k = 0;
        while (given < f) {
          let tot = 0; for (let c = 0; c < K; c++) tot += rem[c];
          let x = (hash32(77, s * NB + j, month, k++) / 4294967296) * tot, bi = 0;
          for (let c = 0; c < K; c++) { if (rem[c] <= 0) continue; bi = c; if (x < rem[c]) break; x -= rem[c]; }
          part[bi]++; rem[bi] = 0; given++;
        }
      }
      const t = nbr[s * NB + j];
      for (let c = 0; c < K; c++) { flowOut[s * K + c] += part[c]; flowIn[t * K + c] += part[c]; movedBy[c] += part[c]; }
    }
  }
  for (let i = 0; i < S * K; i++) counts[i] += flowIn[i] - flowOut[i];
  for (let s = 0; s < S; s++) { let p = 0; for (let c = 0; c < K; c++) p += counts[s * K + c]; pop[s] = p; }
}
const before = counts.reduce((a, b) => a + b, 0);
const start = counts.slice(), startPop = pop.slice();
const mixStats = () => { const n = new Array(K + 1).fill(0); for (let s = 0; s < S; s++) { let m = 0; for (let c = 0; c < K; c++) if (counts[s * K + c] > 0) m++; n[m]++; } return n.join('/'); };
for (const mode of ['largest', 'stochastic']) {
  counts.set(start); pop.set(startPop); MODE = mode; month = 0; movedBy.fill(0); stockBy.fill(0);
  for (let m = 0; m < 12 * 30; m++) migrateMonth(); // 30 years
  const after = counts.reduce((a, b) => a + b, 0);
  let neg = 0; for (let i = 0; i < S * K; i++) if (counts[i] < 0) neg++;
  // Migration rate by culture relative to the overall rate: 1.00 means each culture moves at its true share.
  const totM = movedBy.reduce((a, b) => a + b, 0), totS = stockBy.reduce((a, b) => a + b, 0);
  const rel = [...movedBy].map((m, c) => stockBy[c] ? (m / stockBy[c]) / (totM / totS) : NaN).slice(0, 6).map(x => x.toFixed(3));
  // A minority test: in settlements where a culture holds under 10%, how often do its members move?
  if (mode === 'stochastic') { globalThis.endCounts = counts.slice(); globalThis.endPop = pop.slice(); }
  console.log(`migration ${mode}: people ${before} -> ${after} (exact: ${before === after}); negative counts ${neg}; settlements hosting 0..8 cultures ${mixStats()}; move rate by culture vs average ${rel.join(', ')}`);
}
// Minority rate: one settlement, 2% minority, flows of 1-3 people a month for 30 years, both modes.
for (const mode of ['largest', 'stochastic']) {
  let maj = 9800, min = 200, movedMin = 0, movedAll = 0;
  for (let m = 0; m < 360; m++) {
    const f = 1 + (m % 3); const q = f * min / (maj + min); let pMin = Math.floor(q); const r = q - pMin;
    if (mode === 'largest') { if (r > 1 - r && pMin + 1 <= f) pMin++; }
    else if (hash32(78, 0, m, 0) / 4294967296 < r) pMin++;
    movedMin += pMin; movedAll += f;
  }
  console.log(`2% minority, flows of 1-3 people: ${mode} moves ${movedMin} minority of ${movedAll} movers (expected ${(movedAll * 0.02).toFixed(1)})`);
}
counts.set(start); pop.set(startPop); MODE = 'largest';
const snapshot = counts.slice(), popSnap = pop.slice();
for (const mode of ['largest', 'stochastic']) { MODE = mode; bench(() => { counts.set(snapshot); pop.set(popSnap); migrateMonth(); }, `migration month (${mode}), ${S} settlements x ${NB} edges`, S, 'settlement-month'); }
counts.set(globalThis.endCounts); pop.set(globalThis.endPop); // save size and demand shift on the 30-year mixed state
// Weekly demand shares per settlement: Δβ = Σ_c share_c × Δβ_c (6 food + 1 split), integer ppm.
const sDelta = new Int32Array(S * D);
bench(() => {
  for (let s = 0; s < S; s++) {
    const p = pop[s] || 1;
    for (let k = 0; k < D; k++) { let a = 0; for (let c = 0; c < K; c++) a += counts[s * K + c] * cultureDelta[c * D + k]; sDelta[s * D + k] = Math.trunc(a / p); }
  }
}, `settlement demand shift, ${S} settlements`, S, 'settlement-week');
// Save size of the culture block: dense Int32 x 8, and sparse top-3 (id Uint8 + count Int32), gzipped.
let cultured = [0, 0, 0, 0, 0, 0, 0, 0, 0];
for (let s = 0; s < S; s++) { let n = 0; for (let c = 0; c < K; c++) if (counts[s * K + c] > 0) n++; cultured[n]++; }
const dense = Buffer.from(counts.buffer);
const sparse = Buffer.alloc(S * 15);
for (let s = 0; s < S; s++) {
  const order = [...Array(K).keys()].sort((a, b) => counts[s * K + b] - counts[s * K + a] || a - b);
  for (let j = 0; j < 3; j++) { sparse.writeUInt8(order[j], s * 15 + j * 5); sparse.writeInt32LE(counts[s * K + order[j]], s * 15 + j * 5 + 1); }
}
const gz = b => zlib.gzipSync(b, { level: 9 }).length;
console.log(`settlements by number of cultures present (0..8): ${cultured.join(', ')}`);
console.log(`culture block, ${S} settlements: dense ${dense.length} B raw / ${gz(dense)} B gzip; top-3 sparse ${sparse.length} B raw / ${gz(sparse)} B gzip`);
console.log(`node ${process.version}`);
