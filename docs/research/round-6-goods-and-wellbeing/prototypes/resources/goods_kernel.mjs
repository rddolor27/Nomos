// Throwaway research code (round 6, question 1: resources and production). Never import.
// Integer settlement-day goods kernel: extraction with regrowth, recipes, consumption,
// band pricing and plan-then-apply trade on a CSR graph. Measures ns per settlement-day,
// and checks goods conservation, money conservation and order independence.
// Run: node goods_kernel.mjs [quick]

const G = 8; // goods and sectors share indices
const GRAIN = 0, FRESH = 1, TIMBER = 2, STONE = 3, METAL = 4, FUEL = 5, WARES = 6, SERVICES = 7;
const NAMES = ['grain', 'fresh', 'timber', 'stone', 'metal', 'fuel', 'wares', 'services'];
// Tradable order: the first T goods in this list trade between settlements.
const TRADE_ORDER = new Int32Array([GRAIN, METAL, WARES, TIMBER, FUEL, STONE, FRESH]);

const Q16 = 65536, Q24 = 16777216;
const YEAR = 360, HARVEST_START = 240, HARVEST_END = 270;

function mix32(x) {
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15; x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16; return x >>> 0;
}
function draw(seed, entity, tick, stream) {
  return mix32(mix32(mix32(mix32(seed) ^ entity) ^ tick) ^ (stream + 0x9e3779b9));
}
function stochRound(n, p16, r) { // n * p16 / 65536 with an unbiased integer result
  const prod = n * p16, base = Math.floor(prod / Q16);
  return base + (((r & 0xffff) < prod - base * Q16) ? 1 : 0);
}
// Inverse-normal table: built here with Math.log only because this is a prototype;
// the product would ship it as build-time data.
const ZLUT = new Float64Array(4096);
{
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549671010738239, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  for (let i = 0; i < 4096; i++) {
    const p = (i + 0.5) / 4096; let q, r, x;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    else if (p <= 1 - 0.02425) { q = p - 0.5; r = q*q; x = (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1); }
    else { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    ZLUT[i] = x;
  }
}

// Per-good constants (illustrative, not calibrated).
const BASE_PRICE = new Int32Array([60, 250, 900, 300, 2500, 400, 1500, 1200]); // cents per unit
const DECAY_Q16 = new Int32Array([24, 4096, 8, 0, 0, 16, 8, 65536]);           // share lost per day
const COVER_DAYS = new Int32Array([30, 5, 30, 30, 30, 20, 45, 0]);            // target stock in days of demand
const TAU = new Int32Array([1, 4, 2, 2, 1, 1, 1, 0]);                          // transport cents per unit-km
const DEMAND_PER_1K = new Int32Array([500, 400, 20, 30, 2, 150, 40, 300]);      // units per 1,000 people per day
const OUT_PER_WORKER = new Int32Array([6, 3, 2, 3, 1, 3, 2, 3]);                // units per worker-day (grain accrues)

const S_SEED = 0x5eed;
const ST_WEATHER = 1, ST_DECAY = 2, ST_TRADE = 3;

function makeWorld(N, k) {
  const side = Math.ceil(Math.sqrt(N));
  const w = {
    N, k,
    pop: new Int32Array(N), workers: new Int32Array(N * G),
    stock: new Float64Array(N * G), price: new Int32Array(N * G), demand: new Int32Array(N * G),
    unmet: new Int32Array(N * G),
    standing: new Float64Array(N), fert: new Int32Array(N), shock: new Int32Array(N),
    fishB: new Float64Array(N), fishK: new Float64Array(N), forestV: new Float64Array(N), forestK: new Float64Array(N),
    ore: new Float64Array(N), ore0: new Float64Array(N),
    hh: new Float64Array(N), firm: new Float64Array(N), mint: 0,
    acc: new Float64Array(G * 5), // produced, consumed, decayed, lost, used as input
  };
  for (let s = 0; s < N; s++) {
    const r = draw(S_SEED, s, 0, 99);
    const p = 500 + (r % 20000); // 500..20,499 people
    w.pop[s] = p;
    const workforce = Math.floor(p * 45 / 100);
    // Lower-middle-income-like mix: 41% agriculture split grain/fresh, 22% industry, 37% services.
    const shares = [30, 11, 4, 3, 2, 3, 10, 37];
    for (let g = 0; g < G; g++) w.workers[s * G + g] = Math.floor(workforce * shares[g] / 100);
    for (let g = 0; g < G; g++) {
      w.demand[s * G + g] = Math.floor(p * DEMAND_PER_1K[g] / 1000);
      w.price[s * G + g] = BASE_PRICE[g];
      w.stock[s * G + g] = w.demand[s * G + g] * COVER_DAYS[g];
    }
    w.fert[s] = 52429; // 0.8 in Q16
    w.shock[s] = Q16;
    w.fishK[s] = 2000000 + (r % 1000000); w.fishB[s] = Math.floor(w.fishK[s] * 6 / 10);
    w.forestK[s] = 5000000 + (r % 3000000); w.forestV[s] = Math.floor(w.forestK[s] * 7 / 10);
    w.ore0[s] = (r & 3) === 0 ? 20000000 : 0; w.ore[s] = w.ore0[s];
    const cash = p * 50000; // cents
    w.hh[s] = cash; w.firm[s] = cash; w.mint -= 2 * cash;
  }
  // CSR graph on a grid: k = 8 (3x3) or 24 (5x5) neighbourhood, distance in km.
  const rad = k === 24 ? 2 : 1;
  const row = new Int32Array(N + 1); const colTmp = []; const distTmp = [];
  for (let s = 0; s < N; s++) {
    row[s] = colTmp.length;
    const x = s % side, y = Math.floor(s / side);
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= side || ny >= side) continue;
      const j = ny * side + nx; if (j >= N) continue;
      colTmp.push(j); distTmp.push(Math.round(10 * Math.sqrt(dx * dx + dy * dy))); // build time only
    }
  }
  row[N] = colTmp.length;
  w.row = row; w.col = Int32Array.from(colTmp); w.dist = Int32Array.from(distTmp);
  w.plan = new Int32Array(w.col.length * TRADE_ORDER.length);
  return w;
}

