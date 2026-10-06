// Micro-benchmarks and the end-to-end pipeline, callable from the page or from bench.mjs.
import { makeCity, views, visibleCount, CELL, CELLS } from './world.js';
import * as GL from './gl.js';
import * as GP from './gpu.js';

export function stat(a) {
  const s = a.filter(Number.isFinite).sort((x, y) => x - y);
  if (!s.length) return null;
  return { med: s[s.length >> 1], min: s[0], max: s[s.length - 1], p95: s[Math.min(s.length - 1, Math.floor(s.length * 0.95))], k: s.length };
}

let R = null, G = null;
const cities = new Map();
export function city(n, order = 'cell') {
  const key = `${n}:${order}`;
  if (!cities.has(key)) cities.set(key, makeCity(n, 42, order));
  return cities.get(key);
}
export function gl() { if (!R) R = GL.initGL(new OffscreenCanvas(64, 64)); return R; }
export async function gpu() { if (!G) G = await GP.initGPU(); return G; }

export function env() {
  const r = gl();
  return { renderer: r.renderer, timer: !!r.timer, floatBlend: r.floatBlend, ua: navigator.userAgent,
    cores: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory, isolated: self.crossOriginIsolated, webgpu: 'gpu' in navigator };
}

// Draws one frame and reads it back: lit-pixel count, GL error and a PNG data URL for eyeballing.
export async function snapshot({ n, prim = 'points', size = 1, interp = false, view = 'city', tex = false, heat = false, png = false }) {
  const r = gl(), g = r.gl, c = city(n), v = views(c)[view];
  const data = new Uint8Array(c.buf);
  const cur = GL.makeAgentBuffer(r, 0, data);
  const vao = GL.makeAgentVao(r, cur, null, prim === 'quads' ? 1 : 0);
  let t = null;
  if (tex) { t = GL.makeSnapTexture(r, n); GL.uploadSnapTexture(r, t, new Uint32Array(c.buf), n); }
  GL.clearTarget(r, null, 0, 0, 0);
  if (heat) {
    const den = GL.makeTarget(g, 480, 270, g.R32F);
    GL.clearTarget(r, den, 0, 0, 0);
    GL.drawAgents(r, { vao, n, prim: 'points', splat: true, view: v, target: den });
    GL.resolveDensity(r, den.tex, n / (480 * 270) * 40);
  } else GL.drawAgents(r, { vao, tex: t, prevTex: t, n, prim, size, interp, view: v });
  const err = g.getError();
  const px = new Uint8Array(r.w * r.h * 4);
  g.bindFramebuffer(g.FRAMEBUFFER, r.fbo.fb);
  g.readPixels(0, 0, r.w, r.h, g.RGBA, g.UNSIGNED_BYTE, px);
  let lit = 0;
  for (let i = 0; i < px.length; i += 4) if (px[i] | px[i + 1] | px[i + 2]) lit++;
  let url = null;
  if (png) {
    const cv = new OffscreenCanvas(r.w, r.h), ctx = cv.getContext('2d'), img = ctx.createImageData(r.w, r.h);
    for (let y = 0; y < r.h; y++) img.data.set(px.subarray((r.h - 1 - y) * r.w * 4, (r.h - y) * r.w * 4), y * r.w * 4);
    ctx.putImageData(img, 0, 0);
    const blob = await cv.convertToBlob({ type: 'image/png' });
    url = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(blob); });
  }
  g.deleteBuffer(cur); g.deleteVertexArray(vao); if (t) g.deleteTexture(t);
  return { test: 'snapshot', n, prim, size, view, err, lit, litShare: lit / (r.w * r.h), visible: visibleCount(c, v), url };
}

