// Frame-time benchmark: main-thread upload+draw per rAF and worker sim step per tick, after startup, for 5 s.
import { serve } from './server.mjs'; import { launch, median, pct, r2 } from './lib-bench.mjs'; import path from 'node:path'; import fs from 'node:fs';
const la = () => +fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0];
async function waitLoad(max = 1.5, sec = 60) { const t0 = Date.now(); while (la() > max && Date.now() - t0 < sec * 1000) await new Promise((r) => setTimeout(r, 5000)); return la(); }
const srv = await serve(path.resolve('dist-app/split'), 8195, { coi: true }); const browser = await launch(); const out = [];
for (const [q, rate] of [['?n=10000', 1], ['?n=25000', 1], ['?n=100000', 1], ['?n=10000', 4], ['?n=25000', 4], ['?n=100000', 4], ['?n=10000&skin=town&atlas=webp', 1], ['?n=10000&skin=town&atlas=webp', 4]]) {
  const per = []; const gate = await waitLoad();
  for (let rep = 0; rep < 3; rep++) {
    const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate }); await page.goto(`http://127.0.0.1:8195/index.html${q}&wslow=${rate}`); await page.waitForFunction(() => window.__startup, null, { timeout: 120000 });
    await page.evaluate(() => { window.__startup.frameTimes.length = 0; window.__startup.stepTimes.length = 0; }); await page.waitForTimeout(5000);
    const s = await page.evaluate(() => ({ f: window.__startup.frameTimes.slice(), st: window.__startup.stepTimes.slice() }));
    const bench = await page.evaluate(async () => { await window.__lazy.sim.stop(); return window.__lazy.sim.stepBench(100); });
    per.push({ frames: s.f.length / 5, fMed: median(s.f), fP95: pct(s.f, 0.95), stMed: median(s.st), stP95: pct(s.st, 0.95), benchMed: median(bench), benchP95: pct(bench, 0.95), load: +fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0] });
    await ctx.close();
  }
  const agg = (k) => r2(median(per.map((p) => p[k]))); const row = { q, rate, fps: agg('frames'), mainFrameMed: agg('fMed'), mainFrameP95: agg('fP95'), workerStepMed: agg('stMed'), workerStepP95: agg('stP95'), stepBenchMed: agg('benchMed'), stepBenchP95: agg('benchP95'), gate, load: per.map((p) => p.load) };
  out.push(row); console.log(JSON.stringify(row));
}
fs.writeFileSync(process.env.OUT || 'frames.json', JSON.stringify(out, null, 1)); await browser.close(); srv.close();