// Logistic regrowth with the CMSY depensation term below K/4 (Froese et al. 2017, eq. 1-2).
function regrow(B, K, rQ24) {
  if (B <= 0 || B >= K) return 0;
  const frac = Math.floor((K - B) * Q16 / K);
  let g = Math.floor(Math.floor(B * rQ24 / Q24) * frac / Q16);
  if (B * 4 < K) g = Math.floor(g * Math.floor(B * Q16 / K) * 4 / Q16);
  return g;
}

const FISH_R_Q24 = Math.round(0.6 / YEAR * Q24);    // r = 0.6 a year (medium-high resilience)
const FOREST_R_Q24 = Math.round(0.06 / YEAR * Q24); // r = 0.06 a year
const FERT_MIN = 26214, FERT_MAX = Q16;             // 0.4 .. 1.0

function localDay(w, s, day) {
  const b = s * G, doy = day % YEAR, acc = w.acc;
  const st = w.stock, wk = w.workers;
  // Grain: accrue a standing crop daily, harvest it over 30 days with this year's fertility and weather.
  w.standing[s] += wk[b + GRAIN] * OUT_PER_WORKER[GRAIN];
  if (doy === HARVEST_START) {
    let sh = Q16 + Math.floor(11141 * ZLUT[draw(S_SEED, s, Math.floor(day / YEAR), ST_WEATHER) & 4095]); // sd 0.17
    if (sh < 13107) sh = 13107; if (sh > 104858) sh = 104858;
    w.shock[s] = sh;
  }
  if (doy >= HARVEST_START && doy < HARVEST_END) {
    const take = Math.floor(w.standing[s] / (HARVEST_END - doy));
    w.standing[s] -= take;
    const out = Math.floor(Math.floor(take * w.fert[s] / Q16) * w.shock[s] / Q16);
    st[b + GRAIN] += out; acc[GRAIN] += out;
    if (doy === HARVEST_END - 1) { // continuous cropping drifts fertility toward its floor; fresh-food sector (livestock manure) lifts it
      const eq = FERT_MIN + Math.floor((FERT_MAX - FERT_MIN) * Math.min(Q16, Math.floor(wk[b + FRESH] * Q16 * 3 / (wk[b + GRAIN] + 1))) / Q16);
      w.fert[s] += (eq - w.fert[s]) >> 3;
    }
  }
  // Fresh food: livestock output plus a fishery with logistic regrowth.
  const fishers = wk[b + FRESH] >> 1;
  const B = w.fishB[s], K = w.fishK[s];
  let caught = fishers * Math.floor(B * 40 / Q24); // catchability per fisher-day
  if (caught > B) caught = B;
  w.fishB[s] = B - caught + regrow(B, K, FISH_R_Q24);
  let out = (wk[b + FRESH] - fishers) * OUT_PER_WORKER[FRESH] + caught;
  st[b + FRESH] += out; acc[FRESH] += out;
  // Timber: logging capped by the standing volume, logistic regrowth.
  const V = w.forestV[s];
  let logged = wk[b + TIMBER] * OUT_PER_WORKER[TIMBER];
  if (logged > V) logged = V;
  w.forestV[s] = V - logged + regrow(V, w.forestK[s], FOREST_R_Q24);
  st[b + TIMBER] += logged; acc[TIMBER] += logged;
  // Stone: unlimited quarry.
  out = wk[b + STONE] * OUT_PER_WORKER[STONE]; st[b + STONE] += out; acc[STONE] += out;
  // Metal: output per miner falls with the remaining share of the deposit (grade decline).
  if (w.ore0[s] > 0) {
    out = Math.floor(wk[b + METAL] * OUT_PER_WORKER[METAL] * Math.floor(w.ore[s] * Q16 / w.ore0[s]) / Q16);
    if (out * 10 > w.ore[s]) out = Math.floor(w.ore[s] / 10);
    w.ore[s] -= out * 10; st[b + METAL] += out; acc[METAL] += out;
  }
  // Recipes: 1 timber -> 3 fuel; 1 metal + 2 timber -> 4 wares; capacity set by workers.
  let batches = wk[b + FUEL]; if (batches > st[b + TIMBER]) batches = st[b + TIMBER];
  st[b + TIMBER] -= batches; acc[4 * G + TIMBER] += batches; st[b + FUEL] += batches * 3; acc[FUEL] += batches * 3;
  batches = wk[b + WARES] >> 1;
  if (batches > st[b + METAL]) batches = st[b + METAL];
  if (batches * 2 > st[b + TIMBER]) batches = Math.floor(st[b + TIMBER] / 2);
  st[b + METAL] -= batches; st[b + TIMBER] -= batches * 2;
  acc[4 * G + METAL] += batches; acc[4 * G + TIMBER] += batches * 2;
  st[b + WARES] += batches * 4; acc[WARES] += batches * 4;
  out = wk[b + SERVICES] * OUT_PER_WORKER[SERVICES]; st[b + SERVICES] += out; acc[SERVICES] += out;
  // Consumption, paid from household cents to firm cents.
  for (let g = 0; g < G; g++) {
    const i = b + g, p = w.price[i];
    let got = w.demand[i]; if (got > st[i]) got = st[i];
    const afford = Math.floor(w.hh[s] / p); if (got > afford) got = afford;
    st[i] -= got; acc[G + g] += got; w.unmet[i] = w.demand[i] - got;
    const pay = got * p; w.hh[s] -= pay; w.firm[s] += pay;
  }
  // Decay (services perish fully).
  for (let g = 0; g < G; g++) {
    const i = b + g; if (DECAY_Q16[g] === 0 || st[i] === 0) continue;
    const lost = stochRound(st[i], DECAY_Q16[g], draw(S_SEED, s, day, ST_DECAY * 16 + g));
    st[i] -= lost; acc[2 * G + g] += lost;
  }
  // Band pricing: about 1.5% steps when stock leaves 75-125% of target, clamped to 25-175% of base.
  for (let g = 0; g < SERVICES; g++) {
    const i = b + g, tg = w.demand[i] * COVER_DAYS[g];
    let p = w.price[i];
    if (st[i] * 4 < tg * 3) p += 1 + (p * 983 >> 16);
    else if (st[i] * 4 > tg * 5) p -= 1 + (p * 983 >> 16);
    const lo = BASE_PRICE[g] >> 2, hi = (BASE_PRICE[g] * 7) >> 2;
    w.price[i] = p < lo ? lo : (p > hi ? hi : p);
  }
  // Wages: firms pay 1/32 of cash a day to households.
  const wage = Math.floor(w.firm[s] / 32); w.firm[s] -= wage; w.hh[s] += wage;
}

