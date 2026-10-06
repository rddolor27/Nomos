// WebGL2 pieces for the 1M-agent tests. Works on a canvas or an OffscreenCanvas.
export const TW = 1024;
const TSHIFT = 10;

const PAL = 'const vec3 PAL[3] = vec3[3](vec3(0.969,0.788,0.282), vec3(0.165,0.616,0.561), vec3(0.157,0.227,0.486));';

function agentVS({ quad, interp, tex }) {
  const src = tex
    ? `int id = ${quad ? 'gl_InstanceID' : 'gl_VertexID'} + uFirst;
  ivec2 t = ivec2(id & ${TW - 1}, id >> ${TSHIFT});
  uvec4 s = texelFetch(uSnap, t, 0);
  vec2 cur = uintBitsToFloat(s.xy); uint word = s.z;
  vec2 prev = ${interp ? 'uintBitsToFloat(texelFetch(uPrevSnap, t, 0).xy)' : 'cur'};`
    : `vec2 cur = aCur; uint word = aWord; vec2 prev = ${interp ? 'aPrev' : 'aCur'};`;
  return `#version 300 es
${tex ? 'uniform highp usampler2D uSnap; uniform highp usampler2D uPrevSnap;' : 'layout(location=0) in vec2 aCur; layout(location=1) in uint aWord; layout(location=2) in vec2 aPrev;'}
uniform vec2 uCam, uRes;
uniform float uPpt, uAlpha, uSize;
uniform int uFirst;
flat out uint vWord;
out vec2 vQ;
void main() {
  ${src}
  vec2 p = ${interp ? 'mix(prev, cur, uAlpha)' : 'cur'};
  vec2 px = floor((p - uCam) * uPpt + 0.5 * uRes) + 0.5;
  ${quad ? `vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0;
  px += corner * 0.5 * uSize; vQ = corner;` : 'gl_PointSize = uSize; vQ = vec2(0.0);'}
  gl_Position = vec4(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0, 0.0, 1.0);
  vWord = word;
}`;
}

function agentFS(quad) {
  return `#version 300 es
precision mediump float;
flat in uint vWord;
in vec2 vQ;
uniform highp float uSize;
uniform int uShape;
out vec4 o;
${PAL}
void main() {
  uint role = min(vWord & 3u, 2u);
  vec3 col = PAL[role];
  if (uShape == 1) {
    vec2 q = ${quad ? 'vQ' : 'gl_PointCoord * 2.0 - 1.0'};
    float d = role == 0u ? length(q) : role == 1u ? max(abs(q.x), abs(q.y)) : abs(q.x) + abs(q.y);
    if (d > 1.0) discard;
    if (d > 1.0 - 2.4 / uSize) col = vec3(0.08, 0.08, 0.1);
  }
  o = vec4(col, 1.0);
}`;
}

const SPLAT_FS = `#version 300 es
precision mediump float;
out vec4 o;
void main() { o = vec4(1.0); }`;

