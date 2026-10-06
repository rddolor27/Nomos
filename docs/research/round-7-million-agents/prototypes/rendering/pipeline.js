// End-to-end: stand-in sim worker at `hz`, snapshot through SAB or transfer, render on main or in a worker.
import { makeCity, views } from './world.js';
import * as GL from './gl.js';
import * as P from './protocol.js';
import { createLoop } from './loop.js';

const W = 1920, H = 1080;
const once = (target, type) => new Promise((ok) => target.addEventListener('message', function h(e) {
  if (e.data.type === type) { target.removeEventListener('message', h); ok(e.data); }
}));
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

function stat(a) {
  const s = a.filter(Number.isFinite).sort((x, y) => x - y);
  if (!s.length) return null;
  return { med: s[s.length >> 1], p95: s[Math.min(s.length - 1, Math.floor(s.length * 0.95))], min: s[0], max: s[s.length - 1], k: s.length };
}

export async function startSim({ n, transport, upload, hz, view }) {
  const sim = new Worker(new URL('./sim-worker.js', import.meta.url), { type: 'module' });
  const sab = transport === 'sab' ? new SharedArrayBuffer(P.sabBytes(n, upload)) : null;
  const camArr = [view.cam[0], view.cam[1], view.ppt, W, H];
  if (sab) P.views(sab).f32.set(camArr, P.CAM_F32);
  const ready = once(sim, 'ready');
  sim.postMessage({ type: 'cam', cam: camArr });
  sim.postMessage({ type: 'init', n, upload, transport, hz, sab });
  await ready;
  return { sim, sab };
}

export async function simStats(sim) {
  const s = once(sim, 'stats');
  sim.postMessage({ type: 'stats' });
  const r = await s;
  delete r.type;
  return r;
}

export async function startPipeline({ n, transport = 'sab', render = 'main', upload = 'full', view = 'city', prim = 'points', size = 1,
  interp = true, hz = 10, lod = 'dots', canvas = null, cityData = null }) {
  if (transport === 'sab' && !self.crossOriginIsolated) throw new Error('SharedArrayBuffer needs crossOriginIsolated (COOP/COEP)');
  if (transport === 'transfer' && render === 'worker') throw new Error('transfer mode renders on the main thread only');
  const c = cityData || makeCity(n, 42, 'cell');
  const v = typeof view === 'string' ? views(c)[view] : view;
  const cv = canvas || Object.assign(document.createElement('canvas'), { width: W, height: H });
  if (!canvas) { cv.style.cssText = 'position:fixed;right:0;bottom:0;width:480px;height:270px;'; document.body.appendChild(cv); }
  const opts = { n, upload, view: { cam: [...v.cam], ppt: v.ppt }, prim, size, interp, hz, lod };
  const { sim, sab } = await startSim({ n, transport, upload, hz, view: v });
  let loop = null, rw = null, raf = 0, running = true, lastMain = 0, R2 = null;
  let mainInt = [], mainBusy = [];
  if (render === 'worker') {
    rw = new Worker(new URL('./render-worker.js', import.meta.url), { type: 'module' });
    const off = cv.transferControlToOffscreen();
    const rready = once(rw, 'ready');
    rw.postMessage({ type: 'init', canvas: off, sab, w: W, h: H, opts }, [off]);
    await rready;
    const idle = (now) => {
      if (!running) return;
      const t0 = performance.now();
      if (lastMain) mainInt.push(now - lastMain);
      lastMain = now;
      mainBusy.push(performance.now() - t0);
      raf = requestAnimationFrame(idle);
    };
    raf = requestAnimationFrame(idle);
  } else {
    R2 = GL.initGL(cv, W, H);
    loop = createLoop(R2, { ...opts, sab, w: W, h: H,
      returnBuf: (buf) => sim.postMessage({ type: 'return', buf }, [buf]),
      postCam: (cam) => sim.postMessage({ type: 'cam', cam }) });
    if (!sab) sim.addEventListener('message', (e) => { if (e.data.type === 'snap') loop.onSnap(e.data); });
    const tick = (now) => { if (!running) return; loop.frame(now); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
  }
  return {
    renderer: R2 ? R2.renderer : 'worker',
    setView(nv) {
      opts.view.cam[0] = nv.cam[0]; opts.view.cam[1] = nv.cam[1]; opts.view.ppt = nv.ppt;
      if (loop) loop.setView(nv); else rw.postMessage({ type: 'view', view: nv });
      if (!sab) sim.postMessage({ type: 'cam', cam: [nv.cam[0], nv.cam[1], nv.ppt, W, H] });
    },
    async reset() {
      await simStats(sim);
      if (loop) loop.reset(); else rw.postMessage({ type: 'reset' });
      mainInt = []; mainBusy = [];
    },
    async summary() {
      const s = await simStats(sim);
      let rs;
      if (loop) rs = loop.summary();
      else { const p = once(rw, 'summary'); rw.postMessage({ type: 'summary' }); rs = await p; delete rs.type; }
      return { render: rs, sim: s, main: rw ? { interval: stat(mainInt), busy: stat(mainBusy) } : null };
    },
    async stop() {
      running = false;
      cancelAnimationFrame(raf);
      sim.postMessage({ type: 'stop' });
      sim.terminate();
      if (rw) { const p = once(rw, 'stopped'); rw.postMessage({ type: 'stop' }); await Promise.race([p, sleep(500)]); rw.terminate(); }
      if (loop) { loop.dispose(); R2.gl.getExtension('WEBGL_lose_context')?.loseContext(); }
      if (!canvas) cv.remove();
    },
  };
}

export async function pipeline(o) {
  const { warm = 2, seconds = 6 } = o;
  let p;
  try { p = await startPipeline(o); } catch (e) { return { test: 'pipeline', ...o, error: String(e.message || e) }; }
  if (warm > 0) { await sleep(warm * 1000); await p.reset(); }
  await sleep(seconds * 1000);
  const s = await p.summary();
  await p.stop();
  const { cityData, canvas, render = 'main', upload = 'full', ...params } = o;
  return { test: 'pipeline', ...params, renderThread: render, uploadMode: upload, warm, seconds, stats: s.render, sim: s.sim, main: s.main };
}
