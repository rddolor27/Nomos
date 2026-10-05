// node browser/run-chromium.mjs <suite> [quick] [trace-gc] [webgpu]
import { createRequire } from 'node:module'; import { readFileSync, writeFileSync } from 'node:fs';
import { startServer } from './server.mjs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const suite = process.argv[2] || 'probe'; const quick = process.argv.includes('quick');
const loadavg = () => readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3).join(' ');
const args = [];
if (process.argv.includes('trace-gc')) args.push('--js-flags=--trace-gc');
if (process.argv.includes('webgpu')) args.push('--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--use-angle=swiftshader');
const srv = await startServer(0, !process.argv.includes('no-coi'));
const port = srv.address().port;
const server = await chromium.launchServer({ headless: true, args });
const gcLines = [];
const onOut = (d) => { for (const line of String(d).split('\n')) if (/Scavenge|Mark-Compact|Mark-sweep|Minor Mark/.test(line)) gcLines.push(line.trim()); };
server.process().stdout.on('data', onOut); server.process().stderr.on('data', onOut);
const browser = await chromium.connect(server.wsEndpoint());
const version = browser.version();
console.log('chromium', version, 'args', args.join(' '), 'load', loadavg());
const page = await browser.newPage();
page.on('console', (m) => console.log(`[${loadavg()}] ${m.text()}`));
await page.goto(`http://127.0.0.1:${port}/browser/index.html?suite=${suite}&quick=${quick ? 1 : 0}`);
await page.waitForFunction(() => window.__result || window.__error, null, { timeout: 40 * 60 * 1000, polling: 1000 });
const { result, error } = await page.evaluate(() => ({ result: window.__result, error: window.__error }));
if (error) console.log('ERROR', error);
if (result) { result.env = Object.assign(result.env || {}, { chromium: version, args, loadEnd: loadavg() }); if (gcLines.length) result.traceGc = gcLines;
  writeFileSync(new URL(`../results/${suite}-chromium${quick ? '-quick' : ''}${process.argv.includes('webgpu') ? '-webgpu' : ''}${process.argv.includes('trace-gc') ? '-tracegc' : ''}.json`, import.meta.url), JSON.stringify(result, null, 1)); }
console.log('gc trace lines captured:', gcLines.length, gcLines.slice(0, 3));
await browser.close(); await server.close(); srv.close();