export async function glDraw({ n, prim = 'points', size = 1, interp = false, view = 'city', tex = false, order = 'cell', samples = 60 }) {
  const r = gl(), g = r.gl, c = city(n, order), v = views(c)[view];
  const data = new Uint8Array(c.buf);
  const cur = GL.makeAgentBuffer(r, 0, data), prev = interp ? GL.makeAgentBuffer(r, 0, data) : null;
  const vao = GL.makeAgentVao(r, cur, prev, prim === 'quads' ? 1 : 0);
  let t = null;
  if (tex) { t = GL.makeSnapTexture(r, n); GL.uploadSnapTexture(r, t, new Uint32Array(c.buf), n); }
  GL.clearTarget(r);
  const res = await GL.timeGL(r, () => GL.drawAgents(r, { vao, tex: t, prevTex: t, n, prim, size, interp, view: v }), { samples });
  g.deleteBuffer(cur); if (prev) g.deleteBuffer(prev); g.deleteVertexArray(vao); if (t) g.deleteTexture(t);
  return { test: 'glDraw', n, prim, size, interp, view, tex, order, visible: visibleCount(c, v), gpu: stat(res.gpu), cpu: stat(res.cpu) };
}

// Upload cost: CPU time of the call, and end-to-end time with a 1-pixel readback after a small dependent draw.
export async function glUpload({ n, method = 'subdata', sab = false, samples = 30 }) {
  const r = gl(), g = r.gl, c = city(n), bytes = n * 12;
  const src = new Uint8Array(sab ? new SharedArrayBuffer(bytes) : new ArrayBuffer(bytes));
  src.set(new Uint8Array(c.buf));
  const v = views(c).city;
  const ring = method === 'ring3' ? 3 : 1;
  const bufs = [], vaos = [];
  for (let i = 0; i < ring; i++) { bufs.push(GL.makeAgentBuffer(r, bytes)); vaos.push(GL.makeAgentVao(r, bufs[i], null, 0)); }
  const tex = method === 'texture' ? GL.makeSnapTexture(r, n) : null;
  const u32 = method === 'texture' ? new Uint32Array(src.buffer) : null;
  const cpu = [];
  const tiny = { prim: 'points', size: 1, view: v, n: 1024 };
  const e2e = GL.timeSynced(r, (i) => {
    const t0 = performance.now();
    if (tex) GL.uploadSnapTexture(r, tex, u32, n);
    else {
      g.bindBuffer(g.ARRAY_BUFFER, bufs[i % ring]);
      if (method === 'orphan') { g.bufferData(g.ARRAY_BUFFER, bytes, g.DYNAMIC_DRAW); g.bufferSubData(g.ARRAY_BUFFER, 0, src); }
      else if (method === 'bufferData') g.bufferData(g.ARRAY_BUFFER, src, g.DYNAMIC_DRAW);
      else g.bufferSubData(g.ARRAY_BUFFER, 0, src);
    }
    cpu.push(performance.now() - t0);
    if (tex) GL.drawAgents(r, { ...tiny, tex, prevTex: tex });
    else GL.drawAgents(r, { ...tiny, vao: vaos[i % ring] });
  }, { warm: 5, samples });
  const base = GL.timeSynced(r, () => (tex ? GL.drawAgents(r, { ...tiny, tex, prevTex: tex }) : GL.drawAgents(r, { ...tiny, vao: vaos[0] })), { warm: 5, samples });
  for (const b of bufs) g.deleteBuffer(b); for (const a of vaos) g.deleteVertexArray(a); if (tex) g.deleteTexture(tex);
  return { test: 'glUpload', n, mb: bytes / 1e6, method, sab, cpu: stat(cpu.slice(5)), e2e: stat(e2e), base: stat(base) };
}

