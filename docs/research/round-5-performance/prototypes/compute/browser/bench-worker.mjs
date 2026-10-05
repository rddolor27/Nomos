import { runKernelSuite } from '../js/suite-kernels.mjs';
import { runMT } from '../js/mt-core.mjs';
import { runGcSuite } from '../js/gc-suite.mjs';
import { runAlgoSuite } from '../js/algo-suite.mjs';
import { mix32 } from '../js/common.mjs';
const log = (text) => postMessage({ type: 'log', text });
async function probe() {
  const r = { coi: self.crossOriginIsolated, sab: typeof SharedArrayBuffer !== 'undefined', hc: navigator.hardwareConcurrency };
  // timer resolution: smallest non-zero step of performance.now()
  let minStep = Infinity; for (let k = 0; k < 200; k++) { const a = performance.now(); let b; do { b = performance.now(); } while (b === a); minStep = Math.min(minStep, b - a); }
  r.timerStepUs = minStep * 1000;
  const simd = new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]);
  r.wasmSimd = WebAssembly.validate(simd);
  const relaxed = new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,15,1,13,0,65,1,253,15,65,2,253,15,253,128,2,11]);
  r.wasmRelaxedSimd = WebAssembly.validate(relaxed);
  r.webgpu = typeof navigator.gpu !== 'undefined';
  if (r.webgpu) {
    try {
      const ad = await navigator.gpu.requestAdapter();
      r.adapter = ad ? (ad.info ? { vendor: ad.info.vendor, arch: ad.info.architecture, desc: ad.info.description, fallback: ad.info.isFallbackAdapter } : 'yes') : null;
      if (ad) {
        const dev = await ad.requestDevice();
        const n = 1 << 20;
        const code = `@group(0) @binding(0) var<storage, read_write> d: array<u32>;
fn mix32(h0: u32) -> u32 { var h = h0; h ^= h >> 16u; h *= 0x7feb352du; h ^= h >> 15u; h *= 0x846ca68bu; h ^= h >> 16u; return h; }
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3<u32>) { let i = id.x; if (i < arrayLength(&d)) { d[i] = mix32(d[i] ^ mix32(i)); } }`;
        const mod = dev.createShaderModule({ code });
        const pipe = dev.createComputePipeline({ layout: 'auto', compute: { module: mod, entryPoint: 'main' } });
        const buf = dev.createBuffer({ size: n * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
        const rb = dev.createBuffer({ size: n * 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        const init = new Uint32Array(n); for (let i = 0; i < n; i++) init[i] = mix32(i * 7 + 1);
        const bg = dev.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: buf } }] });
        const times = [];
        let ok = null;
        for (let rep = 0; rep < 7; rep++) {
          dev.queue.writeBuffer(buf, 0, init);
          const t0 = performance.now();
          const enc = dev.createCommandEncoder(); const p = enc.beginComputePass(); p.setPipeline(pipe); p.setBindGroup(0, bg); p.dispatchWorkgroups(n / 64); p.end();
          enc.copyBufferToBuffer(buf, 0, rb, 0, n * 4); dev.queue.submit([enc.finish()]);
          await rb.mapAsync(GPUMapMode.READ); const outv = new Uint32Array(rb.getMappedRange().slice(0)); rb.unmap();
          times.push(performance.now() - t0);
          if (rep === 0) { ok = true; for (let i = 0; i < n; i++) if (outv[i] !== mix32(init[i] ^ mix32(i))) { ok = false; break; } }
        }
        times.sort((a, b) => a - b);
        r.webgpuU32HashMatchesJS = ok; r.webgpuRoundTripMs1M = { med: times[3], min: times[0], max: times[6] };
      }
    } catch (e) { r.webgpuError = String(e); }
  }
  return r;
}
onmessage = async (e) => {
  const { suite, quick } = e.data;
  try {
    let result;
    if (suite === 'kernels') { const [a, b] = await Promise.all(['../wasm/scalar.wasm', '../wasm/simd.wasm'].map((u) => fetch(u).then((r) => r.arrayBuffer()))); result = await runKernelSuite({ scalarBytes: new Uint8Array(a), simdBytes: new Uint8Array(b), log, quick }); }
    else if (suite === 'mt') {
      const spawnHelper = (S, w) => new Promise((resolve) => { const wk = new Worker('./mt-helper-browser.mjs', { type: 'module' }); let doneRes; const done = new Promise((r) => (doneRes = r));
        wk.onmessage = (m) => { if (m.data === 'ready') resolve({ wk, done }); if (m.data === 'exit') { wk.terminate(); doneRes(); } }; wk.onerror = (er) => log('helper error ' + er.message); wk.postMessage({ S, w }); });
      result = await runMT({ log, spawnHelper, sizes: quick ? [10000] : [10000, 25000, 100000], ticks: quick ? 10 : 40, runs: quick ? 3 : 6 });
    }
    else if (suite === 'gc') result = await runGcSuite({ log });
    else if (suite === 'algo') result = await runAlgoSuite({ log, quick });
    else if (suite === 'probe') result = await probe();
    result.env = Object.assign(result.env || {}, { ua: navigator.userAgent, coi: self.crossOriginIsolated, hc: navigator.hardwareConcurrency });
    postMessage({ type: 'result', result });
  } catch (err) { postMessage({ type: 'error', error: String((err && err.stack) || err) }); }
};
