// One probe group per page load, chosen by ?g=. The result lands in window.__done for Playwright.
import { buildModule, prepare, timeKernels, LAYOUT } from '../wasmgen.mjs';

const q = new URLSearchParams(location.search);
const PAGE = 65536, MiB = 1 << 20, GiB = 1 << 30;
const err = (e) => `${e.name}: ${e.message}`;

function workerFromSource(src) {
  return new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
}

async function env() {
  const r = { ua: navigator.userAgent, crossOriginIsolated, isSecureContext };
  r.deviceMemory = 'deviceMemory' in navigator ? navigator.deviceMemory : null;
  r.hardwareConcurrency = navigator.hardwareConcurrency;
  const d = navigator.userAgentData;
  r.uaData = d ? { mobile: d.mobile, platform: d.platform, brands: d.brands.map((b) => `${b.brand} ${b.version}`) } : null;
  if (d && d.getHighEntropyValues) {
    try { r.uaHigh = await d.getHighEntropyValues(['architecture', 'bitness', 'model', 'platformVersion', 'wow64', 'formFactors']); } catch (e) { r.uaHigh = err(e); }
  }
  r.perfMemory = performance.memory
    ? { jsHeapSizeLimit: performance.memory.jsHeapSizeLimit, totalJSHeapSize: performance.memory.totalJSHeapSize, usedJSHeapSize: performance.memory.usedJSHeapSize }
    : null;
  r.pressureObserver = 'PressureObserver' in self ? { knownSources: PressureObserver.knownSources || null } : null;
  if ('getBattery' in navigator) {
    try { const b = await navigator.getBattery(); r.battery = { charging: b.charging, level: b.level, chargingTime: b.chargingTime, dischargingTime: b.dischargingTime }; } catch (e) { r.battery = err(e); }
  } else r.battery = null;
  r.hasGpu = 'gpu' in navigator;
  r.hasUASM = typeof performance.measureUserAgentSpecificMemory === 'function';
  try { r.storage = await navigator.storage.estimate(); } catch (e) { r.storage = err(e); }
  r.screen = { w: screen.width, h: screen.height, dpr: devicePixelRatio, coarse: matchMedia('(pointer: coarse)').matches };
  r.features = {
    sab: typeof SharedArrayBuffer === 'function',
    growableSab: typeof SharedArrayBuffer === 'function' && 'growable' in SharedArrayBuffer.prototype,
    resizableAb: 'resizable' in ArrayBuffer.prototype,
    toResizableBuffer: typeof WebAssembly.Memory.prototype.toResizableBuffer === 'function',
    atomicsWaitAsync: typeof Atomics.waitAsync === 'function',
    memory64: (() => { try { new WebAssembly.Memory({ address: 'i64', initial: 1n, maximum: 2n }); return true; } catch (e) { return err(e); } })(),
  };
  r.worker = await new Promise((resolve) => {
    const w = workerFromSource(`postMessage({ deviceMemory: 'deviceMemory' in navigator ? navigator.deviceMemory : null,
      hardwareConcurrency: navigator.hardwareConcurrency, crossOriginIsolated: self.crossOriginIsolated, gpu: 'gpu' in navigator })`);
    w.onmessage = (e) => resolve(e.data);
    w.onerror = (e) => resolve({ error: String(e.message) });
  });
  return r;
}