// Density heatmap: GPU additive splat into an R32F target, or CPU bins uploaded as a texture.
export async function glHeat({ n, bw = 480, bh = 270, view = 'city', path = 'splat', samples = 40 }) {
  const r = gl(), g = r.gl, c = city(n), v = views(c)[view];
  const den = GL.makeTarget(g, bw, bh, g.R32F);
  let maxc = 1, splat = null, bin = null, up = null;
  const cur = GL.makeAgentBuffer(r, 0, new Uint8Array(c.buf));
  const vao = GL.makeAgentVao(r, cur, null, 0);
  if (path === 'splat') {
    if (!den.ok || !r.floatBlend) return { test: 'glHeat', path, error: 'R32F blend unsupported' };
    splat = await GL.timeGL(r, () => { GL.clearTarget(r, den, 0, 0, 0); GL.drawAgents(r, { vao, n, prim: 'points', size: 1, view: v, splat: true, target: den }); }, { samples });
    maxc = n / (bw * bh) * 40;
  } else {
    const f = new Float32Array(c.buf), bins = new Float32Array(bw * bh);
    const binOnce = () => {
      bins.fill(0);
      const sx = v.ppt * bw / r.w, sy = v.ppt * bh / r.h, ox = bw / 2 - v.cam[0] * sx, oy = bh / 2 - v.cam[1] * sy;
      for (let i = 0; i < n; i++) {
        const bx = (f[3 * i] * sx + ox) | 0, by = (f[3 * i + 1] * sy + oy) | 0;
        if (bx >= 0 && by >= 0 && bx < bw && by < bh) bins[by * bw + bx]++;
      }
    };
    const tb = [];
    for (let i = 0; i < 15; i++) { const t0 = performance.now(); binOnce(); if (i >= 5) tb.push(performance.now() - t0); }
    bin = stat(tb);
    g.bindTexture(g.TEXTURE_2D, den.tex);
    up = stat(GL.timeSynced(r, () => { g.bindTexture(g.TEXTURE_2D, den.tex); g.texSubImage2D(g.TEXTURE_2D, 0, 0, 0, bw, bh, g.RED, g.FLOAT, bins); }, { warm: 3, samples: 20 }));
    maxc = n / (bw * bh) * 40;
  }
  const resolve = await GL.timeGL(r, () => GL.resolveDensity(r, den.tex, maxc), { samples });
  g.deleteBuffer(cur); g.deleteVertexArray(vao); g.deleteTexture(den.tex); g.deleteFramebuffer(den.fb);
  return { test: 'glHeat', n, path, bw, bh, view, splatGpu: splat && stat(splat.gpu), cpuBin: bin, binUploadE2e: up, resolveGpu: stat(resolve.gpu) };
}

// Viewport culling at district zoom: GPU clipping of all agents, cell-row ranges, or CPU compaction.
export async function glCull({ n, view = 'district', method = 'none', size = 5, samples = 40 }) {
  const r = gl(), g = r.gl, c = city(n), v = views(c)[view];
  const data = new Uint8Array(c.buf);
  const cur = GL.makeAgentBuffer(r, 0, data), vao = GL.makeAgentVao(r, cur, null, 0);
  const out = { test: 'glCull', n, view, method, size, visible: visibleCount(c, v) };
  const hw = r.w / 2 / v.ppt, hh = r.h / 2 / v.ppt;
  if (method === 'none') {
    out.gpu = stat((await GL.timeGL(r, () => GL.drawAgents(r, { vao, n, prim: 'points', size, view: v }), { samples })).gpu);
  } else if (method === 'ranges') {
    const tr = [];
    let ranges = null;
    for (let k = 0; k < 20; k++) {
      const t0 = performance.now();
      const cx0 = Math.max(0, Math.floor((v.cam[0] - hw) / CELL)), cx1 = Math.min(CELLS - 1, Math.floor((v.cam[0] + hw) / CELL));
      const cy0 = Math.max(0, Math.floor((v.cam[1] - hh) / CELL)), cy1 = Math.min(CELLS - 1, Math.floor((v.cam[1] + hh) / CELL));
      ranges = [];
      for (let cy = cy0; cy <= cy1; cy++) {
        const a = c.cellStart[cy * CELLS + cx0], b = c.cellStart[cy * CELLS + cx1 + 1];
        if (b > a) ranges.push([a, b - a]);
      }
      tr.push(performance.now() - t0);
    }
    out.ranges = ranges.length;
    out.drawn = ranges.reduce((s, x) => s + x[1], 0);
    out.cpuRanges = stat(tr);
    out.gpu = stat((await GL.timeGL(r, () => GL.drawAgents(r, { vao, n, ranges, prim: 'points', size, view: v }), { samples })).gpu);
  } else {
    const f = new Float32Array(c.buf), u = new Uint32Array(c.buf);
    const outBuf = new ArrayBuffer(n * 12), of = new Float32Array(outBuf), ou = new Uint32Array(outBuf);
    const x0 = v.cam[0] - hw, x1 = v.cam[0] + hw, y0 = v.cam[1] - hh, y1 = v.cam[1] + hh;
    const compact = () => {
      let k = 0;
      for (let i = 0; i < n; i++) {
        const x = f[3 * i], y = f[3 * i + 1];
        if (x < x0 || x >= x1 || y < y0 || y >= y1) continue;
        of[3 * k] = x; of[3 * k + 1] = y; ou[3 * k + 2] = u[3 * i + 2]; k++;
      }
      return k;
    };
    const ts = [];
    let k = 0;
    for (let i = 0; i < 15; i++) { const t0 = performance.now(); k = compact(); if (i >= 5) ts.push(performance.now() - t0); }
    out.cpuScan = stat(ts);
    out.drawn = k;
    const vb = GL.makeAgentBuffer(r, n * 12), vv = GL.makeAgentVao(r, vb, null, 0);
    const tu = [];
    GL.timeSynced(r, () => { g.bindBuffer(g.ARRAY_BUFFER, vb); const t0 = performance.now(); g.bufferSubData(g.ARRAY_BUFFER, 0, new Uint8Array(outBuf, 0, k * 12)); tu.push(performance.now() - t0); }, { warm: 3, samples: 15 });
    out.upload = stat(tu.slice(3));
    out.gpu = stat((await GL.timeGL(r, () => GL.drawAgents(r, { vao: vv, n: k, prim: 'points', size, view: v }), { samples })).gpu);
    g.deleteBuffer(vb); g.deleteVertexArray(vv);
  }
  g.deleteBuffer(cur); g.deleteVertexArray(vao);
  return out;
}