// Trade: plan from a read-only snapshot, then apply in fixed edge order.
function tradeDay(w, T, R, day) {
  const N = w.N, row = w.row, col = w.col, dist = w.dist, plan = w.plan, st = w.stock, pr = w.price;
  for (let s = 0; s < N; s++) {
    if (R !== 1 && (s + day) % R !== 0) continue; // round-robin: inactive origins skip their edges
    for (let e = row[s]; e < row[s + 1]; e++) {
      const j = col[e], d = dist[e], base = e * T;
      for (let t = 0; t < T; t++) {
        const g = TRADE_ORDER[t];
        let q = 0;
        const i = s * G + g, jj = j * G + g;
        const margin = pr[jj] - (pr[jj] * d >> 12) - pr[i] - TAU[g] * d; // loss ~ d/4096 per unit
        const surplus = st[i] - w.demand[i] * COVER_DAYS[g];
        if (margin > 0 && surplus > 0) {
          q = surplus >> 4; // at most 1/16 of surplus per edge; apply caps at the origin's stock
          const need = w.demand[jj] * COVER_DAYS[g] * 2 - st[jj];
          if (q > need) q = need > 0 ? need : 0;
        }
        plan[base + t] = q;
      }
    }
  }
  const acc = w.acc;
  for (let s = 0; s < N; s++) {
    if (R !== 1 && (s + day) % R !== 0) continue;
    for (let e = row[s]; e < row[s + 1]; e++) {
      const j = col[e], d = dist[e], base = e * T;
      for (let t = 0; t < T; t++) {
        let q = plan[base + t]; if (q === 0) continue;
        const g = TRADE_ORDER[t], i = s * G + g, jj = j * G + g;
        if (q > st[i]) q = st[i];
        const pay = q * pr[i] + q * TAU[g] * d; // buyer pays origin price plus freight, kept by the seller's firms here
        if (pay > w.firm[j]) continue;
        const lost = Math.floor(q * d / 4096);
        st[i] -= q; st[jj] += q - lost; acc[3 * G + g] += lost;
        w.firm[j] -= pay; w.firm[s] += pay;
      }
    }
  }
}