const FULL_VS = `#version 300 es
void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

const RESOLVE_FS = `#version 300 es
precision highp float;
uniform highp sampler2D uDen;
uniform vec2 uRes;
uniform float uMax;
out vec4 o;
void main() {
  ivec2 sz = textureSize(uDen, 0);
  vec2 f = gl_FragCoord.xy / uRes;
  float c = texelFetch(uDen, ivec2(f * vec2(sz)), 0).r;
  if (c <= 0.0) { o = vec4(0.06, 0.07, 0.10, 1.0); return; }
  float t = clamp(log(1.0 + c) / log(1.0 + uMax), 0.0, 1.0);
  o = vec4(mix(vec3(0.16, 0.23, 0.49), vec3(0.97, 0.79, 0.28), t) + vec3(t * t * 0.3), 1.0);
}`;

const MESH_VS = `#version 300 es
layout(location=0) in vec2 aPos; layout(location=1) in vec4 aCol;
uniform vec2 uRes; out vec4 vCol;
void main() { vCol = aCol; gl_Position = vec4(aPos.x / uRes.x * 2.0 - 1.0, 1.0 - aPos.y / uRes.y * 2.0, 0.0, 1.0); }`;
const MESH_FS = `#version 300 es
precision mediump float; in vec4 vCol; out vec4 o; void main() { o = vCol; }`;

const SEG_VS = `#version 300 es
layout(location=0) in vec4 aSeg; layout(location=1) in float aW; layout(location=2) in vec4 aCol;
uniform vec2 uRes; out vec4 vCol;
void main() {
  vec2 a = aSeg.xy, b = aSeg.zw, d = b - a;
  float l = length(d);
  vec2 dir = l > 0.0 ? d / l : vec2(1.0, 0.0), nrm = vec2(-dir.y, dir.x);
  float s = float(gl_VertexID & 1), t = float(gl_VertexID >> 1) * 2.0 - 1.0;
  vec2 p = mix(a, b, s) + nrm * t * aW + dir * (s * 2.0 - 1.0) * aW;
  vCol = aCol;
  gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
}`;

function compile(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src);
    gl.attachShader(p, s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < nu; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}

export function initGL(canvas, w = 1920, h = 1080) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  const R = { gl, w, h };
  R.timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  R.floatTarget = !!gl.getExtension('EXT_color_buffer_float');
  R.floatBlend = !!gl.getExtension('EXT_float_blend');
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  R.renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  R.progs = {};
  for (const quad of [false, true]) for (const interp of [false, true]) for (const tex of [false, true]) {
    R.progs[`${quad ? 'quads' : 'points'}${interp ? '+i' : ''}${tex ? '+tex' : ''}`] = compile(gl, agentVS({ quad, interp, tex }), agentFS(quad));
  }
  R.progs.splat = compile(gl, agentVS({ quad: false, interp: false, tex: false }), SPLAT_FS);
  R.progs.resolve = compile(gl, FULL_VS, RESOLVE_FS);
  R.progs.mesh = compile(gl, MESH_VS, MESH_FS);
  R.progs.seg = compile(gl, SEG_VS, MESH_FS);
  R.fbo = makeTarget(gl, w, h, gl.RGBA8);
  R.emptyVao = gl.createVertexArray();
  return R;
}

export function makeTarget(gl, w, h, fmt) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fb, tex, w, h, ok };
}

// Snapshot buffers: interleaved 12-byte records (f32 x, f32 y, u32 word).
export function makeAgentBuffer(R, bytes, data) {
  const gl = R.gl, b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  if (data) gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  else gl.bufferData(gl.ARRAY_BUFFER, bytes, gl.DYNAMIC_DRAW);
  return b;
}

export function makeAgentVao(R, cur, prev, divisor) {
  return makeVao(R, { cur, prev: prev || cur, divisor });
}

// Visible-subset records carry both endpoints: f32 prevX, prevY, curX, curY, u32 word = 20 bytes.
export function makeVao(R, { cur, prev = cur, stride = 12, offCur = 0, offWord = 8, offPrev = 0, divisor = 0 }) {
  const gl = R.gl, vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, cur);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, offCur);
  gl.vertexAttribDivisor(0, divisor);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribIPointer(1, 1, gl.UNSIGNED_INT, stride, offWord);
  gl.vertexAttribDivisor(1, divisor);
  gl.bindBuffer(gl.ARRAY_BUFFER, prev);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, offPrev);
  gl.vertexAttribDivisor(2, divisor);
  gl.bindVertexArray(null);
  return vao;
}

// RGB32UI texture holding the same 12-byte records; the shader reinterprets x,y with uintBitsToFloat.
export function makeSnapTexture(R, n) {
  const gl = R.gl, t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB32UI, TW, Math.ceil(n / TW));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return t;
}

export function uploadSnapTexture(R, tex, u32, n) {
  const gl = R.gl, rows = Math.floor(n / TW), rest = n - rows * TW;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  if (rows) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TW, rows, gl.RGB_INTEGER, gl.UNSIGNED_INT, u32, 0);
  if (rest) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, rows, rest, 1, gl.RGB_INTEGER, gl.UNSIGNED_INT, u32, rows * TW * 3);
}

// view: { cam: [x, y] tiles, ppt: device px per tile }; target defaults to the 1080p FBO.
export function drawAgents(R, o) {
  const gl = R.gl, t = o.target || R.fbo;
  const quad = o.prim === 'quads';
  const name = `${quad ? 'quads' : 'points'}${o.interp ? '+i' : ''}${o.tex ? '+tex' : ''}`;
  const pr = o.splat ? R.progs.splat : R.progs[name];
  gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
  gl.viewport(0, 0, t.w, t.h);
  gl.useProgram(pr.p);
  const scale = t.w / R.w;
  gl.uniform2f(pr.u.uCam, o.view.cam[0], o.view.cam[1]);
  gl.uniform2f(pr.u.uRes, t.w, t.h);
  gl.uniform1f(pr.u.uPpt, o.view.ppt * scale);
  gl.uniform1f(pr.u.uAlpha, o.alpha ?? 0.5);
  gl.uniform1f(pr.u.uSize, o.splat ? 1 : o.size);
  if (pr.u.uShape) gl.uniform1i(pr.u.uShape, o.size >= 4 ? 1 : 0);
  if (o.tex) {
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, o.tex);
    gl.uniform1i(pr.u.uSnap, 0);
    if (pr.u.uPrevSnap) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, o.prevTex || o.tex); gl.uniform1i(pr.u.uPrevSnap, 1); }
    gl.bindVertexArray(R.emptyVao);
  } else gl.bindVertexArray(o.vao);
  if (o.splat) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); }
  const ranges = o.ranges || [[o.first || 0, o.n]];
  // WebGL2 has no base instance, so offset instanced ranges only work through texture pulling.
  for (const [first, count] of ranges) {
    if (o.tex) {
      gl.uniform1i(pr.u.uFirst, first);
      if (quad) gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
      else gl.drawArrays(gl.POINTS, 0, count);
    } else if (quad) {
      if (first) throw new Error('instanced ranges need texture pulling');
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    } else gl.drawArrays(gl.POINTS, first, count);
  }
  if (o.splat) gl.disable(gl.BLEND);
  gl.bindVertexArray(null);
}

export function clearTarget(R, t, r = 0.06, g = 0.07, b = 0.1) {
  const gl = R.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, (t || R.fbo).fb);
  gl.viewport(0, 0, (t || R.fbo).w, (t || R.fbo).h);
  gl.clearColor(r, g, b, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

export function resolveDensity(R, den, maxCount, target) {
  const gl = R.gl, t = target || R.fbo, pr = R.progs.resolve;
  gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
  gl.viewport(0, 0, t.w, t.h);
  gl.useProgram(pr.p);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, den);
  gl.uniform1i(pr.u.uDen, 0);
  gl.uniform2f(pr.u.uRes, t.w, t.h);
  gl.uniform1f(pr.u.uMax, maxCount);
  gl.bindVertexArray(R.emptyVao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
}

export function blitToCanvas(R, t) {
  const gl = R.gl, s = t || R.fbo;
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, s.fb);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  gl.blitFramebuffer(0, 0, s.w, s.h, 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
}

// Country scene stand-in: a gw×gh-cell mesh, settlement squares and route segments.
export function makeCountry(R, gw, gh, nSettle, nSeg, seed = 7) {
  const gl = R.gl;
  let s = seed;
  const rnd = () => ((s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x6d2b79f5 | 0) >>> 0) / 4294967296;
  const vx = (gw + 1) * (gh + 1);
  const pos = new Float32Array(vx * 2), col = new Uint8Array(vx * 4);
  for (let y = 0; y <= gh; y++) for (let x = 0; x <= gw; x++) {
    const i = y * (gw + 1) + x;
    pos[2 * i] = x / gw * R.w; pos[2 * i + 1] = y / gh * R.h;
    const e = rnd();
    col.set(e < 0.3 ? [40, 80, 140, 255] : [70 + e * 60, 120 + e * 40, 60, 255], 4 * i);
  }
  const idx = new Uint32Array(gw * gh * 6);
  let k = 0;
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const a = y * (gw + 1) + x, b = a + 1, c = a + gw + 1, d = c + 1;
    idx.set([a, b, c, b, d, c], k); k += 6;
  }
  const mesh = gl.createVertexArray();
  gl.bindVertexArray(mesh);
  const pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const cb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cb); gl.bufferData(gl.ARRAY_BUFFER, col, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, 0, 0);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  const nInst = nSettle + nSeg;
  const seg = new Float32Array(nInst * 9);
  const sx = new Float32Array(nSettle), sy = new Float32Array(nSettle);
  const cols = Math.ceil(Math.sqrt(nSettle * R.w / R.h)), rows = Math.ceil(nSettle / cols);
  const dx = R.w / cols, dy = R.h / rows;
  for (let i = 0; i < nSettle; i++) {
    sx[i] = (i % cols + 0.2 + 0.6 * rnd()) * dx; sy[i] = (Math.floor(i / cols) + 0.2 + 0.6 * rnd()) * dy;
    const size = 1.5 + 4 * Math.pow(rnd(), 6);
    seg.set([sx[i], sy[i], sx[i], sy[i], size, 0.95, 0.9, 0.8, 1], i * 9);
  }
  // Routes join grid neighbours, so edges are short, as on a real road graph.
  for (let j = 0; j < nSeg; j++) {
    const a = (rnd() * nSettle) | 0;
    let b = rnd() < 0.5 && a % cols < cols - 1 ? a + 1 : a + cols;
    if (b >= nSettle) b = a > 0 ? a - 1 : a + 1;
    const vol = Math.pow(rnd(), 3);
    seg.set([sx[a], sy[a], sx[b], sy[b], 0.5 + vol * 3, 0.9, 0.4 + vol * 0.4, 0.2, 0.9], (nSettle + j) * 9);
  }
  const inst = gl.createVertexArray();
  gl.bindVertexArray(inst);
  const sb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, sb); gl.bufferData(gl.ARRAY_BUFFER, seg, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 36, 0); gl.vertexAttribDivisor(0, 1);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 36, 16); gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 36, 20); gl.vertexAttribDivisor(2, 1);
  gl.bindVertexArray(null);
  return { mesh, nIdx: idx.length, inst, nInst, tris: gw * gh * 2 };
}

export function drawCountry(R, c, target) {
  const gl = R.gl, t = target || R.fbo;
  gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
  gl.viewport(0, 0, t.w, t.h);
  gl.useProgram(R.progs.mesh.p);
  gl.uniform2f(R.progs.mesh.u.uRes, R.w, R.h);
  gl.bindVertexArray(c.mesh);
  gl.drawElements(gl.TRIANGLES, c.nIdx, gl.UNSIGNED_INT, 0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(R.progs.seg.p);
  gl.uniform2f(R.progs.seg.u.uRes, R.w, R.h);
  gl.bindVertexArray(c.inst);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, c.nInst);
  gl.disable(gl.BLEND);
  gl.bindVertexArray(null);
}

const nextTask = () => new Promise((r) => setTimeout(r, 0));

// Times fn() with GPU timer queries, batch draws per task, and returns per-sample GPU and CPU ms.
export async function timeGL(R, fn, { warm = 10, samples = 60, batch = 10 } = {}) {
  const gl = R.gl, ext = R.timer;
  for (let i = 0; i < warm; i++) fn(i);
  gl.finish();
  const gpu = [], cpu = [];
  let done = 0;
  while (done < samples) {
    const qs = [];
    for (let b = 0; b < batch && done + qs.length < samples; b++) {
      const q = ext ? gl.createQuery() : null;
      const t0 = performance.now();
      if (q) gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
      fn(done + b);
      if (q) gl.endQuery(ext.TIME_ELAPSED_EXT);
      cpu.push(performance.now() - t0);
      qs.push(q);
    }
    gl.flush();
    for (const q of qs) {
      if (!q) continue;
      let spins = 0;
      while (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) { await nextTask(); if (++spins > 2000) break; }
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
      gpu.push(disjoint ? NaN : gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(q);
    }
    done += qs.length;
    await nextTask();
  }
  return { gpu: gpu.filter((x) => !Number.isNaN(x)), cpu };
}

// End-to-end cost with a 1-pixel readPixels after each call, which blocks until the GPU is done.
export function timeSynced(R, fn, { warm = 5, samples = 30 } = {}) {
  const gl = R.gl, px = new Uint8Array(4), out = [];
  for (let i = 0; i < warm + samples; i++) {
    const t0 = performance.now();
    fn(i);
    gl.bindFramebuffer(gl.FRAMEBUFFER, R.fbo.fb);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    if (i >= warm) out.push(performance.now() - t0);
  }
  return out;
}
