// Reports which GPU path the repo-local Chromium gets under different flag sets.
// Run: PLAYWRIGHT_BROWSERS_PATH=0 node probe-gpu.mjs
import { chromium } from 'playwright';

const FLAG_SETS = {
  default: [],
  gpu: ['--enable-gpu', '--ignore-gpu-blocklist'],
  gpuD3d11: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'],
  gpuWebgpu: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-unsafe-webgpu'],
};

async function probe(page) {
  return page.evaluate(async () => {
    const out = {};
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      out.webgl2 = {
        vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        pointSizeRange: Array.from(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)),
        timerQuery: !!gl.getExtension('EXT_disjoint_timer_query_webgl2'),
        colorBufferFloat: !!gl.getExtension('EXT_color_buffer_float'),
        floatBlend: !!gl.getExtension('EXT_float_blend'),
      };
    } else out.webgl2 = null;
    if ('gpu' in navigator) {
      try {
        const a = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (a) {
          const info = a.info || {};
          out.webgpu = {
            vendor: info.vendor, architecture: info.architecture, description: info.description,
            isFallback: !!(info.isFallbackAdapter ?? a.isFallbackAdapter),
            timestamp: a.features.has('timestamp-query'),
            maxStorageBufferBindingSize: a.limits.maxStorageBufferBindingSize,
            maxBufferSize: a.limits.maxBufferSize,
          };
        } else out.webgpu = 'no adapter';
      } catch (e) { out.webgpu = 'error: ' + e.message; }
    } else out.webgpu = 'navigator.gpu missing';
    out.ua = navigator.userAgent;
    out.hardwareConcurrency = navigator.hardwareConcurrency;
    out.deviceMemory = navigator.deviceMemory;
    out.crossOriginIsolated = self.crossOriginIsolated;
    return out;
  });
}

// http://localhost is a secure context, which navigator.gpu requires; a data: URL is not.
const headers = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' };
for (const [name, args] of Object.entries(FLAG_SETS)) {
  const browser = await chromium.launch({ channel: 'chromium', headless: true, args });
  const page = await browser.newPage();
  await page.route('http://localhost:9/probe', (r) => r.fulfill({ contentType: 'text/html', headers, body: '<title>probe</title>' }));
  await page.goto('http://localhost:9/probe');
  const r = await probe(page);
  console.log(name, JSON.stringify(r, null, 1));
  await browser.close();
}
