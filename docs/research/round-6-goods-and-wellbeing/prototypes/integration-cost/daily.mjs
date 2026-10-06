// Day-boundary systems over index ranges, so the same code runs whole at the boundary or in fixed
// 1,024-entity slices across the first ticks of a day. Each pass fuses its settlement-ledger fold;
// only dayEnd writes the committed ledger record.
//   separate: spoil (households), payroll (agents), wealth (households), happiness (agents)
//   fused:    one agent sweep (payroll + happiness) and one household sweep (spoil + wealth)
import { WB, HB, R, NBINS, F_EMP, F_VIC, FIRM, BANK, RATE_DIV, QUAL_DRIVE, WB_DRIVE, RES_PROD, RES_USE, C, Q, A } from './world.mjs';
import { log2Q16 } from './det.mjs';
import { socialNow } from './needs.mjs';
import { spoilHousehold } from './food.mjs';

let N = 0, H = 0, F = 0, wheelMode = false;
let household, flags, cash, wage, incomeDay, hhCash, deposits, homeValue, durables, netWorth, foodValue, memberCash, wealthBand;
let acct, wCount, wCents, wHistCount, wHistCents, happy, happySet, mealQSum, meals, missed, hBand, scalars, needs, sortBuf;
let firmRes, res, stock, waste, eaten, committedI, committedF, dayAcc;
const LOG2_100USD = log2Q16(10000);

export function bindDaily(w) {
  N = w.N; H = w.H; F = w.F; wheelMode = w.mode === 'wheel';
  household = w.household; flags = w.flags; cash = w.cash; wage = w.wage; incomeDay = w.incomeDay;
  hhCash = w.hhCash; deposits = w.deposits; homeValue = w.homeValue; durables = w.durables; netWorth = w.netWorth;
  foodValue = w.foodValue; memberCash = w.memberCash; wealthBand = w.wealthBand;
  acct = w.acct; wCount = w.wCount; wCents = w.wCents; wHistCount = w.wHistCount; wHistCents = w.wHistCents;
  happy = w.happy; happySet = w.happySet; mealQSum = w.mealQSum; meals = w.meals; missed = w.missed;
  hBand = w.hBand; scalars = w.scalars; needs = w.needs; sortBuf = w.sortBuf; dayAcc = w.dayAcc;
  firmRes = w.firmRes; res = w.res; stock = w.stock; waste = w.waste; eaten = w.eaten; committedI = w.committedI; committedF = w.committedF;
}

export function dayBegin() {
  for (let k = 0; k < C * Q * A; k++) stock[k] = 0;
  for (let b = 0; b < WB; b++) { wCount[b] = 0; wCents[b] = 0; }
  for (let k = 0; k < NBINS; k++) { wHistCount[k] = 0; wHistCents[k] = 0; }
  for (let b = 0; b < HB; b++) hBand[b] = 0;
  dayAcc[0] = 0; dayAcc[1] = 0;
}

// Payroll, a household contribution and other spending as integer-cent transfers.
export function wealthAgents(i0, i1) {
  let firm = acct[FIRM];
  for (let i = i0; i < i1; i++) {
    let c = cash[i], inc = 0;
    const wg = wage[i];
    if ((flags[i] & F_EMP) !== 0 && firm >= wg) { inc = wg; firm -= wg; c += wg; }
    incomeDay[i] = inc;
    const h = household[i];
    const contrib = Math.floor(inc * 3 / 10);
    c -= contrib; hhCash[h] += contrib;
    const spend = Math.floor(c / 10);
    c -= spend; firm += spend;
    cash[i] = c;
    memberCash[h] += c;
  }
  acct[FIRM] = firm;
}

function wealthHousehold(h, fv, bills, it) {
  const purse = hhCash[h] - bills;
  hhCash[h] = purse;
  const d = deposits[h] + it;
  deposits[h] = d;
  let du = durables[h];
  du -= Math.floor(du * 3 / 10000);
  durables[h] = du;
  const nw = memberCash[h] + purse + d + homeValue[h] + du + fv;
  memberCash[h] = 0;
  netWorth[h] = nw;
  let band = 0, bin = 0;
  if (nw >= 1) {
    const L = log2Q16(nw);
    band = (L - LOG2_100USD) >> 17;
    if (band < 0) band = 0; else if (band > WB - 1) band = WB - 1;
    bin = L >> 12;
  }
  wealthBand[h] = band;
  wCount[band]++; wCents[band] += nw;
  wHistCount[bin]++; wHistCents[bin] += nw;
}

// Bills to the firm, interest from the bank, depreciation, net worth, log2 wealth band and histogram.
export function wealthHouseholds(h0, h1) {
  let toFirm = 0, fromBank = 0;
  for (let h = h0; h < h1; h++) {
    const bills = Math.floor(hhCash[h] / 20), it = Math.floor(deposits[h] / RATE_DIV);
    wealthHousehold(h, foodValue[h], bills, it);
    toFirm += bills; fromBank += it;
  }
  acct[FIRM] += toFirm; acct[BANK] -= fromBank;
}

