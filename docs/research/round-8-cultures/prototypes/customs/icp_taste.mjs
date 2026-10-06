// How much of food-basket composition differs across countries beyond income and prices?
// Data: World Bank ICP 2021 (source 90), fetched at run time into a cache dir OUTSIDE the repo.
// Usage: node icp_taste.mjs <cacheDir>
// Output: summary statistics only (no raw data is written into the repo).
import fs from 'node:fs';
import path from 'node:path';

const cache = process.argv[2];
if (!cache) { console.error('usage: node icp_taste.mjs <cacheDir>'); process.exit(1); }
fs.mkdirSync(cache, { recursive: true });

const API = 'https://api.worldbank.org/v2/sources/90/country/all/series';
async function series(code, cls) {
  const f = path.join(cache, `icp_${code}_${cls}.json`);
  if (!fs.existsSync(f)) {
    const r = await fetch(`${API}/${code}/classification/${cls}/time/YR2021/data?format=json&per_page=2000`);
    fs.writeFileSync(f, await r.text());
  }
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const out = new Map();
  for (const d of j.source.data) {
    const iso = d.variable.find(v => v.concept === 'Country').id;
    if (d.value !== null) out.set(iso, d.value);
  }
  return out;
}

// Aggregates (regions, income groups) have non-3-letter or known aggregate codes; keep only countries
// present in the population series and drop World Bank aggregate codes by a simple heuristic:
// ICP aggregates in source 90 use codes like WLD, HIC, LMC, etc.
const AGG = new Set(['WLD','HIB','LIB','LMB','UMB','HIC','LIC','LMC','UMC','MIC','LMY','EAS','ECS','LCN','MEA','NAC','SAS','SSF','EAP','ECA','LAC','MNA','SSA','EMU','EUU','OED','ARB','CEB','CSS','EAR','FCS','HPC','IBD','IBT','IDA','IDB','IDX','INX','LDC','LTE','OSS','PRE','PSS','PST','SST','TEA','TEC','TLA','TMN','TSA','TSS','AFE','AFW']);

const FOOD = {
  bread_cereals: '1101110', meat: '1101120', fish: '1101130', dairy_eggs: '1101140',
  oils_fats: '1101150', fruit: '1101160', vegetables: '1101170', sugar_conf: '1101180', food_nec: '1101190',
};
const NONFOOD = {
  food_total: '1101000', nonalc_bev: '1101200', alcohol: '1102100', tobacco: '1102200', clothing: '1103000',
  furnishings: '1105000', transport: '1107000', communication: '1108000', restaurants_hotels: '1111000',
  recreation_culture: '9110000', housing: '9060000',
};

function ols(X, y) { // X: array of rows (with intercept), y: array. Returns {b, resid, r2}
  const n = y.length, k = X[0].length;
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty = new Array(k).fill(0);
  for (let i = 0; i < n; i++) for (let a = 0; a < k; a++) {
    Xty[a] += X[i][a] * y[i];
    for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b];
  }
  // Gauss-Jordan
  const M = XtX.map((r, i) => [...r, Xty[i]]);
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c]; for (let j = c; j <= k; j++) M[c][j] /= d;
    for (let r = 0; r < k; r++) if (r !== c) { const f = M[r][c]; for (let j = c; j <= k; j++) M[r][j] -= f * M[c][j]; }
  }
  const b = M.map(r => r[k]);
  const mean = y.reduce((s, v) => s + v, 0) / n;
  let sst = 0, sse = 0; const resid = [];
  for (let i = 0; i < n; i++) {
    const yh = X[i].reduce((s, v, j) => s + v * b[j], 0);
    resid.push(y[i] - yh); sse += (y[i] - yh) ** 2; sst += (y[i] - mean) ** 2;
  }
  return { b, resid, r2: 1 - sse / sst, sd: Math.sqrt(sse / (n - k)), mean };
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * p; const lo = Math.floor(i); return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo); };

const aic = await series('9020000', 'PCAP.PP'); // actual individual consumption per capita, PPP US$
const pop = await series('SP.POP.TOTL.ICP', 'POP');
// Food classes: local-currency expenditure (CN), because the AICZS share of Fruit is null in the API.
// Within-food shares are ratios of CN values, so the currency cancels. Non-food: AICZS (share of AIC, %).
const sh = {};
for (const [k, c] of Object.entries(FOOD)) sh[k] = await series(c, 'CN');
for (const [k, c] of Object.entries(NONFOOD)) sh[k] = await series(c, 'AICZS');
const px = {}; for (const [k, c] of Object.entries({ ...FOOD, food_total: '1101100', aic: '9020000', recreation_culture: '9110000', restaurants_hotels: '1111000' })) px[k] = await series(c, 'PX.WL');

const countries = [...aic.keys()].filter(c => !AGG.has(c) && c.length === 3 && sh.food_total.has(c) && Object.keys(FOOD).every(k => sh[k].has(c) && sh[k].get(c) > 0));
const res = { n: countries.length, food: {}, groups: {}, nonfood: {}, bands: {} };

