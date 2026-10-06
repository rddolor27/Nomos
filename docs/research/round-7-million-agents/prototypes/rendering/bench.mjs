// Playwright runner for the repo-local Chromium.
// Run: PLAYWRIGHT_BROWSERS_PATH=0 node bench.mjs <gpu|swiftshader> <suite> [runs]
// Each run is a fresh browser; results/<mode>-<suite>.json keeps every run plus machine state.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import os from 'node:os';
import { mkdirSync, writeFileSync } from 'node:fs';
import { startServer } from './serve.mjs';

const MODE = process.argv[2] || 'gpu';
const SUITE = process.argv[3] || 'draw';
const RUNS = +(process.argv[4] || 3);
const PORT = 8790;
const ARGS = {
  gpu: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgpu-developer-features'],
  swiftshader: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu'],
};

const N3 = [100000, 250000, 1000000];
const SUITES = {
  draw: [
    ...[100000, 250000, 1000000, 2000000, 4000000].map((n) => ['glDraw', { n, prim: 'points', size: 1 }]),
    ...[2, 3, 5].flatMap((size) => N3.map((n) => ['glDraw', { n, prim: 'points', size }])),
    ...[1, 3, 5].flatMap((size) => N3.map((n) => ['glDraw', { n, prim: 'quads', size }])),
    ['glDraw', { n: 1000000, prim: 'points', size: 5, view: 'district' }],
    ['glDraw', { n: 1000000, prim: 'points', size: 5, view: 'street' }],
    ['glDraw', { n: 1000000, prim: 'points', size: 1, interp: true }],
    ['glDraw', { n: 1000000, prim: 'quads', size: 5, interp: true }],
    ['glDraw', { n: 1000000, prim: 'points', size: 1, tex: true }],
    ['glDraw', { n: 1000000, prim: 'points', size: 5, tex: true }],
    ['glDraw', { n: 1000000, prim: 'quads', size: 5, tex: true }],
    ['glDraw', { n: 1000000, prim: 'points', size: 1, order: 'random' }],
    ['glDraw', { n: 1000000, prim: 'points', size: 5, order: 'random' }],
    ...[1, 3, 5].flatMap((size) => N3.map((n) => ['gpuDraw', { n, prim: 'quads', size }])),
    ...N3.map((n) => ['gpuDraw', { n, prim: 'points' }]),
    ['gpuDraw', { n: 1000000, prim: 'quads', size: 5, interp: true }],
    ['gpuDraw', { n: 1000000, prim: 'points', interp: true }],
  ],
  upload: [
    ...['subdata', 'ring3', 'orphan', 'bufferData', 'texture'].map((method) => ['glUpload', { n: 1000000, method }]),
    ['glUpload', { n: 1000000, method: 'subdata', sab: true }],
    ['glUpload', { n: 250000, method: 'subdata' }],
    ['glUpload', { n: 100000, method: 'subdata' }],
    ['gpuUpload', { n: 1000000, method: 'writeBuffer' }],
    ['gpuUpload', { n: 1000000, method: 'writeBuffer', sab: true }],
    ['gpuUpload', { n: 1000000, method: 'staging' }],
    ['gpuUpload', { n: 250000, method: 'writeBuffer' }],
    ['gpuUpload', { n: 100000, method: 'writeBuffer' }],
  ],
  heat: [
    ['glHeat', { n: 1000000, path: 'splat', bw: 1920, bh: 1080 }],
    ['glHeat', { n: 1000000, path: 'splat', bw: 480, bh: 270 }],
    ['glHeat', { n: 1000000, path: 'splat', bw: 240, bh: 135 }],
    ['glHeat', { n: 1000000, path: 'cpu', bw: 480, bh: 270 }],
    ['gpuHeat', { n: 1000000, bw: 1920, bh: 1080 }],
    ['gpuHeat', { n: 1000000, bw: 480, bh: 270 }],
    ['gpuHeat', { n: 1000000, bw: 240, bh: 135 }],
    ['glCull', { n: 1000000, view: 'district', method: 'none' }],
    ['glCull', { n: 1000000, view: 'district', method: 'ranges' }],
    ['glCull', { n: 1000000, view: 'district', method: 'compact' }],
    ['glCull', { n: 1000000, view: 'street', method: 'none' }],
    ['glCull', { n: 1000000, view: 'street', method: 'compact' }],
    ['glCountry', { gw: 256, gh: 128, settlements: 7000, segments: 14000 }],
    ['glCountry', { gw: 512, gh: 256, settlements: 30000, segments: 60000 }],
    ['canvas2d', { n: 1000000, mode: 'imagedata' }],
    ['canvas2d', { n: 5000, mode: 'fillrect' }],
    ['canvas2d', { n: 25000, mode: 'fillrect' }],
    ['canvas2d', { n: 100000, mode: 'fillrect' }],
    ['cpuCosts', { n: 1000000 }],
    ['transition', { n: 1000000, slices: 16 }],
    ['transition', { n: 250000, slices: 4 }],
  ],
  pipeline: [
    ['pipeline', { n: 1000000, transport: 'sab', render: 'main', upload: 'full', warm: 0, seconds: 1.5, label: 'zoom-in first 1.5 s' }],
    ['pipeline', { n: 1000000, transport: 'sab', render: 'main', upload: 'full' }],
    ['pipeline', { n: 1000000, transport: 'sab', render: 'worker', upload: 'full' }],
    ['pipeline', { n: 1000000, transport: 'transfer', render: 'main', upload: 'full' }],
    ['pipeline', { n: 1000000, transport: 'sab', render: 'main', upload: 'visible', view: 'district', size: 5 }],
    ['pipeline', { n: 1000000, transport: 'sab', render: 'main', upload: 'full', lod: 'heat' }],
    ['pipeline', { n: 250000, transport: 'sab', render: 'main', upload: 'full' }],
    ['pipeline', { n: 100000, transport: 'sab', render: 'main', upload: 'full' }],
  ],
  check: [
    ['transition', { n: 1000000, slices: 16, fresh: true }],
    ['transition', { n: 1000000, slices: 16 }],
    ['transition', { n: 1000000, slices: 16, fresh: true }],
    ['pipeline', { n: 1000000, transport: 'sab', render: 'main', upload: 'full', warm: 0, seconds: 1.5 }],
    ['pipeline', { n: 1000000, transport: 'sab', render: 'worker', upload: 'full', warm: 1, seconds: 2 }],
  ],
  smoke: [
    ['glDraw', { n: 100000, prim: 'points', size: 5, samples: 10 }],
    ['glDraw', { n: 100000, prim: 'quads', size: 5, interp: true, samples: 10 }],
    ['glDraw', { n: 100000, prim: 'quads', size: 5, tex: true, samples: 10 }],
    ['gpuDraw', { n: 100000, prim: 'quads', size: 5, samples: 6 }],
    ['gpuDraw', { n: 100000, prim: 'points', samples: 6 }],
    ['glUpload', { n: 100000, method: 'texture', samples: 6 }],
    ['glUpload', { n: 100000, method: 'subdata', sab: true, samples: 6 }],
    ['gpuUpload', { n: 100000, method: 'staging', samples: 6 }],
    ['gpuUpload', { n: 100000, method: 'writeBuffer', sab: true, samples: 6 }],
    ['glHeat', { n: 100000, path: 'splat', samples: 6 }],
    ['glHeat', { n: 100000, path: 'cpu', samples: 6 }],
    ['gpuHeat', { n: 100000, samples: 6 }],
    ['glCull', { n: 100000, method: 'ranges', samples: 6 }],
    ['glCull', { n: 100000, method: 'compact', samples: 6 }],
    ['glCountry', { samples: 6 }],
    ['canvas2d', { n: 100000, mode: 'imagedata', frames: 3 }],
    ['canvas2d', { n: 5000, mode: 'fillrect', frames: 3 }],
    ['cpuCosts', { n: 100000 }],
    ['pipeline', { n: 100000, transport: 'sab', render: 'main', upload: 'full', warm: 1, seconds: 2 }],
    ['pipeline', { n: 100000, transport: 'sab', render: 'worker', upload: 'full', warm: 1, seconds: 2 }],
    ['pipeline', { n: 100000, transport: 'transfer', render: 'main', upload: 'full', warm: 1, seconds: 2 }],
    ['pipeline', { n: 100000, transport: 'sab', render: 'main', upload: 'visible', view: 'district', size: 5, warm: 1, seconds: 2 }],
    ['pipeline', { n: 100000, transport: 'sab', render: 'main', upload: 'full', lod: 'auto', warm: 1, seconds: 2 }],
  ],
  soft: [
    ...N3.map((n) => ['glDraw', { n, prim: 'points', size: 1, samples: 20 }]),
    ['glDraw', { n: 1000000, prim: 'points', size: 5, samples: 10 }],
    ['glUpload', { n: 1000000, method: 'subdata', samples: 10 }],
    ['glHeat', { n: 1000000, path: 'splat', bw: 480, bh: 270, samples: 10 }],
    ['glCull', { n: 1000000, view: 'district', method: 'compact', samples: 10 }],
    ['pipeline', { n: 100000, transport: 'sab', render: 'main', upload: 'full', seconds: 4 }],
    ['pipeline', { n: 1000000, transport: 'sab', render: 'main', upload: 'full', seconds: 4 }],
  ],
};

