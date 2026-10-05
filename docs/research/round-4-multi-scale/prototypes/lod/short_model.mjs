// Discrete Short et al. (2008)-style burglary model on an L x L torus. Own experiment.
// Question: what does a spatially aggregated (well-mixed) model keep and lose? Expectation from burglar
// conservation: in steady state, burglaries per site per unit time = Gamma regardless of hotspots.
function sfc32(a, b, c, d) { return function () { a |= 0; b |= 0; c |= 0; d |= 0; const t = (a + b | 0) + d | 0; d = d + 1 | 0; a = b ^ b >>> 9; b = c + (c << 3) | 0; c = (c << 21 | c >>> 11); c = c + t | 0; return (t >>> 0) / 4294967296; }; }
function run({ L = 64, dt = 0.01, omega = 1 / 15, A0 = 1 / 30, theta = 0.56, Gamma = 0.019, eta = 0.03, T = 600, Tm = 300, seed = 1 }) {
  const rand = sfc32(seed, 2, 3, 4), C = L * L;
  let B = new Float64Array(C).fill(theta * Gamma / omega), Bn = new Float64Array(C);
  const Ev = new Int32Array(C), cnt = new Float64Array(C);
  let bx = new Int32Array(1 << 20), nb = 0; // burglar positions
  // start at homogeneous equilibrium burglar density nbar = Gamma*dt/(1-exp(-Abar dt)) per site
  const Abar = A0 + theta * Gamma / omega, nbar = Gamma * dt / (1 - Math.exp(-Abar * dt));
  for (let c = 0; c < C; c++) { let k = Math.floor(nbar) + (rand() < nbar - Math.floor(nbar) ? 1 : 0); while (k--) bx[nb++] = c; }
  const steps = Math.round(T / dt), mstart = Math.round((T - Tm) / dt);
  let burgl = 0;
  for (let st = 0; st < steps; st++) {
    let w = 0;
    for (let i = 0; i < nb; i++) {
      const c = bx[i], x = c % L, y = (c / L) | 0;
      const A = A0 + B[c];
      if (rand() < 1 - Math.exp(-A * dt)) { Ev[c]++; continue; } // burgle -> removed
      const n0 = y * L + (x + 1) % L, n1 = y * L + (x + L - 1) % L, n2 = ((y + 1) % L) * L + x, n3 = ((y + L - 1) % L) * L + x;
      const a0 = A0 + B[n0], a1 = A0 + B[n1], a2 = A0 + B[n2], a3 = A0 + B[n3];
      let r = rand() * (a0 + a1 + a2 + a3);
      bx[w++] = r < a0 ? n0 : (r -= a0) < a1 ? n1 : (r -= a1) < a2 ? n2 : n3;
    }
    nb = w;
    for (let c = 0; c < C; c++) {
      const x = c % L, y = (c / L) | 0;
      const lap = B[y * L + (x + 1) % L] + B[y * L + (x + L - 1) % L] + B[((y + 1) % L) * L + x] + B[((y + L - 1) % L) * L + x];
      Bn[c] = ((1 - eta) * B[c] + eta * 0.25 * lap) * (1 - omega * dt) + theta * Ev[c];
      if (st >= mstart) { cnt[c] += Ev[c]; burgl += Ev[c]; }
      Ev[c] = 0;
      if (rand() < Gamma * dt) bx[nb++] = c; // new burglar
    }
    const t = B; B = Bn; Bn = t;
  }
  // concentration: share of burglaries in the top 5% of sites, vs a homogeneous-Poisson null with the same mean
  const sorted = Array.from(cnt).sort((p, q) => q - p); const top = Math.ceil(0.05 * C);
  let topSum = 0; for (let i = 0; i < top; i++) topSum += sorted[i];
  const mean = burgl / C; const null_ = []; const rr = sfc32(seed + 9, 7, 7, 7);
  for (let c = 0; c < C; c++) { let k = 0, p = Math.exp(-mean), s = p, u = rr(); while (u > s && k < 10000) { k++; p *= mean / k; s += p; } null_.push(k); }
  null_.sort((p, q) => q - p); let nullTop = 0; for (let i = 0; i < top; i++) nullTop += null_[i];
  let Bmax = 0, Bsum = 0; for (let c = 0; c < C; c++) { Bsum += B[c]; if (B[c] > Bmax) Bmax = B[c]; }
  return { eta, theta, Gamma, ratePerSitePerTimeOverGamma: +(burgl / C / Tm / Gamma).toFixed(3), top5pctShare: +(topSum / burgl).toFixed(3), poissonNullTop5: +(nullTop / burgl).toFixed(3), BmaxOverBmean: +(Bmax / (Bsum / C)).toFixed(1), burglars: nb };
}
const rows = [];
for (const p of [ { eta: 0.03, theta: 0.56, Gamma: 0.019 }, { eta: 0.2, theta: 0.56, Gamma: 0.019 }, { eta: 0.03, theta: 5.6, Gamma: 0.002 }, { eta: 0.2, theta: 5.6, Gamma: 0.002 } ]) {
  const t0 = Date.now(); const r = run(p); r.seconds = (Date.now() - t0) / 1000; rows.push(r);
}
console.table(rows);