export async function glCountry({ gw = 256, gh = 128, settlements = 7000, segments = 14000, samples = 40 }) {
  const r = gl();
  const c = GL.makeCountry(r, gw, gh, settlements, segments);
  const res = await GL.timeGL(r, () => GL.drawCountry(r, c), { samples });
  return { test: 'glCountry', tris: c.tris, settlements, segments, gpu: stat(res.gpu), cpu: stat(res.cpu) };
}

export async function gpuDraw({ n, prim = 'quads', size = 1, interp = false, view = 'city', samples = 30 }) {
  const G = await gpu(), c = city(n), v = views(c)[view];
  const data = new Uint8Array(c.buf);
  const cur = GP.makeSnapBuffer(G, n * 12, data), prev = interp ? GP.makeSnapBuffer(G, n * 12, data) : null;
  GP.setAgentUniforms(G, { view: v, size, n, alpha: 0.5 });
  const o = { prim, interp, bind: GP.bindAgents(G, cur, prev), n, load: true };
  const res = await GP.timeGPU(G, (enc, timed) => GP.encodeAgents(G, enc, o, timed), { samples });
  cur.destroy(); if (prev) prev.destroy();
  return { test: 'gpuDraw', n, prim, size: prim === 'points' ? 1 : size, interp, view, visible: visibleCount(c, v), gpu: stat(res.gpu), wallPerPass: stat(res.wall), timestamps: G.ts };
}

export async function gpuUpload({ n, method = 'writeBuffer', sab = false, samples = 20 }) {
  const G = await gpu(), c = city(n), bytes = n * 12;
  const src = new Uint8Array(sab ? new SharedArrayBuffer(bytes) : new ArrayBuffer(bytes));
  src.set(new Uint8Array(c.buf));
  const dst = GP.makeSnapBuffer(G, bytes);
  let res;
  try { res = method === 'staging' ? await GP.timeStaging(G, dst, src, samples) : await GP.timeWriteBuffer(G, dst, src, samples); }
  catch (e) { dst.destroy(); return { test: 'gpuUpload', n, method, sab, error: String(e.message || e) }; }
  dst.destroy();
  return { test: 'gpuUpload', n, mb: bytes / 1e6, method, sab, cpu: stat(res.cpu), done: stat(res.done) };
}

export async function gpuHeat({ n, bw = 480, bh = 270, view = 'city', samples = 30 }) {
  const G = await gpu(), c = city(n), v = views(c)[view];
  const cur = GP.makeSnapBuffer(G, n * 12, new Uint8Array(c.buf));
  const B = GP.makeBins(G, bw, bh);
  GP.setAgentUniforms(G, { view: v, n, bw, bh, size: 1 });
  const res = await GP.timeGPU(G, (enc, timed) => GP.encodeBins(G, enc, { n }, B, cur, timed), { samples });
  const e = G.device.createCommandEncoder();
  GP.encodeResolve(G, e, B, n / (bw * bh) * 40);
  G.device.queue.submit([e.finish()]);
  await G.device.queue.onSubmittedWorkDone();
  cur.destroy(); B.bins.destroy();
  return { test: 'gpuHeat', n, bw, bh, view, gpu: stat(res.gpu), wallPerPass: stat(res.wall) };
}

