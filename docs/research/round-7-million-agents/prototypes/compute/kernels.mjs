// Per-tick phases. Every function here is allocation-free and integer-only on replay state.
// Phase order per tick: move (static strips) -> cell totals (dynamic cell blocks) -> block scan (serial)
// -> offsets (dynamic cell blocks) -> scatter (static strips) -> decide (dynamic chunks)
// -> snapshot (dynamic chunks) -> chunk-ordered reduction (serial).
import {
  CHUNK, WS, WMASK, CELL_SHIFT, CELL_BLOCK, FULL, EAT_T, RATE_H, RATE_E, RATE_S, RATE_P,
  N_SHOPS, S_DECIDE, WAGE, BUY_QTY, ROLE_POL, draw, mix32,
} from './world.mjs';

let N = 0, W = 0, CW = 0, NC = 0, NT = 0, nChunks = 0, nCB = 0, seedH = 0;
let px, py, needZ, wnext, cell, partner, hhOf, sorted, dest, dirC, role, act, speed, metab, homeZone, workZone, shopZone, parkZone, zoneShop;
let food, cash, cellStart, agg, blockSum, blockStart, wheelHead;
let cMeals, cDec, cSoc, cBuys, cSales, shopCash, price, zoneCell, lut, flow, snapX, snapY, snapVis, totals;
let part, off, movers, mPos, mCount, decided, dCount;
let LEAN = 0;
export function setLean(v) { LEAN = v; }
const COMMIT = 6 * 65535 * 16;

const DX = new Int32Array([0, 1, 1, 0, -1, -1, -1, 0, 1]);
const DY = new Int32Array([0, 0, 1, 1, 1, 0, -1, -1, -1]);

export function bind(V, L, seed) {
  N = L.N; W = L.W; CW = L.CW; NC = L.NC; NT = L.NT; nChunks = L.nChunks; nCB = L.nCB; seedH = mix32(seed);
  ({ px, py, needZ, wnext, cell, partner, hhOf, sorted, dest, dirC, role, act, speed, metab, homeZone, workZone, shopZone, parkZone, zoneShop } = V);
  ({ food, cash, cellStart, agg, blockSum, blockStart, wheelHead } = V);
  ({ cMeals, cDec, cSoc, cBuys, cSales, shopCash, price, zoneCell, lut, flow, snapX, snapY, snapVis, totals } = V);
  ({ part, off, movers, mPos, mCount, decided, dCount } = V);
}

// Static strip of whole chunks for worker w of nw; move and scatter use the same strip, which keeps the sort stable.
function stripStart(w, nw) { return Math.floor((w * nChunks) / nw) * CHUNK; }
function stripEnd(w, nw) { const e = Math.floor(((w + 1) * nChunks) / nw) * CHUNK; return e < N ? e : N; }

// Step towards the centre of the next tile on the cached flow direction (branch-free clamp), refresh the
// direction only on a tile change, then count the agent into this worker's per-cell partials.
export function phaseMove(w, nw, t) {
  const i0 = stripStart(w, nw), i1 = stripEnd(w, nw), pb = (w * NC) << 2;
  part.fill(0, pb, pb + (NC << 2));
  for (let i = i0; i < i1; i++) {
    let x = px[i], y = py[i];
    const tx = x >> 8, ty = y >> 8, dir = dirC[i], sp = speed[i];
    let d = ((tx + DX[dir]) << 8) + 128 - x, h = d - sp; d -= h & ~(h >> 31); h = d + sp; d -= h & (h >> 31); x += d;
    d = ((ty + DY[dir]) << 8) + 128 - y; h = d - sp; d -= h & ~(h >> 31); h = d + sp; d -= h & (h >> 31); y += d;
    px[i] = x; py[i] = y;
    const nx = x >> 8, ny = y >> 8;
    if (nx !== tx || ny !== ty) dirC[i] = flow[dest[i] * NT + ny * W + nx];
    const c = (y >> CELL_SHIFT) * CW + (x >> CELL_SHIFT);
    cell[i] = c;
    const o = pb + (c << 2), r = role[i];
    part[o]++; part[o + 1] += (r >> 1) & 1; part[o + 2] += r & 1;
    part[o + 3] += ((needZ[i << 2] - t) * ((RATE_H * metab[i]) >> 7) - EAT_T) >>> 31;
  }
}