const sh = (cmd) => { try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; } };
const gpuState = () => sh('nvidia-smi --query-gpu=utilization.gpu,clocks.gr,clocks.mem,memory.used --format=csv,noheader,nounits');
const cpuTimes = () => os.cpus().map((c) => c.times);
function busyPct(a, b) {
  let idle = 0, total = 0;
  for (let i = 0; i < a.length; i++) {
    const d = (k) => b[i][k] - a[i][k];
    idle += d('idle');
    total += d('user') + d('nice') + d('sys') + d('idle') + d('irq');
  }
  return total ? +(100 * (1 - idle / total)).toFixed(1) : null;
}

const machine = {
  cpu: os.cpus()[0].model, logicalCores: os.cpus().length, ramGB: +(os.totalmem() / 2 ** 30).toFixed(1), node: process.version,
  os: `${os.type()} ${os.release()}`, gpu: sh('nvidia-smi --query-gpu=name,driver_version,pcie.link.gen.current,pcie.link.width.current --format=csv,noheader'),
  loadavg: os.loadavg(), loadavgNote: 'os.loadavg() is always 0 on Windows; busyPct per test is the CPU-busy figure (all logical cores, from os.cpus() deltas)',
};

const server = await startServer(PORT);
const runs = [];
const idleBefore = (() => { const a = cpuTimes(); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000); return busyPct(a, cpuTimes()); })();
console.log(`machine idle busy% over 2 s before start: ${idleBefore}`);
for (let r = 0; r < RUNS; r++) {
  const browser = await chromium.launch({ channel: 'chromium', headless: true, args: ARGS[MODE] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', (m) => { if (m.type() === 'error') console.log('page error:', m.text()); });
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.goto(`http://localhost:${PORT}/index.html?bench=1`);
  await page.waitForFunction(() => window.__ready === true);
  const env = await page.evaluate(() => window.suite.env());
  const version = browser.version();
  const results = [];
  for (const [name, params] of SUITES[SUITE]) {
    const a = cpuTimes(), g0 = gpuState(), t0 = Date.now();
    let res;
    try { res = await page.evaluate(([nm, p]) => window.suite[nm](p), [name, params]); }
    catch (e) { res = { test: name, ...params, error: String(e.message || e).slice(0, 300) }; }
    res.busyPct = busyPct(a, cpuTimes());
    res.gpuBefore = g0; res.gpuAfter = gpuState(); res.wallS = (Date.now() - t0) / 1000;
    results.push(res);
    const key = res.gpu?.med ?? res.stats?.interval?.med ?? res.cpu?.med ?? res.frame?.med;
    console.log(`run ${r + 1} ${name} ${JSON.stringify(params)} → ${key?.toFixed ? key.toFixed(3) : JSON.stringify(res).slice(0, 160)} (busy ${res.busyPct}%)`);
  }
  runs.push({ run: r + 1, chromium: version, env, results });
  await browser.close();
}
server.close();
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
const file = new URL(`./results/${MODE}-${SUITE}.json`, import.meta.url);
writeFileSync(file, JSON.stringify({ mode: MODE, suite: SUITE, machine, idleBusyPctBefore: idleBefore, date: new Date().toISOString(), runs }, null, 1));
console.log('wrote', file.pathname);
