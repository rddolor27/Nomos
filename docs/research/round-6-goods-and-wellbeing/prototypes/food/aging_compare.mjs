// How well do cheap aggregate food models track exact FEFO lots with hard expiry?
// Integer-only, keyed stochastic rounding, deterministic. Run: node aging_compare.mjs
//
// exact  : stock indexed by days-left (1..L); FEFO; units reaching 0 days left spoil at the day boundary.
// erlangB: B age bands, each day a fraction B/L of every band ages one band (stochastic rounding);
//          units aging out of the last band spoil; FEFO eats from the oldest band first.
//          B = 1 is the "single daily loss rate" model.
const Q16 = 65536;

function hash(a, b, c) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return h >>> 0;
}

function stochRound(qty, fracQ16, day, band) {
  const x = qty * fracQ16;
  let n = Math.floor(x / Q16);
  if ((hash(day, band, qty) & 0xffff) < x - n * Q16) n++;
  return n;
}

function runExact(L, k, D, supplyPct, days, warm) {
  const left = new Int32Array(L + 1);
  let delivered = 0, wasted = 0, unmet = 0, demanded = 0;
  for (let day = 0; day < days; day++) {
    if (day % k === 0) { const q = Math.floor(k * D * supplyPct / 100); left[L] += q; if (day >= warm) delivered += q; }
    let need = D;
    for (let d = 1; d <= L && need > 0; d++) { const t = left[d] < need ? left[d] : need; left[d] -= t; need -= t; }
    if (day >= warm) { unmet += need; demanded += D; }
    if (day >= warm) wasted += left[1];
    for (let d = 1; d < L; d++) left[d] = left[d + 1];
    left[L] = 0;
  }
  return { waste: wasted / delivered, short: unmet / demanded };
}

function runErlang(B, L, k, D, supplyPct, days, warm) {
  const band = new Int32Array(B);
  const f = Math.min(Q16, Math.floor(B * Q16 / L));
  let delivered = 0, wasted = 0, unmet = 0, demanded = 0;
  for (let day = 0; day < days; day++) {
    if (day % k === 0) { const q = Math.floor(k * D * supplyPct / 100); band[0] += q; if (day >= warm) delivered += q; }
    let need = D;
    for (let b = B - 1; b >= 0 && need > 0; b--) { const t = band[b] < need ? band[b] : need; band[b] -= t; need -= t; }
    if (day >= warm) { unmet += need; demanded += D; }
    let carry = 0;
    for (let b = 0; b < B; b++) {
      const out = stochRound(band[b], f, day, b);
      band[b] = band[b] - out + carry;
      carry = out;
    }
    if (day >= warm) wasted += carry;
  }
  return { waste: wasted / delivered, short: unmet / demanded };
}

const pct = (x) => (100 * x).toFixed(1).padStart(5);
const D = 100, DAYS = 3000, WARM = 200;
console.log('waste% / shortage% of delivered / demanded; demand 100 units a day; 2,800 scored days');
console.log('L  k  supply | exact        | erlang1      | erlang2      | erlang4');
for (const L of [2, 3, 4, 7, 14, 30]) for (const k of [1, 3, 7]) for (const s of [100, 110, 130]) {
  const e = runExact(L, k, D, s, DAYS, WARM);
  const r = [1, 2, 4].map((B) => runErlang(B, L, k, D, s, DAYS, WARM));
  console.log(`${String(L).padStart(2)} ${k} ${String(s).padStart(4)}%  | ${pct(e.waste)} ${pct(e.short)} | ` +
    r.map((x) => `${pct(x.waste)} ${pct(x.short)}`).join(' | '));
}
