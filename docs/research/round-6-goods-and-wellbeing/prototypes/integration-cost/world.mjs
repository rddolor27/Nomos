// Layout, tables and deterministic initial state. Every number here is a placeholder for the
// mechanics the other round-6 researchers design; sizes are what this cost study measures.
import { createArena } from './arena.mjs';
import { draw } from './det.mjs';

export const FULL = 65535;
export const C = 8, Q = 4, A = 3, R = 8;        // food categories, quality bands, age bands, non-food resources
export const MAX_LOTS = 8, EMPTY = 0xffffffff;
export const HB = 5, WB = 8;                     // happiness bands, wealth bands
export const NBINS = 848;                        // log2 histogram: 16 bins per octave up to 2^53 cents
export const WSIZE = 2048, WMASK = WSIZE - 1;    // timing-wheel slots for the event-driven meal variant
export const F_EMP = 1, F_FAIL = 2, F_VIC = 4;
export const MINT = 0, FIRM = 1, BANK = 2;
export const EAT_T = 39321;                      // eat below 60% hunger satisfaction
export const RATE_DIV = 10000;                   // deposit interest 0.01% a day, exact integer division
export const S_SPOIL = 1, S_SHOP = 2, S_INIT = 3;

// bread, vegetables, fruit, meat, fish, dairy, grain, preserved
export const SHELF = Int32Array.from([3, 6, 8, 4, 2, 7, 180, 365]);
export const STALE = Int32Array.from([1, 2, 2, 1, 1, 2, 10, 30]);
export const LOSS_Q16 = Int32Array.from([0, 1966, 1311, 0, 0, 0, 66, 0]);
const BASE_PRICE = [120, 90, 110, 300, 280, 140, 40, 160];
const QUAL_PCT = [80, 100, 135, 180];
const CAT_W = [18, 16, 12, 10, 6, 14, 14, 10];

export const PRICE = new Float64Array(C * 8);
export const AGE_BAND = new Uint8Array(C * 16);
export const CAT_PICK = new Uint8Array(256);
export const QUAL_PICK = new Uint8Array(WB * 16);
export const MEAL_VALUE = Int32Array.from([18400, 21600, 23800, 25900, 0, 0, 0, 0]);
export const MEAL_BONUS = Int32Array.from([-1311, 0, 655, 1311, 0, 0, 0, 0]);
export const QUAL_DRIVE = Int32Array.from([-3932, -1311, 655, 1966, 1966, 1966, 1966, 1966]);
export const WB_DRIVE = Int32Array.from([-1966, -1311, -655, 0, 328, 655, 983, 1311]);

for (let c = 0; c < C; c++) {
  for (let q = 0; q < Q; q++) PRICE[c * 8 + q] = Math.floor(BASE_PRICE[c] * QUAL_PCT[q] / 100);
  const near = Math.max(1, SHELF[c] >> 2), mid = Math.max(2, SHELF[c] >> 1);
  for (let left = 0; left < 16; left++) AGE_BAND[c * 16 + left] = left <= near ? 2 : left <= mid ? 1 : 0;
}
{
  let k = 0;
  for (let c = 0; c < C; c++) { const n = Math.round(CAT_W[c] * 256 / 100); for (let j = 0; j < n && k < 256; j++) CAT_PICK[k++] = c; }
  while (k < 256) CAT_PICK[k++] = 0;
  for (let b = 0; b < WB; b++) for (let r = 0; r < 16; r++) {
    const s = r + b * 2;
    QUAL_PICK[b * 16 + r] = s < 6 ? 0 : s < 14 ? 1 : s < 22 ? 2 : 3;
  }
}

// Non-food resources live in firm inventories (about one firm per 10 households, as in Lengnick's
// 1,000 households and 100 firms); each of 4 firm types makes some resources and uses others.
export const firmsOf = (H) => Math.max(1, Math.ceil(H / 10));
export const RES_PROD = new Int32Array(4 * R), RES_USE = new Int32Array(4 * R);
for (let t = 0; t < 4; t++) for (let r = 0; r < R; r++) {
  RES_PROD[t * R + r] = (r & 3) === t ? 40 + r * 3 : 0;
  RES_USE[t * R + r] = ((r + 1) & 3) === t ? 30 + r * 2 : 2;
}