function stateHash(w) {
  let h = 0x811c9dc5;
  const mixIn = (v) => { h = mix32(h ^ (v | 0)); h = mix32(h ^ Math.floor(v / 4294967296)); };
  for (let i = 0; i < w.stock.length; i++) { mixIn(w.stock[i]); mixIn(w.price[i]); }
  for (let s = 0; s < w.N; s++) { mixIn(w.hh[s]); mixIn(w.firm[s]); mixIn(w.fishB[s]); mixIn(w.forestV[s]); mixIn(w.ore[s]); mixIn(w.fert[s]); }
  return h >>> 0;
}
function totals(w) {
  const t = new Float64Array(G);
  for (let s = 0; s < w.N; s++) for (let g = 0; g < G; g++) t[g] += w.stock[s * G + g];
  return t;
}
function moneySum(w) { let m = w.mint; for (let s = 0; s < w.N; s++) m += w.hh[s] + w.firm[s]; return m; }

function runDays(w, days, startDay, T, R, reverse) {
  for (let d = 0; d < days; d++) {
    const day = startDay + d;
    if (reverse) { for (let s = w.N - 1; s >= 0; s--) localDay(w, s, day); }
    else { for (let s = 0; s < w.N; s++) localDay(w, s, day); }
    if (T > 0) tradeDay(w, T, R, day);
  }
}

