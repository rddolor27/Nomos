import { serve } from './server.mjs'; import { launch } from './lib-bench.mjs'; import path from 'node:path';
const srv = await serve(path.resolve('dist-app', process.argv[2] || 'split'), 8199, { coi: true }); const browser = await launch();
const page = await browser.newPage({ locale: 'en-US' }); page.on('console', (m) => console.log('console', m.type(), m.text())); page.on('pageerror', (e) => console.log('pageerror', e.message));
page.on('worker', (w) => console.log('worker', w.url())); page.on('requestfailed', (r) => console.log('reqfail', r.url(), r.failure()?.errorText));
await page.goto('http://127.0.0.1:8199/index.html' + (process.argv[3] || '')); await page.waitForTimeout(4000);
console.log(await page.evaluate(() => JSON.stringify({ marks: performance.getEntriesByType('mark').map((m) => m.name + '@' + m.startTime.toFixed(0)), su: !!window.__startup, coi: crossOriginIsolated, gl: !!document.createElement('canvas').getContext('webgl2') })));
await browser.close(); srv.close();
