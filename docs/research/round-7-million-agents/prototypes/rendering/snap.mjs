// Renders a few configurations once and saves PNGs to an output folder, to check the frames by eye.
// Run: PLAYWRIGHT_BROWSERS_PATH=0 node snap.mjs <outDir>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { startServer } from './serve.mjs';

const out = process.argv[2] || 'snaps';
mkdirSync(out, { recursive: true });
const CONFIGS = [
  { n: 1000000, prim: 'points', size: 1, view: 'city' },
  { n: 1000000, prim: 'points', size: 5, view: 'city' },
  { n: 1000000, prim: 'points', size: 5, view: 'district' },
  { n: 1000000, prim: 'quads', size: 5, view: 'district' },
  { n: 1000000, prim: 'points', size: 5, view: 'street' },
  { n: 1000000, prim: 'quads', size: 5, view: 'street', tex: true },
  { n: 1000000, heat: true, view: 'city' },
  { n: 1000000, heat: true, view: 'district' },
];
const server = await startServer(8791);
const browser = await chromium.launch({ channel: 'chromium', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.goto('http://localhost:8791/index.html?bench=1');
await page.waitForFunction(() => window.__ready === true);
for (const c of CONFIGS) {
  const r = await page.evaluate((p) => window.suite.snapshot({ ...p, png: true }), c);
  const name = `${c.heat ? 'heat' : c.prim + c.size + (c.tex ? 'tex' : '')}-${c.view}.png`;
  writeFileSync(join(out, name), Buffer.from(r.url.split(',')[1], 'base64'));
  console.log(name, `err=${r.err} lit=${r.lit} (${(r.litShare * 100).toFixed(1)}%) visible=${r.visible}`);
}
await browser.close();
server.close();
