// Debug: move kernel only, one tick at a time, compared with the CPU move after every tick.
// Usage: node dbg-move.mjs [N=100000] [ticks=20]
import { create, globals } from 'webgpu';
import { makeLayout, makeArena, makeViews, buildWorld } from '../compute/world.mjs';
import * as K from '../compute/kernels.mjs';
import * as G from './kernels.wgsl.mjs';
Object.assign(globalThis, globals);
const arg = (k, d) => { const a = process.argv.find((s) => s.startsWith(k + '=')); return a ? a.slice(k.length + 1) : d; };
const N = Number(arg('N', '100000')), T = Number(arg('ticks', '20'));
const L = makeLayout(N), V = makeViews(makeArena(L).buffer, L);
buildWorld(V, L, 20261005); K.bind(V, L, 20261005);
const gpu = create([]);
const device = await (await gpu.requestAdapter()).requestDevice();
const U = GPUBufferUsage;
const mk = (ta) => { const c = new Uint8Array(Math.ceil(ta.byteLength / 4) * 4); c.set(new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength)); const b = device.createBuffer({ size: c.byteLength, usage: U.STORAGE | U.COPY_DST | U.COPY_SRC }); device.queue.writeBuffer(b, 0, c); return b; };
const attrA = new Uint32Array(N), metab = new Uint32Array(N);
for (let i = 0; i < N; i++) { attrA[i] = V.dest[i] | (V.dirC[i] << 8) | (V.speed[i] << 16) | (V.role[i] << 24); metab[i] = V.metab[i]; }
const b = { params: device.createBuffer({ size: 48, usage: U.UNIFORM | U.COPY_DST }), px: mk(V.px.slice()), py: mk(V.py.slice()), attrA: mk(attrA), metab: mk(metab), needZ: mk(V.needZ.slice()), flow: mk(V.flow.slice()),
  cell: device.createBuffer({ size: 4 * N, usage: U.STORAGE | U.COPY_SRC }), agg: device.createBuffer({ size: 16 * L.NC, usage: U.STORAGE | U.COPY_SRC | U.COPY_DST }) };
const pipe = device.createComputePipeline({ layout: 'auto', compute: { module: device.createShaderModule({ code: G.MOVE_KERNEL }), entryPoint: 'main' } });
const bg = device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: ['params', 'px', 'py', 'attrA', 'metab', 'needZ', 'flow', 'cell', 'agg'].map((k, i) => ({ binding: i, resource: { buffer: b[k] } })) });
const rb = async (src, bytes) => { const r = device.createBuffer({ size: bytes, usage: U.MAP_READ | U.COPY_DST }); const e = device.createCommandEncoder(); e.copyBufferToBuffer(src, 0, r, 0, bytes); device.queue.submit([e.finish()]); await r.mapAsync(GPUMapMode.READ); const c = new Uint8Array(bytes); c.set(new Uint8Array(r.getMappedRange())); r.unmap(); return c.buffer; };
const prm = new Uint32Array(12); prm[1] = N; prm[2] = L.W; prm[3] = L.CW; prm[4] = L.NC; prm[5] = L.NT;
console.log(`N=${N} W=${L.W} NC=${L.NC} NT=${L.NT} flow bytes=${V.flow.byteLength}`);
for (let t = 1; t <= T; t++) {
  prm[0] = t; device.queue.writeBuffer(b.params, 0, prm);
  const e = device.createCommandEncoder(); e.clearBuffer(b.agg);
  const p = e.beginComputePass(); p.setPipeline(pipe); p.setBindGroup(0, bg); p.dispatchWorkgroups(Math.ceil(N / 256)); p.end();
  console.log("submit", t); device.queue.submit([e.finish()]);
  await device.queue.onSubmittedWorkDone();
  console.log("gpu done", t);
  K.phaseMove(0, 1, t);
  console.log("cpu done", t);
  const gx = new Int32Array(await rb(b.px, 4 * N)), gy = new Int32Array(await rb(b.py, 4 * N)), ga = new Uint32Array(await rb(b.attrA, 4 * N));
  let dx = 0, dd = 0, oob = 0, first = -1;
  for (let i = 0; i < N; i++) {
    if (gx[i] !== V.px[i] || gy[i] !== V.py[i]) { dx++; if (first < 0) first = i; }
    if (((ga[i] >> 8) & 255) !== V.dirC[i]) dd++;
    if (gx[i] < 0 || gy[i] < 0 || gx[i] >= L.W * 256 || gy[i] >= L.W * 256) oob++;
  }
  console.log(`tick ${t}: pos diffs ${dx} dir diffs ${dd} out-of-map ${oob}` + (first >= 0 ? ` first i=${first} gpu=(${gx[first]},${gy[first]}) cpu=(${V.px[first]},${V.py[first]}) attr=${ga[first].toString(16)}` : ''));
}
process.exit(0);
