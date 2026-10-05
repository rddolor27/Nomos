// node browser/run-speedometer.mjs [runs]  -> Speedometer 3.1 (release/3.1 branch) in headless Chromium on this machine
import { createRequire } from 'node:module'; import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { readFileSync, writeFileSync } from 'node:fs'; import path from 'node:path';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../speedometer31');
const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const srv = http.createServer(async (req, res) => { const u = new URL(req.url, 'http://x'); let p = path.join(root, decodeURIComponent(u.pathname)); if (p.endsWith('/')) p += 'index.html';
  try { const d = await readFile(p); res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const loadavg = () => readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3).join(' ');
const runs = +(process.argv[2] || 3); const out = [];
const browser = await chromium.launch({ headless: true });
console.log('chromium', browser.version());
for (let r = 0; r < runs; r++) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const l0 = loadavg(); const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html?startAutomatically=true&iterationCount=10`);
  await page.waitForFunction(() => /\d/.test(document.getElementById('result-number')?.textContent || ''), null, { timeout: 15 * 60 * 1000, polling: 2000 });
  const score = await page.evaluate(() => [document.getElementById('result-number').textContent, document.getElementById('confidence-number')?.textContent]);
  out.push({ score: score[0], ci: score[1], loadStart: l0, loadEnd: loadavg(), secs: (Date.now() - t0) / 1000 });
  console.log(JSON.stringify(out[out.length - 1]));
  await page.close();
}
writeFileSync(new URL('../results/speedometer31-chromium.json', import.meta.url), JSON.stringify({ chromium: browser.version(), runs: out }, null, 1));
await browser.close(); srv.close();
