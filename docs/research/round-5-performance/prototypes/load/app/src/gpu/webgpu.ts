// WebGPU compute path for agent movement (lazy, only where navigator.gpu exists).
const WGSL = `struct P { pos: vec2f, tgt: vec2f };
@group(0) @binding(0) var<storage, read_write> a: array<P>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x; if (i >= arrayLength(&a)) { return; }
  let d = a[i].tgt - a[i].pos; let l = length(d); if (l > 1.0) { a[i].pos += d / l; }
}`;
export async function createGpuSim(n: number) {
  const nav = navigator as any; if (!nav.gpu) return null; const adapter = await nav.gpu.requestAdapter(); if (!adapter) return null;
  const device = await adapter.requestDevice(); const buf = device.createBuffer({ size: n * 16, usage: 0x80 | 0x8 | 0x4 });
  const pipe = device.createComputePipeline({ layout: 'auto', compute: { module: device.createShaderModule({ code: WGSL }), entryPoint: 'main' } });
  const bg = device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: buf } }] });
  return { step() { const enc = device.createCommandEncoder(); const p = enc.beginComputePass(); p.setPipeline(pipe); p.setBindGroup(0, bg); p.dispatchWorkgroups(Math.ceil(n / 64)); p.end(); device.queue.submit([enc.finish()]); } };
}