function alloc() {
  const kind = q.get('kind'), bytes = Number(q.get('bytes')), max = Number(q.get('max') || bytes), touch = Number(q.get('touch') || 0);
  const r = { kind, bytes, max, touch };
  const t0 = performance.now();
  let buf;
  try {
    if (kind === 'ab') buf = new ArrayBuffer(bytes);
    else if (kind === 'sab') buf = new SharedArrayBuffer(bytes);
    else if (kind === 'sabGrowable') buf = new SharedArrayBuffer(bytes, { maxByteLength: max });
    else if (kind === 'wasm') buf = new WebAssembly.Memory({ initial: bytes / PAGE, maximum: max / PAGE }).buffer;
    else if (kind === 'wasmNoMax') buf = new WebAssembly.Memory({ initial: bytes / PAGE }).buffer;
    else if (kind === 'wasmShared') buf = new WebAssembly.Memory({ initial: bytes / PAGE, maximum: max / PAGE, shared: true }).buffer;
    else if (kind === 'wasm64') buf = new WebAssembly.Memory({ address: 'i64', initial: BigInt(bytes / PAGE), maximum: BigInt(max / PAGE) }).buffer;
    else if (kind === 'wasm64Shared') buf = new WebAssembly.Memory({ address: 'i64', initial: BigInt(bytes / PAGE), maximum: BigInt(max / PAGE), shared: true }).buffer;
    else throw new Error(`unknown kind ${kind}`);
  } catch (e) { r.error = err(e); r.ms = performance.now() - t0; return r; }
  r.ms = performance.now() - t0;
  r.byteLength = buf.byteLength;
  if (touch) {
    const u8 = new Uint8Array(buf);
    const a = performance.now(); for (let i = 0; i < touch; i += 4096) u8[i] = 1; r.firstTouchMs = performance.now() - a;
    const b = performance.now(); for (let i = 0; i < touch; i += 4096) u8[i] = 2; r.secondTouchMs = performance.now() - b;
  }
  try { const v = new Int32Array(buf, buf.byteLength - 4096, 1024); v[1023] = 5; r.lastPageOk = v[1023] === 5; } catch (e) { r.lastPageOk = err(e); }
  window.__keep = buf;
  return r;
}

async function grow() {
  const r = {};
  {
    const m = new WebAssembly.Memory({ initial: 256, maximum: 1024 });
    const v = new Int32Array(m.buffer); v[0] = 42;
    const old = m.buffer; m.grow(1);
    r.nonShared = { oldByteLength: old.byteLength, viewLength: v.length };
  }
  {
    const m = new WebAssembly.Memory({ initial: 256, maximum: 65536, shared: true });
    const v = new Int32Array(m.buffer); v[0] = 42;
    const old = m.buffer; m.grow(256);
    const fresh = new Int32Array(m.buffer); v[1] = 5;
    r.shared = { oldByteLength: old.byteLength, viewLength: v.length, v0: v[0], newByteLength: m.buffer.byteLength, sameObject: old === m.buffer, oldWriteVisibleInNew: fresh[1] === 5 };
    const b1 = m.buffer; m.grow(0); r.sharedGrow0SameObject = b1 === m.buffer;
  }
  r.worker = await new Promise((resolve) => {
    const m = new WebAssembly.Memory({ initial: 256, maximum: 4096, shared: true });
    const ctl = new Int32Array(new SharedArrayBuffer(16));
    new Int32Array(m.buffer)[0] = 42;
    const w = workerFromSource(`onmessage = (e) => { const { m, ctl } = e.data; const v = new Int32Array(m.buffer);
      Atomics.store(ctl, 0, 1); Atomics.notify(ctl, 0); Atomics.wait(ctl, 1, 0);
      const fresh = new Int32Array(m.buffer); fresh[fresh.length - 1] = 123;
      postMessage({ oldViewLength: v.length, oldV0: v[0], newByteLength: m.buffer.byteLength }); };`);
    w.onmessage = (e) => { const mv = new Int32Array(m.buffer); resolve({ ...e.data, mainSeesWorkerWrite: mv[mv.length - 1] === 123 }); };
    w.onerror = (e) => resolve({ error: String(e.message) });
    w.postMessage({ m, ctl });
    const poll = () => {
      if (Atomics.load(ctl, 0) === 1) { m.grow(256); Atomics.store(ctl, 1, 1); Atomics.notify(ctl, 1); } else setTimeout(poll, 1);
    };
    poll();
  });
  try {
    const s = new SharedArrayBuffer(16 * MiB, { maxByteLength: GiB });
    const t = new Int32Array(s); s.grow(32 * MiB);
    r.growableSab = { growable: s.growable, trackingLength: t.length, byteLength: s.byteLength };
  } catch (e) { r.growableSab = err(e); }
  if (typeof WebAssembly.Memory.prototype.toResizableBuffer === 'function') {
    const m = new WebAssembly.Memory({ initial: 256, maximum: 4096, shared: true });
    const rb = m.toResizableBuffer(); const lt = new Int32Array(rb); const before = lt.length; m.grow(256);
    r.rabShared = { isSAB: rb instanceof SharedArrayBuffer, growable: rb.growable, maxByteLength: rb.maxByteLength, before, after: lt.length, sameObject: m.buffer === rb };
    const p = new WebAssembly.Memory({ initial: 256, maximum: 4096 });
    const prb = p.toResizableBuffer(); const plt = new Int32Array(prb); p.grow(256);
    r.rabNonShared = { resizable: prb.resizable, detached: prb.detached, after: plt.length };
  } else r.rab = 'toResizableBuffer not available';
  {
    const m = new WebAssembly.Memory({ initial: 256, maximum: 16384, shared: true });
    const t = performance.now(); m.grow(16384 - 256); r.sharedGrowTo1GiBMs = performance.now() - t;
  }
  return r;
}

