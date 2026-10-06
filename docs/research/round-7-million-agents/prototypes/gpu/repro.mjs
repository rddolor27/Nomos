// Minimal dawn.node crash repro: one trivial kernel over n u32, many submits.
// Usage: node repro.mjs [n=100000] [ticks=200] [await=1] [mode=plain|wbuf|enc]
import { create, globals } from 'webgpu';
Object.assign(globalThis, globals);
const arg = (k, d) => { const a = process.argv.find((s) => s.startsWith(k + '=')); return a ? a.slice(k.length + 1) : d; };
const n = Number(arg('n', '100000')), T = Number(arg('ticks', '200')), AW = arg('await', '1') === '1', mode = arg('mode', 'plain');
const gpu = create([]);
const adapter = await gpu.requestAdapter();
const device = await adapter.requestDevice();
const code = `
@group(0) @binding(0) var<uniform> t: vec4<u32>;
@group(0) @binding(1) var<storage, read_write> a: array<u32>;
@compute @workgroup_size(256) fn main(@builtin(global_invocation_id) g: vec3<u32>) { if (g.x < arrayLength(&a)) { a[g.x] = a[g.x] * 3u + t.x; } }`;
const pipe = device.createComputePipeline({ layout: 'auto', compute: { module: device.createShaderModule({ code }), entryPoint: 'main' } });
const buf = device.createBuffer({ size: 4 * n, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
const ub = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
const bg = device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: ub } }, { binding: 1, resource: { buffer: buf } }] });
const u = new Uint32Array(4);
for (let k = 1; k <= T; k++) {
  if (mode !== 'plain') { u[0] = k; device.queue.writeBuffer(ub, 0, u); }
  const enc = device.createCommandEncoder();
  const passes = mode === 'enc' ? 5 : 1;
  for (let p = 0; p < passes; p++) { const cp = enc.beginComputePass(); cp.setPipeline(pipe); cp.setBindGroup(0, bg); cp.dispatchWorkgroups(Math.ceil(n / 256)); cp.end(); }
  device.queue.submit([enc.finish()]);
  if (AW) await device.queue.onSubmittedWorkDone();
  if (k % 50 === 0) console.log('tick', k);
}
await device.queue.onSubmittedWorkDone();
console.log('ok');
process.exit(0);
