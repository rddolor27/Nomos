// Per-tick needs and eating, three swappable variants:
//   all     - decay 4 Uint16 needs for every agent every tick, eat below the threshold;
//   stagger - the same for 1/8 of agents per tick (contiguous blocks), 8x the decay;
//   wheel   - needs stored as the tick each reaches zero (lazy), meals scheduled on a timing wheel.
import { FULL, EAT_T, WSIZE, WMASK, F_FAIL, MEAL_VALUE, MEAL_BONUS, S_INIT } from './world.mjs';
import { eatOne } from './food.mjs';
import { draw } from './det.mjs';

let needs, needZ, wheelNext, wheelHead, metab, household, mealQSum, meals, missed, flags, happy;
let N = 0, r0 = 0, r1 = 0, r2 = 0, r3 = 0, retry = 1;

export function bindNeeds(w) {
  needs = w.needs; needZ = w.needZ; wheelNext = w.wheelNext; wheelHead = w.wheelHead;
  metab = w.metab; household = w.household; mealQSum = w.mealQSum; meals = w.meals; missed = w.missed;
  flags = w.flags; happy = w.happy; N = w.N;
  r0 = w.rates[0]; r1 = w.rates[1]; r2 = w.rates[2]; r3 = w.rates[3];
  retry = Math.max(1, Math.floor(w.tpd / 48));
}

export function initNeeds(w, t0) {
  for (let i = 0; i < N; i++) {
    const r = draw(w.seed, i, 8, S_INIT);
    const lv = EAT_T + (r % (FULL - EAT_T));
    if (w.mode === 'wheel') {
      const rate = (r0 * metab[i]) >> 7, b = i << 2;
      needZ[b] = t0 + Math.ceil(lv / rate);
      needZ[b + 1] = t0 + ((r >>> 4) & 4095); needZ[b + 2] = t0 + ((r >>> 8) & 4095); needZ[b + 3] = t0 + ((r >>> 12) & 4095);
    } else {
      const b = i << 2;
      needs[b] = lv; needs[b + 1] = 8192 + ((r >>> 3) % 57343); needs[b + 2] = 8192 + ((r >>> 7) % 57343); needs[b + 3] = 8192 + ((r >>> 11) % 57343);
    }
  }
  if (w.mode === 'wheel') {
    wheelHead.fill(-1);
    for (let i = 0; i < N; i++) { const rate = (r0 * metab[i]) >> 7; schedule(i, t0, needZ[i << 2] - ((EAT_T / rate) | 0)); }
  }
}

function tryEat(i) {
  const r = eatOne(household[i]);
  if (r < 0) {
    const f = flags[i];
    if ((f & F_FAIL) === 0) { flags[i] = f | F_FAIL; missed[i]++; }
    return -1;
  }
  flags[i] &= 0xfd;
  const q = r & 7;
  mealQSum[i] += q; meals[i]++;
  happy[i] += MEAL_BONUS[q];
  return MEAL_VALUE[q];
}

// Rest, social and fun refill to full below 8192 as a stand-in for the systems that restore them.
export function tickAll() {
  const n = N, a = r0, b1 = r1, b2 = r2, b3 = r3;
  for (let i = 0; i < n; i++) {
    const b = i << 2;
    let v = needs[b + 1] - b1; needs[b + 1] = v < 8192 ? FULL : v;
    v = needs[b + 2] - b2; needs[b + 2] = v < 8192 ? FULL : v;
    v = needs[b + 3] - b3; needs[b + 3] = v < 8192 ? FULL : v;
    let hu = needs[b] - ((a * metab[i]) >> 7);
    if (hu < 0) hu = 0;
    if (hu < EAT_T) { const g = tryEat(i); if (g > 0) { hu += g; if (hu > FULL) hu = FULL; } }
    needs[b] = hu;
  }
}

export function tickStagger(t) {
  const n = N, blk = t & 7, i0 = (blk * n) >> 3, i1 = ((blk + 1) * n) >> 3;
  const a = r0 * 8, b1 = r1 * 8, b2 = r2 * 8, b3 = r3 * 8;
  for (let i = i0; i < i1; i++) {
    const b = i << 2;
    let v = needs[b + 1] - b1; needs[b + 1] = v < 8192 ? FULL : v;
    v = needs[b + 2] - b2; needs[b + 2] = v < 8192 ? FULL : v;
    v = needs[b + 3] - b3; needs[b + 3] = v < 8192 ? FULL : v;
    let hu = needs[b] - ((a * metab[i]) >> 7);
    if (hu < 0) hu = 0;
    if (hu < EAT_T) { const g = tryEat(i); if (g > 0) { hu += g; if (hu > FULL) hu = FULL; } }
    needs[b] = hu;
  }
}

function schedule(i, t, due) {
  let d = due - t;
  if (d < 1) d = 1; else if (d >= WSIZE) d = WSIZE - 1;
  const s = (t + d) & WMASK;
  wheelNext[i] = wheelHead[s];
  wheelHead[s] = i;
}

function mealDue(i, t) {
  const b = i << 2;
  const rate = (r0 * metab[i]) >> 7;
  const z = needZ[b];
  let hu = (z - t) * rate;
  if (hu < 0) hu = 0; else if (hu > FULL) hu = FULL;
  const lead = (EAT_T / rate) | 0;
  if (hu >= EAT_T) { schedule(i, t, z - lead); return; }
  const g = tryEat(i);
  if (g < 0) { schedule(i, t, t + retry); return; }
  hu += g; if (hu > FULL) hu = FULL;
  const z2 = t + (((hu + rate - 1) / rate) | 0);
  needZ[b] = z2;
  schedule(i, t, z2 - lead);
}

export function tickWheel(t) {
  const slot = t & WMASK;
  let i = wheelHead[slot];
  wheelHead[slot] = -1;
  while (i >= 0) {
    const nx = wheelNext[i];
    mealDue(i, t);
    i = nx;
  }
}

export function socialNow(i, t) {
  let v = (needZ[(i << 2) + 2] - t) * r2;
  return v < 0 ? 0 : v > FULL ? FULL : v;
}

// Optional per-tick mood: EMA of need satisfaction toward happiness (variants all/stagger only).
export function moodTick() {
  const n = N;
  for (let i = 0; i < n; i++) {
    const b = i << 2;
    const target = (needs[b] + needs[b + 1] + needs[b + 2] + needs[b + 3] - 131070) << 1;
    const h = happy[i];
    happy[i] = h + ((target - h) >> 12);
  }
}

// Dinner-rush probe: every agent attempts one meal now.
export function eatAll() {
  let ok = 0;
  for (let i = 0; i < N; i++) if (tryEat(i) > 0) ok++;
  return ok;
}