export function needRates(tpd) {
  const per = (fracPerDay) => Math.max(1, Math.floor(fracPerDay * FULL / tpd));
  return Int32Array.from([per(0.95), per(1.0), per(0.6), per(0.8)]);
}

function householdSizes(N, seed) {
  const sizes = [];
  let n = 0, h = 0;
  while (n < N) {
    const r = draw(seed, h, 0, S_INIT) % 100;
    let s = r < 27 ? 1 : r < 60 ? 2 : r < 76 ? 3 : r < 90 ? 4 : 5;
    if (n + s > N) s = N - n;
    sizes.push(s); n += s; h++;
  }
  return sizes;
}

function layout(a, N, H, mode, lotLayout) {
  const w = {};
  const ag = (T, name, n = N) => (w[name] = a.take(T, n, name, 'agent'));
  const hh = (T, name, n = H) => (w[name] = a.take(T, n, name, 'household'));
  const sys = (T, name, n) => (w[name] = a.take(T, n, name, 'system'));
  const st = (T, name, n) => (w[name] = a.take(T, n, name, 'settlement'));
  const scr = (T, name, n) => (w[name] = a.take(T, n, name, 'scratch-optional'));
  if (mode === 'wheel') { ag(Int32Array, 'needZ', N * 4); ag(Int32Array, 'wheelNext'); sys(Int32Array, 'wheelHead', WSIZE); }
  else ag(Uint16Array, 'needs', N * 4);
  ag(Uint8Array, 'metab'); ag(Int32Array, 'household');
  ag(Int32Array, 'happy'); ag(Int16Array, 'happySet');
  ag(Uint16Array, 'mealQSum'); ag(Uint8Array, 'meals'); ag(Uint8Array, 'missed'); ag(Uint8Array, 'flags');
  ag(Float64Array, 'cash'); ag(Float64Array, 'wage'); ag(Float64Array, 'incomeDay');
  if (lotLayout === 'soa') {
    hh(Uint16Array, 'lotExp', H * MAX_LOTS); hh(Uint16Array, 'lotQty', H * MAX_LOTS);
    hh(Uint8Array, 'lotCat', H * MAX_LOTS); hh(Uint8Array, 'lotQual', H * MAX_LOTS);
  } else hh(Uint32Array, 'lots', H * MAX_LOTS);
  hh(Uint8Array, 'lotCount'); hh(Uint16Array, 'portions'); hh(Uint8Array, 'members');
  hh(Uint8Array, 'inShopQ'); hh(Int32Array, 'shopQ');
  for (const k of ['hhCash', 'deposits', 'homeValue', 'durables', 'netWorth', 'foodValue', 'memberCash']) hh(Float64Array, k);
  hh(Uint8Array, 'wealthBand');
  w.firmRes = a.take(Int32Array, firmsOf(H) * R, 'firmRes', 'firm');
  sys(Int32Array, 'qState', 4); sys(Float64Array, 'acct', 4); sys(Float64Array, 'dayAcc', 4);
  st(Int32Array, 'stock', C * Q * A); st(Int32Array, 'waste', C); st(Int32Array, 'eaten', C); st(Int32Array, 'res', R);
  st(Int32Array, 'hBand', HB); st(Int32Array, 'wCount', WB); st(Float64Array, 'wCents', WB); st(Int32Array, 'scalars', 8);
  st(Int32Array, 'committedI', C * Q * A + C + C + R + HB + WB + 8); st(Float64Array, 'committedF', WB);
  sys(Int32Array, 'wHistCount', NBINS); sys(Float64Array, 'wHistCents', NBINS);
  scr(Float64Array, 'sortBuf', H);
  return w;
}