// Canvas2D fallback: per-pixel ImageData writes for 1-px dust, or fillRect for 5-px dots.
export async function canvas2d({ n, mode = 'imagedata', view = 'city', size = 5, frames = 12 }) {
  const cv = new OffscreenCanvas(1920, 1080), ctx = cv.getContext('2d');
  const c = city(n), v = views(c)[view], f = new Float32Array(c.buf), u = new Uint32Array(c.buf);
  const ox = 960 - v.cam[0] * v.ppt, oy = 540 - v.cam[1] * v.ppt;
  const COL = [0xff48c9f7, 0xff8f9d2a, 0xff7c3a28];
  const CSS = ['#F7C948', '#2A9D8F', '#283A7C'];
  const ts = [], tp = [], tr = [];
  let img = null, u32 = null;
  if (mode === 'imagedata') { img = ctx.createImageData(1920, 1080); u32 = new Uint32Array(img.data.buffer); }
  for (let k = 0; k < frames + 2; k++) {
    const t0 = performance.now();
    if (mode === 'imagedata') {
      u32.fill(0xff1a1210);
      for (let i = 0; i < n; i++) {
        const x = (f[3 * i] * v.ppt + ox) | 0, y = (f[3 * i + 1] * v.ppt + oy) | 0;
        if (x >= 0 && y >= 0 && x < 1920 && y < 1080) u32[y * 1920 + x] = COL[u[3 * i + 2] & 3] || COL[0];
      }
      const t1 = performance.now();
      ctx.putImageData(img, 0, 0);
      if (k >= 2) { ts.push(t1 - t0); tp.push(performance.now() - t1); }
    } else {
      ctx.fillStyle = '#101a12';
      ctx.fillRect(0, 0, 1920, 1080);
      for (let role = 0; role < 3; role++) {
        ctx.fillStyle = CSS[role];
        for (let i = 0; i < n; i++) {
          if ((u[3 * i + 2] & 3) !== role) continue;
          const x = f[3 * i] * v.ppt + ox, y = f[3 * i + 1] * v.ppt + oy;
          if (x > -size && y > -size && x < 1920 + size && y < 1080 + size) ctx.fillRect((x | 0) - 2, (y | 0) - 2, size, size);
        }
      }
      const t1 = performance.now();
      ctx.getImageData(0, 0, 1, 1);
      if (k >= 2) { tr.push(t1 - t0); ts.push(performance.now() - t0); }
    }
  }
  return { test: 'canvas2d', n, mode, view, size, visible: visibleCount(c, v), frame: stat(ts), record: stat(tr), putImageData: stat(tp) };
}