// Lean mode: only travelling agents move, from the chunk's dense list; the cell and the persistent render
// snapshot are updated in the same pass, and arrivals leave the list by swap-remove (a fixed order per chunk).
export function phaseMoveLean(c) {
  const base = c * CHUNK;
  let cnt = mCount[c], k = 0;
  while (k < cnt) {
    const i = movers[base + k];
    const dir = dirC[i];
    if (dir === 0) {
      cnt--; const last = movers[base + cnt]; movers[base + k] = last; mPos[last] = k; mPos[i] = -1;
      continue;
    }
    let x = px[i], y = py[i];
    const tx = x >> 8, ty = y >> 8, sp = speed[i];
    let d = ((tx + DX[dir]) << 8) + 128 - x, h = d - sp; d -= h & ~(h >> 31); h = d + sp; d -= h & (h >> 31); x += d;
    d = ((ty + DY[dir]) << 8) + 128 - y; h = d - sp; d -= h & ~(h >> 31); h = d + sp; d -= h & (h >> 31); y += d;
    px[i] = x; py[i] = y;
    snapX[i] = x * 0.00390625; snapY[i] = y * 0.00390625;
    const nx = x >> 8, ny = y >> 8;
    if (nx !== tx || ny !== ty) {
      dirC[i] = flow[dest[i] * NT + ny * W + nx];
      cell[i] = (y >> CELL_SHIFT) * CW + (x >> CELL_SHIFT);
    }
    k++;
  }
  mCount[c] = cnt;
}

// Lean rebuild tick: per-worker cell partials from the stored cells, no movement.
export function phaseHist(w, nw, t) {
  const i0 = stripStart(w, nw), i1 = stripEnd(w, nw), pb = (w * NC) << 2;
  part.fill(0, pb, pb + (NC << 2));
  for (let i = i0; i < i1; i++) {
    const o = pb + (cell[i] << 2), r = role[i];
    part[o]++; part[o + 1] += (r >> 1) & 1; part[o + 2] += r & 1;
    part[o + 3] += ((needZ[i << 2] - t) * ((RATE_H * metab[i]) >> 7) - EAT_T) >>> 31;
  }
}

// Integer sums over workers: any order gives the same result.
export function phaseCellTotals(b, nw) {
  const c0 = b * CELL_BLOCK, c1 = c0 + CELL_BLOCK < NC ? c0 + CELL_BLOCK : NC, stride = NC << 2;
  let bs = 0;
  for (let c = c0; c < c1; c++) {
    let n = 0, p = 0, m = 0, h = 0;
    for (let w = 0, o = c << 2; w < nw; w++, o += stride) { n += part[o]; p += part[o + 1]; m += part[o + 2]; h += part[o + 3]; }
    const a = c << 2;
    agg[a] = n; agg[a + 1] = p; agg[a + 2] = m; agg[a + 3] = h;
    bs += n;
  }
  blockSum[b] = bs;
}

export function blockScan() {
  let run = 0;
  for (let b = 0; b < nCB; b++) { blockStart[b] = run; run += blockSum[b]; }
  cellStart[NC] = run;
}

// Offsets in (cell, worker) order: the scatter then reproduces a stable counting sort by cell.
export function phaseOffsets(b, nw) {
  const c0 = b * CELL_BLOCK, c1 = c0 + CELL_BLOCK < NC ? c0 + CELL_BLOCK : NC, stride = NC << 2;
  let run = blockStart[b];
  for (let c = c0; c < c1; c++) {
    cellStart[c] = run;
    for (let w = 0, o = c << 2, q = c; w < nw; w++, o += stride, q += NC) { off[q] = run; run += part[o]; }
  }
}

export function phaseScatter(w, nw) {
  const i0 = stripStart(w, nw), i1 = stripEnd(w, nw), ob = w * NC;
  for (let i = i0; i < i1; i++) { const o = ob + cell[i]; const k = off[o]; off[o] = k + 1; sorted[k] = i; }
}

function clampNeed(v) { return v < 0 ? 0 : v > FULL ? FULL : v; }

