import * as S from './suite.js';
import { startPipeline, startSim, simStats } from './pipeline.js';
import { makeCity, views as viewsOf } from './world.js';
import * as GP from './gpu.js';
import * as P from './protocol.js';

window.suite = S;
const q = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const PPT = [0.25, 0.35, 0.5, 1, 2, 3, 4, 6, 8, 12, 16];
const f1 = (x) => (x == null || !Number.isFinite(x) ? '–' : x < 10 ? x.toFixed(2) : x.toFixed(1));

function params() {
  return {
    n: +q.get('n') || 1000000, prim: q.get('prim') || 'points', size: +q.get('size') || 1, view: q.get('view') || 'city',
    interp: q.get('interp') !== '0', transport: q.get('transport') || (self.crossOriginIsolated ? 'sab' : 'transfer'),
    render: q.get('render') || 'main', upload: q.get('upload') || 'full', hz: +q.get('hz') || 10, lod: q.get('lod') || 'auto',
    api: q.get('api') || 'webgl2',
  };
}

if (q.has('bench')) window.__ready = true;
else if (q.has('live')) live().catch((e) => { $('hud').textContent = 'Error: ' + e.message; });
else home();

function home() {
  const e = S.env();
  $('env').textContent = `${e.renderer} · WebGL2 timer queries: ${e.timer} · WebGPU: ${e.webgpu} · crossOriginIsolated: ${e.isolated} · cores: ${e.cores}`;
  for (const [k, v] of Object.entries(params())) { const el = document.querySelector(`[name=${k}]`); if (el) el.value = String(v === true ? 1 : v === false ? 0 : v); }
  $('quick').onclick = quickSuite;
}

const QUICK = [
  ['glDraw', { n: 100000, prim: 'points', size: 1 }],
  ['glDraw', { n: 1000000, prim: 'points', size: 1 }],
  ['glDraw', { n: 1000000, prim: 'points', size: 5 }],
  ['glDraw', { n: 1000000, prim: 'quads', size: 5 }],
  ['glDraw', { n: 1000000, prim: 'points', size: 1, interp: true }],
  ['gpuDraw', { n: 1000000, prim: 'quads', size: 5 }],
  ['gpuDraw', { n: 1000000, prim: 'points' }],
  ['glUpload', { n: 1000000, method: 'subdata' }],
  ['gpuUpload', { n: 1000000, method: 'writeBuffer' }],
  ['glHeat', { n: 1000000, path: 'splat' }],
  ['gpuHeat', { n: 1000000 }],
  ['glCull', { n: 1000000, method: 'none' }],
  ['glCull', { n: 1000000, method: 'compact' }],
  ['pipeline', { n: 1000000, transport: 'sab', render: 'main', upload: 'full', seconds: 5 }],
  ['pipeline', { n: 1000000, transport: 'sab', render: 'worker', upload: 'full', seconds: 5 }],
];

function headline(r) {
  if (r.error) return 'error: ' + r.error;
  if (r.test === 'glDraw' || r.test === 'gpuDraw') return `GPU ${f1(r.gpu?.med)} ms [${f1(r.gpu?.min)}–${f1(r.gpu?.max)}]`;
  if (r.test === 'glUpload') return `main-thread ${f1(r.cpu?.med)} ms, end-to-end ${f1(r.e2e?.med)} ms (draw-only ${f1(r.base?.med)})`;
  if (r.test === 'gpuUpload') return `main-thread ${f1(r.cpu?.med)} ms, done ${f1(r.done?.med)} ms`;
  if (r.test === 'glHeat') return `splat ${f1(r.splatGpu?.med)} ms + resolve ${f1(r.resolveGpu?.med)} ms`;
  if (r.test === 'gpuHeat') return `compute bins ${f1(r.gpu?.med)} ms`;
  if (r.test === 'glCull') return `GPU ${f1(r.gpu?.med)} ms${r.cpuScan ? `, scan ${f1(r.cpuScan.med)} ms, upload ${f1(r.upload?.med)} ms` : ''} (${r.visible} visible)`;
  if (r.test === 'pipeline') return `frame ${f1(r.render?.interval?.med)} ms (p95 ${f1(r.render?.interval?.p95)}), render CPU ${f1(r.render?.cpu?.med)} ms, upload ${f1(r.render?.upload?.med)} ms, GPU ${f1(r.render?.gpu?.med)} ms`;
  return JSON.stringify(r).slice(0, 120);
}

async function quickSuite() {
  const out = $('results'), all = [];
  out.textContent = '';
  for (const [name, p] of QUICK) {
    const line = document.createElement('div');
    line.textContent = `${name} ${JSON.stringify(p)} …`;
    out.appendChild(line);
    let r;
    try { r = await S[name](p); } catch (e) { r = { test: name, error: String(e.message || e) }; }
    all.push(r);
    line.textContent = `${name} ${JSON.stringify(p)} → ${headline(r)}`;
  }
  $('json').value = JSON.stringify({ env: S.env(), results: all }, null, 1);
}

