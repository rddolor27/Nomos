// Shopping trips, capped per tick: a household tops its pantry up to 9 portions a member in two lots,
// paying integer cents from its purse to the firm account (one ledger transfer per lot).
import { CAT_PICK, QUAL_PICK, SHELF, PRICE, FIRM, S_SHOP } from './world.mjs';
import { draw } from './det.mjs';
import { addLot } from './food.mjs';
import { dequeueShop } from './shopq.mjs';

let members, portions, hhCash, wealthBand, acct, seed = 0;

export function bindShop(w) { members = w.members; portions = w.portions; hhCash = w.hhCash; wealthBand = w.wealthBand; acct = w.acct; seed = w.seed; }

function buyLot(h, cat, q, qty, day, age) {
  const p = PRICE[(cat << 3) | q];
  const cash = hhCash[h];
  const afford = Math.floor(cash / p);
  if (qty > afford) qty = afford;
  if (qty > 511) qty = 511;
  if (qty <= 0) return;
  let exp = day + SHELF[cat] - age;
  if (exp <= day) exp = day + 1;
  const got = addLot(h, cat, q, qty, exp);
  if (got === 0) return;
  const cost = got * p;
  hhCash[h] = cash - cost;
  acct[FIRM] += cost;
}

function buy(h, t, day) {
  const want = members[h] * 9 - portions[h];
  if (want <= 0) return;
  const r = draw(seed, h, t, S_SHOP);
  const band = wealthBand[h] << 4;
  const half = (want + 1) >> 1;
  buyLot(h, CAT_PICK[r & 255], QUAL_PICK[band | ((r >>> 16) & 15)], half, day, (r >>> 24) & 1);
  if (want > half) buyLot(h, CAT_PICK[(r >>> 8) & 255], QUAL_PICK[band | ((r >>> 20) & 15)], want - half, day, (r >>> 25) & 1);
}

export function processShops(t, day, cap) {
  let c = 0;
  while (c < cap) {
    const h = dequeueShop();
    if (h < 0) break;
    buy(h, t, day);
    c++;
  }
  return c;
}