export function createWorld({ N, seed = 42, order = 'contig', tpd = 1440, mode = 'all', lotLayout = 'packed' }) {
  const sizes = householdSizes(N, seed);
  const H = sizes.length;
  const a = createArena();
  layout(a, N, H, mode, lotLayout);
  const reserved = a.reserve();
  const w = layout(a, N, H, mode, lotLayout);
  Object.assign(w, { N, H, seed, order, tpd, mode, lotLayout, arena: a, reservedBytes: reserved, rates: needRates(tpd) });
  if (w.lots) w.lots.fill(EMPTY);

  const slot = new Int32Array(N);
  for (let i = 0; i < N; i++) slot[i] = i;
  if (order === 'scatter') {
    for (let i = N - 1; i > 0; i--) { const j = draw(seed, i, 1, S_INIT) % (i + 1); const t = slot[i]; slot[i] = slot[j]; slot[j] = t; }
  }
  let i = 0;
  for (let h = 0; h < H; h++) { w.members[h] = sizes[h]; for (let k = 0; k < sizes[h]; k++) w.household[slot[i++]] = h; }

  let payroll = 0, money = 0;
  for (let i = 0; i < N; i++) {
    const r = draw(seed, i, 2, S_INIT), r2 = draw(seed, i, 3, S_INIT);
    w.metab[i] = 96 + (r % 65); // Q7 hunger-rate multiplier (128 = 1.0), so it fits a Uint8
    w.happySet[i] = 19 + ((r >>> 8) % 65);
    const emp = (r2 % 100) < 85;
    w.flags[i] = emp ? F_EMP : 0;
    w.wage[i] = emp ? 8000 + ((r2 >>> 8) % 22000) : 0;
    w.cash[i] = (20000 + ((r >>> 16) % 200000)) * (((r2 >>> 24) & 15) === 0 ? 10 : 1);
    payroll += w.wage[i]; money += w.cash[i];
  }
  for (let h = 0; h < H; h++) {
    const r = draw(seed, h, 4, S_INIT), r2 = draw(seed, h, 5, S_INIT);
    w.hhCash[h] = 30000 + (r % 50000);
    w.deposits[h] = (r2 % 100) < 60 ? (r % 5000000) * (((r2 >>> 8) % 10) === 0 ? 20 : 1) : 0;
    w.homeValue[h] = ((r2 >>> 16) % 100) < 40 ? 15000000 + ((r >>> 4) % 25000000) : 0;
    w.durables[h] = 200000 + ((r2 >>> 4) % 1800000);
    money += w.hhCash[h] + w.deposits[h];
  }
  for (let k = 0; k < w.firmRes.length; k++) w.firmRes[k] = 500 + (draw(seed, k, 9, S_INIT) % 2000);
  w.F = firmsOf(H);
  w.acct[FIRM] = 5 * payroll; w.acct[BANK] = 1e11;
  w.acct[MINT] = -(money + w.acct[FIRM] + w.acct[BANK]);
  return w;
}

export function initLots(w, addLot, day) {
  for (let h = 0; h < w.H; h++) {
    const n = 2 + (draw(w.seed, h, 6, S_INIT) % 3);
    for (let k = 0; k < n; k++) {
      const r = draw(w.seed, h, 7 + k, S_INIT);
      const cat = CAT_PICK[r & 255], q = (r >>> 8) & 3;
      const qty = w.members[h] * 3 + ((r >>> 12) % 5);
      addLot(h, cat, q, qty, day + 1 + ((r >>> 16) % SHELF[cat]));
    }
  }
}

export function moneyTotal(w) {
  let s = w.acct[MINT] + w.acct[FIRM] + w.acct[BANK];
  for (let i = 0; i < w.N; i++) s += w.cash[i];
  for (let h = 0; h < w.H; h++) s += w.hhCash[h] + w.deposits[h];
  return s;
}

export function memoryReport(w) {
  const g = {};
  for (const r of w.arena.regions) { (g[r.group] ??= { bytes: 0, items: [] }); g[r.group].bytes += r.bytes; g[r.group].items.push(`${r.name}:${r.bytes}`); }
  return { reservedBytes: w.reservedBytes, usedBytes: w.arena.used(), groups: g };
}
