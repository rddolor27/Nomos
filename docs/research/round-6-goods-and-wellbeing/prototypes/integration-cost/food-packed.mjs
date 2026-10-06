// Food lots as one Uint32 word each: expiry day (16 bits) | category (4) | quality band (3) | quantity (9).
// Lots stay sorted by (expiry, category, quality), so FEFO is "take slot 0". Equal keys merge.
import { MAX_LOTS, EMPTY, Q, A, STALE, LOSS_Q16, AGE_BAND, PRICE } from './world.mjs';
import { draw } from './det.mjs';
import { enqueueShop } from './shopq.mjs';

let lots, lotCount, portions, members, eaten, stock, waste, foodValue, H = 0, seed = 0;

export function bindFood(w) {
  lots = w.lots; lotCount = w.lotCount; portions = w.portions; members = w.members;
  eaten = w.eaten; stock = w.stock; waste = w.waste; foodValue = w.foodValue; H = w.H; seed = w.seed;
}

// Returns (category << 3) | quality of the portion eaten, or -1 when the household has no food.
export function eatOne(h) {
  const n = lotCount[h];
  if (n === 0) return -1;
  const base = h << 3;
  const w = lots[base];
  const cat = (w >>> 12) & 15, q = (w >>> 9) & 7;
  if ((w & 511) > 1) lots[base] = w - 1;
  else {
    for (let k = 1; k < n; k++) lots[base + k - 1] = lots[base + k];
    lots[base + n - 1] = EMPTY;
    lotCount[h] = n - 1;
  }
  const p = portions[h] - 1;
  portions[h] = p;
  eaten[cat]++;
  if (p < members[h] * 2) enqueueShop(h);
  return (cat << 3) | q;
}

export function addLot(h, cat, q, qty, exp) {
  const base = h << 3, n = lotCount[h];
  const key = (exp << 7) | (cat << 3) | q;
  for (let k = 0; k < n; k++) {
    const w = lots[base + k];
    if ((w >>> 9) === key && (w & 511) + qty <= 511) { lots[base + k] = w + qty; portions[h] += qty; return qty; }
  }
  if (n === MAX_LOTS) return 0;
  let k = n;
  while (k > 0 && (lots[base + k - 1] >>> 9) > key) { lots[base + k] = lots[base + k - 1]; k--; }
  lots[base + k] = ((key << 9) | qty) >>> 0;
  lotCount[h] = n + 1;
  portions[h] += qty;
  return qty;
}

// Day boundary: drop expired lots, stochastic loss for perishables, stale quality, compaction,
// and (fused) the settlement-ledger stock fold plus each household's food value for wealth.
export function spoilHousehold(h, day) {
  const n = lotCount[h];
  if (n === 0) { foodValue[h] = 0; enqueueShop(h); return 0; }
  const base = h << 3;
  let j = 0, por = 0, val = 0;
  for (let k = 0; k < n; k++) {
    const w = lots[base + k];
    const exp = w >>> 16, cat = (w >>> 12) & 15;
    let q = (w >>> 9) & 7, qty = w & 511;
    if (exp <= day) { waste[cat] += qty; continue; }
    const lr = LOSS_Q16[cat];
    if (lr !== 0) {
      const x = qty * lr;
      let lost = x >>> 16;
      if ((draw(seed, h, day, (cat << 16) | exp) & 0xffff) < (x & 0xffff)) lost++;
      if (lost > 0) { waste[cat] += lost; qty -= lost; if (qty === 0) continue; }
    }
    const left = exp - day;
    if (left <= STALE[cat] && q > 0) q--;
    stock[(cat * Q + q) * A + AGE_BAND[(cat << 4) | (left > 15 ? 15 : left)]] += qty;
    val += qty * PRICE[(cat << 3) | q];
    por += qty;
    lots[base + j] = ((exp << 16) | (cat << 12) | (q << 9) | qty) >>> 0;
    j++;
  }
  for (let k = j; k < n; k++) lots[base + k] = EMPTY;
  lotCount[h] = j; portions[h] = por; foodValue[h] = val;
  if (por < members[h] * 2) enqueueShop(h);
  return val;
}

export function spoilDay(day, h0, h1) { for (let h = h0; h < h1; h++) spoilHousehold(h, day); }

// Same as spoilDay without the ledger fold and food valuation, to price the fusion.
export function spoilDayPlain(day) {
  for (let h = 0; h < H; h++) {
    const n = lotCount[h];
    if (n === 0) { enqueueShop(h); continue; }
    const base = h << 3;
    let j = 0, por = 0;
    for (let k = 0; k < n; k++) {
      const w = lots[base + k];
      const exp = w >>> 16, cat = (w >>> 12) & 15;
      let q = (w >>> 9) & 7, qty = w & 511;
      if (exp <= day) { waste[cat] += qty; continue; }
      const lr = LOSS_Q16[cat];
      if (lr !== 0) {
        const x = qty * lr;
        let lost = x >>> 16;
        if ((draw(seed, h, day, (cat << 16) | exp) & 0xffff) < (x & 0xffff)) lost++;
        if (lost > 0) { waste[cat] += lost; qty -= lost; if (qty === 0) continue; }
      }
      if (exp - day <= STALE[cat] && q > 0) q--;
      por += qty;
      lots[base + j] = ((exp << 16) | (cat << 12) | (q << 9) | qty) >>> 0;
      j++;
    }
    for (let k = j; k < n; k++) lots[base + k] = EMPTY;
    lotCount[h] = j; portions[h] = por;
    if (por < members[h] * 2) enqueueShop(h);
  }
}

export function lotWord(h, k) { return k < lotCount[h] ? lots[(h << 3) + k] : EMPTY; }
