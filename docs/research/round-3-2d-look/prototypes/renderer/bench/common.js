// Shared bench scaffolding: procedural atlas + 256x256 town map + stub agent sim (30 Hz ticks, 60 Hz frames).
export const TILE = 16, MAP_W = 256, MAP_H = 256, WORLD_W = MAP_W * TILE, WORLD_H = MAP_H * TILE, OUTFITS = 8;
export const VIEW_W = 1280, VIEW_H = 720;
export const params = new URLSearchParams(location.search);
export const N = +(params.get('n') || 10000), ZOOM = +(params.get('zoom') || 3), MODE = params.get('mode') || '';

export function makeAtlasCanvas() {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  for (let i = 0; i < 64 * 16; i++) {                                    // 1024 tiles, 16x16, rows 0..255
    const x = (i % 64) * 16, y = Math.floor(i / 64) * 16;
    g.fillStyle = `hsl(${(i * 37) % 360},40%,${30 + (i % 5) * 8}%)`; g.fillRect(x, y, 16, 16);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + (i % 7), y + (i % 11), 3, 3);
  }
  for (let k = 0; k < OUTFITS * 12; k++) {                               // characters 16x32 from y=512, 32 per row
    const x = (k % 32) * 16, y = 512 + Math.floor(k / 32) * 32, outfit = Math.floor(k / 12), dir = Math.floor((k % 12) / 3), fr = k % 3;
    g.fillStyle = `hsl(${outfit * 45},70%,50%)`; g.fillRect(x + 4, y + 12, 8, 14);
    g.fillStyle = '#f2c9a0'; g.fillRect(x + 4, y + 4, 8, 8);
    g.fillStyle = '#222'; const a = fr === 1 ? 0 : fr === 2 ? 4 : 2; g.fillRect(x + 4 + a, y + 26, 3, 5); g.fillRect(x + 9 - a, y + 26, 3, 5);
    if (dir !== 3) { g.fillStyle = '#000'; g.fillRect(x + (dir === 1 ? 4 : dir === 2 ? 10 : 5), y + 7, 2, 2); }
  }
  for (let e = 0; e < 8; e++) {                                          // emotes 16x16 at y=1000
    const x = e * 16, y = 1000; g.fillStyle = '#fff'; g.fillRect(x + 1, y + 1, 14, 11); g.fillStyle = `hsl(${e * 45},80%,45%)`; g.fillRect(x + 6, y + 3, 4, 6);
  }
  return c;
}
export const charRect = k => [(k % 32) * 16, 512 + Math.floor(k / 32) * 32, 16, 32];
export const tileRect = id => [(id % 64) * 16, Math.floor(id / 64) * 16, 16, 16];

/** RGBA16UI-style map: r = ground, g = detail, b = above (roofs), a = 0 */
export function makeMap() {
  const m = new Uint16Array(MAP_W * MAP_H * 4);
  for (let i = 0; i < MAP_W * MAP_H; i++) {
    const x = i % MAP_W, y = (i / MAP_W) | 0, road = (x % 16 < 2) || (y % 16 < 2);
    m[i * 4] = road ? 5 : 1 + ((x * 7 + y * 13) % 8);
    m[i * 4 + 1] = (!road && (x * 31 + y * 17) % 23 === 0) ? 64 + ((x + y) % 8) : 0;
    m[i * 4 + 2] = (!road && x % 16 >= 5 && x % 16 < 11 && y % 16 >= 4 && y % 16 < 7) ? 128 + (x % 4) : 0;
  }
  return m;
}

