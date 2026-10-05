// JavaScript reference kernels: typed arrays, monomorphic, allocation-free. Mirror rust-kernels/src/lib.rs.
import { mix32, key3 } from './common.mjs';

export function moveF32(px, py, vx, vy, n, dt, w, h) {      // plain JS numbers (f64 intermediates)
  const w2 = w + w, h2 = h + h;
  for (let i = 0; i < n; i++) {
    const x = px[i] + vx[i] * dt, y = py[i] + vy[i] * dt;
    const lx = x < 0, hx = x >= w, ly = y < 0, hy = y >= h;
    px[i] = lx ? -x : hx ? w2 - x : x;
    py[i] = ly ? -y : hy ? h2 - y : y;
    if (lx || hx) vx[i] = -vx[i];
    if (ly || hy) vy[i] = -vy[i];
  }
}
const fr = Math.fround;
export function moveF32Fround(px, py, vx, vy, n, dt, w, h) { // f32 semantics -> bit-identical to WASM f32
  const w2 = fr(w + w), h2 = fr(h + h);
  for (let i = 0; i < n; i++) {
    const x = fr(px[i] + fr(vx[i] * dt)), y = fr(py[i] + fr(vy[i] * dt));
    const lx = x < 0, hx = x >= w, ly = y < 0, hy = y >= h;
    px[i] = lx ? -x : hx ? fr(w2 - x) : x;
    py[i] = ly ? -y : hy ? fr(h2 - y) : y;
    if (lx || hx) vx[i] = -vx[i];
    if (ly || hy) vy[i] = -vy[i];
  }
}
export function moveI32(px, py, vx, vy, n, w, h) {
  const w2 = 2 * w - 1, h2 = 2 * h - 1;
  for (let i = 0; i < n; i++) {
    const x = (px[i] + vx[i]) | 0, y = (py[i] + vy[i]) | 0;
    const lx = x < 0, hx = x >= w, ly = y < 0, hy = y >= h;
    px[i] = lx ? -x : hx ? w2 - x : x;
    py[i] = ly ? -y : hy ? h2 - y : y;
    if (lx || hx) vx[i] = -vx[i];
    if (ly || hy) vy[i] = -vy[i];
  }
}
export function gridBuildF32(px, py, n, invCell, gw, gh, cellOf, cs, cursor, sorted, sx, sy) {
  const nc = gw * gh;
  cs.fill(0, 0, nc + 1);
  for (let i = 0; i < n; i++) {
    let cx = (px[i] * invCell) | 0, cy = (py[i] * invCell) | 0;
    if (cx > gw - 1) cx = gw - 1; if (cy > gh - 1) cy = gh - 1;
    const c = cy * gw + cx; cellOf[i] = c; cs[c + 1]++;
  }
  for (let c = 0; c < nc; c++) cs[c + 1] += cs[c];
  cursor.set(cs.subarray(0, nc));
  for (let i = 0; i < n; i++) {
    const c = cellOf[i]; const k = cursor[c]; cursor[c] = k + 1;
    sorted[k] = i; sx[k] = px[i]; sy[k] = py[i];
  }
}
export function gridBuildI32(px, py, n, shift, gw, gh, cellOf, cs, cursor, sorted, sx, sy) {
  const nc = gw * gh;
  cs.fill(0, 0, nc + 1);
  for (let i = 0; i < n; i++) {
    let cx = px[i] >> shift, cy = py[i] >> shift;
    if (cx > gw - 1) cx = gw - 1; if (cy > gh - 1) cy = gh - 1;
    const c = cy * gw + cx; cellOf[i] = c; cs[c + 1]++;
  }
  for (let c = 0; c < nc; c++) cs[c + 1] += cs[c];
  cursor.set(cs.subarray(0, nc));
  for (let i = 0; i < n; i++) {
    const c = cellOf[i]; const k = cursor[c]; cursor[c] = k + 1;
    sorted[k] = i; sx[k] = px[i]; sy[k] = py[i];
  }
}
// neighbour query over sorted copies: 3 contiguous row spans per agent
export function nqF32(sx, sy, cs, gw, gh, invCell, r2, outCnt, outAx, outAy, i0, i1) {
  for (let i = i0; i < i1; i++) {
    const x = sx[i], y = sy[i];
    let cx = (x * invCell) | 0, cy = (y * invCell) | 0;
    if (cx > gw - 1) cx = gw - 1; if (cy > gh - 1) cy = gh - 1;
    const x0 = cx > 0 ? cx - 1 : 0, x1 = cx < gw - 1 ? cx + 1 : gw - 1;
    const y0 = cy > 0 ? cy - 1 : 0, y1 = cy < gh - 1 ? cy + 1 : gh - 1;
    let cnt = 0, ax = 0, ay = 0;
    for (let r = y0; r <= y1; r++) {
      const e = cs[r * gw + x1 + 1];
      for (let j = cs[r * gw + x0]; j < e; j++) {
        const dx = sx[j] - x, dy = sy[j] - y;
        if (dx * dx + dy * dy < r2 && j !== i) { cnt++; ax += dx; ay += dy; }
      }
    }
    outCnt[i] = cnt; outAx[i] = ax; outAy[i] = ay;
  }
}
// same query but gathering positions through the sorted index (no sorted copies) -> cache misses
export function nqF32Indirect(px, py, sorted, cs, gw, gh, invCell, r2, outCnt, outAx, outAy, i0, i1) {
  for (let i = i0; i < i1; i++) {
    const me = sorted[i]; const x = px[me], y = py[me];
    let cx = (x * invCell) | 0, cy = (y * invCell) | 0;
    if (cx > gw - 1) cx = gw - 1; if (cy > gh - 1) cy = gh - 1;
    const x0 = cx > 0 ? cx - 1 : 0, x1 = cx < gw - 1 ? cx + 1 : gw - 1;
    const y0 = cy > 0 ? cy - 1 : 0, y1 = cy < gh - 1 ? cy + 1 : gh - 1;
    let cnt = 0, ax = 0, ay = 0;
    for (let r = y0; r <= y1; r++) {
      const e = cs[r * gw + x1 + 1];
      for (let j = cs[r * gw + x0]; j < e; j++) {
        const o = sorted[j]; const dx = px[o] - x, dy = py[o] - y;
        if (dx * dx + dy * dy < r2 && o !== me) { cnt++; ax += dx; ay += dy; }
      }
    }
    outCnt[me] = cnt; outAx[me] = ax; outAy[me] = ay;
  }
}
export function nqI32(sx, sy, cs, gw, gh, shift, r2, outCnt, outAx, outAy, i0, i1) {
  for (let i = i0; i < i1; i++) {
    const x = sx[i], y = sy[i];
    let cx = x >> shift, cy = y >> shift;
    if (cx > gw - 1) cx = gw - 1; if (cy > gh - 1) cy = gh - 1;
    const x0 = cx > 0 ? cx - 1 : 0, x1 = cx < gw - 1 ? cx + 1 : gw - 1;
    const y0 = cy > 0 ? cy - 1 : 0, y1 = cy < gh - 1 ? cy + 1 : gh - 1;
    let cnt = 0, ax = 0, ay = 0;
    for (let r = y0; r <= y1; r++) {
      const e = cs[r * gw + x1 + 1];
      for (let j = cs[r * gw + x0]; j < e; j++) {
        const dx = (sx[j] - x) | 0, dy = (sy[j] - y) | 0;
        if (((Math.imul(dx, dx) + Math.imul(dy, dy)) | 0) < r2 && j !== i) { cnt++; ax = (ax + dx) | 0; ay = (ay + dy) | 0; }
      }
    }
    outCnt[i] = cnt; outAx[i] = ax; outAy[i] = ay;
  }
}
export function utilScore(needs, n, lut, cons, wts, tick, seed, outAct, outScore, i0, i1, stride) {
  for (let i = i0; i < i1; i += stride) {
    const hh = key3(seed, i, tick);
    let best = 0, besta = 0;
    for (let a = 0; a < 6; a++) {
      let s = wts[a] << 8;
      for (let c = 0; c < 3; c++) {
        const k = cons[a * 6 + c * 2], cv = cons[a * 6 + c * 2 + 1];
        s = Math.imul(s, lut[(cv << 8) + needs[k * n + i]]) >>> 16;
      }
      s = (s << 4) + ((hh >>> (a << 2)) & 15);
      if (s > best) { best = s; besta = a; }
    }
    outAct[i] = besta; outScore[i] = best;
  }
}
export function settleDay(ns, day, seed, pop, food, price, prod, hh, farm, treas, workersOut, mort, fert, aging, aged) {
  for (let s = 0; s < ns; s++) {
    let h = key3(seed, s, day);
    const base = s * 32;
    let births = 0, workers = 0, total = 0;
    for (let a = 0; a < 32; a++) {
      let p = pop[base + a];
      h = mix32((h + 0x6D2B79F5) | 0);
      p -= Math.floor((p * mort[a] + (h & 0x0FFFFFFF)) / 268435456);
      const band = a & 15;
      let up = 0;
      if (band < 15) { h = mix32((h + 0x6D2B79F5) | 0); up = Math.floor((p * aging + (h & 0x0FFFFFFF)) / 268435456); p -= up; }
      aged[a] = up;
      if (a < 16) { const f = fert[band]; if (f !== 0) { h = mix32((h + 0x6D2B79F5) | 0); births += Math.floor((p * f + (h & 0x0FFFFFFF)) / 268435456); } }
      if (band >= 3 && band <= 12) workers += p;
      total += p;
      pop[base + a] = p;
    }
    for (let a = 0; a < 32; a++) if ((a & 15) < 15) pop[base + a + 1] += aged[a];
    const bf = Math.floor(births / 2);
    pop[base] += bf; pop[base + 16] += births - bf; total += births;
    workersOut[s] = workers;
    const produced = Math.floor(workers * prod[s] / 65536);
    let f = food[s] + produced;
    const eat = total < f ? total : f;
    f -= eat; if (f > 0x3FFFFFFF) f = 0x3FFFFFFF;
    food[s] = f;
    let pr = price[s];
    if (f < total * 30) pr = pr + (pr >> 5) + 1; else pr -= pr >> 6;
    if (pr < 1) pr = 1; else if (pr > 1000000) pr = 1000000;
    price[s] = pr;
    let cost = eat * pr; const cash = hh[s];
    if (cost > cash) cost = cash;
    const tax = Math.floor(cost / 16);
    hh[s] = cash - cost; farm[s] += cost - tax; treas[s] += tax;
    const wage = Math.floor(farm[s] / 8);
    farm[s] -= wage; hh[s] += wage;
  }
}
export function flowsSparse(ne, ea, eb, day, seed, pop, food, price, hh, farm, workers, migQ28, fq, mq) {
  const mseed = seed ^ 0xA511E9B3;
  for (let e = 0; e < ne; e++) {
    const a = ea[e], b = eb[e], pa = price[a], pb = price[b];
    let q = 0;
    if (pa !== pb) {
      const lo = pa < pb ? a : b, dmin = pa < pb ? pa : pb, dd = pa < pb ? pb - pa : pa - pb;
      if (dd * 16 > dmin) { let v = food[lo] >> 7; if (v > 100000) v = 100000; q = lo === a ? v : -v; }
    }
    fq[e] = q;
    let m = 0;
    if (pa > pb + (pb >> 3) || pb > pa + (pa >> 3)) {
      const from = pa > pb ? a : b;
      const h = key3(mseed, e, day);
      const mm = Math.floor((workers[from] * migQ28 + (h & 0x0FFFFFFF)) / 268435456);
      m = from === a ? mm : -mm;
    }
    mq[e] = m;
  }
  for (let e = 0; e < ne; e++) {
    const a = ea[e], b = eb[e];
    const q = fq[e];
    if (q !== 0) {
      const src = q > 0 ? a : b, dst = q > 0 ? b : a;
      let v = q > 0 ? q : -q; if (v > food[src]) v = food[src];
      const mid = Math.floor((price[a] + price[b]) / 2);
      let pay = v * mid; if (pay > hh[dst]) pay = hh[dst];
      food[src] -= v; food[dst] += v; hh[dst] -= pay; farm[src] += pay;
    }
    const m = mq[e];
    if (m !== 0) {
      const src = m > 0 ? a : b, dst = m > 0 ? b : a, v = m > 0 ? m : -m;
      let vf = v >> 1, vm = v - vf;
      const fi = src * 32 + 5, mi = src * 32 + 21;
      if (vf > pop[fi]) vf = pop[fi]; if (vm > pop[mi]) vm = pop[mi];
      pop[fi] -= vf; pop[dst * 32 + 5] += vf; pop[mi] -= vm; pop[dst * 32 + 21] += vm;
    }
  }
}
export function denseF64(n, x, y, m, p, out) {
  for (let i = 0; i < n; i++) {
    const xi = x[i], yi = y[i], pi = p[i];
    let acc = 0;
    for (let j = 0; j < n; j++) { const dx = x[j] - xi, dy = y[j] - yi; acc += m[j] * (p[j] - pi) / (dx * dx + dy * dy + 1); }
    out[i] = acc;
  }
}
export function denseMatVec(n, wmat, p, out) { // precomputed dense weight matrix (n*n floats)
  for (let i = 0; i < n; i++) { const pi = p[i], row = i * n; let acc = 0; for (let j = 0; j < n; j++) acc += wmat[row + j] * (p[j] - pi); out[i] = acc; }
}
export function ledgerF64(bal, nacc, ntx, seed) {
  let h = seed;
  for (let t = 0; t < ntx; t++) { h = mix32((h + t) | 0); const a = h % nacc, b = (h >>> 7) % nacc, amt = (h & 0xFFFF) * 37; bal[a] -= amt; bal[b] += amt; }
  let s = 0; for (let i = 0; i < nacc; i++) s += bal[i]; return s;
}
export function ledgerBig(bal, nacc, ntx, seed) {
  let h = seed;
  for (let t = 0; t < ntx; t++) { h = mix32((h + t) | 0); const a = h % nacc, b = (h >>> 7) % nacc, amt = BigInt((h & 0xFFFF) * 37); bal[a] -= amt; bal[b] += amt; }
  let s = 0n; for (let i = 0; i < nacc; i++) s += bal[i]; return s;
}
// branch-free accumulate (avoids ~35% unpredictable branch) - identical results to nqF32
export function nqF32Branchless(sx, sy, cs, gw, gh, invCell, r2, outCnt, outAx, outAy, i0, i1) {
  for (let i = i0; i < i1; i++) {
    const x = sx[i], y = sy[i];
    let cx = (x * invCell) | 0, cy = (y * invCell) | 0;
    if (cx > gw - 1) cx = gw - 1; if (cy > gh - 1) cy = gh - 1;
    const x0 = cx > 0 ? cx - 1 : 0, x1 = cx < gw - 1 ? cx + 1 : gw - 1;
    const y0 = cy > 0 ? cy - 1 : 0, y1 = cy < gh - 1 ? cy + 1 : gh - 1;
    let cnt = 0, ax = 0, ay = 0;
    for (let r = y0; r <= y1; r++) {
      const e = cs[r * gw + x1 + 1];
      for (let j = cs[r * gw + x0]; j < e; j++) {
        const dx = sx[j] - x, dy = sy[j] - y;
        const m = (dx * dx + dy * dy < r2) ? 1 : 0;
        cnt += m; ax += m * dx; ay += m * dy;
      }
    }
    // self was counted (d2 = 0 < r2) with dx = dy = 0: remove it
    outCnt[i] = cnt - 1; outAx[i] = ax; outAy[i] = ay;
  }
}
// f32 semantics via Math.fround -> bit-identical to WASM nq_f32 (scalar)
export function nqF32Fround(sx, sy, cs, gw, gh, invCell, r2, outCnt, outAx, outAy, i0, i1) {
  const f = Math.fround;
  for (let i = i0; i < i1; i++) {
    const x = sx[i], y = sy[i];
    let cx = (x * invCell) | 0, cy = (y * invCell) | 0;
    if (cx > gw - 1) cx = gw - 1; if (cy > gh - 1) cy = gh - 1;
    const x0 = cx > 0 ? cx - 1 : 0, x1 = cx < gw - 1 ? cx + 1 : gw - 1;
    const y0 = cy > 0 ? cy - 1 : 0, y1 = cy < gh - 1 ? cy + 1 : gh - 1;
    let cnt = 0, ax = 0, ay = 0;
    for (let r = y0; r <= y1; r++) {
      const e = cs[r * gw + x1 + 1];
      for (let j = cs[r * gw + x0]; j < e; j++) {
        const dx = f(sx[j] - x), dy = f(sy[j] - y);
        if (f(f(dx * dx) + f(dy * dy)) < r2 && j !== i) { cnt++; ax = f(ax + dx); ay = f(ay + dy); }
      }
    }
    outCnt[i] = cnt; outAx[i] = ax; outAy[i] = ay;
  }
}
// utility scoring with the 6x3 consideration table hoisted into locals and the action loop unrolled
export function utilScoreHoisted(needs, n, lut, cons, wts, tick, seed, outAct, outScore, i0, i1, stride) {
  const n0 = cons[0] * n, c0 = cons[1] << 8,
    n1 = cons[2] * n, c1 = cons[3] << 8,
    n2 = cons[4] * n, c2 = cons[5] << 8,
    n3 = cons[6] * n, c3 = cons[7] << 8,
    n4 = cons[8] * n, c4 = cons[9] << 8,
    n5 = cons[10] * n, c5 = cons[11] << 8,
    n6 = cons[12] * n, c6 = cons[13] << 8,
    n7 = cons[14] * n, c7 = cons[15] << 8,
    n8 = cons[16] * n, c8 = cons[17] << 8,
    n9 = cons[18] * n, c9 = cons[19] << 8,
    n10 = cons[20] * n, c10 = cons[21] << 8,
    n11 = cons[22] * n, c11 = cons[23] << 8,
    n12 = cons[24] * n, c12 = cons[25] << 8,
    n13 = cons[26] * n, c13 = cons[27] << 8,
    n14 = cons[28] * n, c14 = cons[29] << 8,
    n15 = cons[30] * n, c15 = cons[31] << 8,
    n16 = cons[32] * n, c16 = cons[33] << 8,
    n17 = cons[34] * n, c17 = cons[35] << 8;
  const w0 = wts[0] << 8, w1 = wts[1] << 8, w2 = wts[2] << 8, w3 = wts[3] << 8, w4 = wts[4] << 8, w5 = wts[5] << 8;
  for (let i = i0; i < i1; i += stride) {
    const hh = key3(seed, i, tick);
    let s, best, besta;
    s = Math.imul(w0, lut[c0 + needs[n0 + i]]) >>> 16; s = Math.imul(s, lut[c1 + needs[n1 + i]]) >>> 16; s = Math.imul(s, lut[c2 + needs[n2 + i]]) >>> 16;
    s = (s << 4) + (hh & 15); best = s; besta = 0;
    if (s <= 0) { best = 0; besta = 0; }
    s = Math.imul(w1, lut[c3 + needs[n3 + i]]) >>> 16; s = Math.imul(s, lut[c4 + needs[n4 + i]]) >>> 16; s = Math.imul(s, lut[c5 + needs[n5 + i]]) >>> 16;
    s = (s << 4) + ((hh >>> 4) & 15); if (s > best) { best = s; besta = 1; }
    s = Math.imul(w2, lut[c6 + needs[n6 + i]]) >>> 16; s = Math.imul(s, lut[c7 + needs[n7 + i]]) >>> 16; s = Math.imul(s, lut[c8 + needs[n8 + i]]) >>> 16;
    s = (s << 4) + ((hh >>> 8) & 15); if (s > best) { best = s; besta = 2; }
    s = Math.imul(w3, lut[c9 + needs[n9 + i]]) >>> 16; s = Math.imul(s, lut[c10 + needs[n10 + i]]) >>> 16; s = Math.imul(s, lut[c11 + needs[n11 + i]]) >>> 16;
    s = (s << 4) + ((hh >>> 12) & 15); if (s > best) { best = s; besta = 3; }
    s = Math.imul(w4, lut[c12 + needs[n12 + i]]) >>> 16; s = Math.imul(s, lut[c13 + needs[n13 + i]]) >>> 16; s = Math.imul(s, lut[c14 + needs[n14 + i]]) >>> 16;
    s = (s << 4) + ((hh >>> 16) & 15); if (s > best) { best = s; besta = 4; }
    s = Math.imul(w5, lut[c15 + needs[n15 + i]]) >>> 16; s = Math.imul(s, lut[c16 + needs[n16 + i]]) >>> 16; s = Math.imul(s, lut[c17 + needs[n17 + i]]) >>> 16;
    s = (s << 4) + ((hh >>> 20) & 15); if (s > best) { best = s; besta = 5; }
    outAct[i] = besta; outScore[i] = best;
  }
}
export function ledgerApplyF64(bal, ta, tb, amt, ntx) { for (let t = 0; t < ntx; t++) { const v = amt[t]; bal[ta[t]] -= v; bal[tb[t]] += v; } }
export function ledgerApplyBig(bal, ta, tb, amt, ntx) { for (let t = 0; t < ntx; t++) { const v = amt[t]; bal[ta[t]] -= v; bal[tb[t]] += v; } }
export function moveF32Range(px, py, vx, vy, i0, i1, dt, w, h) {
  const w2 = w + w, h2 = h + h;
  for (let i = i0; i < i1; i++) {
    const x = px[i] + vx[i] * dt, y = py[i] + vy[i] * dt;
    const lx = x < 0, hx = x >= w, ly = y < 0, hy = y >= h;
    px[i] = lx ? -x : hx ? w2 - x : x;
    py[i] = ly ? -y : hy ? h2 - y : y;
    if (lx || hx) vx[i] = -vx[i];
    if (ly || hy) vy[i] = -vy[i];
  }
}
