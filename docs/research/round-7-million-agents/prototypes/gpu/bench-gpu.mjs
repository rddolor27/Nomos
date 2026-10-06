// WebGPU (Dawn's Node bindings) against the CPU path on the same world: parity of state hashes after T ticks,
// then per-tick GPU time, per-pass timestamps, transfers and readback latency.
// Usage: node bench-gpu.mjs [sizes=100000,250000,1000000] [ticks=200] [adapter=<name>] [timing=1] [tag=run]
import { create, globals } from 'webgpu';
import { performance } from 'node:perf_hooks';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import { makeLayout, makeArena, makeViews, buildWorld, mix32, draw, CELL_BLOCK, RATE_H, EAT_T, FULL } from '../compute/world.mjs';
import * as K from '../compute/kernels.mjs';
import * as G from './kernels.wgsl.mjs';
import { envInfo, sampleBusy } from '../compute/env.mjs';

Object.assign(globalThis, globals);
const arg = (k, d) => { const a = process.argv.find((s) => s.startsWith(k + '=')); return a ? a.slice(k.length + 1) : d; };
const sizes = arg('sizes', '100000,250000,1000000').split(',').map(Number);
const T = Number(arg('ticks', '200'));
const adapterName = arg('adapter', '');
const TIMING = arg('timing', '1') === '1';
const tag = arg('tag', 'run');
const SKIP = arg('skip', '').split(',').filter(Boolean).map(Number);
const SEED = 20261005, seedH = mix32(SEED);
const now = () => performance.now();

const backend = arg('backend', '');
const gpuOpts = [];
if (adapterName) gpuOpts.push(`adapter=${adapterName}`);
if (backend) gpuOpts.push(`backend=${backend}`);
const gpu = create(gpuOpts);
const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
const hasTS = adapter.features.has('timestamp-query');
const device = await adapter.requestDevice({
  requiredFeatures: hasTS ? ['timestamp-query'] : [],
  requiredLimits: { maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize, maxBufferSize: adapter.limits.maxBufferSize },
});
let lost = null;
device.lost.then((i) => { lost = { reason: i.reason, message: i.message }; });
const errors = [];
device.onuncapturederror = (e) => errors.push(e.error.message);
const pkg = JSON.parse(readFileSync(new URL('./node_modules/webgpu/package.json', import.meta.url), 'utf8'));
const out = {
  env: envInfo(), webgpuNpm: pkg.version,
  adapter: { vendor: adapter.info.vendor, architecture: adapter.info.architecture, device: adapter.info.device, description: adapter.info.description, isFallbackAdapter: adapter.info.isFallbackAdapter },
  timestampQuery: hasTS, sizes: {}, hashKernel: null, transfers: null,
};
console.log(JSON.stringify(out.adapter));

const U = GPUBufferUsage;
// Dawn's writeBuffer rejects views over a SharedArrayBuffer, so shared-arena data is copied first.
const sabUploads = { count: 0, bytes: 0 };
function makeBuf(data, usage) {
  const size = Math.max(4, Math.ceil(data.byteLength / 4) * 4);
  const b = device.createBuffer({ size, usage: usage | U.COPY_DST | U.COPY_SRC });
  let src = data;
  if (data.buffer instanceof SharedArrayBuffer) { src = data.slice(); sabUploads.count++; sabUploads.bytes += data.byteLength; }
  const padded = new Uint8Array(size);
  padded.set(new Uint8Array(src.buffer, src.byteOffset, src.byteLength));
  const CH = Number(arg('uploadChunk', '0'));
  if (CH > 0) for (let o = 0; o < size; o += CH) device.queue.writeBuffer(b, o, padded, o, Math.min(CH, size - o));
  else device.queue.writeBuffer(b, 0, padded);
  keepAlive.push(padded);
  return b;
}
const keepAlive = [];
function emptyBuf(bytes, usage = U.STORAGE) { return device.createBuffer({ size: Math.max(4, Math.ceil(bytes / 4) * 4), usage: usage | U.COPY_DST | U.COPY_SRC }); }
// Staging buffers are kept alive and reused: destroying them and letting the wrapper's finalizers run
// crashed dawn.node (segfault) in this session.
const staging = new Map();
async function readBack(src, bytes) {
  const size = Math.ceil(bytes / 4) * 4;
  let rb = staging.get(size);
  if (!rb) { rb = device.createBuffer({ size, usage: U.MAP_READ | U.COPY_DST }); staging.set(size, rb); }
  const enc = device.createCommandEncoder();
  enc.copyBufferToBuffer(src, 0, rb, 0, size);
  device.queue.submit([enc.finish()]);
  await rb.mapAsync(GPUMapMode.READ);
  const copy = new Uint8Array(size);
  copy.set(new Uint8Array(rb.getMappedRange()));
  rb.unmap();
  return copy.buffer;
}
function pipeline(code) {
  const module = device.createShaderModule({ code });
  return device.createComputePipeline({ layout: 'auto', compute: { module, entryPoint: 'main' } });
}
function bind(pipe, bufs) {
  return device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: bufs.map((b, k) => ({ binding: k, resource: { buffer: b } })) });
}
function fnv(u8) {
  let h = 0x811c9dc5 | 0;
  const nw = u8.byteLength >> 2, w32 = new Int32Array(u8.buffer, u8.byteOffset, nw);
  for (let k = 0; k < nw; k++) h = Math.imul(h ^ w32[k], 16777619);
  for (let k = nw << 2; k < u8.byteLength; k++) h = Math.imul(h ^ u8[k], 16777619);
  return (h >>> 0).toString(16).padStart(8, '0');
}
const asU8 = (ta) => new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength);
function stat(a) { const s = a.slice().sort((x, y) => x - y); return { med: +s[s.length >> 1].toFixed(4), min: +s[0].toFixed(4), max: +s[s.length - 1].toFixed(4), n: s.length }; }