export function makeAgents(n, seed = 1) {
  let s = seed >>> 0 || 1; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const a = { n, prev: new Float32Array(2 * n), cur: new Float32Array(2 * n), vx: new Float32Array(n), vy: new Float32Array(n),
    outfit: new Uint8Array(n), emote: new Uint8Array(n), emoteT: new Uint16Array(n) };
  const newDir = i => { const r = rnd(); const sp = 2; a.vx[i] = r < 0.2 ? sp : r < 0.4 ? -sp : 0; a.vy[i] = r >= 0.4 && r < 0.6 ? sp : r >= 0.6 && r < 0.8 ? -sp : 0; };
  for (let i = 0; i < n; i++) { a.cur[2 * i] = 32 + rnd() * (WORLD_W - 64); a.cur[2 * i + 1] = 48 + rnd() * (WORLD_H - 96); a.outfit[i] = (rnd() * OUTFITS) | 0; newDir(i); }
  a.prev.set(a.cur);
  a.tick = () => {
    a.prev.set(a.cur);
    for (let i = 0; i < n; i++) {
      if (rnd() < 0.03) newDir(i);
      let x = a.cur[2 * i] + a.vx[i], y = a.cur[2 * i + 1] + a.vy[i];
      if (x < 32 || x > WORLD_W - 32) { a.vx[i] = -a.vx[i]; x = a.cur[2 * i]; }
      if (y < 48 || y > WORLD_H - 48) { a.vy[i] = -a.vy[i]; y = a.cur[2 * i + 1]; }
      a.cur[2 * i] = x; a.cur[2 * i + 1] = y;
      if (a.emote[i]) { if (--a.emoteT[i] === 0) a.emote[i] = 0; } else if (rnd() < 0.002) { a.emote[i] = 1 + ((rnd() * 8) | 0); a.emoteT[i] = 60; }
    }
  };
  return a;
}
/** facing 0 down 1 left 2 right 3 up; walk frame 0 stand, 1 left step, 2 right step */
export function facingOf(a, i, last) {
  const dx = a.cur[2 * i] - a.prev[2 * i], dy = a.cur[2 * i + 1] - a.prev[2 * i + 1];
  if (dx * dx + dy * dy <= 0.0025) return last;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : (dy > 0 ? 0 : 3);
}
export function walkFrame(a, i, time) {
  const dx = a.cur[2 * i] - a.prev[2 * i], dy = a.cur[2 * i + 1] - a.prev[2 * i + 1];
  if (dx * dx + dy * dy <= 0.0025) return 0;
  const ph = Math.floor(time * 6 + (i & 7) * 0.37) & 3; return ph === 1 ? 1 : ph === 3 ? 2 : 0;
}
export const camCenter = () => [WORLD_W / 2 - VIEW_W / ZOOM / 2, WORLD_H / 2 - VIEW_H / ZOOM / 2];

/** sc = { onTick(agents), frame(alpha, timeSec), stepExternal? } ; frames: 60 Hz, sim tick every 2nd frame */
export async function runBench(name, setup) {
  const agents = makeAgents(N, 1);
  const heap0 = performance.memory ? performance.memory.usedJSHeapSize : 0;
  const t0 = performance.now(); const sc = await setup(agents); const setupMs = performance.now() - t0;
  const WARM = +(params.get('warm') || 40), MEAS = +(params.get('frames') || 150), cpu = [], gap = [], tickCpu = [];
  let f = 0, lastNow = 0, simTime = 0;
  await new Promise(res => {
    const loop = now => {
      if (f % 2 === 0) { agents.tick(); const t = performance.now(); sc.onTick(agents); if (f >= WARM) tickCpu.push(performance.now() - t); }
      const t1 = performance.now();
      sc.frame((f % 2) / 2, simTime);
      const t2 = performance.now();
      if (f >= WARM) { cpu.push(t2 - t1 + (f % 2 === 0 ? tickCpu[tickCpu.length - 1] : 0)); gap.push(now - lastNow); }
      lastNow = now; simTime += 1 / 60; f++;
      if (f < WARM + MEAS) requestAnimationFrame(loop); else res();
    };
    requestAnimationFrame(loop);
  });
  const q = (arr, p) => { const s = [...arr].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const heap1 = performance.memory ? performance.memory.usedJSHeapSize : 0;
  let gpu = '';
  try { const c = document.createElement('canvas'); const gl = c.getContext('webgl2'); const d = gl.getExtension('WEBGL_debug_renderer_info'); gpu = d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { gpu = 'n/a'; }
  window.__result = { name, mode: MODE, n: N, zoom: ZOOM, setupMs: +setupMs.toFixed(1),
    cpuMed: +q(cpu, 0.5).toFixed(2), cpuP95: +q(cpu, 0.95).toFixed(2), tickMed: +q(tickCpu, 0.5).toFixed(2),
    gapMed: +q(gap, 0.5).toFixed(1), heapMB: +((heap1 - heap0) / 1048576).toFixed(1), gpu, extra: (sc.split ? 'jsUpdate med ' + q(sc.split.u.slice(WARM), 0.5).toFixed(2) + ' ms / render() med ' + q(sc.split.r.slice(WARM), 0.5).toFixed(2) + ' ms; ' : '') + (sc.extra || '') };
}
