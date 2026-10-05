import { serve } from './server.mjs'; import { launch, median, pct, r2 } from './lib-bench.mjs'; import path from 'node:path'; import fs from 'node:fs';
if (process.env.VERBOSE) console.log('boot');
const FWS = (process.env.FWS || 'vanilla,lit,preact,solid,svelte,react').split(','); const RATES = (process.env.RATES || '1,4,6').split(',').map(Number);
const LOADS = +(process.env.LOADS || 5);
const srv = await serve(path.resolve('dist-ui'), 8091, { coi: true });
if (process.env.VERBOSE) console.log('served'); const browser = await launch(); const out = {}; if (process.env.VERBOSE) console.log('launched');
const la = () => +fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0];
async function waitLoad(max = +(process.env.MAXLOAD || 2.0), sec = +(process.env.WAITSEC || 30)) { const t0 = Date.now(); while (la() > max && Date.now() - t0 < sec * 1000) await new Promise((r) => setTimeout(r, 5000)); return la(); }
const textOf = () => ['.tiles', '.inspector', '.log'].map((s) => document.querySelector(s).textContent.replace(/\s+/g, '')).join('|');
const T0 = Date.now();
for (const fw of FWS) for (const rate of RATES) {
  const runs = []; const gate = await waitLoad();
  for (let l = 0; l < LOADS; l++) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
    if (process.env.VERBOSE) console.log('  start', fw, rate, l, ((Date.now() - T0) / 1000).toFixed(1));
    await page.goto(`http://127.0.0.1:8091/${fw}/index.html`); await page.waitForFunction(() => window.__ui);
    // correctness: same DOM text after a fixed sequence of updates
    let sig = null;
    if (l === 0 && rate === 1) { sig = await page.evaluate(async (tf) => { for (let i = 1; i <= 137; i++) { window.__ui.apply(i); await window.__ui.flush(); } return eval('(' + tf + ')')(); }, textOf.toString()); }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    // micro: synchronous update + framework flush + forced style/layout, per update
    const micro = await page.evaluate(async () => {
      const ui = window.__ui; const t = []; let i = 200;
      for (let w = 0; w < 100; w++) { ui.apply(i++); await ui.flush(); document.documentElement.offsetHeight; }
      const s = []; for (let k = 0; k < 300; k++) { const t0 = performance.now(); ui.apply(i++); await ui.flush(); const t1 = performance.now(); document.documentElement.offsetHeight; t.push(performance.now() - t0); s.push(t1 - t0); }
      return { t, s };
    });
    if (process.env.VERBOSE) console.log('  micro done', ((Date.now() - T0) / 1000).toFixed(1));
    // holistic: natural scheduling at 10 Hz for 5 s, CDP main-thread metrics incl. style/layout/paint tasks
    await cdp.send('Performance.enable', { timeDomain: 'timeTicks' });
    const getM = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    const idle0 = await getM(); await page.waitForTimeout(+(process.env.IDLE_MS || 1500)); const idle1 = await getM();
    const m0 = await getM();
    const n = await page.evaluate((NUPD) => new Promise((res) => { let i = 600, c = 0; const id = setInterval(() => { window.__ui.apply(i++); if (++c === NUPD) { clearInterval(id); setTimeout(() => res(c), 300); } }, 100); }), +(process.env.NUPD || 30));
    const m1 = await getM();
    const span = (a, b, k) => b[k] - a[k];
    const idleRate = span(idle0, idle1, 'TaskDuration') / span(idle0, idle1, 'Timestamp');
    const busySpan = span(m0, m1, 'Timestamp');
    const holistic = { taskMsPerUpdate: (span(m0, m1, 'TaskDuration') - idleRate * busySpan) * 1000 / n, scriptMsPerUpdate: span(m0, m1, 'ScriptDuration') * 1000 / n,
      layoutMsPerUpdate: span(m0, m1, 'LayoutDuration') * 1000 / n, styleMsPerUpdate: span(m0, m1, 'RecalcStyleDuration') * 1000 / n, heapMB: m1.JSHeapUsedSize / 1048576, nodes: m1.Nodes };
    runs.push({ load: la(), med: median(micro.t), p95: pct(micro.t, 0.95), smed: median(micro.s), sp95: pct(micro.s, 0.95), holistic, sig });
    await ctx.close(); if (process.env.VERBOSE) console.log('  load', l, fw, rate, ((Date.now() - T0) / 1000).toFixed(1) + 's', 'la', la());
  }
  const key = `${fw}@${rate}x`;
  out[key] = { microMedian: r2(median(runs.map((r) => r.med))), microMedianMin: r2(Math.min(...runs.map((r) => r.med))), microMedianMax: r2(Math.max(...runs.map((r) => r.med))),
    microP95: r2(median(runs.map((r) => r.p95))), scriptOnlyMedian: r2(median(runs.map((r) => r.smed))), scriptOnlyP95: r2(median(runs.map((r) => r.sp95))), taskMs: r2(median(runs.map((r) => r.holistic.taskMsPerUpdate))), taskMin: r2(Math.min(...runs.map((r) => r.holistic.taskMsPerUpdate))), taskMax: r2(Math.max(...runs.map((r) => r.holistic.taskMsPerUpdate))),
    scriptMs: r2(median(runs.map((r) => r.holistic.scriptMsPerUpdate))), layoutMs: r2(median(runs.map((r) => r.holistic.layoutMsPerUpdate))), styleMs: r2(median(runs.map((r) => r.holistic.styleMsPerUpdate))),
    heapMB: r2(median(runs.map((r) => r.holistic.heapMB))), nodes: runs[0].holistic.nodes, gate, loads: runs.map((r) => r.load), sig: runs[0].sig ? runs[0].sig.length : null };
  console.log(key, JSON.stringify(out[key]).slice(0, 400));
}
const sigs = new Set(Object.values(out).filter((o) => o.sig).map((o) => o.sig)); console.log('distinct DOM signatures across frameworks:', sigs.size);
fs.writeFileSync(process.env.OUT || 'ui-bench.json', JSON.stringify(out, null, 1)); await browser.close(); srv.close();