const pMove = pipeline(G.MOVE_KERNEL), pScan = pipeline(G.SCAN_KERNEL), pScat = pipeline(G.SCATTER_KERNEL);
const pSort = pipeline(G.CELLSORT_KERNEL), pMeals = pipeline(G.MEALS_KERNEL), pHash = pipeline(G.HASH_KERNEL);
await device.queue.onSubmittedWorkDone();

for (const N of sizes) {
  const L = makeLayout(N), mem = makeArena(L), V = makeViews(mem.buffer, L);
  const { households: H } = buildWorld(V, L, SEED);
  K.bind(V, L, SEED);
  // household ranges (members are contiguous)
  const hhFirst = new Uint32Array(H), hhSize = new Uint32Array(H);
  for (let i = 0; i < N; i++) { const h = V.hhOf[i]; if (hhSize[h] === 0) hhFirst[h] = i; hhSize[h]++; }
  const attrA = new Uint32Array(N), metab = new Uint32Array(N);
  for (let i = 0; i < N; i++) { attrA[i] = V.dest[i] | (V.dirC[i] << 8) | (V.speed[i] << 16) | (V.role[i] << 24); metab[i] = V.metab[i]; }
  const gb = {
    params: device.createBuffer({ size: 48, usage: U.UNIFORM | U.COPY_DST }),
    px: makeBuf(V.px, U.STORAGE), py: makeBuf(V.py, U.STORAGE), attrA: makeBuf(attrA, U.STORAGE), metab: makeBuf(metab, U.STORAGE),
    needZ: makeBuf(V.needZ, U.STORAGE), flow: makeBuf(V.flow, U.STORAGE), cell: emptyBuf(4 * N), agg: emptyBuf(16 * L.NC),
    cellStart: emptyBuf(4 * (L.NC + 1)), cursor: emptyBuf(4 * L.NC), sorted: emptyBuf(4 * N),
    food: makeBuf(V.food.subarray(0, H), U.STORAGE), hhFirst: makeBuf(hhFirst, U.STORAGE), hhSize: makeBuf(hhSize, U.STORAGE),
  };
  const bMove = bind(pMove, [gb.params, gb.px, gb.py, gb.attrA, gb.metab, gb.needZ, gb.flow, gb.cell, gb.agg]);
  const bScan = bind(pScan, [gb.params, gb.agg, gb.cellStart, gb.cursor]);
  const bScat = bind(pScat, [gb.params, gb.cell, gb.cursor, gb.sorted]);
  const bSort = bind(pSort, [gb.params, gb.cellStart, gb.sorted]);
  const bMeals = bind(pMeals, [gb.params, gb.metab, gb.needZ, gb.food, gb.hhFirst, gb.hhSize]);
  const prm = new Uint32Array(12);
  prm[1] = N; prm[2] = L.W; prm[3] = L.CW; prm[4] = L.NC; prm[5] = L.NT; prm[6] = H; prm[7] = seedH;
  const nQ = 10;
  const qs = hasTS ? device.createQuerySet({ type: 'timestamp', count: nQ }) : null;
  const qResolve = hasTS ? device.createBuffer({ size: 8 * nQ, usage: U.QUERY_RESOLVE | U.COPY_SRC }) : null;
  const wgN = Math.ceil(N / 256), wgC = Math.ceil(L.NC / 64), wgH = Math.ceil(H / 64);
  function encodeTick(t, withTS) {
    prm[0] = t;
    device.queue.writeBuffer(gb.params, 0, prm);
    const enc = device.createCommandEncoder();
    enc.clearBuffer(gb.agg);
    const passes = [[pMove, bMove, wgN], [pScan, bScan, 1], [pScat, bScat, wgN], [pSort, bSort, wgC], [pMeals, bMeals, wgH]];
    passes.forEach(([pp, bg, n], k) => {
      if (SKIP.includes(k)) return;
      const desc = withTS ? { timestampWrites: { querySet: qs, beginningOfPassWriteIndex: 2 * k, endOfPassWriteIndex: 2 * k + 1 } } : {};
      const pass = enc.beginComputePass(desc);
      pass.setPipeline(pp); pass.setBindGroup(0, bg); pass.dispatchWorkgroups(n); pass.end();
    });
    if (withTS) enc.resolveQuerySet(qs, 0, nQ, qResolve, 0);
    device.queue.submit([enc.finish()]);
  }
  // CPU reference for the same subset, single thread: move + cell totals + scan + offsets + scatter + meals
  function mealsRef(t) {
    const { needZ, food } = V;
    for (let h = 0; h < H; h++) {
      let f = food[h];
      const first = hhFirst[h], n = hhSize[h];
      for (let k = 0; k < n; k++) {
        const i = first + k, rate = (RATE_H * metab[i]) >> 7;
        if ((needZ[i * 4] - t) * rate < EAT_T && f > 0) { f--; needZ[i * 4] = t + (((FULL + rate - 1) / rate) | 0); }
      }
      food[h] = f;
    }
  }
  function cpuTick(t) {
    K.phaseMove(0, 1, t);
    for (let b = 0; b < L.nCB; b++) K.phaseCellTotals(b, 1);
    K.blockScan();
    for (let b = 0; b < L.nCB; b++) K.phaseOffsets(b, 1);
    K.phaseScatter(0, 1);
    mealsRef(t);
  }
  // parity: identical start, T ticks on each side
  await device.queue.onSubmittedWorkDone();
  if (process.argv.includes('verbose')) console.log(`N=${N} uploaded`);
  const tg = now();
  for (let t = 1; t <= T; t++) {
    encodeTick(t, false);
    if (process.argv.includes('verbose')) { await device.queue.onSubmittedWorkDone(); console.log(`N=${N} tick ${t} lost=${JSON.stringify(lost)} errors=${errors.length ? errors[0] : 0}`); }
  }
  await device.queue.onSubmittedWorkDone();
  const gpuParityMs = now() - tg;
  const tc = now();
  for (let t = 1; t <= T; t++) cpuTick(t);
  const cpuParityMs = now() - tc;
  const gpx = new Int32Array(await readBack(gb.px, 4 * N)), gpy = new Int32Array(await readBack(gb.py, 4 * N));
  const gattr = new Uint32Array(await readBack(gb.attrA, 4 * N)), gcell = new Uint32Array(await readBack(gb.cell, 4 * N));
  const gagg = new Uint32Array(await readBack(gb.agg, 16 * L.NC)), gstart = new Uint32Array(await readBack(gb.cellStart, 4 * (L.NC + 1)));
  const gsorted = new Uint32Array(await readBack(gb.sorted, 4 * N)), gneed = new Int32Array(await readBack(gb.needZ, 16 * N));
  const gfood = new Int32Array(await readBack(gb.food, 4 * H));
  const gdir = new Uint8Array(N);
  for (let i = 0; i < N; i++) gdir[i] = (gattr[i] >> 8) & 255;
  const fields = {
    px: [asU8(gpx), asU8(V.px)], py: [asU8(gpy), asU8(V.py)], dirC: [gdir, asU8(V.dirC)], cell: [asU8(gcell), asU8(V.cell)],
    agg: [asU8(gagg), asU8(V.agg)], cellStart: [asU8(gstart), asU8(V.cellStart)], sorted: [asU8(gsorted), asU8(V.sorted)],
    needZ: [asU8(gneed), asU8(V.needZ)], food: [asU8(gfood), asU8(V.food.subarray(0, H))],
  };
  const parity = {};
  let allEqual = true;
  for (const [k, [g, c]] of Object.entries(fields)) { const hg = fnv(g), hc = fnv(c); parity[k] = { gpu: hg, cpu: hc, equal: hg === hc }; if (hg !== hc) allEqual = false; }
  // how much the canonicalising sort mattered: was the raw atomic scatter order already sorted?
  let inversions = 0;
  for (let c = 0; c < L.NC; c++) for (let k = gstart[c] + 1; k < gstart[c + 1]; k++) if (gsorted[k - 1] > gsorted[k]) inversions++;
  const rec = { N, H, cells: L.NC, ticks: T, parity, allEqual, gpuParityMs: +gpuParityMs.toFixed(1), cpuParityMs: +cpuParityMs.toFixed(1), errors: errors.slice() };
  console.log(`N=${N} parity after ${T} ticks: ${allEqual ? 'ALL EQUAL' : 'MISMATCH'} ${JSON.stringify(Object.fromEntries(Object.entries(parity).map(([k, v]) => [k, v.equal])))} gpu ${gpuParityMs.toFixed(0)} ms cpu ${cpuParityMs.toFixed(0)} ms`);

  if (TIMING) {
    // unsorted-scatter check: run one tick without the cell sort and count inversions in the raw order
    rec.idleBusyCpus = await sampleBusy(1000);
    let t = T + 1;
    for (let k = 0; k < 20; k++) encodeTick(t++, false);
    await device.queue.onSubmittedWorkDone();
    const batch = N >= 1e6 ? 10 : 20, samples = [];
    for (let s = 0; s < 9; s++) {
      const a = now();
      for (let k = 0; k < batch; k++) encodeTick(t++, false);
      await device.queue.onSubmittedWorkDone();
      samples.push((now() - a) / batch);
    }
    rec.gpuTickMs = stat(samples);
    if (hasTS) {
      const per = [[], [], [], [], []];
      for (let s = 0; s < 9; s++) {
        encodeTick(t++, true);
        const ts = new BigUint64Array(await readBack(qResolve, 8 * nQ));
        for (let k = 0; k < 5; k++) per[k].push(Number(ts[2 * k + 1] - ts[2 * k]) / 1e6);
      }
      rec.gpuPassMs = { move: stat(per[0]), scan: stat(per[1]), scatter: stat(per[2]), cellSort: stat(per[3]), meals: stat(per[4]) };
    }
    // single-tick latency including a readback of the cell aggregates (what a CPU consumer would wait for)
    const aggBytes = 16 * L.NC, lat = [];
    const rbAgg = device.createBuffer({ size: aggBytes, usage: U.MAP_READ | U.COPY_DST });
    for (let s = 0; s < 9; s++) {
      const a = now();
      encodeTick(t++, false);
      const enc = device.createCommandEncoder();
      enc.copyBufferToBuffer(gb.agg, 0, rbAgg, 0, aggBytes);
      device.queue.submit([enc.finish()]);
      await rbAgg.mapAsync(GPUMapMode.READ);
      rbAgg.unmap();
      lat.push(now() - a);
    }
    rec.tickPlusAggReadbackMs = stat(lat);
    // CPU reference timing for the same subset (single thread)
    const cs = [];
    for (let s = 0; s < 9; s++) { const a = now(); for (let k = 0; k < 3; k++) cpuTick(t++); cs.push((now() - a) / 3); }
    rec.cpuSubsetTickMs = stat(cs);
    rec.inversionsInRawScatterAfterSort = inversions;
    console.log(`N=${N} gpu tick ${rec.gpuTickMs.med} ms [${rec.gpuTickMs.min}-${rec.gpuTickMs.max}] passes ${hasTS ? JSON.stringify(Object.fromEntries(Object.entries(rec.gpuPassMs).map(([k, v]) => [k, v.med]))) : '-'} ` +
      `tick+readback ${rec.tickPlusAggReadbackMs.med} ms; cpu subset ${rec.cpuSubsetTickMs.med} ms`);
  }
  rec.lost = lost;
  out.sizes[N] = rec;
  await device.queue.onSubmittedWorkDone();
  if (process.argv.includes('destroy')) for (const b of Object.values(gb)) b.destroy();
  console.log(`N=${N} done`);
}

