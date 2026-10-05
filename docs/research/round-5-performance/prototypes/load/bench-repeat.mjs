// Repeat-visit startup: HTTP cache only vs. service worker precache (tiny hand-written SW vs. Workbox via vite-plugin-pwa), plus offline.
import { serve, throttle } from './server.mjs'; import { launch, median, r1 } from './lib-bench.mjs'; import path from 'node:path'; import fs from 'node:fs';
const RUNS = +(process.env.RUNS || 5); const la = () => +fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0];
const NET = { rtt: 165, bps: 1012500, connRtts: 3 };
const browser = await launch(); let port = 8300; const out = [];
for (const variant of (process.env.VARIANTS || 'early-mp,pwa-tiny,pwa-workbox').split(',')) {
  const srv = await serve(path.resolve('dist-app', variant), port, { coi: true }); const base = `http://127.0.0.1:${port++}`;
  for (const mode of ['repeat', 'offline']) {
    const runs = [];
    for (let r = 0; r < RUNS; r++) {
      Object.assign(throttle, { rtt: 0, bps: 0, connRtts: 0 });
      const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 412, height: 915 } }); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
      await page.goto(base + '/index.html'); await page.waitForFunction(() => window.__startup, null, { timeout: 60000 });
      if (variant.startsWith('pwa')) await page.evaluate(async () => { const t0 = Date.now(); while (Date.now() - t0 < 20000) { const r = await navigator.serviceWorker.getRegistration(); if (r && r.active && r.active.state === 'activated') { const keys = await caches.keys(); let n = 0; for (const k of keys) n += (await (await caches.open(k)).keys()).length; if (n >= 10) return; } await new Promise((res) => setTimeout(res, 250)); } });
      const sw = await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); if (!reg) return 'none'; const keys = await caches.keys(); let n = 0; for (const k of keys) n += (await (await caches.open(k)).keys()).length; return { active: !!reg.active, cached: n }; });
      await page.waitForTimeout(1500);
      await page.goto('about:blank'); Object.assign(throttle, NET); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      if (mode === 'offline') await ctx.setOffline(true);
      let ok = true; try { await page.goto(base + '/index.html?wslow=4', { waitUntil: 'commit', timeout: 30000 }); await page.waitForFunction(() => window.__startup, null, { timeout: 30000 }); } catch (e) { ok = false; }
      if (ok) { const s = await page.evaluate(() => window.__startup); runs.push({ firstFrame: s.marks['frame:first'], interactive: s.marks['app:interactive'], netKB: (s.res.reduce((a, x) => a + x.transfer, 0) + s.nav.transfer) / 1024, sw, load: la() }); }
      else runs.push({ failed: true, sw, load: la() });
      await ctx.close();
    }
    const okRuns = runs.filter((x) => !x.failed); const agg = (k) => okRuns.length ? { med: r1(median(okRuns.map((x) => x[k]))), min: r1(Math.min(...okRuns.map((x) => x[k]))), max: r1(Math.max(...okRuns.map((x) => x[k]))) } : null;
    const row = { variant, mode, ok: okRuns.length, of: runs.length, firstFrame: agg('firstFrame'), interactive: agg('interactive'), netKB: agg('netKB'), sw: runs[0].sw, loads: runs.map((x) => x.load) };
    out.push(row); console.log(JSON.stringify(row));
  }
  srv.close();
}
fs.writeFileSync('repeat.json', JSON.stringify(out, null, 1)); await browser.close();
