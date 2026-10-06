// Throwaway research prototype (round 6, wealth). Household balance sheets in integer cents,
// annual step, keyed hash draws, ppm rates, exact double-entry cash accounts that sum to zero.
// Not for import. Tables are built once at start (in Nomos they would be built at build time).

const PPM = 1e6;

function mix(h) {
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16; return h >>> 0;
}
export function draw(seed, entity, tick, stream) {
  let h = mix(seed ^ 0x9e3779b9);
  h = mix(h ^ entity); h = mix(h ^ Math.imul(tick, 0x85ebca6b)); h = mix(h ^ Math.imul(stream, 0xc2b2ae35));
  return h;
}

// exact floor(x * ppm / 1e6) for integer |x| < 2^53, |ppm| <= 1e6: the split keeps products < 2^53
export function mulPpm(x, ppm) {
  let hi = Math.floor(x / PPM), lo = x - hi * PPM;
  if (lo < 0) { hi -= 1; lo += PPM; } else if (lo >= PPM) { hi += 1; lo -= PPM; }
  return hi * ppm + Math.floor(lo * ppm / PPM);
}

function invNorm(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  const q = p - 0.5, r = q * q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}
const NORM = new Int32Array(4096);
for (let k = 0; k < 4096; k++) NORM[k] = Math.round(invNorm((k + 0.5) / 4096) * PPM);

// equal-mass earnings bins of a lognormal, Pareto-spliced above p = 0.95
function earningsTable(nb, medianCents, sigma, topAlpha) {
  const t = new Float64Array(nb), sub = 4000;
  const q95 = medianCents * Math.exp(sigma * invNorm(0.95));
  for (let b = 0; b < nb; b++) {
    let s = 0;
    for (let k = 0; k < sub; k++) {
      const p = (b + (k + 0.5) / sub) / nb;
      let v = medianCents * Math.exp(sigma * invNorm(p));
      if (topAlpha > 0 && p > 0.95) v = q95 * Math.pow(0.05 / (1 - p), 1 / topAlpha);
      s += v;
    }
    t[b] = Math.round(s / sub);
  }
  return t;
}

// return-type grid (annual, ppm) with stationary probabilities 18/23/24/19/15 %: the grid of
// Benhabib, Bisin and Luo (2019, NBER w21721) Table 2; mean 3.31%, SD 2.73% (computed)
const RT_PPM = Int32Array.from([2400, 14300, 23400, 66500, 74100]);
const RT_CUM = Int32Array.from([18, 41, 65, 84, 100]);

export const DEFAULTS = {
  N: 20000, seed: 42, years: 400, report: [], reportEvery: 0,
  nb: 20, median: 5500000, sigma: 0.75, topAlpha: 2.0, pStay: 900000, igKeep: 300000,
  turnover: 25000, keepShare: 500000, sibling: 'rank', sibBand: 20000, mpcIBands: null, bandMult: [1, 4, 16, 64],          // 1/40 a year; heir keeps half, half goes to a sibling household
  floorFrac: 600000,                            // subsistence floor as a share of bin-0 earnings
  saveQ: [10000, 40000, 70000, 90000, 150000],  // active saving out of income above floor+housing, by earnings quintile
  mpcL: 50000, mpcI: 20000,                     // consumption out of liquid and illiquid net wealth
  rDep: 5000, rBorrow: 120000, creditMult: 500000,
  housing: 1, buyMult: 4000000, downPay: 200000, rMort: 40000, mortYears: 30,
  maint: 15000, propTax: 10000, rentYield: 70000, rentMult: 3000000, gHouse: 0, sigHouse: 100000, fireDiscount: 100000,
  risky: 1, bufferMult: 2000000, investShare: 500000, sigRisky: 150000, payout: 300000,
  hetReturns: 1, rBar: 33100, rtKeep: 200000, rShift: 0, rtSwitch: 0,
  durMult: 350000, minHouseMult: 2000000, dti: 350000, shockProb: 0, shockMult: 500000,
  incTax: 0, wealthTax: 0, wealthTaxThreshMult: 0, estateTax: 0, estateThreshMult: 0,
  init: null,                                   // optional function(arrays) to spawn a target distribution
  dischargeYears: 0, policyFrom: 0, propTaxPolicy: null, creditPolicy: null,                                // year from which taxes apply
};

