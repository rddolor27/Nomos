// node run.mjs [chromium,firefox,webkit] [group,...]   Writes ../results/browser-<engine>.json
import { chromium, firefox, webkit } from 'playwright';
import { serve } from './server.mjs';
import { machine, cpuBusy, save } from '../lib.mjs';

const MiB = 2 ** 20, GiB = 2 ** 30;
const launchers = {
  chromium: () => chromium.launch({ channel: 'chromium', args: ['--enable-blink-features=ForceEagerMeasureMemory', '--enable-unsafe-webgpu'] }),
  firefox: () => firefox.launch(),
  webkit: () => webkit.launch(),
};
const ALLOC_SETS = {
  alloc: [
    ['wasm', 4 * GiB, 4 * GiB], ['wasmNoMax', 4 * GiB], ['wasmShared', 4 * GiB, 4 * GiB],
    ['wasmShared', GiB, 4 * GiB, 256 * MiB], ['wasmShared', 16 * MiB, 4 * GiB],
    ['wasmShared', 64 * MiB, 65537 * 65536],
    ['ab', 4 * GiB], ['sab', 4 * GiB], ['ab', 8 * GiB], ['sabGrowable', 16 * MiB, 4 * GiB],
    ['wasm64', 16 * MiB, 16 * GiB], ['wasm64', 5 * GiB, 16 * GiB], ['wasm64', 16 * MiB, 16 * GiB + 65536], ['wasm64Shared', 16 * MiB, 16 * GiB],
  ],
  allocAb: [['ab', GiB], ['ab', 2 * GiB - 65536], ['ab', 2 * GiB], ['ab', 3 * GiB], ['ab', 4 * GiB - 65536], ['sab', 2 * GiB], ['sab', 3 * GiB]],
  allocMax: [
    ['wasmShared', 16 * MiB, 64 * MiB], ['wasmShared', 16 * MiB, 256 * MiB], ['wasmShared', 16 * MiB, GiB],
    ['wasmShared', 16 * MiB, 2 * GiB], ['wasmShared', 16 * MiB, 4 * GiB], ['wasm', 16 * MiB, 4 * GiB],
    ['sabGrowable', 16 * MiB, 256 * MiB], ['sabGrowable', 16 * MiB, 4 * GiB], ['wasm64Shared', 16 * MiB, 4 * GiB], ['wasm64Shared', 16 * MiB, 8 * GiB],
  ],
};
const GROUPS = ['env', 'grow', 'growcost', 'mem64', 'gpu', 'uasm', 'probe', 'alloc'];

const engines = (process.argv[2] || 'chromium,firefox,webkit').split(',');
const groups = (process.argv[3] || GROUPS.join(',')).split(',');
const { server, origin } = await serve();

async function open(browser, query, timeout = 180000) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(m.text()));
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
  try {
    await page.goto(`${origin}/browser/page.html?${query}`);
    await page.waitForFunction(() => window.__done !== undefined, null, { timeout });
    return await page.evaluate(() => window.__done);
  } catch (e) {
    return { harnessError: String(e.message).split('\n')[0], logs: logs.slice(-5) };
  } finally { await ctx.close(); }
}

for (const name of engines) {
  const browser = await launchers[name]();
  const out = { machine: machine(), engine: name, version: browser.version(), busyBefore: await cpuBusy(1000), groups: {} };
  console.log(`== ${name} ${out.version}`);
  for (const g of groups) {
    if (ALLOC_SETS[g]) {
      out.groups[g] = [];
      for (const [kind, bytes, max, touch] of ALLOC_SETS[g]) {
        const query = `g=alloc&kind=${kind}&bytes=${bytes}${max ? `&max=${max}` : ''}${touch ? `&touch=${touch}` : ''}`;
        const r = await open(browser, query, 60000);
        out.groups[g].push(r);
        console.log('alloc', kind, bytes / MiB, 'MiB', max ? `max ${max / MiB} MiB` : '', '->', r.error || r.harnessError || `ok ${r.ms?.toFixed(2)} ms${r.firstTouchMs ? ` touch ${r.firstTouchMs.toFixed(1)} ms` : ''}`);
      }
    } else {
      out.groups[g] = await open(browser, `g=${g}`);
      console.log(g, JSON.stringify(out.groups[g]).slice(0, 600));
    }
  }
  out.busyAfter = await cpuBusy(1000);
  await browser.close();
  save(`browser-${name}${groups.length < GROUPS.length ? `-${groups.join('+')}` : ''}.json`, out);
}
server.close();