function checks() {
  const N = 1000, k = 8, T = 5, days = 720;
  const a = makeWorld(N, k), b = makeWorld(N, k);
  const t0 = totals(a);
  runDays(a, days, 0, T, 1, false);
  runDays(b, days, 0, T, 1, true);
  const t1 = totals(a);
  let goodsOk = true;
  for (let g = 0; g < G; g++) {
    const acc = a.acc;
    const expect = t0[g] + acc[g] - acc[G + g] - acc[2 * G + g] - acc[3 * G + g] - acc[4 * G + g];
    if (expect !== t1[g]) goodsOk = false;
  }
  const unmet = new Float64Array(G), dem = new Float64Array(G);
  for (let s = 0; s < N; s++) for (let g = 0; g < G; g++) { unmet[g] += a.unmet[s * G + g]; dem[g] += a.demand[s * G + g]; }
  return {
    goodsConserved: goodsOk, moneySumZero: moneySum(a) === 0,
    orderIndependent: stateHash(a) === stateHash(b), hash: stateHash(a).toString(16),
    unmetShareDay720: Array.from(unmet, (u, g) => NAMES[g] + ' ' + (100 * u / dem[g]).toFixed(1) + '%'),
  };
}

function bench(N, k, T, R, samples, daysPerSample, warm) {
  const w = makeWorld(N, k);
  let day = 0;
  runDays(w, warm, day, T, R, false); day += warm;
  const loc = [], trd = [];
  for (let i = 0; i < samples; i++) {
    let tl = 0n, tt = 0n;
    for (let d = 0; d < daysPerSample; d++, day++) {
      const a0 = process.hrtime.bigint();
      for (let s = 0; s < N; s++) localDay(w, s, day);
      const a1 = process.hrtime.bigint();
      if (T > 0) tradeDay(w, T, R, day);
      const a2 = process.hrtime.bigint();
      tl += a1 - a0; tt += a2 - a1;
    }
    loc.push(Number(tl) / daysPerSample / N); trd.push(Number(tt) / daysPerSample / N);
  }
  const stat = (a) => { const s = a.slice().sort((x, y) => x - y); return [s[s.length >> 1], s[0], s[s.length - 1]]; };
  return { N, k, T, R, edges: w.col.length, local: stat(loc), trade: stat(trd), moneyZero: moneySum(w) === 0 };
}

// Fishery check: constant exploitation u per year applied daily; equilibrium catch vs u K (1 - u / r).
function fisheryCheck() {
  const K = 100000000, r = 0.6, rQ = Math.round(r / YEAR * Q24);
  const rows = [];
  for (const u of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]) {
    const uQ = Math.round(u / YEAR * Q24);
    let B = K / 2, lastYear = 0;
    for (let y = 0; y < 150; y++) {
      let c = 0;
      for (let d = 0; d < YEAR; d++) { const h = Math.floor(B * uQ / Q24); B = B - h + regrow(B, K, rQ); c += h; }
      lastYear = c;
    }
    const theory = u < r ? u * K * (1 - u / r) : 0;
    rows.push({ u, catchPerYear: lastYear, theory: Math.round(theory), ratio: theory ? +(lastYear / theory).toFixed(4) : null, BoverK: +(B / K).toFixed(3) });
  }
  return { r, msyTheory: r * K / 4, rows };
}
// Recovery time from 10% to 90% of K with no harvest (theory without depensation: ln(81)/r years).
function recoveryCheck() {
  const out = [];
  for (const r of [0.06, 0.15, 0.6, 1.0]) {
    const K = 100000000, rQ = Math.round(r / YEAR * Q24);
    let B = K / 10, d = 0;
    while (B < 0.9 * K && d < 400 * YEAR) { B += regrow(B, K, rQ); d++; }
    out.push({ r, yearsMeasured: +(d / YEAR).toFixed(1), yearsTheoryNoDepensation: +(Math.log(81) / r).toFixed(1) });
  }
  return out;
}