function setDest(i, z, x, y, c) {
  dest[i] = z;
  const dir = flow[z * NT + (y >> 8) * W + (x >> 8)];
  dirC[i] = dir;
  if (LEAN !== 0 && dir !== 0 && mPos[i] < 0) {
    const k = mCount[c];
    movers[c * CHUNK + k] = i; mPos[i] = k; mCount[c] = k + 1;
  }
}

// One decision: lazy needs, 3x3 cell aggregates, six integer utilities with keyed jitter, effects that
// write only this agent, its chunk-owned household and its chunk's partials, then re-schedule on the wheel.
function decide(i, c, t, sb) {
  const b = i << 2;
  const rateH = (RATE_H * metab[i]) >> 7;
  const hu = clampNeed((needZ[b] - t) * rateH);
  const en = clampNeed((needZ[b + 1] - t) * RATE_E);
  const so = clampNeed((needZ[b + 2] - t) * RATE_S);
  const pu = clampNeed((needZ[b + 3] - t) * RATE_P);
  const x = px[i], y = py[i];
  const cx = x >> CELL_SHIFT, cy = y >> CELL_SHIFT;
  const x0 = cx > 0 ? cx - 1 : 0, x1 = cx < CW - 1 ? cx + 1 : CW - 1;
  const y0 = cy > 0 ? cy - 1 : 0, y1 = cy < CW - 1 ? cy + 1 : CW - 1;
  let crowd = 0, pol = 0, mer = 0, hun = 0;
  for (let yy = y0; yy <= y1; yy++) {
    for (let o = (yy * CW + x0) << 2, oe = (yy * CW + x1) << 2; o <= oe; o += 4) { crowd += agg[o]; pol += agg[o + 1]; mer += agg[o + 2]; hun += agg[o + 3]; }
  }
  const r = draw(seedH, i, t, S_DECIDE);
  const hh = hhOf[i], fd = food[hh];
  const cr = crowd > 255 ? 255 : crowd, mr = mer > 15 ? 255 : mer << 4, hr = hun > 255 ? 255 : hun;
  const uRest = lut[512 + (255 - (en >> 8))] * 170 + lut[256 + cr] * 20;
  const uEat = fd > 0 ? (hu < EAT_T ? 240 : 30) * lut[256 + (hu >> 8)] : 0;
  const uWork = lut[256 + (pu >> 8)] * 120 + lut[1280 + cr] * 20;
  const uShop = (fd < 4 ? 200 : 10) * lut[1792 + mr] + lut[1280 + cr] * 10;
  const uSoc = lut[512 + (255 - (so >> 8))] * 150 + lut[1024 + cr] * 40;
  const uWan = role[i] === ROLE_POL ? 80 * 65535 + lut[hr] * 60 + pol : 55 * 65535;
  // lean mode: an agent on its way keeps its plan unless something else clearly wins
  const cur = act[i], bonus = LEAN !== 0 && dirC[i] !== 0 ? COMMIT : 0;
  let a = 0, best = uRest + (r & 0x7fff) + (cur === 0 ? bonus : 0);
  let u = uEat + ((r >>> 3) & 0x7fff) + (cur === 1 ? bonus : 0); if (u > best) { best = u; a = 1; }
  u = uWork + ((r >>> 6) & 0x7fff) + (cur === 2 ? bonus : 0); if (u > best) { best = u; a = 2; }
  u = uShop + ((r >>> 9) & 0x7fff) + (cur === 3 ? bonus : 0); if (u > best) { best = u; a = 3; }
  u = uSoc + ((r >>> 12) & 0x7fff) + (cur === 4 ? bonus : 0); if (u > best) { best = u; a = 4; }
  u = uWan + ((r >>> 15) & 0x7fff) + (cur === 5 ? bonus : 0); if (u > best) { best = u; a = 5; }
  act[i] = a;
  let ev = 0;
  if (a === 0) {
    setDest(i, homeZone[i], x, y, c); needZ[b + 1] = t + ((FULL / RATE_E) | 0);
  } else if (a === 1) {
    food[hh] = fd - 1; needZ[b] = t + (((FULL + rateH - 1) / rateH) | 0); ev = 1;
  } else if (a === 2) {
    const z = workZone[i];
    setDest(i, z, x, y, c);
    if (cy * CW + cx === zoneCell[z]) {
      needZ[b + 3] = t + ((FULL / RATE_P) | 0);
      cash[hh] += WAGE; cSales[sb + (z & 3)] -= WAGE;
    }
  } else if (a === 3) {
    const z = shopZone[i], s = zoneShop[z];
    setDest(i, z, x, y, c);
    if (cy * CW + cx === zoneCell[z]) {
      const cost = price[s] * BUY_QTY;
      if (cash[hh] >= cost) { cash[hh] -= cost; food[hh] = fd + BUY_QTY; cSales[sb + s] += cost; ev = 4; }
    }
  } else if (a === 4) {
    const ce = cy * CW + cx;
    const s0 = cellStart[ce], n = cellStart[ce + 1] - s0;
    if (n > 1) {
      let k = (r >>> 8) % n, bj = -1, bd = 0x7fffffff;
      const m = n < 16 ? n : 16;
      for (let q = 0; q < m; q++) {
        const j = sorted[s0 + k];
        if (j !== i) {
          let ddx = px[j] - x, ddy = py[j] - y;
          if (ddx < 0) ddx = -ddx; if (ddy < 0) ddy = -ddy;
          const dd = ddx + ddy;
          if (dd < bd) { bd = dd; bj = j; }
        }
        k++; if (k === n) k = 0;
      }
      partner[i] = bj; needZ[b + 2] = t + ((FULL / RATE_S) | 0); ev = 2;
    }
  } else {
    const pick = (r >>> 20) & 3;
    setDest(i, pick === 0 ? homeZone[i] : pick === 1 ? shopZone[i] : pick === 2 ? workZone[i] : parkZone[i], x, y, c);
  }
  let d = 8 + (r >>> 26);
  if (LEAN !== 0) {
    // activity-based scheduling: an agent at its destination dwells 256-1,023 ticks (hunger can still
    // interrupt), a travelling agent re-decides after 64-127 ticks
    if (dirC[i] !== 0) d = 64 + (r >>> 26);
    else d = 256 + ((r >>> 22) % 768);
    const k = dCount[c];
    decided[c * CHUNK + k] = i; dCount[c] = k + 1;
    snapVis[i] = role[i] | (a << 3) | (dest[i] << 6);
  }
  const zt = needZ[b] - ((EAT_T / rateH) | 0);
  if (zt > t && zt - t < d) d = zt - t;
  const slot = c * WS + ((t + d) & WMASK);
  wnext[i] = wheelHead[slot]; wheelHead[slot] = i;
  return ev;
}

