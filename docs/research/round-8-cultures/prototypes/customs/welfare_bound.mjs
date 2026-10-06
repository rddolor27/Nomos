// Bound on how much a culture's taste shift can change real welfare through prices.
// Neutral within-food shares: ICP 2021 cross-country means (icp_taste.mjs), mapped to Nomos's six categories.
// A culture shifts marginal shares (beta) within food by at most +-band relative, summing to zero, with
// culture-blind subsistence (gamma). The cost-of-living gap of its food basket against the neutral basket
// is sum_k dShare_k * r_k, where r_k is the local price deviation of category k from the settlement mean.
// Usage: node welfare_bound.mjs
const NEUTRAL = { grain: 11.4, bread: 10.0, produce: 22.8, dairy: 11.5, fresh_protein: 27.2, preserved: 17.1 }; // % of food
const PRESET_FOOD_SHARE = { low: 0.453, lower_mid: 0.33, upper_mid: 0.19, high: 0.087 }; // ICP 2021 (round 6)
const LS_PER_DOUBLING = 300; // milli-ladder per doubling of own income (round 6 default)
const log2 = x => Math.log(x) / Math.LN2;

function worstShift(band) {
  // Largest L1 shift: raise the largest categories, lower the rest, keep the sum at zero.
  const ks = Object.keys(NEUTRAL).sort((a, b) => NEUTRAL[b] - NEUTRAL[a]);
  let up = 0, down = 0; const d = {};
  for (const k of ks) d[k] = 0;
  // Greedy: alternate so that up mass equals down mass.
  const total = ks.reduce((s, k) => s + NEUTRAL[k] * band, 0);
  let budget = total / 2;
  for (const k of ks) { const m = Math.min(NEUTRAL[k] * band, budget); if (m <= 0) break; d[k] = +m; up += m; budget -= m; }
  let need = up;
  for (const k of [...ks].reverse()) { if (d[k] > 0) continue; const m = Math.min(NEUTRAL[k] * band, need); d[k] = -m; down += m; need -= m; }
  return { d, l1: up + down };
}
const out = [];
for (const band of [0.10, 0.25, 0.40]) {
  const { d, l1 } = worstShift(band);
  for (const r of [0.05, 0.10, 0.20, 0.75]) {
    // Preferred categories priced +r locally, others -r: gap = sum |d_k| * r (percent of food spending)
    const gapFood = l1 * r; // percentage points of food spending
    const row = { band: `+-${band * 100}%`, l1_pp_of_food: +l1.toFixed(1), r: `+-${r * 100}%`, gap_pct_of_food: +gapFood.toFixed(2) };
    for (const [p, fs] of Object.entries(PRESET_FOOD_SHARE)) {
      const gapC = gapFood / 100 * fs; // share of total consumption
      row[`gap_pct_cons_${p}`] = +(100 * gapC).toFixed(3);
      row[`ls_milli_${p}`] = +(LS_PER_DOUBLING * -log2(1 - gapC)).toFixed(1);
    }
    out.push(row);
  }
  console.log(`band +-${band * 100}%: shift by category (pp of food):`, Object.fromEntries(Object.entries(d).map(([k, v]) => [k, +v.toFixed(2)])));
}
console.table(out);