export function run(opts) {
  const P = Object.assign({}, DEFAULTS, opts);
  const N = P.N, seed = P.seed;
  const EARN = earningsTable(P.nb, P.median, P.sigma, P.topAlpha);
  const floor = mulPpm(EARN[0], P.floorFrac);
  const r = P.rMort / PPM, n = P.mortYears;
  const ANN = Math.round((r / (1 - Math.pow(1 + r, -n))) * PPM);
  const SAVE = new Int32Array(P.nb);
  for (let e = 0; e < P.nb; e++) SAVE[e] = P.saveQ[Math.min(4, Math.floor(e * 5 / P.nb))];

  const earn = new Uint8Array(N), rt = new Uint8Array(N);
  const liq = new Float64Array(N), house = new Float64Array(N), mort = new Float64Array(N), mpay = new Float64Array(N);
  const risky = new Float64Array(N), dur = new Float64Array(N);
  const incomeY = new Float64Array(N), gainY = new Float64Array(N), consY = new Float64Array(N), nw = new Float64Array(N);
  const acct = new Float64Array(3); const REST = 0, BANK = 1, GOV = 2;
  const stuck = new Uint8Array(N); let discharges = 0;
  const bandEdge = new Float64Array(4), rankIdx = new Int32Array(N), rankOf = new Int32Array(N);
  const stats = [];
  let defaults = 0, forced = 0, loans = 0, taxRevenueLast = 0;
  const meanEarn = EARN.reduce((a, b) => a + b, 0) / P.nb;

  for (let h = 0; h < N; h++) {
    earn[h] = draw(seed, h, 0, 1) % P.nb;
    const u = draw(seed, h, 0, 2) % 100; let k = 0; while (u >= RT_CUM[k]) k++; rt[h] = k;
    liq[h] = Math.floor(meanEarn); acct[REST] -= liq[h];
  }
  if (P.init) P.init({ N, EARN, earn, rt, liq, house, mort, mpay, risky, acct, ANN, setLoans: (v) => { loans = v; } });

  const netWorth = (h) => liq[h] + house[h] - mort[h] + risky[h] + dur[h];

  function step(t) {
    const policy = t > P.policyFrom;
    const propTax = (policy && P.propTaxPolicy !== null) ? P.propTaxPolicy : P.propTax;
    const creditMult = (policy && P.creditPolicy !== null) ? P.creditPolicy : P.creditMult;
    let wtThresh = 0, esThresh = 0;
    if (policy && (P.wealthTax > 0 || P.estateTax > 0)) {
      let s = 0; for (let h = 0; h < N; h++) s += netWorth(h);
      wtThresh = Math.floor(s / N * P.wealthTaxThreshMult / PPM); esThresh = Math.floor(s / N * P.estateThreshMult / PPM);
    }
    let taxPool = 0;
    { let s = 0; for (let h = 0; h < N; h++) s += netWorth(h); const mw = s / N; for (let b = 0; b < 4; b++) bandEdge[b] = mw * P.bandMult[b]; }
    if (P.sibling === 'rank') { for (let h = 0; h < N; h++) { rankIdx[h] = h; nw[h] = netWorth(h); } rankIdx.sort((a, b) => nw[a] - nw[b] || a - b); for (let k = 0; k < N; k++) rankOf[rankIdx[k]] = k; }
    for (let h = 0; h < N; h++) {
      const u0 = draw(seed, h, t, 10) % PPM;
      if (u0 >= P.pStay) { let e = earn[h] + ((u0 & 1) === 1 ? 1 : -1); if (e < 0) e = 0; if (e >= P.nb) e = P.nb - 1; earn[h] = e; }
      const y = EARN[earn[h]];
      let inc = y, gain = 0; acct[REST] -= y;
      dur[h] = mulPpm(y, P.durMult);
      let L = liq[h], R = risky[h], H = house[h], M = mort[h];
      if (P.rtSwitch > 0 && draw(seed, h, t, 20) % PPM < P.rtSwitch) { const u = draw(seed, h, t, 21) % 100; let k = 0; while (u >= RT_CUM[k]) k++; rt[h] = k; }
      if (L > 0) { const i = mulPpm(L, P.rDep); acct[BANK] -= i; inc += i; }
      else if (L < 0) { const i = mulPpm(-L, P.rBorrow); acct[BANK] += i; inc -= i; }
      if (R > 0) {
        const mu = (P.hetReturns ? RT_PPM[rt[h]] : P.rBar) + P.rShift;
        const ret = mu + mulPpm(NORM[draw(seed, h, t, 11) & 4095], P.sigRisky);
        const dR = mulPpm(R, ret);
        if (dR > 0) { const pay = mulPpm(dR, P.payout); inc += pay; R += dR - pay; gain += dR - pay; acct[REST] -= pay; }
        else { R += dR; gain += dR; }
        if (R < 0) { gain -= R; R = 0; }
      }
      let housingCost = 0;
      if (P.housing) {
        if (H > 0) {
          const dH = mulPpm(H, P.gHouse + mulPpm(NORM[draw(seed, h, t, 12) & 4095], P.sigHouse));
          H += dH; gain += dH;
          if (M > 0) {
            const interest = mulPpm(M, P.rMort);
            const pay = Math.min(mpay[h], M + interest);
            housingCost += pay; acct[BANK] += pay;
            const princ = pay - interest; M -= princ; loans -= princ;
            if (M <= 0) { loans -= M; M = 0; mpay[h] = 0; }
          }
          const upkeep = mulPpm(H, P.maint); housingCost += upkeep; acct[REST] += upkeep;
          if (propTax > 0) { const pt = mulPpm(H, propTax); housingCost += pt; taxPool += pt; }
        } else {
          const rent = mulPpm(mulPpm(y, P.rentMult), P.rentYield);
          housingCost += rent; acct[REST] += rent;
        }
      }
      if (P.shockProb > 0 && draw(seed, h, t, 19) % PPM < P.shockProb) {
        const sz = mulPpm(y, P.shockMult); housingCost += sz; acct[REST] += sz; // emergency expense
      }
      let tax = 0;
      if (P.incTax > 0 && inc > 0) { tax = mulPpm(inc, P.incTax); taxPool += tax; }
      const yd = inc - tax;
      let c = floor;
      const spare = yd - housingCost - floor;
      if (spare > 0) c += spare - mulPpm(spare, SAVE[earn[h]]);
      if (L > 0) c += mulPpm(L, P.mpcL);
      L += yd - housingCost - c; acct[REST] += c;
      // consumption out of illiquid wealth: sell risky assets first, else draw on home equity via credit
      const illiq = R + (H > M ? H - M : 0);
      if (illiq > 0 && P.mpcI > 0) {
        let band = 0; const w0 = L + illiq; while (band < 4 && w0 > bandEdge[band]) band++;
        const x = mulPpm(illiq, P.mpcIBands ? P.mpcIBands[band] : P.mpcI);
        const fromR = x < R ? x : R; R -= fromR; L -= x - fromR; acct[REST] += x - fromR; c += x;
      }
      if (P.risky) {
        const buf = mulPpm(y, P.bufferMult);
        if (L > buf) { const inv = mulPpm(L - buf, P.investShare); L -= inv; R += inv; acct[REST] += inv; }
      }
      if (P.housing && H === 0) {
        let V = mulPpm(y, P.buyMult); if (V < P.minHouseMult * P.median / PPM) V = Math.floor(P.minHouseMult * P.median / PPM);
        const down = mulPpm(V, P.downPay);
        const carry = mulPpm(V - down, ANN) + mulPpm(V, P.maint + propTax);
        if (L >= down + floor && carry <= mulPpm(y - floor, P.dti)) { L -= down; H = V; M = V - down; mpay[h] = mulPpm(M, ANN); acct[REST] += V; acct[BANK] -= M; loans += M; }
      }
      const limit = -mulPpm(y, creditMult);
      if (L < limit) {
        if (H > 0) { const sale = H - mulPpm(H, P.fireDiscount); L += sale - M; acct[REST] -= sale; acct[BANK] += M; loans -= M; H = 0; M = 0; mpay[h] = 0; forced++; }
        if (L < limit && R > 0) { L += R; acct[REST] -= R; R = 0; }
        if (L < limit) { acct[BANK] -= (limit - L); L = limit; defaults++; }
      }
      if (P.dischargeYears > 0) {
        if (L < 0 && L <= mulPpm(limit, 800000)) { stuck[h]++; if (stuck[h] >= P.dischargeYears) { acct[BANK] += L; L = 0; stuck[h] = 0; discharges++; } } else stuck[h] = 0;
      }
      liq[h] = L; risky[h] = R; house[h] = H; mort[h] = M;
      incomeY[h] = inc; gainY[h] = gain; consY[h] = c;
    }
    if (policy && P.wealthTax > 0) {
      for (let h = 0; h < N; h++) {
        const w = netWorth(h);
        if (w > wtThresh) {
          const due = mulPpm(w - wtThresh, P.wealthTax);
          const fromR = Math.min(risky[h], due); risky[h] -= fromR; acct[REST] -= fromR;
          liq[h] -= due - fromR; taxPool += due;
        }
      }
    }
    for (let h = 0; h < N; h++) {
      if (draw(seed, h, t, 13) % PPM >= P.turnover) continue;
      if (policy && P.estateTax > 0) {
        const w = netWorth(h);
        if (w > esThresh) {
          const due = mulPpm(w - esThresh, P.estateTax);
          const fromR = Math.min(risky[h], due); risky[h] -= fromR; acct[REST] -= fromR;
          liq[h] -= due - fromR; taxPool += due;
        }
      }
      // estate split: the sibling household j receives (1 - keepShare) of liquid and risky wealth
      let j;
      if (P.sibling === 'rank') { const w = Math.max(1, Math.floor(N * P.sibBand / PPM)); let k = rankOf[h] + (draw(seed, h, t, 18) % (2 * w + 1)) - w; if (k < 0) k = 0; if (k >= N) k = N - 1; j = rankIdx[k]; }
      else if (P.sibling === 'none') j = h;
      else j = draw(seed, h, t, 18) % N;
      if (j !== h) {
        const giveL = liq[h] > 0 ? liq[h] - mulPpm(liq[h], P.keepShare) : 0;
        const giveR = risky[h] - mulPpm(risky[h], P.keepShare);
        liq[h] -= giveL; liq[j] += giveL; risky[h] -= giveR; risky[j] += giveR;
      }
      if (draw(seed, h, t, 14) % PPM >= P.igKeep) earn[h] = draw(seed, h, t, 15) % P.nb;
      if (draw(seed, h, t, 16) % PPM >= P.rtKeep) { const u = draw(seed, h, t, 17) % 100; let k = 0; while (u >= RT_CUM[k]) k++; rt[h] = k; }
    }
    taxRevenueLast = taxPool;
    if (taxPool !== 0) {
      const share = Math.floor(taxPool / N), rem = taxPool - share * N;
      for (let h = 0; h < N; h++) liq[h] += share + (h < rem ? 1 : 0);
    }
  }

  function measure(t) {
    for (let h = 0; h < N; h++) nw[h] = netWorth(h);
    const s = Float64Array.from(nw).sort(), inc = Float64Array.from(incomeY).sort();
    let tot = 0, ti = 0; for (let h = 0; h < N; h++) { tot += s[h]; ti += inc[h]; }
    const top = (p) => { let a = 0; for (let h = N - Math.floor(N * p); h < N; h++) a += s[h]; return a / tot; };
    let bot = 0; for (let h = 0; h < N / 2; h++) bot += s[h];
    const gin = (arr, T) => { let g = 0, cum = 0; for (let h = 0; h < N; h++) { cum += arr[h]; g += cum - arr[h] / 2; } return 1 - 2 * g / (N * T); };
    let le0 = 0, owners = 0; for (let h = 0; h < N; h++) { if (nw[h] <= 0) le0++; if (house[h] > 0) owners++; }
    const t10 = top(0.10), t1 = top(0.01);
    return { t, gini: +gin(s, tot).toFixed(3), incGini: +gin(inc, ti).toFixed(3), top10: +t10.toFixed(3), top1: +t1.toFixed(3),
      bot50: +(bot / tot).toFixed(3), le0: +(le0 / N).toFixed(3), own: +(owners / N).toFixed(3),
      medW_medY: +(s[N >> 1] / inc[N >> 1]).toFixed(2), meanW_meanY: +(tot / ti).toFixed(2),
      alpha: +(1 / (1 - Math.log(t1 / t10) / Math.log(0.1))).toFixed(2), defaults, forced, discharges, taxShareY: +(taxRevenueLast / ti).toFixed(4) };
  }

  for (let t = 1; t <= P.years; t++) {
    step(t);
    if (P.report.includes(t) || (P.reportEvery && t % P.reportEvery === 0)) stats.push(measure(t));
  }
  let cashSum = acct[REST] + acct[BANK] + acct[GOV], mortSum = 0;
  for (let h = 0; h < N; h++) { cashSum += liq[h]; mortSum += mort[h]; }
  for (let h = 0; h < N; h++) nw[h] = netWorth(h);
  return { P, stats, step, measure, A: { liq, house, mort, mpay, risky, dur, earn, rt, incomeY, gainY, consY, nw }, EARN, cashSum, loanGap: mortSum - loans };
}