// keyed hash kernel: exactness of u32 wrapping arithmetic against JS for 1M draws
{
  const N = 1 << 20, ob = emptyBuf(4 * N), params = device.createBuffer({ size: 48, usage: U.UNIFORM | U.COPY_DST });
  const prm = new Uint32Array(12); prm[0] = 123456; prm[1] = N; prm[7] = seedH; prm[8] = 7;
  device.queue.writeBuffer(params, 0, prm);
  console.log('hash: buffers ready');
  const bg = bind(pHash, [params, ob]);
  console.log('hash: bind group ready');
  const run = () => { const enc = device.createCommandEncoder(); const cp = enc.beginComputePass(); cp.setPipeline(pHash); cp.setBindGroup(0, bg); cp.dispatchWorkgroups(N / 256); cp.end(); device.queue.submit([enc.finish()]); };
  run();
  await device.queue.onSubmittedWorkDone();
  console.log('hash: first dispatch done');
  const g = new Uint32Array(await readBack(ob, 4 * N));
  console.log('hash: read back');
  let mism = 0;
  for (let i = 0; i < N; i++) if (g[i] !== draw(seedH, i, 123456, 7)) mism++;
  console.log(`hash: compared, ${mism} mismatches`);
  const ts = [];
  for (let s = 0; s < 9; s++) { const a = now(); for (let k = 0; k < 20; k++) run(); await device.queue.onSubmittedWorkDone(); ts.push((now() - a) / 20); console.log(`hash: sample ${s}`); }
  out.hashKernel = { n: N, mismatches: mism, msPerDispatch: stat(ts) };
  console.log(`hash kernel: ${mism} mismatches of ${N}; ${stat(ts).med} ms per 1M-draw dispatch`);
}

