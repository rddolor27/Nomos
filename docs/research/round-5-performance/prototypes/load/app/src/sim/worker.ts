import * as Comlink from 'comlink';
const T_EVAL = performance.now();
let N = 0, W = 0, H = 0;
let px!: Float32Array, py!: Float32Array, tx!: Float32Array, ty!: Float32Array, spd!: Float32Array, hunger!: Float32Array, wealth!: Float32Array;
let kind!: Uint8Array, state!: Uint8Array, home!: Uint32Array, grid!: Uint8Array, cellCount!: Uint32Array, cellStart!: Uint32Array, order!: Uint32Array;
let tiles: Uint16Array[] = [];
let SLOW = 1; const spin = (ms: number) => { const e = performance.now() + ms * (SLOW - 1); while (performance.now() < e); };
let seed = 99; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
function parseJson(buf: ArrayBuffer) {
  const j = JSON.parse(new TextDecoder().decode(buf)); const lvl = j.levels[0];
  const ig = lvl.layerInstances.find((l: any) => l.__type === 'IntGrid'); W = ig.__cWid; H = ig.__cHei; grid = Uint8Array.from(ig.intGridCsv);
  tiles = [];
  for (const id of ['Default_floor', 'Collisions', 'Wall_tops', 'Custom_floor']) {
    const li = lvl.layerInstances.find((l: any) => l.__identifier === id); const a = new Uint16Array(W * H).fill(0xffff);
    for (const t of li.autoLayerTiles.length ? li.autoLayerTiles : li.gridTiles) a[(t.px[1] >> 4) * W + (t.px[0] >> 4)] = t.t | (t.f << 14);
    tiles.push(a);
  }
}
function parseBin(buf: ArrayBuffer) {
  const dv = new DataView(buf); W = dv.getUint16(6, true); H = dv.getUint16(8, true); let o = 16;
  grid = new Uint8Array(buf, o, W * H).slice(); o += W * H; tiles = [];
  for (let k = 0; k < 4; k++) { tiles.push(new Uint16Array(buf.slice(o, o + W * H * 2))); o += W * H * 2; }
}
function walkable(x: number, y: number) { const cx = x >> 4, cy = y >> 4; if (cx < 0 || cy < 0 || cx >= W || cy >= H) return false; const v = grid[cy * W + cx]; return v !== 3 && v !== 4; }
function pickTarget(i: number) { for (let k = 0; k < 8; k++) { const x = rnd() * W * 16, y = rnd() * H * 16; if (walkable(x, y)) { tx[i] = x; ty[i] = y; return; } } tx[i] = px[i]; ty[i] = py[i]; }
function spawn(n: number) {
  N = n; px = new Float32Array(n); py = new Float32Array(n); tx = new Float32Array(n); ty = new Float32Array(n); spd = new Float32Array(n);
  hunger = new Float32Array(n); wealth = new Float32Array(n); kind = new Uint8Array(n); state = new Uint8Array(n); home = new Uint32Array(n);
  cellCount = new Uint32Array(W * H); cellStart = new Uint32Array(W * H + 1); order = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0; do { x = rnd() * W * 16; y = rnd() * H * 16; } while (!walkable(x, y));
    px[i] = x; py[i] = y; spd[i] = 0.6 + rnd() * 0.8; kind[i] = i % 50 === 0 ? 2 : i % 12 === 0 ? 1 : 0; hunger[i] = rnd() * 100; wealth[i] = rnd() * 500; home[i] = (rnd() * W * H) | 0; pickTarget(i);
  }
}
function step() {
  cellCount.fill(0);
  for (let i = 0; i < N; i++) {
    const dx = tx[i] - px[i], dy = ty[i] - py[i]; const d = Math.hypot(dx, dy);
    if (d < 2) { pickTarget(i); continue; }
    const nx = px[i] + (dx / d) * spd[i], ny = py[i] + (dy / d) * spd[i];
    if (walkable(nx, ny)) { px[i] = nx; py[i] = ny; } else pickTarget(i);
    hunger[i] += 0.01; if (hunger[i] > 100) { hunger[i] = 0; wealth[i] -= 1; }
    state[i] = kind[i] === 0 && hunger[i] > 90 && wealth[i] < 50 ? 1 : 0;
    cellCount[(py[i] >> 4) * W + (px[i] >> 4)]++;
  }
  let acc = 0; for (let c = 0; c < W * H; c++) { cellStart[c] = acc; acc += cellCount[c]; } cellStart[W * H] = acc;
  for (let i = 0; i < N; i++) { const c = (py[i] >> 4) * W + (px[i] >> 4); order[cellStart[c]++] = i; }
}
function pack() { const p = new Float32Array(N * 2); for (let i = 0; i < N; i++) { p[2 * i] = px[i]; p[2 * i + 1] = py[i]; } const k = new Uint8Array(N); for (let i = 0; i < N; i++) k[i] = state[i] ? 3 : kind[i]; return { p, k }; }
let timer = 0;
const api = {
  async init(buf: ArrayBuffer, fmt: string, n: number, slow = 1) {
    SLOW = slow; const t0 = performance.now(); if (fmt === 'bin') parseBin(buf); else parseJson(buf); spin(performance.now() - t0); const t1 = performance.now(); spawn(n); spin(performance.now() - t1); const t2 = performance.now();
    const g = grid.slice(); const tl = tiles.map((t) => t.slice());
    return Comlink.transfer({ W, H, grid: g, tiles: tl, wOrigin: performance.timeOrigin, tEval: T_EVAL, tParse0: t0, tParse1: t1, tSpawn1: t2 }, [g.buffer, ...tl.map((t) => t.buffer)]);
  },
  snapshot() { const t0 = performance.now(); const s = pack(); spin(performance.now() - t0); return Comlink.transfer(s, [s.p.buffer, s.k.buffer]); },
  calib() { const t0 = performance.now(); let x = 0; for (let i = 0; i < 3e7; i++) x = (x + i * 7) % 1000003; return { ms: performance.now() - t0, x }; },
  stepBench(frames: number) { const t: number[] = []; for (let f = 0; f < frames; f++) { const t0 = performance.now(); step(); spin(performance.now() - t0); t.push(performance.now() - t0); } return t; },
  start(cb: (s: { p: Float32Array; k: Uint8Array; stepMs: number }) => void, hz = 30) {
    clearInterval(timer); timer = setInterval(() => { const t0 = performance.now(); step(); const s = pack(); spin(performance.now() - t0); cb(Comlink.transfer({ ...s, stepMs: performance.now() - t0 }, [s.p.buffer, s.k.buffer])); }, 1000 / hz) as unknown as number;
  },
  stop() { clearInterval(timer); },
  agent(i: number) { return { id: i, x: px[i], y: py[i], hunger: hunger[i], wealth: wealth[i], kind: kind[i], state: state[i], home: home[i] }; },
  bytes() { const arrs = [px, py, tx, ty, spd, hunger, wealth, kind, state, home, grid, cellCount, cellStart, order, ...tiles]; return arrs.reduce((a, b) => a + b.byteLength, 0); },
};
export type SimApi = typeof api;
Comlink.expose(api);
