// Algorithmic savings: per-cell aggregates, staggered decisions, timing wheel vs scan, sleeping agents.
import * as C from './common.mjs';
import * as K from './kernels.mjs';
const { measure } = C;
export function cellAggBuild(sx, sy, cs, nc, aCnt, aX, aY) {
  for (let c = 0; c < nc; c++) { const s = cs[c], e = cs[c + 1]; let x = 0, y = 0; for (let j = s; j < e; j++) { x += sx[j]; y += sy[j]; } aCnt[c] = e - s; aX[c] = x; aY[c] = y; }
}
export function nqAgg(sx, sy, gw, gh, invCell, aCnt, aX, aY, outCnt, outAx, outAy, n) {
  for (let i = 0; i < n; i++) {
    const x = sx[i], y = sy[i];
    let cx = (x * invCell) | 0, cy = (y * invCell) | 0; if (cx > gw - 1) cx = gw - 1; if (cy > gh - 1) cy = gh - 1;
    const x0 = cx > 0 ? cx - 1 : 0, x1 = cx < gw - 1 ? cx + 1 : gw - 1, y0 = cy > 0 ? cy - 1 : 0, y1 = cy < gh - 1 ? cy + 1 : gh - 1;
    let k = 0, sxx = 0, syy = 0;
    for (let r = y0; r <= y1; r++) for (let c = r * gw + x0, ce = r * gw + x1; c <= ce; c++) { k += aCnt[c]; sxx += aX[c]; syy += aY[c]; }
    outCnt[i] = k - 1; outAx[i] = sxx - x - (k - 1) * x; outAy[i] = syy - y - (k - 1) * y;
  }
}
export function moveFlag(px, py, vx, vy, awake, n, dt, w, h) {
  const w2 = w + w, h2 = h + h;
  for (let i = 0; i < n; i++) {
    if (awake[i] === 0) continue;
    const x = px[i] + vx[i] * dt, y = py[i] + vy[i] * dt; const lx = x < 0, hx = x >= w, ly = y < 0, hy = y >= h;
    px[i] = lx ? -x : hx ? w2 - x : x; py[i] = ly ? -y : hy ? h2 - y : y; if (lx || hx) vx[i] = -vx[i]; if (ly || hy) vy[i] = -vy[i];
  }
}
export function moveList(px, py, vx, vy, list, m, dt, w, h) {
  const w2 = w + w, h2 = h + h;
  for (let k = 0; k < m; k++) {
    const i = list[k];
    const x = px[i] + vx[i] * dt, y = py[i] + vy[i] * dt; const lx = x < 0, hx = x >= w, ly = y < 0, hy = y >= h;
    px[i] = lx ? -x : hx ? w2 - x : x; py[i] = ly ? -y : hy ? h2 - y : y; if (lx || hx) vx[i] = -vx[i]; if (ly || hy) vy[i] = -vy[i];
  }
}
// think scheduling: interval 8..71 ticks
const interval = (i, t) => 8 + (C.key3(17, i, t) & 63);
export function scanTick(next, n, tick, think) { let k = 0; for (let i = 0; i < n; i++) if (next[i] === tick) { think(i, tick); next[i] = tick + interval(i, tick); k++; } return k; }
export function wheelTick(head, nxt, mask, tick, think) {
  const s = tick & mask; let i = head[s]; head[s] = -1; let k = 0;
  while (i !== -1) { const nn = nxt[i]; think(i, tick); const due = tick + interval(i, tick); const d = due & mask; nxt[i] = head[d]; head[d] = i; i = nn; k++; }
  return k;
}
export async function runAlgoSuite({ log = console.log, loadavg = () => null, sizes = [25000, 100000], quick = false }) {
  const M = (fn, o) => measure(fn, quick ? { samples: 5, minSampleMs: 10, warmupMs: 100, ...o } : o);
  const out = {};
  const rec = (grp, name, r) => { r.load = loadavg(); grp[name] = r; log(`[${r.load}] ${name.padEnd(34)} med ${(r.med * 1000).toFixed(1).padStart(9)} us  [${(r.min * 1000).toFixed(1)}-${(r.max * 1000).toFixed(1)}]`); };
  const U = C.makeUtilTables();
  for (const N of sizes) {
    log(`== N=${N}`);
    const R = (out[N] = {});
    for (const clustered of [false, true]) {
      const A = C.makeAgents(N, clustered ? 4242 : 12345, clustered); const g = A.g, NC = g * g;
      const cs = new Uint32Array(NC + 1), cur = new Uint32Array(NC), cellOf = new Uint32Array(N), sorted = new Uint32Array(N), sx = new Float32Array(N), sy = new Float32Array(N);
      const cnt = new Uint32Array(N), ax = new Float32Array(N), ay = new Float32Array(N), aCnt = new Uint32Array(NC), aX = new Float64Array(NC), aY = new Float64Array(NC);
      K.gridBuildF32(A.px, A.py, N, C.INV_CELL, g, g, cellOf, cs, cur, sorted, sx, sy);
      const tag = clustered ? 'clustered' : 'uniform';
      rec(R, `nq.exact.${tag}`, M(() => K.nqF32(sx, sy, cs, g, g, C.INV_CELL, C.R2, cnt, ax, ay, 0, N)));
      rec(R, `nq.cellAggregates.${tag}`, M(() => { cellAggBuild(sx, sy, cs, NC, aCnt, aX, aY); nqAgg(sx, sy, g, g, C.INV_CELL, aCnt, aX, aY, cnt, ax, ay, N); }));
    }
    const A = C.makeAgents(N); const act = new Uint8Array(N), score = new Uint32Array(N);
    let tick = 0;
    for (const Kst of [1, 4, 8, 16]) rec(R, `util.stagger.1of${Kst}`, M(() => { const t = tick++; K.utilScoreHoisted(A.needs, N, U.lut, U.cons, U.wts, t, 99, act, score, t % Kst, N, Kst); }));
    // event-driven thinking
    const next = new Int32Array(N), head = new Int32Array(128).fill(-1), nxt = new Int32Array(N);
    for (let i = 0; i < N; i++) { const d = 1 + (C.mix32(i) % 64); next[i] = d; nxt[i] = head[d & 127]; head[d & 127] = i; }
    let thinks = 0; const trivial = (i, t) => { thinks++; };
    const real = (i, t) => { K.utilScoreHoisted(A.needs, N, U.lut, U.cons, U.wts, t, 99, act, score, i, i + 1, 1); };
    let ts = 1, tw = 1;
    rec(R, 'think.scan.trivial', M(() => { scanTick(next, N, ts++, trivial); }));
    rec(R, 'think.wheel.trivial', M(() => { wheelTick(head, nxt, 127, tw++, trivial); }));
    rec(R, 'think.scan.utility', M(() => { scanTick(next, N, ts++, real); }));
    rec(R, 'think.wheel.utility', M(() => { wheelTick(head, nxt, 127, tw++, real); }));
    R.thinksPerTick = (() => { let k = 0; for (let t = 0; t < 64; t++) k += wheelTick(head, nxt, 127, tw++, trivial); return k / 64; })();
    // sleeping agents: 10% awake
    const awake = new Uint8Array(N), list = new Int32Array(N); let m = 0;
    for (let i = 0; i < N; i++) if (C.mix32(i ^ 0x3131) % 10 === 0) { awake[i] = 1; list[m++] = i; }
    const dt = Math.fround(0.1);
    rec(R, 'move.all', M(() => K.moveF32(A.px, A.py, A.vx, A.vy, N, dt, A.W, A.W)));
    rec(R, 'move.10pct.flagcheck', M(() => moveFlag(A.px, A.py, A.vx, A.vy, awake, N, dt, A.W, A.W)));
    rec(R, 'move.10pct.awakeList', M(() => moveList(A.px, A.py, A.vx, A.vy, list, m, dt, A.W, A.W)));
  }
  return out;
}
