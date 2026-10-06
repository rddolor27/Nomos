// Prints, per test, the median of the per-run medians with [min–max] across runs.
// Run: node summarize.mjs results/gpu-draw.json [more files]
import { readFileSync } from 'node:fs';

const METRICS = {
  glDraw: (r) => ({ gpu: r.gpu?.med, cpu: r.cpu?.med, visible: r.visible }),
  gpuDraw: (r) => ({ gpu: r.gpu?.med, wallPerPass: r.wallPerPass?.med, visible: r.visible }),
  glUpload: (r) => ({ cpu: r.cpu?.med, cpuP95: r.cpu?.p95, e2e: r.e2e?.med, base: r.base?.med, uploadE2e: r.e2e && r.base ? r.e2e.med - r.base.med : undefined }),
  gpuUpload: (r) => ({ cpu: r.cpu?.med, cpuP95: r.cpu?.p95, done: r.done?.med }),
  glHeat: (r) => ({ splat: r.splatGpu?.med, resolve: r.resolveGpu?.med, cpuBin: r.cpuBin?.med, binUpload: r.binUploadE2e?.med }),
  gpuHeat: (r) => ({ gpu: r.gpu?.med, wallPerPass: r.wallPerPass?.med }),
  glCull: (r) => ({ gpu: r.gpu?.med, scan: r.cpuScan?.med, upload: r.upload?.med, ranges: r.cpuRanges?.med, drawn: r.drawn, visible: r.visible }),
  glCountry: (r) => ({ gpu: r.gpu?.med }),
  canvas2d: (r) => ({ frame: r.frame?.med, record: r.record?.med, put: r.putImageData?.med }),
  cpuCosts: (r) => ({ compact: r.compactDistrict?.med, bin256: r.bin256?.med, copy12: r.copy12?.med }),
  transition: (r) => ({ allocE2e: r.allocE2e, upCpu: r.firstUploadCpu, upE2e: r.firstUploadE2e, firstDraw: r.firstDrawE2e,
    up2: r.secondBufferUploadE2e, draw2: r.secondBufferFirstDrawE2e, warm: r.warmFrameE2e?.med, slice: r.sliceCpu?.med }),
  pipeline: (r) => {
    const s = r.stats || r.render;
    return { int: s?.interval?.med, intP95: s?.interval?.p95, intMax: s?.interval?.max, cpu: s?.cpu?.med,
      cpuP95: s?.cpu?.p95, up: s?.upload?.med, upP95: s?.upload?.p95, upMax: s?.upload?.max, gpu: s?.gpu?.med,
      long: s?.longFrames, frames: s?.frames, step: r.sim?.stepMed, pack: r.sim?.packMed, mainInt: r.main?.interval?.med, mainIntP95: r.main?.interval?.p95,
      mainBusy: r.main?.busy?.med, lod: s?.lod, visible: s?.visible };
  },
};

const SKIP = new Set(['test', 'samples', 'busyPct', 'gpuBefore', 'gpuAfter', 'wallS', 'gpu', 'cpu', 'e2e', 'base', 'done', 'wallPerPass', 'visible',
  'splatGpu', 'resolveGpu', 'cpuBin', 'binUploadE2e', 'cpuScan', 'upload', 'cpuRanges', 'drawn', 'ranges', 'frame', 'record', 'putImageData',
  'compactDistrict', 'bin256', 'copy12', 'render', 'sim', 'main', 'mb', 'timestamps', 'tris', 'error', 'allocE2e', 'firstUploadCpu', 'firstUploadE2e',
  'firstDrawE2e', 'secondBufferUploadE2e', 'secondBufferFirstDrawE2e', 'firstFrameE2e', 'warmFrameE2e', 'sliceCpu', 'sliceMb', 'sabAllocMs',
  'glAllocTwoBuffersMs', 'render_', 'stats']);

const fmt = (x) => (x == null || Number.isNaN(x) ? '–' : typeof x === 'string' ? x : Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(3));
const med = (a) => { const s = a.slice().sort((p, q) => p - q); return s[(s.length - 1) >> 1]; };

for (const file of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(file, 'utf8'));
  console.log(`\n# ${file}  mode=${d.mode} suite=${d.suite} runs=${d.runs.length} chromium=${d.runs[0].chromium}`);
  console.log(`# ${d.machine.cpu} · ${d.machine.logicalCores} threads · ${d.machine.gpu} · node ${d.machine.node} · idle busy ${d.idleBusyPctBefore}%`);
  console.log(`# renderer: ${d.runs[0].env.renderer}`);
  const groups = new Map();
  for (const run of d.runs) for (const r of run.results) {
    const params = Object.fromEntries(Object.entries(r).filter(([k]) => !SKIP.has(k)));
    const key = `${r.test} ${JSON.stringify(params)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  for (const [key, rs] of groups) {
    const m = METRICS[rs[0].test];
    if (!m || rs[0].error) { console.log(key, rs[0].error ? 'ERROR ' + rs[0].error : ''); continue; }
    const vals = rs.map(m);
    const parts = Object.keys(vals[0]).map((k) => {
      const xs = vals.map((v) => v[k]).filter((x) => x != null);
      if (!xs.length) return null;
      if (typeof xs[0] === 'string') return `${k}=${xs[0]}`;
      const lo = Math.min(...xs), hi = Math.max(...xs);
      return xs.length > 1 && lo !== hi ? `${k}=${fmt(med(xs))} [${fmt(lo)}–${fmt(hi)}]` : `${k}=${fmt(xs[0])}`;
    }).filter(Boolean);
    const busy = rs.map((r) => r.busyPct).filter((x) => x != null);
    console.log(`${key}\n    ${parts.join('  ')}  busy%=${fmt(Math.min(...busy))}–${fmt(Math.max(...busy))}`);
  }
}
