// Cold-load startup benchmark: CDP network + CPU throttling, performance marks from page and worker.
import { serve, throttle } from './server.mjs'; import { launch, NET, median, r1 } from './lib-bench.mjs'; import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os';
const NETS = { none: { rtt: 0, bps: 0, connRtts: 0 }, fast4g: { rtt: 165, bps: 1012500, connRtts: 3 }, fast4gWarm: { rtt: 165, bps: 1012500, connRtts: 0 }, slow4g: { rtt: 562.5, bps: 180000, connRtts: 3 } };
const PROFILES = { desktop: { net: 'none', cpu: 1 }, 'fast4g-4x': { net: 'fast4g', cpu: 4 }, 'fast4g-4x-warmconn': { net: 'fast4gWarm', cpu: 4 }, 'fast4g-6x': { net: 'fast4g', cpu: 6 }, 'slow4g-4x': { net: 'slow4g', cpu: 4 } };
const RUNS = +(process.env.RUNS || 7);
const CONFIGS = JSON.parse(process.env.CONFIGS || '[["split","", "desktop"]]'); // [variantDir, query, profile]
const servers = {}; let port = 8100;
const la = () => +fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0];
async function waitLoad(max = +(process.env.MAXLOAD || 1.5), sec = +(process.env.WAITSEC || 120)) { const t0 = Date.now(); while (la() > max && Date.now() - t0 < sec * 1000) await new Promise((r) => setTimeout(r, 5000)); return la(); }
const browser = await launch(); const results = [];
for (const [variant, query, prof] of CONFIGS) {
  if (!servers[variant]) servers[variant] = { port: port, srv: await serve(path.resolve('dist-app', variant), port++, { coi: true }) };
  const P = { ...PROFILES[prof] }; if (process.env.CPU_RATE) P.cpu = +process.env.CPU_RATE; const runs = []; const gate = await waitLoad();
  for (let r = 0; r < RUNS; r++) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, locale: 'en-US' }); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
    Object.assign(throttle, NETS[P.net]);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: P.cpu }); await cdp.send('Performance.enable', { timeDomain: 'timeTicks' });
    const load = la();
    const sep = query.includes('?') ? '&' : '?'; await page.goto(`http://127.0.0.1:${servers[variant].port}/index.html${query}${sep}wslow=${P.cpu}`, { waitUntil: 'commit', timeout: 120000 });
    await page.waitForFunction(() => window.__startup, null, { timeout: 120000, polling: 50 });
    const s = await page.evaluate(() => window.__startup);
    const met = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    let calib = null; if (process.env.CALIB) calib = await page.evaluate(async () => { const w = await window.__lazy.sim.calib(); const t0 = performance.now(); let x = 0; for (let i = 0; i < 3e7; i++) x = (x + i * 7) % 1000003; return { worker: w.ms, main: performance.now() - t0 }; });
    const m = s.marks; const find = (re) => s.res.find((x) => re.test(x.name));
    const entry = find(/^index-.*\.js$/), wjs = find(/^worker-.*\.js$/), map = find(/^town-/), atlas = find(/^atlas2048/);
    const initialBytes = s.res.filter((x) => x.end <= m['frame:first']).reduce((a, x) => a + x.transfer, 0) + s.nav.transfer;
    runs.push({ load, htmlEnd: s.nav.responseEnd, entryEnd: entry?.end, mainEval: m['main:eval'], workerNew: m['worker:new'], workerJsEnd: wjs?.end ?? null, wEval: m['w:eval'], mapEnd: map?.end, mapFetched: m['map:fetched'],
      parseMs: m['w:parse1'] - m['w:parse0'], spawnMs: m['w:spawned'] - m['w:parse1'], simReady: m['sim:ready'], glReadyMs: m['gl:ready'] - m['main:eval'],
      atlasFetched: m['atlas:fetched'], atlasDecodeMs: m['atlas:decoded'] - m['atlas:fetched'], atlasUploadMs: m['atlas:uploaded'] - m['atlas:decoded'],
      firstFrame: m['frame:first'], presented: m['frame:presented'], hudMounted: m['hud:mounted'], lazyLoaded: m['lazy:loaded'], controlsMounted: m['controls:mounted'], chartMounted: m['chart:mounted'], interactive: m['app:interactive'], initialKB: initialBytes / 1024, totalKB: (s.res.reduce((a, x) => a + x.transfer, 0) + s.nav.transfer) / 1024,
      loafTop: s.loaf.filter((l) => l.start < m['app:interactive'] + 50).sort((a, b) => b.dur - a.dur).slice(0, 4), longTaskMs: s.longTasks.reduce((a, b) => a + b, 0), longTasks: s.longTasks.length, v8CompileMs: met.V8CompileDuration * 1000, scriptMs: met.ScriptDuration * 1000, taskMs: met.TaskDuration * 1000, heapMB: met.JSHeapUsedSize / 1048576, calib });
    await ctx.close();
  }
  const keys = Object.keys(runs[0]).filter((k) => typeof runs[0][k] === 'number' || runs.some((x) => typeof x[k] === 'number'));
  const summary = {}; for (const k of keys) { const v = runs.map((x) => x[k]).filter((x) => typeof x === 'number' && !Number.isNaN(x)); if (v.length) summary[k] = { med: r1(median(v)), min: r1(Math.min(...v)), max: r1(Math.max(...v)) }; }
  if (runs[0].calib) summary.calib = runs.map((x) => x.calib);
  const rec = { variant, query, prof, runs: RUNS, gateLoad: gate, summary, loaf0: runs[0].loafTop }; results.push(rec);
  console.log(`\n### ${variant}${query} @ ${prof} (load at gate ${gate})`); for (const k of ['htmlEnd', 'entryEnd', 'mainEval', 'workerNew', 'workerJsEnd', 'wEval', 'mapEnd', 'parseMs', 'spawnMs', 'simReady', 'glReadyMs', 'atlasFetched', 'atlasDecodeMs', 'atlasUploadMs', 'firstFrame', 'presented', 'hudMounted', 'lazyLoaded', 'controlsMounted', 'chartMounted', 'interactive', 'initialKB', 'totalKB', 'longTaskMs', 'v8CompileMs', 'scriptMs', 'heapMB', 'load'])
    if (summary[k]) console.log(`  ${k.padEnd(14)} ${String(summary[k].med).padStart(8)}  [${summary[k].min} – ${summary[k].max}]`);
  console.log('  LoAF (run0, top):', JSON.stringify(runs[0].loafTop)); if (summary.calib) console.log('  calib', JSON.stringify(summary.calib.map((c) => ({ w: r1(c.worker), m: r1(c.main) }))));
}
fs.writeFileSync(process.env.OUT || 'startup.json', JSON.stringify(results, null, 1));
await browser.close(); for (const s of Object.values(servers)) s.srv.close();