function growcost() {
  const r = {};
  for (const shared of [true, false]) {
    const m = new WebAssembly.Memory({ initial: 256, maximum: 16384, shared });
    const steps = [];
    for (let k = 0; k < 15; k++) { const t = performance.now(); m.grow(1024); steps.push(performance.now() - t); }
    steps.sort((x, y) => x - y);
    r[shared ? 'shared' : 'nonShared'] = { stepMiB: 64, medianMs: steps[7], minMs: steps[0], maxMs: steps[14], totalMs: steps.reduce((x, y) => x + y, 0) };
  }
  return r;
}

function mem64() {
  const out = { rows: [] };
  const pages = LAYOUT.bytes / PAGE;
  for (const [label, is64, shared] of [['mem32', false, false], ['mem32 shared', false, true], ['mem64', true, false], ['mem64 shared', true, true]]) {
    try {
      const desc = is64 ? { address: 'i64', initial: BigInt(pages), maximum: BigInt(pages), shared } : { initial: pages, maximum: pages, shared };
      const mem = new WebAssembly.Memory(desc);
      const inst = new WebAssembly.Instance(new WebAssembly.Module(buildModule(is64, shared, pages, pages)), { env: { mem } });
      out.rows.push({ label, ...timeKernels(prepare(mem, inst, is64, 0)) });
    } catch (e) { out.rows.push({ label, error: err(e) }); }
  }
  return out;
}