// Save size of the persistent goods state for 10,000 settlements after a 400-day run.
async function saveSize() {
  const { gzipSync } = await import('node:zlib');
  const N = 10000, w = makeWorld(N, 8);
  runDays(w, 400, 0, 4, 7, false);
  const perS = G * 2 + 5; // stock, price per good; standing crop, fertility, fish, forest, ore
  const a = new Int32Array(N * perS), b = new Uint16Array(N * G); const c = new Int32Array(N * (G + 5));
  for (let s = 0; s < N; s++) {
    const o = s * perS;
    for (let g = 0; g < G; g++) { a[o + g] = Math.min(w.stock[s * G + g], 2147483647); a[o + G + g] = w.price[s * G + g]; }
    a[o + 2 * G] = Math.min(w.standing[s], 2147483647); a[o + 2 * G + 1] = w.fert[s]; a[o + 2 * G + 2] = w.fishB[s]; a[o + 2 * G + 3] = w.forestV[s]; a[o + 2 * G + 4] = w.ore[s];
    for (let g = 0; g < G; g++) { b[s * G + g] = Math.floor(w.price[s * G + g] * 1000 / BASE_PRICE[g]); c[s * (G + 5) + g] = a[o + g]; }
    for (let r = 0; r < 5; r++) c[s * (G + 5) + G + r] = a[o + 2 * G + r];
  }
  const raw = a.byteLength, gz = gzipSync(Buffer.from(a.buffer), { level: 9 }).length;
  const alt = c.byteLength + b.byteLength, altGz = gzipSync(Buffer.from(c.buffer), { level: 9 }).length + gzipSync(Buffer.from(b.buffer), { level: 9 }).length;
  console.log(JSON.stringify({ saveSize10k: { int32Bytes: raw, int32Gzip: gz, priceAsUint16PermilleBytes: alt, priceAsUint16PermilleGzip: altGz } }));
}
if (process.argv[2] === 'save') { await saveSize(); process.exit(0); }

const quick = process.argv[2] === 'quick';
const env = { node: process.version, v8: process.versions.v8, platform: process.platform, arch: process.arch };
console.log(JSON.stringify({ env }, null, 0));
console.log(JSON.stringify({ checks: checks() }));
console.log(JSON.stringify({ fishery: fisheryCheck() }));
console.log(JSON.stringify({ recovery: recoveryCheck() }));
{
  const w = makeWorld(1000, 8);
  const perSettlement = ['pop', 'workers', 'stock', 'price', 'demand', 'unmet', 'standing', 'fert', 'shock', 'fishB', 'fishK', 'forestV', 'forestK', 'ore', 'ore0', 'hh', 'firm']
    .reduce((sum, key) => sum + w[key].byteLength / w.N, 0);
  const edgeBytes = (w.col.byteLength + w.dist.byteLength) / w.N;
  console.log(JSON.stringify({ memory: { goodsStateBytesPerSettlement: perSettlement, csrBytesPerSettlementK8: edgeBytes, tradePlanBytesPerEdgePerTradable: 4 } }));
}
const samples = quick ? 5 : 15, perSample = quick ? 20 : 60, warm = quick ? 60 : 360;
for (const N of [1000, 10000]) {
  for (const [k, T, R] of [[8, 0, 1], [8, 3, 1], [8, 4, 1], [8, 5, 1], [8, 7, 1], [24, 5, 1], [8, 5, 4], [24, 5, 4], [8, 4, 7], [24, 4, 7]]) {
    const r = bench(N, k, T, R, samples, perSample, warm);
    const f = (a) => a[0].toFixed(0) + ' [' + a[1].toFixed(0) + '-' + a[2].toFixed(0) + ']';
    console.log(`N=${N} k=${k} tradables=${T} tradeEvery=${R}d edges=${r.edges} local ns/settlement-day ${f(r.local)} trade ${f(r.trade)} moneyZero=${r.moneyZero}`);
  }
}
console.log(`samples=${samples} x ${perSample} days, warm-up ${warm} days`);
