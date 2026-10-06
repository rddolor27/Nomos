// Runs kernel-bench.mjs in Node and in headless Chromium, and checks that 32x32 chunk patches
// reach an R16UI texture through texSubImage2D with UNPACK_ROW_LENGTH and UNPACK_SKIP_*.
// Playwright is not vendored here: pass --pw=<folder whose node_modules holds playwright>, such
// as round 7's prototypes/rendering. Usage: node browser.mjs --pw=<folder> [--warm=10] [--samples=30]

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runKernelBench } from './kernel-bench.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const warm = Number(arg('warm', 10)), samples = Number(arg('samples', 30));
const { chromium } = createRequire(path.join(arg('pw', here), 'package.json'))('playwright');

const classic = ['map.mjs', 'tools.mjs', 'kernel-bench.mjs']
  .map((f) => readFileSync(path.join(here, f), 'utf8'))
  .join('\n')
  .split('\n')
  .filter((line) => !line.startsWith('import '))
  .map((line) => line.replace(/^export (function|const|let) /, '$1 '))
  .join('\n');
const script = `(() => {\n${classic}\nwindow.runKernelBench = runKernelBench;\n})();`;

const nodeRun = runKernelBench({ warm, samples });

// Served from a routed origin with COOP/COEP, so the page is cross-origin isolated and
// performance.now() is not clamped to 100 us.
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.route('https://editor.invalid/', (route) => route.fulfill({
  contentType: 'text/html',
  headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' },
  body: '<!doctype html><title>editor kernel</title>',
}));
await page.goto('https://editor.invalid/');
await page.addScriptTag({ content: script });
const browserRun = await page.evaluate(({ warm, samples }) => {
  const gl = new OffscreenCanvas(16, 16).getContext('webgl2');
  let tick = performance.now(), step = Infinity;
  for (let i = 0; i < 1e5; i++) { const t = performance.now(); if (t > tick) { step = Math.min(step, t - tick); tick = t; } }
  const info = { webgl2: !!gl, crossOriginIsolated: self.crossOriginIsolated, timerStepMs: step };
  let upload = null;
  if (gl) {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    info.renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R16UI, 1024, 1024);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 1024);
    const patch = (src, cx, cy) => {
      gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, cx);
      gl.pixelStorei(gl.UNPACK_SKIP_ROWS, cy);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, cx, cy, 32, 32, gl.RED_INTEGER, gl.UNSIGNED_SHORT, src);
    };
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const probe = new Uint16Array(1024 * 1024);
    for (let i = 0; i < probe.length; i++) probe[i] = (i * 2654435761) >>> 20;
    for (let cy = 0; cy < 1024; cy += 32) for (let cx = 0; cx < 1024; cx += 32) patch(probe, cx, cy);
    for (let i = 0; i < 32 * 32; i++) probe[(400 + (i >> 5)) * 1024 + 96 + (i & 31)] ^= 0x5a5a;
    for (let cy = 384; cy < 1024 && cy < 448 + 32; cy += 32) patch(probe, 96, cy);
    const back = new Uint32Array(32 * 32 * 4);
    let bad = 0;
    for (const [cx, cy] of [[96, 384], [96, 416], [96, 448], [64, 416], [0, 0], [992, 992]]) {
      gl.readPixels(cx, cy, 32, 32, gl.RGBA_INTEGER, gl.UNSIGNED_INT, back);
      for (let r = 0; r < 32; r++) for (let c = 0; c < 32; c++) bad += back[(r * 32 + c) * 4] !== probe[(cy + r) * 1024 + cx + c];
    }
    info.patchReadbackMismatches = bad;
    info.glError = gl.getError();
    upload = (m) => {
      const n = m.dirtyCount;
      for (let d = 0; d < n; d++) {
        const c = m.dirtyList[d];
        patch(m.tile, (c % m.cw) * 32, ((c / m.cw) | 0) * 32);
        m.dirty[c] = 0;
      }
      m.dirtyCount = 0;
      if (n) gl.finish();
      return { chunks: n, bytes: n * 2048 };
    };
  }
  const withGl = runKernelBench({ warm, samples, upload });
  const noGl = runKernelBench({ warm, samples });
  return { info, userAgent: navigator.userAgent, withGl, noGl };
}, { warm, samples });
const version = browser.version();
await browser.close();

const out = {
  machine: { node: process.version, v8: process.versions.v8, chromium: version, cpu: os.cpus()[0].model.trim(), os: `${os.type()} ${os.release()}`, when: new Date().toISOString() },
  config: { warm, samples, setup: 'diff undo, plan-then-apply tidy once per edit' },
  node: nodeRun, chromium: browserRun,
};
writeFileSync(path.join(here, 'results-browser.json'), JSON.stringify(out, null, 1));
const f = (q) => `${q.median.toFixed(3)} [${q.min.toFixed(3)}–${q.max.toFixed(3)}]`;
console.log(`node ${process.version} / chromium ${version}, ${browserRun.info.renderer}, isolated ${browserRun.info.crossOriginIsolated}, timer step ${browserRun.info.timerStepMs} ms, patch mismatches ${browserRun.info.patchReadbackMismatches}, gl error ${browserRun.info.glError}`);
for (let i = 0; i < nodeRun.results.length; i++) {
  const n = nodeRun.results[i], c = browserRun.noGl.results[i], g = browserRun.withGl.results[i];
  console.log(`${n.scenario.padEnd(18)} node ${f(n.strokeMs)} | chromium ${f(c.strokeMs)} | chromium+GL stroke ${f(g.strokeMs)} flush med ${g.flushMs.median.toFixed(3)} p99 ${g.flushMs.p99.toFixed(3)} max ${g.flushMs.max.toFixed(3)} | event p99 node ${n.eventMs.p99.toFixed(3)} chromium ${c.eventMs.p99.toFixed(3)} | undo+flush GL ${f(g.undoWithFlushMs)}`);
}