function happinessAgent(i, t) {
  const L = log2Q16(incomeDay[i] + 1);
  let dI = L - scalars[1];
  if (dI > 262144) dI = 262144; else if (dI < -262144) dI = -262144;
  let drive = (dI * 8) >> 8;
  const m = meals[i];
  if (m > 0) drive += QUAL_DRIVE[(mealQSum[i] / m) | 0];
  drive -= missed[i] * 2621;
  const social = wheelMode ? socialNow(i, t) : needs[(i << 2) + 2];
  drive += ((social - 32768) * 20) >> 8;
  const f = flags[i];
  if ((f & F_EMP) !== 0) drive += 655;
  if ((f & F_VIC) !== 0) { drive -= 6554; flags[i] = f & 0xfb; }
  drive += WB_DRIVE[wealthBand[household[i]]];
  let h = happy[i];
  h += (((happySet[i] << 8) - h) * 26) >> 8;
  h += drive;
  if (h > 262144) h = 262144; else if (h < -262144) h = -262144;
  happy[i] = h;
  let hb = (h + 163840) >> 16;
  if (hb < 0) hb = 0; else if (hb > HB - 1) hb = HB - 1;
  hBand[hb]++;
  mealQSum[i] = 0; meals[i] = 0; missed[i] = 0;
  return L;
}

// Drivers: log income vs yesterday's settlement mean (LUT), meal quality, missed meals, social need,
// employment, victimisation, wealth standing; then decay toward the set point.
export function happinessAgents(i0, i1, t) {
  let sum = 0, sumL = 0;
  for (let i = i0; i < i1; i++) { sumL += happinessAgent(i, t); sum += happy[i]; }
  dayAcc[0] += sum; dayAcc[1] += sumL;
}

// Fused agent sweep: happiness reads yesterday's wealth band, because households run after agents.
export function agentDayFused(i0, i1, t) {
  let firm = acct[FIRM], sum = 0, sumL = 0;
  for (let i = i0; i < i1; i++) {
    let c = cash[i], inc = 0;
    const wg = wage[i];
    if ((flags[i] & F_EMP) !== 0 && firm >= wg) { inc = wg; firm -= wg; c += wg; }
    incomeDay[i] = inc;
    const h = household[i];
    const contrib = Math.floor(inc * 3 / 10);
    c -= contrib; hhCash[h] += contrib;
    const spend = Math.floor(c / 10);
    c -= spend; firm += spend;
    cash[i] = c;
    memberCash[h] += c;
    sumL += happinessAgent(i, t); sum += happy[i];
  }
  acct[FIRM] = firm;
  dayAcc[0] += sum; dayAcc[1] += sumL;
}

export function householdDayFused(day, h0, h1) {
  let toFirm = 0, fromBank = 0;
  for (let h = h0; h < h1; h++) {
    const fv = spoilHousehold(h, day);
    const bills = Math.floor(hhCash[h] / 20), it = Math.floor(deposits[h] / RATE_DIV);
    wealthHousehold(h, fv, bills, it);
    toFirm += bills; fromBank += it;
  }
  acct[FIRM] += toFirm; acct[BANK] -= fromBank;
}

export function resourceDay() {
  for (let r = 0; r < R; r++) res[r] = 0;
  for (let f = 0; f < F; f++) {
    const base = f * R, tb = (f & 3) * R;
    for (let r = 0; r < R; r++) {
      let s = firmRes[base + r] + RES_PROD[tb + r] - RES_USE[tb + r];
      if (s < 0) s = 0;
      firmRes[base + r] = s;
      res[r] += s;
    }
  }
}

// Top-10% wealth share (Q16) from the 16-bins-per-octave histogram: O(bins), no sort.
export function topShareHist() {
  const target = Math.floor(H / 10);
  let total = 0;
  for (let k = 0; k < NBINS; k++) total += wHistCents[k];
  let cnt = 0, top = 0;
  for (let k = NBINS - 1; k >= 0; k--) {
    const c = wHistCount[k];
    if (cnt + c >= target) { if (c > 0) top += wHistCents[k] * (target - cnt) / c; break; }
    cnt += c; top += wHistCents[k];
  }
  return total > 0 ? Math.floor(top / total * 65536) : 0;
}

// Exact top-10% share by sorting a scratch copy: the comparison point for the histogram.
export function topShareSort() {
  for (let h = 0; h < H; h++) sortBuf[h] = netWorth[h];
  sortBuf.sort();
  const k0 = H - Math.floor(H / 10);
  let total = 0, top = 0;
  for (let h = 0; h < H; h++) { const v = sortBuf[h]; total += v; if (h >= k0) top += v; }
  return total > 0 ? Math.floor(top / total * 65536) : 0;
}

// Finish the day's fold and copy it into the committed record, then reset the day's flow counters.
export function dayEnd() {
  scalars[0] = Math.floor(dayAcc[0] / N);
  scalars[1] = Math.floor(dayAcc[1] / N);
  scalars[2] = topShareHist();
  let o = 0;
  for (let k = 0; k < C * Q * A; k++) committedI[o++] = stock[k];
  for (let k = 0; k < C; k++) { committedI[o++] = waste[k]; waste[k] = 0; }
  for (let k = 0; k < C; k++) { committedI[o++] = eaten[k]; eaten[k] = 0; }
  for (let k = 0; k < R; k++) committedI[o++] = res[k];
  for (let k = 0; k < HB; k++) committedI[o++] = hBand[k];
  for (let k = 0; k < WB; k++) { committedI[o++] = wCount[k]; committedF[k] = wCents[k]; }
  for (let k = 0; k < 8; k++) committedI[o++] = scalars[k];
}
