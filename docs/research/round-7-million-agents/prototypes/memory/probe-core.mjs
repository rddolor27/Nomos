// Start-up probe: integer movement + grid counting sort + 5-cell crowding read, the tick's memory-heavy core.
// A cache-resident world (16k agents) and a memory-bound one (256k), each timed as the fastest of short slices.
const SHIFT = 11, W = 128, CELLS = W * W, SIDE = W << SHIFT;

function makeWorld(n) {
  const buf = new SharedArrayBuffer(n * 4 * 7 + CELLS * 4 * 2);
  let o = 0;
  const take = (len) => { const v = new Int32Array(buf, o, len); o += len * 4; return v; };
  const w = { n, x: take(n), y: take(n), vx: take(n), vy: take(n), cell: take(n), order: take(n), crowd: take(n), count: take(CELLS), start: take(CELLS) };
  let s = 0x9e3779b9;
  for (let i = 0; i < n; i++) {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5; w.x[i] = (s >>> 0) % SIDE;
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5; w.y[i] = (s >>> 0) % SIDE;
    w.vx[i] = (s & 255) - 128; w.vy[i] = ((s >>> 8) & 255) - 128;
  }
  return w;
}

function step(w) {
  const { n, x, y, vx, vy, cell, order, crowd, count, start } = w;
  count.fill(0);
  for (let i = 0; i < n; i++) {
    let nx = x[i] + vx[i], ny = y[i] + vy[i];
    if (nx < 0 || nx >= SIDE) { vx[i] = -vx[i]; nx = x[i]; }
    if (ny < 0 || ny >= SIDE) { vy[i] = -vy[i]; ny = y[i]; }
    x[i] = nx; y[i] = ny;
    const c = (nx >> SHIFT) + (ny >> SHIFT) * W;
    cell[i] = c; count[c]++;
  }
  let acc = 0;
  for (let c = 0; c < CELLS; c++) { start[c] = acc; acc += count[c]; }
  for (let i = 0; i < n; i++) order[start[cell[i]]++] = i;
  for (let k = 0; k < n; k++) {
    const i = order[k], c = cell[i];
    const cx = c & (W - 1), cy = c >> 7;
    let s = count[c];
    if (cx > 0) s += count[c - 1];
    if (cx < W - 1) s += count[c + 1];
    if (cy > 0) s += count[c - W];
    if (cy < W - 1) s += count[c + W];
    crowd[i] = s;
    if (s > 64) { vx[i] = -vx[i]; vy[i] = -vy[i]; }
  }
}

function runFor(w, ms) {
  let steps = 0;
  const t0 = performance.now();
  let t = t0;
  while (t - t0 < ms) { step(w); steps++; t = performance.now(); }
  return ((t - t0) * 1e6) / (steps * w.n);
}

// Fastest of several short slices, so one preemption or GC does not set the tier.
function fastest(w, slices, ms) {
  let best = Infinity;
  for (let s = 0; s < slices; s++) best = Math.min(best, runFor(w, ms));
  return best;
}

export function probe() {
  const t0 = performance.now();
  const small = makeWorld(16_384), big = makeWorld(262_144);
  const tSetup = performance.now();
  runFor(small, 15);
  const nsSmall = fastest(small, 5, 6);
  runFor(big, 10);
  const nsBig = fastest(big, 5, 8);
  return { nsPerAgentSmall: nsSmall, nsPerAgentBig: nsBig, setupMs: tSetup - t0, totalMs: performance.now() - t0 };
}
