// (1) Individual-agent tick on SoA typed arrays (256x256 tiles), (2) mean-field lattice crime field per cell.
// Own measurement. Usage: node bench_abm_grid.mjs
import { rnd, timeit } from './common.mjs';
import zlib from 'node:zlib';

const W = 256, CELLS = W * W;
function makeAgents(N, seed) {
  const a = {
    N, seed,
    x: new Uint16Array(N), y: new Uint16Array(N), hx: new Uint16Array(N), hy: new Uint16Array(N),
    tx: new Uint16Array(N), ty: new Uint16Array(N),
    role: new Uint8Array(N), state: new Uint8Array(N), timer: new Uint16Array(N),
    money: new Float64Array(N), wage: new Int32Array(N), employer: new Int32Array(N), crimes: new Uint16Array(N),
    B: new Float32Array(CELLS), Bn: new Float32Array(CELLS), Ev: new Uint16Array(CELLS), police: new Uint16Array(CELLS),
    merchants: null, trueCrime: 0, recCrime: 0,
  };
  const merch = [];
  for (let i = 0; i < N; i++) {
    const r = rnd(seed, i, 0, 1);
    a.x[i] = a.hx[i] = r & 255; a.y[i] = a.hy[i] = (r >>> 8) & 255;
    a.tx[i] = (r >>> 16) & 255; a.ty[i] = (r >>> 24) & 255;
    const rr = rnd(seed, i, 0, 2) % 1000;
    a.role[i] = rr < 20 ? 1 /*police*/ : rr < 60 ? 2 /*merchant*/ : 0 /*citizen*/;
    if (a.role[i] === 2) merch.push(i);
    a.money[i] = 20000 + (rnd(seed, i, 0, 3) % 200000); a.wage[i] = 12000;
  }
  a.merchants = Int32Array.from(merch);
  return a;
}

function abmTick(a, t) {
  const { N, seed, x, y, tx, ty, hx, hy, role, state, money, B, Bn, Ev, police, merchants, crimes } = a;
  police.fill(0);
  for (let i = 0; i < N; i++) if (role[i] === 1) police[(y[i] << 8) | x[i]]++;
  const M = merchants.length;
  for (let i = 0; i < N; i++) {
    const r = rnd(seed, i, t, 0);
    // movement: one tile toward target with jitter; swap target/home on arrival
    let xi = x[i], yi = y[i];
    if (role[i] === 1) { // police: climb the hotspot field locally
      let best = B[(yi << 8) | xi], bx = xi, by = yi;
      for (let k = 0; k < 4; k++) { const nx = (xi + (k === 0 ? 1 : k === 1 ? 255 : 0)) & 255, ny = (yi + (k === 2 ? 1 : k === 3 ? 255 : 0)) & 255; const v = B[(ny << 8) | nx]; if (v > best) { best = v; bx = nx; by = ny; } }
      if ((r & 7) === 0) { bx = (xi + ((r >>> 3) % 3) - 1) & 255; by = (yi + ((r >>> 5) % 3) - 1) & 255; }
      x[i] = bx; y[i] = by; continue;
    }
    if ((r & 3) !== 0) { xi += xi < tx[i] ? 1 : xi > tx[i] ? -1 : 0; yi += yi < ty[i] ? 1 : yi > ty[i] ? -1 : 0; }
    else { xi = (xi + ((r >>> 2) % 3) - 1) & 255; yi = (yi + ((r >>> 4) % 3) - 1) & 255; }
    x[i] = xi; y[i] = yi;
    if (xi === tx[i] && yi === ty[i]) { tx[i] = hx[i]; ty[i] = hy[i]; hx[i] = xi; hy[i] = yi; }
    const c = (yi << 8) | xi;
    // Becker/Epstein-style decision: expected gain vs perceived risk from local police, plus hotspot attractiveness
    if (role[i] === 0) {
      const poor = money[i] < 30000 ? 1 : 0;
      const p16 = 6 + poor * 40 + Math.floor(B[c] * 400) - police[c] * 200; // per-tick offence propensity (16.16)
      if (p16 > 0 && ((r >>> 8) & 0xffff) < p16) {
        const v = rnd(seed, i, t, 1) % N;              // victim (random-access, cache-unfriendly)
        let take = 2000; if (take > money[v]) take = money[v];
        money[v] -= take; money[i] += take; crimes[i]++;
        Ev[c]++; a.trueCrime++; if ((rnd(seed, i, t, 2) & 0xff) < 115) a.recCrime++;
      }
    }
    // consumption: ~1 purchase per 3 ticks at a random merchant (transfer to merchant)
    if (((r >>> 24) & 3) === 0 && M > 0) {
      const m = merchants[(r >>> 26) % M]; const price = 1000;
      if (money[i] >= price && m !== i) { money[i] -= price; money[m] += price; }
    }
  }
  // hotspot field (Short et al.-style): decay + diffusion + new events
  const eta = 0.03, omega = 1 / 15 * 0.1, theta = 0.56;
  for (let yy = 0; yy < W; yy++) for (let xx = 0; xx < W; xx++) {
    const c = (yy << 8) | xx;
    const lap = B[(yy << 8) | ((xx + 1) & 255)] + B[(yy << 8) | ((xx + 255) & 255)] + B[(((yy + 1) & 255) << 8) | xx] + B[(((yy + 255) & 255) << 8) | xx];
    Bn[c] = ((1 - eta) * B[c] + eta * 0.25 * lap) * (1 - omega) + theta * Ev[c];
  }
  a.B = Bn; a.Bn = B; Ev.fill(0);
}

