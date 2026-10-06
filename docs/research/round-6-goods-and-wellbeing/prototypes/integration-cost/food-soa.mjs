// Food lots as four field arrays (expiry Uint16, quantity Uint16, category Uint8, quality Uint8):
// 6 bytes a lot instead of 4. Same algorithm and ordering as food-packed.mjs, so state hashes match.
import { MAX_LOTS, EMPTY, Q, A, STALE, LOSS_Q16, AGE_BAND, PRICE } from './world.mjs';
import { draw } from './det.mjs';
import { enqueueShop } from './shopq.mjs';

let lotExp, lotQty, lotCat, lotQual, lotCount, portions, members, eaten, stock, waste, foodValue, H = 0, seed = 0;

export function bindFood(w) {
  lotExp = w.lotExp; lotQty = w.lotQty; lotCat = w.lotCat; lotQual = w.lotQual;
  lotCount = w.lotCount; portions = w.portions; members = w.members;
  eaten = w.eaten; stock = w.stock; waste = w.waste; foodValue = w.foodValue; H = w.H; seed = w.seed;
}

export function eatOne(h) {
  const n = lotCount[h];
  if (n === 0) return -1;
  const base = h << 3;
  const cat = lotCat[base], q = lotQual[base], qty = lotQty[base];
  if (qty > 1) lotQty[base] = qty - 1;
  else {
    for (let k = 1; k < n; k++) {
      const d = base + k - 1, s = base + k;
      lotExp[d] = lotExp[s]; lotQty[d] = lotQty[s]; lotCat[d] = lotCat[s]; lotQual[d] = lotQual[s];
    }
    lotQty[base + n - 1] = 0;
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
    const s = base + k;
    if (((lotExp[s] << 7) | (lotCat[s] << 3) | lotQual[s]) === key && lotQty[s] + qty <= 511) { lotQty[s] += qty; portions[h] += qty; return qty; }
  }
  if (n === MAX_LOTS) return 0;
  let k = n;
  while (k > 0) {
    const s = base + k - 1;
    if (((lotExp[s] << 7) | (lotCat[s] << 3) | lotQual[s]) <= key) break;
    lotExp[s + 1] = lotExp[s]; lotQty[s + 1] = lotQty[s]; lotCat[s + 1] = lotCat[s]; lotQual[s + 1] = lotQual[s];
    k--;
  }
  const d = base + k;
  lotExp[d] = exp; lotQty[d] = qty; lotCat[d] = cat; lotQual[d] = q;
  lotCount[h] = n + 1;
  portions[h] += qty;
  return qty;
}

export function spoilHousehold(h, day) {
  const n = lotCount[h];
  if (n === 0) { foodValue[h] = 0; enqueueShop(h); return 0; }
  const base = h << 3;
  let j = 0, por = 0, val = 0;
  for (let k = 0; k < n; k++) {
    const s = base + k;
    const exp = lotExp[s], cat = lotCat[s];
    let q = lotQual[s], qty = lotQty[s];
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
    const d = base + j;
    lotExp[d] = exp; lotQty[d] = qty; lotCat[d] = cat; lotQual[d] = q;
    j++;
  }
  for (let k = j; k < n; k++) lotQty[base + k] = 0;
  lotCount[h] = j; portions[h] = por; foodValue[h] = val;
  if (por < members[h] * 2) enqueueShop(h);
  return val;
}

export function spoilDay(day, h0, h1) { for (let h = h0; h < h1; h++) spoilHousehold(h, day); }

export function spoilDayPlain(day) {
  for (let h = 0; h < H; h++) {
    const n = lotCount[h];
    if (n === 0) { enqueueShop(h); continue; }
    const base = h << 3;
    let j = 0, por = 0;
    for (let k = 0; k < n; k++) {
      const s = base + k;
      const exp = lotExp[s], cat = lotCat[s];
      let q = lotQual[s], qty = lotQty[s];
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
      const d = base + j;
      lotExp[d] = exp; lotQty[d] = qty; lotCat[d] = cat; lotQual[d] = q;
      j++;
    }
    for (let k = j; k < n; k++) lotQty[base + k] = 0;
    lotCount[h] = j; portions[h] = por;
    if (por < members[h] * 2) enqueueShop(h);
  }
}

export function lotWord(h, k) {
  if (k >= lotCount[h]) return EMPTY;
  const s = (h << 3) + k;
  return ((lotExp[s] << 16) | (lotCat[s] << 12) | (lotQual[s] << 9) | lotQty[s]) >>> 0;
}
