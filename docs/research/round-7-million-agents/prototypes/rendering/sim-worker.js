// Stand-in sim worker: Q8 Int32 SoA positions (as round 5 recommends), a random walk per tick,
// then a pack pass into the 12-byte snapshot (or 20-byte visible records) for the renderer.
import { makeCity, WORLD_TILES } from './world.js';
import * as P from './protocol.js';

let n, mode, transport, x, y, w, px, py, back = 0, tick = 0, timer, sab, H;
let camCache = [WORLD_TILES / 2, WORLD_TILES / 2, 1, 1920, 1080];
const pool = [];
const stats = { step: [], pack: [], count: [] };
const MAXQ = WORLD_TILES * 256 - 1;

onmessage = (e) => {
  const m = e.data;
  if (m.type === 'init') init(m);
  else if (m.type === 'return') pool.push(m.buf);
  else if (m.type === 'cam') camCache = m.cam;
  else if (m.type === 'stats') postMessage({ type: 'stats', ...summarise() });
  else if (m.type === 'stop') clearInterval(timer);
};

function init(m) {
  n = m.n; mode = m.upload; transport = m.transport;
  const city = makeCity(n, 42, 'cell');
  const f = new Float32Array(city.buf), u = new Uint32Array(city.buf);
  x = new Int32Array(n); y = new Int32Array(n); w = new Uint32Array(n);
  for (let i = 0; i < n; i++) { x[i] = Math.round(f[3 * i] * 256); y[i] = Math.round(f[3 * i + 1] * 256); w[i] = u[3 * i + 2]; }
  px = x.slice(); py = y.slice();
  if (transport === 'sab') {
    sab = m.sab; H = P.views(sab);
    for (let k = 0; k < 3; k++) publishInto(k);
    Atomics.store(H.i32, P.ST, 1 | P.FRESH);
    back = 0;
  } else for (let k = 0; k < 3; k++) pool.push(new ArrayBuffer(P.slotBytes(n, mode)));
  timer = setInterval(tickOnce, 1000 / m.hz);
  postMessage({ type: 'ready' });
}

function stepSim() {
  px.set(x); py.set(y);
  let s = Math.imul(tick + 1, 0x9e3779b1) | 0;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + i) | 0;
    let nx = x[i] + ((s & 255) - 127) * 0.6 | 0, ny = y[i] + (((s >>> 8) & 255) - 127) * 0.6 | 0;
    x[i] = nx < 0 ? 0 : nx > MAXQ ? MAXQ : nx;
    y[i] = ny < 0 ? 0 : ny > MAXQ ? MAXQ : ny;
  }
}

let lastVisible = 0;

function packFull(buf, off, cam) {
  const f = new Float32Array(buf, off, 3 * n), u = new Uint32Array(buf, off, 3 * n);
  const q = 1 / 256;
  const hw = cam[3] / 2 / cam[2], hh = cam[4] / 2 / cam[2];
  const x0 = (cam[0] - hw) * 256, x1 = (cam[0] + hw) * 256, y0 = (cam[1] - hh) * 256, y1 = (cam[1] + hh) * 256;
  let vis = 0;
  for (let i = 0, j = 0; i < n; i++, j += 3) {
    const xi = x[i], yi = y[i];
    f[j] = xi * q; f[j + 1] = yi * q; u[j + 2] = w[i];
    if (xi >= x0 && xi < x1 && yi >= y0 && yi < y1) vis++;
  }
  lastVisible = vis;
  return n;
}

// Visible subset for the camera the renderer last wrote, with a 32-px margin.
function packVisible(buf, off, cam) {
  const f = new Float32Array(buf, off, 5 * n), u = new Uint32Array(buf, off, 5 * n);
  const q = 1 / 256, m = 32 / cam[2];
  const hw = cam[3] / 2 / cam[2] + m, hh = cam[4] / 2 / cam[2] + m;
  const x0 = (cam[0] - hw) * 256, x1 = (cam[0] + hw) * 256, y0 = (cam[1] - hh) * 256, y1 = (cam[1] + hh) * 256;
  let c = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i], yi = y[i];
    if (xi < x0 || xi >= x1 || yi < y0 || yi >= y1) continue;
    const j = 5 * c++;
    f[j] = px[i] * q; f[j + 1] = py[i] * q; f[j + 2] = xi * q; f[j + 3] = yi * q; u[j + 4] = w[i];
  }
  lastVisible = c;
  return c;
}

function cam() {
  if (!H) return camCache;
  const f = H.f32, c = P.CAM_F32;
  return [f[c], f[c + 1], f[c + 2], f[c + 3], f[c + 4]];
}

function publishInto(k) {
  const off = P.slotOffset(k, n, mode);
  const c = mode === 'visible' ? packVisible(sab, off, cam()) : packFull(sab, off, cam());
  H.i32[P.COUNT_I32 + k] = c;
  H.i32[P.VIS_I32 + k] = lastVisible;
  H.i32[P.TICK_I32 + k] = tick;
  H.f64[P.TIME_F64 + k] = performance.timeOrigin + performance.now();
  return c;
}

function tickOnce() {
  const t0 = performance.now();
  stepSim();
  const t1 = performance.now();
  let c;
  if (transport === 'sab') {
    c = publishInto(back);
    back = Atomics.exchange(H.i32, P.ST, back | P.FRESH) & 3;
  } else {
    const buf = pool.pop() || new ArrayBuffer(P.slotBytes(n, mode));
    c = mode === 'visible' ? packVisible(buf, 0, camCache) : packFull(buf, 0, camCache);
    postMessage({ type: 'snap', buf, count: c, vis: lastVisible, tick, t: performance.timeOrigin + performance.now() }, [buf]);
  }
  const t2 = performance.now();
  tick++;
  if (tick > 5) { stats.step.push(t1 - t0); stats.pack.push(t2 - t1); stats.count.push(c); }
}

function med(a) { const s = a.slice().sort((p, q) => p - q); return s.length ? s[s.length >> 1] : NaN; }
function summarise() {
  const out = { ticks: stats.step.length, stepMed: med(stats.step), packMed: med(stats.pack), countMed: med(stats.count),
    packMin: Math.min(...stats.pack), packMax: Math.max(...stats.pack) };
  stats.step.length = stats.pack.length = stats.count.length = 0;
  return out;
}
