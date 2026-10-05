import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [,, list, shots] = process.argv;  // list = "s:mode:n:zoom,..."
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const out = [];
for (const spec of list.split(',')) {
  const [s, mode, n, zoom, frames] = spec.split(':');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 300))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  const url = `file://${process.cwd()}/bench.html?s=${s}&mode=${mode || ''}&n=${n}&zoom=${zoom}&frames=${frames || 150}&layers=${spec.split(':')[5] || '012'}&${spec.split(':')[6] || 'x=1'}`;
  const t0 = Date.now();
  try {
    await page.goto(url);
    await page.waitForFunction(() => window.__result, null, { timeout: 600000, polling: 500 });
    const r = await page.evaluate(() => window.__result);
    if (shots) await page.screenshot({ path: `shot_${s}_${mode || 'x'}_${n}_${zoom}_${spec.split(':')[5] || ''}.png` });
    r.wallS = ((Date.now() - t0) / 1000).toFixed(1); r.errs = errs.slice(0, 3).join(' | ');
    out.push(r); console.log(JSON.stringify(r));
  } catch (e) { console.log(JSON.stringify({ spec, error: String(e).slice(0, 300), errs })); }
  await page.close();
}
await browser.close();