async function live() {
  const o = params();
  document.body.classList.add('live');
  const cv = $('view');
  cv.width = 1920; cv.height = 1080;
  $('hud').textContent = `building ${o.n.toLocaleString()} agents…`;
  const city = makeCity(o.n, 42, 'cell');
  const v = viewsOf(city)[o.view];
  const view = { cam: [...v.cam], ppt: v.ppt };
  const p = o.api === 'webgpu' ? await startGpuLive(o, cv, view) : await startPipeline({ ...o, view, canvas: cv, cityData: city });
  let zi = PPT.findIndex((x) => x >= view.ppt);
  if (zi < 0) zi = 0;
  const apply = () => p.setView(view);
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    zi = Math.max(0, Math.min(PPT.length - 1, zi + (e.deltaY < 0 ? 1 : -1)));
    view.ppt = PPT[zi];
    apply();
  }, { passive: false });
  let drag = null;
  cv.addEventListener('pointerdown', (e) => { drag = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointerup', () => { drag = null; });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const k = 1920 / cv.clientWidth / view.ppt;
    view.cam[0] -= (e.clientX - drag[0]) * k; view.cam[1] -= (e.clientY - drag[1]) * k;
    drag = [e.clientX, e.clientY];
    apply();
  });
  setInterval(async () => {
    const s = await p.summary();
    await p.reset();
    const r = s.render || {};
    $('hud').textContent = [
      `${o.api} · ${p.renderer} · ${o.n.toLocaleString()} agents · ${o.transport}/${o.render}/${o.upload} · ${view.ppt} px per tile`,
      `LOD ${r.lod || o.prim} · visible ${(r.visible ?? 0).toLocaleString()} · occupancy ${f1(r.occupancy)}`,
      `frame interval ${f1(r.interval?.med)} ms (p95 ${f1(r.interval?.p95)}, ${r.longFrames ?? 0} over 25 ms) → ${f1(1000 / (r.interval?.med || NaN))} fps`,
      `render CPU per frame ${f1(r.cpu?.med)} ms (p95 ${f1(r.cpu?.p95)}) · upload per tick ${f1(r.upload?.med)} ms (p95 ${f1(r.upload?.p95)}) · GPU ${f1(r.gpu?.med)} ms`,
      s.main ? `main thread: rAF interval ${f1(s.main.interval?.med)} ms (p95 ${f1(s.main.interval?.p95)})` : '',
      `sim worker: step ${f1(s.sim?.stepMed)} ms · pack ${f1(s.sim?.packMed)} ms per tick`,
      'wheel = zoom in integer-ish steps · drag = pan',
    ].filter(Boolean).join('\n');
  }, 1000);
}

// WebGPU live view: same sim worker and SAB channel, storage-buffer vertex pulling to the canvas.
async function startGpuLive(o, cv, view) {
  if (!self.crossOriginIsolated) throw new Error('the WebGPU live view needs crossOriginIsolated (run serve.mjs)');
  const G = await GP.initGPU(1920, 1080, cv);
  const { sim, sab } = await startSim({ n: o.n, transport: 'sab', upload: 'full', hz: o.hz, view });
  const H = P.views(sab), bytes = o.n * 12;
  const bufs = [GP.makeSnapBuffer(G, bytes), GP.makeSnapBuffer(G, bytes)];
  const binds = [GP.bindAgents(G, bufs[0], bufs[1]), GP.bindAgents(G, bufs[1], bufs[0])];
  let cur = 0, front = 2, tickT = 0, last = 0, raf = 0, have = false;
  let st = { cpu: [], up: [], int: [] };
  const frame = (now) => {
    const t0 = performance.now();
    H.f32.set([view.cam[0], view.cam[1], view.ppt, 1920, 1080], P.CAM_F32);
    if (Atomics.load(H.i32, P.ST) & P.FRESH) {
      front = Atomics.exchange(H.i32, P.ST, front) & 3;
      const u0 = performance.now();
      G.device.queue.writeBuffer(bufs[1 - cur], 0, new Uint8Array(sab, P.slotOffset(front, o.n, 'full'), bytes));
      st.up.push(performance.now() - u0);
      cur = 1 - cur; tickT = H.f64[P.TIME_F64 + front] - performance.timeOrigin; have = true;
    }
    const alpha = o.interp ? Math.min(1, Math.max(0, (performance.now() - tickT) / (1000 / o.hz))) : 1;
    GP.setAgentUniforms(G, { view, size: o.size, n: o.n, alpha });
    const e = G.device.createCommandEncoder();
    if (have) GP.encodeAgents(G, e, { prim: o.prim, interp: o.interp, bind: binds[cur], n: o.n }, false, true);
    G.device.queue.submit([e.finish()]);
    st.cpu.push(performance.now() - t0);
    if (last) st.int.push(now - last);
    last = now;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return {
    renderer: `WebGPU ${G.info.vendor || ''} ${G.info.architecture || ''}`,
    setView() {},
    async reset() { st = { cpu: [], up: [], int: [] }; },
    async summary() {
      return { render: { cpu: S.stat(st.cpu), upload: S.stat(st.up), interval: S.stat(st.int), longFrames: st.int.filter((x) => x > 25).length, lod: o.prim },
        sim: await simStats(sim), main: null };
    },
    async stop() { cancelAnimationFrame(raf); sim.terminate(); },
  };
}