// transfers: upload, download, empty round trip
if (TIMING) {
  const res = {};
  const rt = [];
  for (let s = 0; s < 15; s++) { const a = now(); device.queue.submit([device.createCommandEncoder().finish()]); await device.queue.onSubmittedWorkDone(); rt.push(now() - a); }
  res.emptySubmitRoundTripMs = stat(rt);
  for (const mb of [1, 4, 12, 64]) {
    const bytes = mb * 2 ** 20, src = new Uint8Array(bytes);
    for (let k = 0; k < bytes; k += 4096) src[k] = k & 255;
    const b = emptyBuf(bytes), rb = device.createBuffer({ size: bytes, usage: U.MAP_READ | U.COPY_DST });
    const up = [], down = [];
    for (let s = 0; s < 9; s++) { const a = now(); device.queue.writeBuffer(b, 0, src); await device.queue.onSubmittedWorkDone(); up.push(now() - a); }
    for (let s = 0; s < 9; s++) {
      const a = now();
      const enc = device.createCommandEncoder(); enc.copyBufferToBuffer(b, 0, rb, 0, bytes); device.queue.submit([enc.finish()]);
      await rb.mapAsync(GPUMapMode.READ); const view = new Uint8Array(rb.getMappedRange()); const x = view[bytes - 1]; rb.unmap();
      down.push(now() - a + x * 0);
    }
    const u = stat(up), d = stat(down);
    res[`${mb}MiB`] = { uploadMs: u, downloadMs: d, uploadGBps: +((bytes / 1e9) / (u.med / 1e3)).toFixed(2), downloadGBps: +((bytes / 1e9) / (d.med / 1e3)).toFixed(2) };
    console.log(`${mb} MiB: upload ${u.med} ms (${res[`${mb}MiB`].uploadGBps} GB/s), download ${d.med} ms (${res[`${mb}MiB`].downloadGBps} GB/s)`);
    b.destroy(); rb.destroy();
  }
  out.transfers = res;
}

// device loss: destroy() must resolve device.lost with reason "destroyed"
device.destroy();
await new Promise((r) => setTimeout(r, 200));
out.deviceLostAfterDestroy = lost;
out.uncapturedErrors = errors;
console.log('device.lost after destroy():', JSON.stringify(lost), 'errors:', errors.length);
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
writeFileSync(new URL(`./results/gpu-${tag}.json`, import.meta.url), JSON.stringify(out, null, 1));
process.exit(0);
