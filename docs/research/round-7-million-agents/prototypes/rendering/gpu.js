// WebGPU pieces: vertex pulling from storage buffers, compute density bins, upload paths.
const WGSL = /* wgsl */ `
struct U { cam: vec2f, res: vec2f, ppt: f32, alpha: f32, size: f32, shape: u32, first: u32, bw: u32, bh: u32, n: u32 };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> snap: array<u32>;
@group(0) @binding(2) var<storage, read> prev: array<u32>;
override INTERP: bool = false;

struct VO { @builtin(position) pos: vec4f, @location(0) q: vec2f, @location(1) @interpolate(flat) word: u32 };

fn agentPx(i: u32) -> vec2f {
  var p = vec2f(bitcast<f32>(snap[3u * i]), bitcast<f32>(snap[3u * i + 1u]));
  if (INTERP) { p = mix(vec2f(bitcast<f32>(prev[3u * i]), bitcast<f32>(prev[3u * i + 1u])), p, u.alpha); }
  return floor((p - u.cam) * u.ppt + 0.5 * u.res) + 0.5;
}

fn toClip(px: vec2f) -> vec4f { return vec4f(px.x / u.res.x * 2.0 - 1.0, 1.0 - px.y / u.res.y * 2.0, 0.0, 1.0); }

@vertex fn vsQuad(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VO {
  let i = ii + u.first;
  let corner = vec2f(f32(vi & 1u), f32(vi >> 1u)) * 2.0 - 1.0;
  var o: VO;
  o.pos = toClip(agentPx(i) + corner * 0.5 * u.size);
  o.q = corner;
  o.word = snap[3u * i + 2u];
  return o;
}

@vertex fn vsPoint(@builtin(vertex_index) vi: u32) -> VO {
  let i = vi + u.first;
  var o: VO;
  o.pos = toClip(agentPx(i));
  o.q = vec2f(0.0);
  o.word = snap[3u * i + 2u];
  return o;
}

@fragment fn fs(v: VO) -> @location(0) vec4f {
  let role = min(v.word & 3u, 2u);
  var col = select(select(vec3f(0.157, 0.227, 0.486), vec3f(0.165, 0.616, 0.561), role == 1u), vec3f(0.969, 0.788, 0.282), role == 0u);
  if (u.shape == 1u) {
    let q = v.q;
    let d = select(select(abs(q.x) + abs(q.y), max(abs(q.x), abs(q.y)), role == 1u), length(q), role == 0u);
    if (d > 1.0) { discard; }
    if (d > 1.0 - 2.4 / u.size) { col = vec3f(0.08, 0.08, 0.1); }
  }
  return vec4f(col, 1.0);
}

@group(0) @binding(3) var<storage, read_write> bins: array<atomic<u32>>;

@compute @workgroup_size(256) fn binAgents(@builtin(global_invocation_id) g: vec3u) {
  let i = g.x;
  if (i >= u.n) { return; }
  let p = vec2f(bitcast<f32>(snap[3u * i]), bitcast<f32>(snap[3u * i + 1u]));
  let px = (p - u.cam) * u.ppt + 0.5 * u.res;
  let b = vec2i(floor(px * vec2f(f32(u.bw), f32(u.bh)) / u.res));
  if (b.x < 0 || b.y < 0 || b.x >= i32(u.bw) || b.y >= i32(u.bh)) { return; }
  atomicAdd(&bins[u32(b.y) * u.bw + u32(b.x)], 1u);
}
`;

const RESOLVE = /* wgsl */ `
struct R { bw: u32, bh: u32, w: f32, h: f32, maxc: f32 };
@group(0) @binding(0) var<uniform> r: R;
@group(0) @binding(1) var<storage, read> bins: array<u32>;
@vertex fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32((vi << 1u) & 2u), f32(vi & 2u));
  return vec4f(p * 2.0 - 1.0, 0.0, 1.0);
}
@fragment fn fs(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  let bx = min(u32(fc.x / r.w * f32(r.bw)), r.bw - 1u);
  let by = min(u32(fc.y / r.h * f32(r.bh)), r.bh - 1u);
  let c = f32(bins[by * r.bw + bx]);
  if (c <= 0.0) { return vec4f(0.06, 0.07, 0.10, 1.0); }
  let t = clamp(log(1.0 + c) / log(1.0 + r.maxc), 0.0, 1.0);
  return vec4f(mix(vec3f(0.16, 0.23, 0.49), vec3f(0.97, 0.79, 0.28), t) + vec3f(t * t * 0.3), 1.0);
}`;

