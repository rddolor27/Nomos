import { serve } from './server.mjs'; import { launch, r1, r2 } from './lib-bench.mjs'; import path from 'node:path'; import fs from 'node:fs';
const load = () => fs.readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3).join(' ');
const srv = await serve(path.resolve('bench-assets'), 8197, { coi: true }); const browser = await launch(); const out = { loadStart: load() };
const ctx = await browser.newContext({ locale: 'en-US' }); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
await page.goto('http://127.0.0.1:8197/index.html'); await page.waitForFunction(() => window.ready);
for (const rate of [1, 4, 6]) { await cdp.send('Emulation.setCPUThrottlingRate', { rate }); const bi = []; for (let i = 0; i < 3; i++) bi.push(await page.evaluate(() => computeBenchmarkIndex())); out['benchmarkIndex@' + rate + 'x'] = { runs: bi, load: load() }; console.log('BenchmarkIndex', rate + 'x', bi, load()); }
for (const rate of [1, 4]) { await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  for (const f of ['atlas.png', 'atlas.pq.png', 'atlas.webp', 'atlas.avif', 'town.png', 'town.webp', 'town.avif']) { const r = await page.evaluate(([u]) => runDecode(u, 11), [f]); out[`decode ${f} @${rate}x`] = { ...r, load: load() }; console.log(`decode ${f} @${rate}x`, JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, r2(v)]))), load()); }
  for (const [f, k] of [['town.ldtk', 'ldtk'], ['town.trim.json', 'trim'], ['town.bin', 'bin']]) { const r = await page.evaluate(([u, kk]) => runParse(u, kk, 9), [f, k]); out[`parse ${f} @${rate}x`] = { ...r, load: load() }; console.log(`parse ${f} @${rate}x`, JSON.stringify(Object.fromEntries(Object.entries(r).map(([k2, v]) => [k2, r2(v)]))), load()); }
}
fs.writeFileSync('decode.json', JSON.stringify(out, null, 1)); await browser.close(); srv.close();