// Rendering-side cost of a zoom-in to n agents: channel and GPU allocation, the first upload, the first
// (cold) draw, and the same upload cut into slices that could be spread over frames.
export async function transition({ n = 1000000, slices = 16, fresh = false }) {
  const r = fresh ? GL.initGL(new OffscreenCanvas(64, 64)) : gl(), g = r.gl, c = city(n), bytes = n * 12, v = views(c).city;
  const t = () => performance.now();
  const px = new Uint8Array(4);
  const sync = () => { g.bindFramebuffer(g.FRAMEBUFFER, r.fbo.fb); g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, px); };
  sync();
  let t0 = t();
  const sab = new SharedArrayBuffer(256 + 3 * bytes);
  const sabMs = t() - t0;
  new Uint8Array(sab, 256, bytes).set(new Uint8Array(c.buf));
  t0 = t();
  const a = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, a); g.bufferData(g.ARRAY_BUFFER, bytes, g.DYNAMIC_DRAW);
  const b = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, b); g.bufferData(g.ARRAY_BUFFER, bytes, g.DYNAMIC_DRAW);
  const allocMs = t() - t0;
  sync();
  const allocE2e = t() - t0;
  const src = new Uint8Array(sab, 256, bytes);
  t0 = t();
  g.bindBuffer(g.ARRAY_BUFFER, a); g.bufferSubData(g.ARRAY_BUFFER, 0, src);
  const firstUploadCpu = t() - t0;
  sync();
  const firstUploadE2e = t() - t0;
  const vao = GL.makeAgentVao(r, a, null, 0);
  t0 = t();
  GL.drawAgents(r, { vao, n, prim: 'points', size: 1, view: v });
  sync();
  const firstDrawE2e = t() - t0;
  t0 = t();
  g.bindBuffer(g.ARRAY_BUFFER, b); g.bufferSubData(g.ARRAY_BUFFER, 0, src);
  sync();
  const secondBufferUploadE2e = t() - t0;
  const vaoB = GL.makeAgentVao(r, b, null, 0);
  t0 = t();
  GL.drawAgents(r, { vao: vaoB, n, prim: 'points', size: 1, view: v });
  sync();
  const secondBufferFirstDrawE2e = t() - t0;
  const firstFrame = firstUploadE2e + firstDrawE2e;
  const warmFrame = stat(GL.timeSynced(r, () => GL.drawAgents(r, { vao, n, prim: 'points', size: 1, view: v }), { warm: 2, samples: 10 }));
  g.deleteVertexArray(vaoB);
  const per = Math.ceil(bytes / slices / 12) * 12, sliceCpu = [];
  for (let rep = 0; rep < 3; rep++) for (let off = 0; off < bytes; off += per) {
    g.bindBuffer(g.ARRAY_BUFFER, b);
    const s0 = t();
    g.bufferSubData(g.ARRAY_BUFFER, off, src.subarray(off, Math.min(bytes, off + per)));
    sliceCpu.push(t() - s0);
    GL.timeSynced(r, () => {}, { warm: 0, samples: 1 });
  }
  g.deleteBuffer(a); g.deleteBuffer(b); g.deleteVertexArray(vao);
  if (fresh) g.getExtension('WEBGL_lose_context')?.loseContext();
  return { test: 'transition', n, fresh, mb: bytes / 1e6, sabAllocMs: sabMs, glAllocTwoBuffersMs: allocMs, allocE2e, firstUploadCpu, firstUploadE2e,
    firstDrawE2e, secondBufferUploadE2e, secondBufferFirstDrawE2e, firstFrameE2e: firstFrame, warmFrameE2e: warmFrame, slices, sliceMb: per / 1e6, sliceCpu: stat(sliceCpu) };
}

// CPU-side costs in this engine: visible compaction scan, 256² binning, 12 MB copy.
export async function cpuCosts({ n = 1000000 }) {
  const c = city(n), f = new Float32Array(c.buf), u = new Uint32Array(c.buf), v = views(c).district;
  const out = new Uint8Array(n * 12), bins = new Uint32Array(256 * 256);
  const run = (fn) => { const t = []; for (let i = 0; i < 15; i++) { const t0 = performance.now(); fn(); if (i >= 5) t.push(performance.now() - t0); } return stat(t); };
  const hw = 960 / v.ppt, hh = 540 / v.ppt, x0 = v.cam[0] - hw, x1 = v.cam[0] + hw, y0 = v.cam[1] - hh, y1 = v.cam[1] + hh;
  const of = new Float32Array(out.buffer), ou = new Uint32Array(out.buffer);
  const src = new Uint8Array(c.buf);
  return {
    test: 'cpuCosts', n,
    compactDistrict: run(() => { let k = 0; for (let i = 0; i < n; i++) { const x = f[3 * i], y = f[3 * i + 1]; if (x < x0 || x >= x1 || y < y0 || y >= y1) continue; of[3 * k] = x; of[3 * k + 1] = y; ou[3 * k + 2] = u[3 * i + 2]; k++; } }),
    bin256: run(() => { bins.fill(0); const s = 256 / 3072; for (let i = 0; i < n; i++) bins[((f[3 * i + 1] * s) | 0) * 256 + ((f[3 * i] * s) | 0)]++; }),
    copy12: run(() => out.set(src)),
  };
}

export { pipeline, startPipeline } from './pipeline.js';