// mean-field lattice (expected burglars n and attractiveness B per cell), Short et al. 2008 discrete-model expectations
function makeLattice(Wd) { const C = Wd * Wd; return { Wd, n: new Float64Array(C).fill(0.1), B: new Float64Array(C).fill(0.2), nn: new Float64Array(C), Bn: new Float64Array(C), S: new Float64Array(C) }; }
function latticeTick(L) {
  const { Wd, n, B, nn, Bn, S } = L; const dt = 0.01, A0 = 1 / 30, om = 1 / 15, eta = 0.03, th = 0.56, Gam = 0.019;
  const mask = Wd - 1, sh = Math.log2(Wd) | 0;
  // S = sum of neighbour attractiveness (normaliser of the biased walk)
  for (let c = 0; c < Wd * Wd; c++) { const x = c & mask, y = c >> sh; S[c] = 4 * A0 + B[(y << sh) | ((x + 1) & mask)] + B[(y << sh) | ((x + mask) & mask)] + B[(((y + 1) & mask) << sh) | x] + B[(((y + mask) & mask) << sh) | x]; }
  for (let c = 0; c < Wd * Wd; c++) {
    const x = c & mask, y = c >> sh;
    const cE = (y << sh) | ((x + 1) & mask), cW = (y << sh) | ((x + mask) & mask), cN = (((y + 1) & mask) << sh) | x, cS = (((y + mask) & mask) << sh) | x;
    const A = A0 + B[c];
    // burglars arriving from neighbours that did not burgle (1 - A dt), weighted by A / S(neighbour)
    const inflow = A * (n[cE] * (1 - (A0 + B[cE]) * dt) / S[cE] + n[cW] * (1 - (A0 + B[cW]) * dt) / S[cW] + n[cN] * (1 - (A0 + B[cN]) * dt) / S[cN] + n[cS] * (1 - (A0 + B[cS]) * dt) / S[cS]);
    nn[c] = inflow + Gam * dt;
    const burg = n[c] * A * dt;
    Bn[c] = ((1 - eta) * B[c] + eta * 0.25 * (B[cE] + B[cW] + B[cN] + B[cS])) * (1 - om * dt) + th * burg;
  }
  L.n = nn; L.nn = n; L.B = Bn; L.Bn = B;
}

const res = [];
for (const N of [10000, 25000, 100000, 1000000]) {
  const a = makeAgents(N, 4242);
  for (let t = 1; t <= 10; t++) abmTick(a, t);
  const reps = N >= 1000000 ? 10 : 60; let tt = 10;
  const ms = timeit(() => abmTick(a, ++tt), reps);
  let msum = 0; for (let i = 0; i < N; i++) msum += a.money[i];
  res.push({ agents: N, msPerTick: +ms.toFixed(2), nsPerAgentTick: +(ms * 1e6 / N).toFixed(1), maxTicksPerSec: Math.round(1000 / ms), bytesPerAgentSoA: 2 * 6 + 1 + 1 + 2 + 8 + 4 + 4 + 2, moneyConserved: msum === (() => { const b = makeAgents(N, 4242); let s = 0; for (let i = 0; i < N; i++) s += b.money[i]; return s; })() });
}
console.table(res);

const lat = [];
for (const Wd of [256, 512, 1024]) {
  const L = makeLattice(Wd); for (let i = 0; i < 5; i++) latticeTick(L);
  const reps = Wd >= 1024 ? 10 : 40;
  const ms = timeit(() => latticeTick(L), reps);
  lat.push({ grid: `${Wd}x${Wd}`, cells: Wd * Wd, msPerStep: +ms.toFixed(2), nsPerCell: +(ms * 1e6 / (Wd * Wd)).toFixed(2), bytesPerCell: 5 * 8 });
}
console.table(lat);

// save size of 100k agents after 100 ticks
const a = makeAgents(100000, 9); for (let t = 1; t <= 100; t++) abmTick(a, t);
const arrs = [a.x, a.y, a.hx, a.hy, a.tx, a.ty, a.role, a.state, a.timer, a.money, a.wage, a.employer, a.crimes, a.B];
const raw = Buffer.concat(arrs.map(z => Buffer.from(z.buffer, z.byteOffset, z.byteLength)));
console.log(`100k agents + 256x256 field: raw ${raw.length} B, gzip-6 ${zlib.gzipSync(raw, { level: 6 }).length} B, brotli ${zlib.brotliCompressSync(raw).length} B`);
