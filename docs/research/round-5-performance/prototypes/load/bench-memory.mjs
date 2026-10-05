// Memory per tier: measureUserAgentSpecificMemory (COOP/COEP), CDP main-thread heap, and PSS/RSS of renderer + GPU processes.
import { serve } from './server.mjs'; import { launch, r1, FULL_CHROME } from './lib-bench.mjs'; import path from 'node:path'; import fs from 'node:fs'; import { execSync } from 'node:child_process';
const TAG = 'memtag' + process.pid;
const srv = await serve(path.resolve('dist-app/split'), 8196, { coi: true });
const browser = await launch(['--enable-blink-features=ForceEagerMeasureMemory', '--' + TAG], FULL_CHROME);
const procs = () => { const rows = execSync('ps -eo pid,ppid,args --no-headers').toString().trim().split('\n').map((l) => { const m = l.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/); return { pid: +m[1], ppid: +m[2], args: m[3] }; });
  const root = rows.find((r) => r.args.includes(TAG) && !r.args.includes('--type=')); const kids = new Set([root.pid]); let grew = true;
  while (grew) { grew = false; for (const r of rows) if (!kids.has(r.pid) && kids.has(r.ppid)) { kids.add(r.pid); grew = true; } }
  const mem = (pid) => { try { const s = fs.readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8'); const g = (k) => +(s.match(new RegExp(k + ':\\s+(\\d+)')) || [0, 0])[1] / 1024; return { rss: g('Rss'), pss: g('Pss') }; } catch { return { rss: 0, pss: 0 }; } };
  const out = { renderer: { rss: 0, pss: 0 }, gpu: { rss: 0, pss: 0 }, browser: mem(root.pid), other: { rss: 0, pss: 0 } };
  for (const r of rows) if (kids.has(r.pid) && r.pid !== root.pid) { const k = r.args.includes('--type=renderer') ? 'renderer' : r.args.includes('--type=gpu-process') ? 'gpu' : 'other'; const m = mem(r.pid); out[k].rss += m.rss; out[k].pss += m.pss; }
  return out; };
const rows = [];
for (const q of ['?n=0', '?n=10000', '?n=25000', '?n=100000', '?n=10000&skin=town&atlas=webp', '?n=100000&skin=town&atlas=webp']) for (let rep = 0; rep < 3; rep++) {
  const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  const base = procs();
  await page.goto('http://127.0.0.1:8196/index.html' + q); await page.waitForFunction(() => window.__startup, null, { timeout: 120000 }); await page.waitForTimeout(3000);
  const uasm = await page.evaluate(async () => { const m = await performance.measureUserAgentSpecificMemory(); const by = {}; for (const b of m.breakdown) { const scope = b.attribution.map((a) => a.scope).join('+') || 'none'; const key = scope + ':' + b.types.join('+'); by[key] = (by[key] || 0) + b.bytes; } return { total: m.bytes, by }; });
  const simBytes = await page.evaluate(() => window.__lazy.sim.bytes());
  await cdp.send('Performance.enable'); const met = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const p = procs();
  rows.push({ q, rep, uasmMB: uasm.total / 1048576, uasmBy: Object.fromEntries(Object.entries(uasm.by).map(([k, v]) => [k, r1(v / 1048576)])), simStateMB: simBytes / 1048576, mainHeapUsedMB: met.JSHeapUsedSize / 1048576, mainHeapTotalMB: met.JSHeapTotalSize / 1048576,
    rendererPssMB: p.renderer.pss, gpuPssMB: p.gpu.pss, gpuRssMB: p.gpu.rss, browserPssMB: p.browser.pss, totalPssMB: p.renderer.pss + p.gpu.pss + p.browser.pss + p.other.pss, load: fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0] });
  const r = rows[rows.length - 1]; console.log(q, rep, JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? r1(v) : v]))));
  await ctx.close(); await new Promise((res) => setTimeout(res, 1500));
}
fs.writeFileSync('memory.json', JSON.stringify(rows, null, 1)); await browser.close(); srv.close();
