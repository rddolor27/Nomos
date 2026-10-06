// Prints the tables the notes cite from ../results/browser-*.json.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'results');
const load = (e) => (existsSync(join(dir, `browser-${e}.json`)) ? JSON.parse(readFileSync(join(dir, `browser-${e}.json`), 'utf8')) : null);
const engines = ['chromium', 'firefox', 'webkit'].map((e) => [e, load(e)]).filter(([, r]) => r);
const MiB = 2 ** 20;

for (const [e, r] of engines) {
  console.log(`\n## ${e} ${r.version} (busy CPUs ${r.busyBefore}/${r.busyAfter})`);
  const env = r.groups.env;
  console.log('env', JSON.stringify({ deviceMemory: env.deviceMemory, hardwareConcurrency: env.hardwareConcurrency, worker: env.worker, features: env.features, perfMemory: env.perfMemory, pressure: env.pressureObserver, battery: env.battery, hasGpu: env.hasGpu, hasUASM: env.hasUASM, uaHigh: env.uaHigh && { bitness: env.uaHigh.bitness, architecture: env.uaHigh.architecture, formFactors: env.uaHigh.formFactors } }));
  console.log('mem64 (ns/elem median [min-max])');
  for (const row of r.groups.mem64.rows) {
    if (row.error) { console.log(' ', row.label, row.error); continue; }
    console.log(' ', row.label.padEnd(13), ['sum', 'hist', 'gather', 'move'].map((k) => `${k} ${row[k].median} [${row[k].min}-${row[k].max}]`).join(' | '));
  }
  const g = r.groups.gpu;
  for (const pp of ['default', 'high-performance', 'low-power']) {
    if (g[pp] === undefined) continue;
    if (!g[pp] || typeof g[pp] === 'string') { console.log('webgpu', pp, g[pp]); continue; }
    const L = g[pp].limits;
    console.log('webgpu', pp, JSON.stringify(g[pp].info), 'maxBufferSize', L.maxBufferSize / MiB, 'MiB', 'maxStorageBufferBindingSize', L.maxStorageBufferBindingSize / MiB, 'MiB',
      'maxComputeWorkgroupStorageSize', L.maxComputeWorkgroupStorageSize, 'maxComputeInvocationsPerWorkgroup', L.maxComputeInvocationsPerWorkgroup, 'features', g[pp].features.length);
  }
  if (g.deviceDefault) console.log('webgpu device default', JSON.stringify(g.deviceDefault), 'max', JSON.stringify(g.deviceMax), '256 MiB buffer', JSON.stringify(g.buffer256MiB), 'lost', g.lostReasonAfterDestroy);
  if (g.webgl2) console.log('webgl2', JSON.stringify({ MAX_TEXTURE_SIZE: g.webgl2.MAX_TEXTURE_SIZE, MAX_3D: g.webgl2.MAX_3D_TEXTURE_SIZE, LAYERS: g.webgl2.MAX_ARRAY_TEXTURE_LAYERS, UBO: g.webgl2.MAX_UNIFORM_BLOCK_SIZE, SAMPLES: g.webgl2.MAX_SAMPLES, RENDERER: g.webgl2.RENDERER, UNMASKED_RENDERER: g.webgl2.UNMASKED_RENDERER, dbg: g.webgl2.debugRendererInfo }));
  const u = r.groups.uasm;
  if (!u.unavailable) for (const [k, v] of Object.entries(u)) console.log('uasm', k, (v.bytes / MiB).toFixed(1), 'MiB', `${v.ms.toFixed(0)} ms`, JSON.stringify(v.breakdown.map((b) => [b.types.join('+'), b.scope.join('+'), (b.bytes / MiB).toFixed(2)])));
  else console.log('uasm unavailable');
  const p = r.groups.probe.rows || [];
  if (p.length) {
    const s = (k) => { const xs = p.map((x) => x[k]).sort((a, b) => a - b); return `${xs[(xs.length - 1) >> 1].toFixed(1)} [${xs[0].toFixed(1)}-${xs[xs.length - 1].toFixed(1)}]`; };
    console.log('probe (worker, n=' + p.length + ') small', s('nsPerAgentSmall'), 'big', s('nsPerAgentBig'), 'total ms', s('totalMs'));
  }
  for (const a of r.groups.alloc) {
    const tag = `${a.kind} ${(a.bytes / MiB).toFixed(0)} MiB${a.max && a.max !== a.bytes ? ` max ${(a.max / MiB).toFixed(1)}` : ''}`;
    console.log('alloc', tag.padEnd(34), a.error || a.harnessError || `ok ${a.ms.toFixed(2)} ms${a.firstTouchMs ? `, touch ${(a.touch / MiB)} MiB ${a.firstTouchMs.toFixed(1)} ms (${((a.firstTouchMs * 1e6) / (a.touch / 4096)).toFixed(0)} ns/page)` : ''}${a.lastPageOk === true ? '' : ` lastPage ${a.lastPageOk}`}`);
  }
  console.log('grow', JSON.stringify(r.groups.grow));
}