export async function initGPU(w = 1920, h = 1080, canvas = null) {
  const adapter = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('no webgpu adapter');
  const ts = adapter.features.has('timestamp-query');
  const device = await adapter.requestDevice({
    requiredFeatures: ts ? ['timestamp-query'] : [],
    requiredLimits: { maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize, maxBufferSize: adapter.limits.maxBufferSize },
  });
  const G = { device, adapter, w, h, ts, info: adapter.info || {} };
  G.format = 'rgba8unorm';
  G.target = device.createTexture({ size: [w, h], format: G.format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
  G.targetView = G.target.createView();
  if (canvas) {
    G.ctx = canvas.getContext('webgpu');
    G.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    G.ctx.configure({ device, format: G.canvasFormat, alphaMode: 'opaque' });
  }
  const module = device.createShaderModule({ code: WGSL });
  G.ubuf = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const layout = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
    { binding: 2, visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
  ] });
  G.layout = layout;
  const pl = device.createPipelineLayout({ bindGroupLayouts: [layout] });
  G.pipes = {};
  const mk = (fmt) => {
    const out = {};
    for (const interp of [false, true]) {
      const constants = { INTERP: interp ? 1 : 0 };
      out[`quads${interp ? '+i' : ''}`] = device.createRenderPipeline({ layout: pl,
        vertex: { module, entryPoint: 'vsQuad', constants }, fragment: { module, entryPoint: 'fs', targets: [{ format: fmt }] },
        primitive: { topology: 'triangle-strip' } });
      out[`points${interp ? '+i' : ''}`] = device.createRenderPipeline({ layout: pl,
        vertex: { module, entryPoint: 'vsPoint', constants }, fragment: { module, entryPoint: 'fs', targets: [{ format: fmt }] },
        primitive: { topology: 'point-list' } });
    }
    return out;
  };
  G.pipes = mk(G.format);
  if (canvas) G.canvasPipes = mk(G.canvasFormat);
  const binLayout = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
    { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
  ] });
  G.binLayout = binLayout;
  G.binPipe = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [binLayout] }), compute: { module, entryPoint: 'binAgents' } });
  const rmod = device.createShaderModule({ code: RESOLVE });
  G.resolvePipe = device.createRenderPipeline({ layout: 'auto', vertex: { module: rmod, entryPoint: 'vs' }, fragment: { module: rmod, entryPoint: 'fs', targets: [{ format: G.format }] }, primitive: { topology: 'triangle-list' } });
  G.rubuf = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  if (ts) {
    G.qs = device.createQuerySet({ type: 'timestamp', count: 2 });
    G.qres = device.createBuffer({ size: 16, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC });
    G.qread = device.createBuffer({ size: 16, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  }
  return G;
}

export function makeSnapBuffer(G, bytes, data) {
  const b = G.device.createBuffer({ size: Math.ceil(bytes / 4) * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, mappedAtCreation: !!data });
  if (data) { new Uint8Array(b.getMappedRange()).set(new Uint8Array(data.buffer, data.byteOffset, bytes)); b.unmap(); }
  return b;
}

export function bindAgents(G, cur, prev) {
  return G.device.createBindGroup({ layout: G.layout, entries: [
    { binding: 0, resource: { buffer: G.ubuf } }, { binding: 1, resource: { buffer: cur } }, { binding: 2, resource: { buffer: prev || cur } }] });
}

function writeUniforms(G, o) {
  const a = new ArrayBuffer(64), f = new Float32Array(a), u = new Uint32Array(a);
  f[0] = o.view.cam[0]; f[1] = o.view.cam[1]; f[2] = G.w; f[3] = G.h;
  f[4] = o.view.ppt; f[5] = o.alpha ?? 0.5; f[6] = o.size || 1; u[7] = (o.size || 1) >= 4 ? 1 : 0;
  u[8] = o.first || 0; u[9] = o.bw || 0; u[10] = o.bh || 0; u[11] = o.n;
  G.device.queue.writeBuffer(G.ubuf, 0, a);
}

// Encodes one render pass drawing o.n agents; o.prim 'quads' (instanced strips) or 'points' (1 px).
export function encodeAgents(G, enc, o, timed = false, toCanvas = false) {
  const view = toCanvas ? G.ctx.getCurrentTexture().createView() : G.targetView;
  const pass = enc.beginRenderPass({
    colorAttachments: [{ view, loadOp: o.load ? 'load' : 'clear', storeOp: 'store', clearValue: { r: 0.06, g: 0.07, b: 0.1, a: 1 } }],
    ...(timed && G.ts ? { timestampWrites: { querySet: G.qs, beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1 } } : {}),
  });
  const pipes = toCanvas ? G.canvasPipes : G.pipes;
  pass.setPipeline(pipes[`${o.prim}${o.interp ? '+i' : ''}`]);
  pass.setBindGroup(0, o.bind);
  if (o.prim === 'quads') pass.draw(4, o.n); else pass.draw(o.n);
  pass.end();
}

export function setAgentUniforms(G, o) { writeUniforms(G, o); }

async function readTimestamp(G) {
  await G.qread.mapAsync(GPUMapMode.READ);
  const t = new BigUint64Array(G.qread.getMappedRange());
  const ms = Number(t[1] - t[0]) / 1e6;
  G.qread.unmap();
  return ms;
}

// GPU ms per pass from timestamps (if available) and wall ms per pass from a K-pass submit.
export async function timeGPU(G, encodeFn, { warm = 5, samples = 30, k = 10 } = {}) {
  const d = G.device;
  for (let i = 0; i < warm; i++) { const e = d.createCommandEncoder(); encodeFn(e, false); d.queue.submit([e.finish()]); }
  await d.queue.onSubmittedWorkDone();
  const gpu = [];
  if (G.ts) for (let s = 0; s < samples; s++) {
    const e = d.createCommandEncoder();
    encodeFn(e, true);
    e.resolveQuerySet(G.qs, 0, 2, G.qres, 0);
    e.copyBufferToBuffer(G.qres, 0, G.qread, 0, 16);
    d.queue.submit([e.finish()]);
    gpu.push(await readTimestamp(G));
  }
  const wall = [];
  for (let s = 0; s < Math.max(5, samples / 3); s++) {
    const t0 = performance.now();
    const e = d.createCommandEncoder();
    for (let j = 0; j < k; j++) encodeFn(e, false);
    d.queue.submit([e.finish()]);
    await d.queue.onSubmittedWorkDone();
    wall.push((performance.now() - t0) / k);
  }
  return { gpu, wall };
}

export function makeBins(G, bw, bh) {
  const bins = G.device.createBuffer({ size: bw * bh * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  return { bins, bw, bh };
}

export function encodeBins(G, enc, o, B, cur, timed = false) {
  const bind = G.device.createBindGroup({ layout: G.binLayout, entries: [
    { binding: 0, resource: { buffer: G.ubuf } }, { binding: 1, resource: { buffer: cur } }, { binding: 3, resource: { buffer: B.bins } }] });
  enc.clearBuffer(B.bins);
  const pass = enc.beginComputePass(timed && G.ts ? { timestampWrites: { querySet: G.qs, beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1 } } : {});
  pass.setPipeline(G.binPipe);
  pass.setBindGroup(0, bind);
  pass.dispatchWorkgroups(Math.ceil(o.n / 256));
  pass.end();
}

export function encodeResolve(G, enc, B, maxc) {
  const a = new ArrayBuffer(32), u = new Uint32Array(a), f = new Float32Array(a);
  u[0] = B.bw; u[1] = B.bh; f[2] = G.w; f[3] = G.h; f[4] = maxc;
  G.device.queue.writeBuffer(G.rubuf, 0, a);
  const bind = G.device.createBindGroup({ layout: G.resolvePipe.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: G.rubuf } }, { binding: 1, resource: { buffer: B.bins } }] });
  const pass = enc.beginRenderPass({ colorAttachments: [{ view: G.targetView, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
  pass.setPipeline(G.resolvePipe);
  pass.setBindGroup(0, bind);
  pass.draw(3);
  pass.end();
}

// Upload paths: queue.writeBuffer, or a mapped staging ring copied with copyBufferToBuffer.
export async function timeWriteBuffer(G, dst, data, samples = 20) {
  const d = G.device, cpu = [], done = [];
  for (let i = 0; i < samples + 3; i++) {
    const t0 = performance.now();
    d.queue.writeBuffer(dst, 0, data);
    const t1 = performance.now();
    await d.queue.onSubmittedWorkDone();
    if (i >= 3) { cpu.push(t1 - t0); done.push(performance.now() - t0); }
  }
  return { cpu, done };
}

export async function timeStaging(G, dst, data, samples = 20) {
  const d = G.device, bytes = data.byteLength, ring = [];
  for (let i = 0; i < 3; i++) ring.push(d.createBuffer({ size: bytes, usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC, mappedAtCreation: true }));
  const src = new Uint8Array(data.buffer, data.byteOffset, bytes);
  const cpu = [], done = [], pending = [null, null, null];
  for (let i = 0; i < samples + 3; i++) {
    const s = ring[i % 3];
    if (pending[i % 3]) await pending[i % 3];
    const t0 = performance.now();
    new Uint8Array(s.getMappedRange()).set(src);
    s.unmap();
    const e = d.createCommandEncoder();
    e.copyBufferToBuffer(s, 0, dst, 0, bytes);
    d.queue.submit([e.finish()]);
    const t1 = performance.now();
    await d.queue.onSubmittedWorkDone();
    if (i >= 3) { cpu.push(t1 - t0); done.push(performance.now() - t0); }
    pending[i % 3] = s.mapAsync(GPUMapMode.WRITE);
  }
  await Promise.all(pending);
  return { cpu, done };
}