async function gpu() {
  const r = {};
  if ('gpu' in navigator) {
    for (const pp of ['default', 'high-performance', 'low-power']) {
      try {
        const a = await navigator.gpu.requestAdapter(pp === 'default' ? undefined : { powerPreference: pp });
        if (!a) { r[pp] = null; continue; }
        const i = a.info;
        const info = i ? { vendor: i.vendor, architecture: i.architecture, device: i.device, description: i.description, isFallbackAdapter: i.isFallbackAdapter, subgroupMinSize: i.subgroupMinSize, subgroupMaxSize: i.subgroupMaxSize } : null;
        const limits = {};
        for (const k in a.limits) limits[k] = a.limits[k];
        r[pp] = { info, features: [...a.features].sort(), limits };
      } catch (e) { r[pp] = err(e); }
    }
    try {
      const a = await navigator.gpu.requestAdapter();
      if (a) {
        const d = await a.requestDevice();
        r.deviceDefault = { maxBufferSize: d.limits.maxBufferSize, maxStorageBufferBindingSize: d.limits.maxStorageBufferBindingSize };
        const a2 = await navigator.gpu.requestAdapter();
        const d2 = await a2.requestDevice({ requiredLimits: { maxBufferSize: a2.limits.maxBufferSize, maxStorageBufferBindingSize: a2.limits.maxStorageBufferBindingSize } });
        r.deviceMax = { maxBufferSize: d2.limits.maxBufferSize, maxStorageBufferBindingSize: d2.limits.maxStorageBufferBindingSize };
        d2.pushErrorScope('out-of-memory'); d2.pushErrorScope('validation');
        const b = d2.createBuffer({ size: 256 * MiB, usage: GPUBufferUsage.STORAGE });
        const ve = await d2.popErrorScope(); const oe = await d2.popErrorScope();
        r.buffer256MiB = { validation: ve ? ve.message : null, oom: oe ? oe.message : null };
        b.destroy();
        d.destroy();
        r.lostReasonAfterDestroy = await Promise.race([d.lost.then((x) => x.reason), new Promise((res) => setTimeout(() => res('timeout'), 2000))]);
        d2.destroy();
      }
    } catch (e) { r.device = err(e); }
  }
  const gl = document.getElementById('c').getContext('webgl2');
  if (gl) {
    const P = ['MAX_TEXTURE_SIZE', 'MAX_3D_TEXTURE_SIZE', 'MAX_ARRAY_TEXTURE_LAYERS', 'MAX_RENDERBUFFER_SIZE', 'MAX_VIEWPORT_DIMS',
      'MAX_VERTEX_ATTRIBS', 'MAX_UNIFORM_BLOCK_SIZE', 'MAX_SAMPLES', 'MAX_DRAW_BUFFERS', 'MAX_COLOR_ATTACHMENTS', 'MAX_TEXTURE_IMAGE_UNITS',
      'MAX_COMBINED_TEXTURE_IMAGE_UNITS', 'MAX_ELEMENTS_VERTICES', 'MAX_ELEMENT_INDEX', 'RENDERER', 'VENDOR', 'VERSION'];
    const w = {};
    for (const p of P) { const v = gl.getParameter(gl[p]); w[p] = v && typeof v === 'object' ? Array.from(v) : v; }
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) { w.UNMASKED_VENDOR = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL); w.UNMASKED_RENDERER = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL); }
    else w.debugRendererInfo = 'unavailable';
    r.webgl2 = w;
  } else r.webgl2 = null;
  return r;
}

async function uasm() {
  if (typeof performance.measureUserAgentSpecificMemory !== 'function') return { unavailable: true, crossOriginIsolated };
  const m = async () => {
    const t = performance.now();
    const x = await performance.measureUserAgentSpecificMemory();
    return { bytes: x.bytes, ms: performance.now() - t,
      breakdown: x.breakdown.filter((b) => b.bytes > 0).map((b) => ({ bytes: b.bytes, types: b.types, scope: b.attribution.map((a) => a.scope) })) };
  };
  const r = { baseline: await m() };
  const mem = new WebAssembly.Memory({ initial: 16384, maximum: 16384, shared: true });
  r.after1GiBSharedUntouched = await m();
  const u8 = new Uint8Array(mem.buffer);
  for (let i = 0; i < 256 * MiB; i += 4096) u8[i] = 1;
  r.after256MiBTouched = await m();
  const ab = new ArrayBuffer(512 * MiB);
  r.afterPlain512MiBArrayBuffer = await m();
  window.__keep = [mem, ab];
  return r;
}

function probe() {
  return new Promise((resolve) => {
    const w = new Worker('./probe-worker.mjs', { type: 'module' });
    w.onmessage = (e) => resolve({ rows: e.data });
    w.onerror = (e) => resolve({ error: String(e.message) });
  });
}

const groups = { env, alloc, grow, growcost, mem64, gpu, uasm, probe };
(async () => {
  try { window.__done = await groups[q.get('g')](); } catch (e) { window.__done = { fatal: err(e), stack: String(e.stack) }; }
})();