// Within-food shares (percent of food spending), Nomos-like groups
const GROUPS = {
  grain_bread: ['bread_cereals'], fresh_protein: ['meat', 'fish'], dairy: ['dairy_eggs'],
  produce: ['fruit', 'vegetables'], other_preserved: ['oils_fats', 'sugar_conf', 'food_nec'],
};
function within(c, keys) { return 100 * keys.reduce((s, k) => s + sh[k].get(c), 0) / Object.keys(FOOD).reduce((s, k) => s + sh[k].get(c), 0); }
function relPx(c, keys) { // expenditure-weighted log price of the group relative to food (PX.WL indices)
  let w = 0, lp = 0; for (const k of keys) { const v = sh[k].get(c), p = px[k].get(c); if (!p) return null; w += v; lp += v * Math.log(p); }
  return lp / w - Math.log(px.food_total.get(c));
}
const lny = c => Math.log(aic.get(c));

function analyse(name, keys, store) {
  const cs = countries.filter(c => relPx(c, keys) !== null);
  const y = cs.map(c => within(c, keys));
  const m1 = ols(cs.map(c => [1, lny(c)]), y);
  const m2 = ols(cs.map(c => [1, lny(c), lny(c) ** 2]), y);
  const m3 = ols(cs.map(c => [1, lny(c), lny(c) ** 2, relPx(c, keys)]), y);
  // Near-income neighbours: for each country, peers within +-15% AIC per capita; spread of shares
  const iqrs = [], ranges = [];
  for (const c of cs) {
    const peers = cs.filter(d => Math.abs(lny(d) - lny(c)) <= Math.log(1.15));
    if (peers.length >= 8) { const v = peers.map(d => within(d, keys)); iqrs.push(q(v, 0.75) - q(v, 0.25)); ranges.push(q(v, 0.9) - q(v, 0.1)); }
  }
  store[name] = {
    n: cs.length, mean_pct: +m1.mean.toFixed(2), sd_raw: +Math.sqrt(y.reduce((s, v) => s + (v - m1.mean) ** 2, 0) / (y.length - 1)).toFixed(2),
    r2_income: +m2.r2.toFixed(3), resid_sd_income_pp: +m2.sd.toFixed(2), resid_sd_income_rel: +(m2.sd / m1.mean).toFixed(3),
    r2_income_price: +m3.r2.toFixed(3), resid_sd_income_price_pp: +m3.sd.toFixed(2), resid_sd_income_price_rel: +(m3.sd / m1.mean).toFixed(3),
    slope_per_doubling_pp: +(m1.b[1] * Math.log(2)).toFixed(2), price_coef_pp_per_log: +m3.b[3].toFixed(2),
    peer_iqr_median_pp: +q(iqrs, 0.5).toFixed(2), peer_p10_p90_median_pp: +q(ranges, 0.5).toFixed(2), peer_sets: iqrs.length,
  };
}
for (const [k] of Object.entries(FOOD)) analyse(k, [k], res.food);
for (const [g, keys] of Object.entries(GROUPS)) analyse(g, keys, res.groups);

// Non-food: share of AIC (percent), income only (prices where available)
for (const k of ['food_total', 'restaurants_hotels', 'recreation_culture', 'alcohol', 'tobacco', 'clothing', 'nonalc_bev', 'communication', 'transport', 'furnishings', 'housing']) {
  const cs = countries.filter(c => sh[k].has(c));
  const y = cs.map(c => sh[k].get(c));
  const m2 = ols(cs.map(c => [1, lny(c), lny(c) ** 2]), y);
  let m3 = null;
  if (px[k]) { const cp = cs.filter(c => px[k].has(c)); m3 = ols(cp.map(c => [1, lny(c), lny(c) ** 2, Math.log(px[k].get(c) / px.aic.get(c))]), cp.map(c => sh[k].get(c))); }
  res.nonfood[k] = { n: cs.length, mean_pct_of_AIC: +m2.mean.toFixed(2), r2_income: +m2.r2.toFixed(3), resid_sd_pp: +m2.sd.toFixed(2), resid_sd_rel: +(m2.sd / m2.mean).toFixed(3), ...(m3 ? { r2_income_price: +m3.r2.toFixed(3), resid_sd_income_price_pp: +m3.sd.toFixed(2) } : {}) };
}

// Worked example: within-food shares in two income bands (AIC per capita PPP)
for (const [lo, hi] of [[4000, 7000], [12000, 18000], [30000, 45000]]) {
  const cs = countries.filter(c => aic.get(c) >= lo && aic.get(c) < hi);
  const b = { n: cs.length };
  for (const g of Object.keys(GROUPS)) { const v = cs.map(c => within(c, GROUPS[g])); b[g] = { p10: +q(v, 0.1).toFixed(1), median: +q(v, 0.5).toFixed(1), p90: +q(v, 0.9).toFixed(1) }; }
  res.bands[`${lo}-${hi}`] = b;
}
res.aic_range = [Math.min(...countries.map(c => aic.get(c))), Math.max(...countries.map(c => aic.get(c)))].map(v => Math.round(v));
console.log(JSON.stringify(res, null, 1));
