// Does CDP CPU throttling reach a dedicated worker? Page-level vs. worker-target-level (non-flatten session).
import { serve } from './server.mjs'; import { launch, median, r1 } from './lib-bench.mjs'; import path from 'node:path';
const srv = await serve(path.resolve('dist-app/split'), 8198, { coi: true }); const browser = await launch();
const ctx = await browser.newContext({ locale: 'en-US' }); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
await page.goto('http://127.0.0.1:8198/index.html'); await page.waitForFunction(() => window.__startup);
const calib = () => page.evaluate(async () => { const out = []; for (let i = 0; i < 3; i++) out.push((await window.__lazy.sim.calib()).ms); const t0 = performance.now(); let x = 0; for (let i = 0; i < 3e7; i++) x = (x + i * 7) % 1000003; return { w: out, m: performance.now() - t0 }; });
await page.evaluate(() => window.__lazy.sim.stop());
// worker session via browser-level CDP, non-flatten
const b = await browser.newBrowserCDPSession(); const { targetInfos } = await b.send('Target.getTargets'); const wt = targetInfos.find((t) => t.type === 'worker');
console.log('worker target', wt?.type, wt?.url?.split('/').pop());
let msgId = 1; const pending = new Map(); b.on('Target.receivedMessageFromTarget', (e) => { const m = JSON.parse(e.message); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const { sessionId } = await b.send('Target.attachToTarget', { targetId: wt.targetId, flatten: false });
const wsend = (method, params = {}) => new Promise((res) => { const id = msgId++; pending.set(id, res); b.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id, method, params }) }); });
for (const rate of [1, 4, 6]) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate }); await wsend('Emulation.setCPUThrottlingRate', { rate: 1 });
  const a = await calib();
  const resp = await wsend('Emulation.setCPUThrottlingRate', { rate });
  const c = await calib();
  console.log(`rate ${rate}: page-only -> worker ${a.w.map(r1)} main ${r1(a.m)} | +worker-target throttle (${resp.error ? 'ERR ' + resp.error.message : 'ok'}) -> worker ${c.w.map(r1)} main ${r1(c.m)}`);
}
await browser.close(); srv.close();
