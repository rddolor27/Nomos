// Neighbour query written in five allocation styles (same results); used by the GC suite and the lint demo.
// A: allocation-free typed arrays (= kernels.nqF32)
export { nqF32 as nqTyped } from '../js/kernels.mjs';
// B: temporary array per agent
export function nqTempArrays(sx, sy, cs, gw, gh, invCell, r2, outCnt, outAx, outAy, i0, i1) {
  for (let i = i0; i < i1; i++) {
    const x = sx[i], y = sy[i];
    let cx = (x * invCell) | 0, cy = (y * invCell) | 0; if (cx > gw - 1) cx = gw - 1; if (cy > gh - 1) cy = gh - 1;
    const x0 = cx > 0 ? cx - 1 : 0, x1 = cx < gw - 1 ? cx + 1 : gw - 1, y0 = cy > 0 ? cy - 1 : 0, y1 = cy < gh - 1 ? cy + 1 : gh - 1;
    const nb = [];
    for (let r = y0; r <= y1; r++) { const e = cs[r * gw + x1 + 1]; for (let j = cs[r * gw + x0]; j < e; j++) { const dx = sx[j] - x, dy = sy[j] - y; if (dx * dx + dy * dy < r2 && j !== i) nb.push(j); } }
    let ax = 0, ay = 0; for (let k = 0; k < nb.length; k++) { ax += sx[nb[k]] - x; ay += sy[nb[k]] - y; }
    outCnt[i] = nb.length; outAx[i] = ax; outAy[i] = ay;
  }
}
// C: object per neighbour + result object per agent kept until next tick
export function nqObjects(sx, sy, cs, gw, gh, invCell, r2, results, i0, i1) {
  for (let i = i0; i < i1; i++) {
    const x = sx[i], y = sy[i];
    let cx = (x * invCell) | 0, cy = (y * invCell) | 0; if (cx > gw - 1) cx = gw - 1; if (cy > gh - 1) cy = gh - 1;
    const x0 = cx > 0 ? cx - 1 : 0, x1 = cx < gw - 1 ? cx + 1 : gw - 1, y0 = cy > 0 ? cy - 1 : 0, y1 = cy < gh - 1 ? cy + 1 : gh - 1;
    const nb = [];
    for (let r = y0; r <= y1; r++) { const e = cs[r * gw + x1 + 1]; for (let j = cs[r * gw + x0]; j < e; j++) { const dx = sx[j] - x, dy = sy[j] - y; if (dx * dx + dy * dy < r2 && j !== i) nb.push({ dx, dy }); } }
    let ax = 0, ay = 0; for (const v of nb) { ax += v.dx; ay += v.dy; }
    results[i] = { cnt: nb.length, ax, ay };
  }
}
// D: closures and array methods (filter/map/reduce)
export function nqFunctional(sx, sy, cs, gw, gh, invCell, r2, results, i0, i1) {
  for (let i = i0; i < i1; i++) {
    const x = sx[i], y = sy[i];
    let cx = (x * invCell) | 0, cy = (y * invCell) | 0; if (cx > gw - 1) cx = gw - 1; if (cy > gh - 1) cy = gh - 1;
    const x0 = cx > 0 ? cx - 1 : 0, x1 = cx < gw - 1 ? cx + 1 : gw - 1, y0 = cy > 0 ? cy - 1 : 0, y1 = cy < gh - 1 ? cy + 1 : gh - 1;
    const cands = [];
    for (let r = y0; r <= y1; r++) { const e = cs[r * gw + x1 + 1]; for (let j = cs[r * gw + x0]; j < e; j++) cands.push(j); }
    const nb = cands.filter((j) => { const dx = sx[j] - x, dy = sy[j] - y; return j !== i && dx * dx + dy * dy < r2; }).map((j) => ({ dx: sx[j] - x, dy: sy[j] - y }));
    const s = nb.reduce((acc, v) => ({ x: acc.x + v.dx, y: acc.y + v.dy }), { x: 0, y: 0 });
    results[i] = { cnt: nb.length, ax: s.x, ay: s.y };
  }
}
// E: allocation-free kernel + retained history (one event object per agent per tick, last 10 ticks kept -> promotion to old space)
export function nqTypedWithHistory(sx, sy, cs, gw, gh, invCell, r2, outCnt, outAx, outAy, i0, i1, history, tick) {
  for (let i = i0; i < i1; i++) {
    const x = sx[i], y = sy[i];
    let cx = (x * invCell) | 0, cy = (y * invCell) | 0; if (cx > gw - 1) cx = gw - 1; if (cy > gh - 1) cy = gh - 1;
    const x0 = cx > 0 ? cx - 1 : 0, x1 = cx < gw - 1 ? cx + 1 : gw - 1, y0 = cy > 0 ? cy - 1 : 0, y1 = cy < gh - 1 ? cy + 1 : gh - 1;
    let cnt = 0, ax = 0, ay = 0;
    for (let r = y0; r <= y1; r++) { const e = cs[r * gw + x1 + 1]; for (let j = cs[r * gw + x0]; j < e; j++) { const dx = sx[j] - x, dy = sy[j] - y; if (dx * dx + dy * dy < r2 && j !== i) { cnt++; ax += dx; ay += dy; } } }
    outCnt[i] = cnt; outAx[i] = ax; outAy[i] = ay;
    history[(tick % 10) * (i1 - i0) + (i - i0)] = { agent: i, tick, cnt };
  }
}