export function phaseDecide(c, t) {
  const hb = c * WS + (t & WMASK), sb = c * N_SHOPS;
  let i = wheelHead[hb];
  wheelHead[hb] = -1;
  dCount[c] = 0;
  for (let s = 0; s < N_SHOPS; s++) cSales[sb + s] = 0;
  let meals = 0, dec = 0, soc = 0, buys = 0;
  while (i >= 0) {
    const nx = wnext[i];
    const ev = decide(i, c, t, sb);
    dec++; meals += ev & 1; soc += (ev >> 1) & 1; buys += (ev >> 2) & 1;
    i = nx;
  }
  cMeals[c] = meals; cDec[c] = dec; cSoc[c] = soc; cBuys[c] = buys;
}

// Render snapshot (non-canonical floats): 12 bytes per agent.
export function phaseSnapshot(c) {
  const i0 = c * CHUNK, i1 = i0 + CHUNK < N ? i0 + CHUNK : N;
  for (let j = i0; j < i1; j++) {
    snapX[j] = px[j] * 0.00390625; snapY[j] = py[j] * 0.00390625;
    snapVis[j] = role[j] | (act[j] << 3) | (dest[j] << 6);
  }
}

// Fixed chunk order; money partials are integer-valued doubles, exact below 2^53.
export function reduceChunks() {
  let meals = 0, dec = 0, soc = 0, buys = 0;
  for (let c = 0; c < nChunks; c++) {
    meals += cMeals[c]; dec += cDec[c]; soc += cSoc[c]; buys += cBuys[c];
    const sb = c * N_SHOPS;
    for (let s = 0; s < N_SHOPS; s++) shopCash[s] += cSales[sb + s];
  }
  totals[0] += meals; totals[1] += dec; totals[2] += soc; totals[3] += buys;
}
