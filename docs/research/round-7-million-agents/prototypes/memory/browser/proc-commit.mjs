// Commit charge and working set of the engine's processes before and after creating memories in a page.
// node proc-commit.mjs [chromium|firefox|webkit]
import { chromium, firefox, webkit } from 'playwright';
import { execFileSync } from 'node:child_process';
import { serve } from './server.mjs';
import { machine, save } from '../lib.mjs';

const MiB = 2 ** 20;
const name = process.argv[2] || 'webkit';
const launchers = { chromium: () => chromium.launch({ channel: 'chromium' }), firefox: () => firefox.launch(), webkit: () => webkit.launch() };
const PROC = { chromium: 'chrome', firefox: 'firefox', webkit: 'WebKit*' };

function totals() {
  const cmd = `Get-Process -Name '${PROC[name]}' -ErrorAction SilentlyContinue | ForEach-Object { "$($_.Id) $($_.WorkingSet64) $($_.PrivateMemorySize64) $($_.ProcessName)" }`;
  const rows = execFileSync('powershell.exe', ['-NoProfile', '-Command', cmd], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean)
    .map((l) => { const [pid, ws, commit, pname] = l.trim().split(/\s+/); return { pid: +pid, ws: +ws, commit: +commit, pname }; });
  return rows;
}
const sum = (rows) => ({ wsMiB: +(rows.reduce((a, r) => a + r.ws, 0) / MiB).toFixed(1), commitMiB: +(rows.reduce((a, r) => a + r.commit, 0) / MiB).toFixed(1), n: rows.length });
const delta = (a, b) => ({ wsMiB: +(b.wsMiB - a.wsMiB).toFixed(1), commitMiB: +(b.commitMiB - a.commitMiB).toFixed(1) });

const { server, origin } = await serve();
const browser = await launchers[name]();
const page = await (await browser.newContext()).newPage();
await page.goto(`${origin}/browser/page.html?g=env`);
await page.waitForFunction(() => window.__done !== undefined);
const steps = [
  ['shared 16 MiB, max 4 GiB', () => { window.__m1 = new WebAssembly.Memory({ initial: 256, maximum: 65536, shared: true }); window.__m1.buffer; }],
  ['shared 1 GiB, max 1 GiB, untouched', () => { window.__m2 = new WebAssembly.Memory({ initial: 16384, maximum: 16384, shared: true }); window.__m2.buffer; }],
  ['touch 256 MiB of it', () => { const u = new Uint8Array(window.__m2.buffer); for (let i = 0; i < 256 * 2 ** 20; i += 4096) u[i] = 1; }],
  ['non-shared 1 GiB, max 4 GiB, untouched', () => { window.__m3 = new WebAssembly.Memory({ initial: 16384, maximum: 65536 }); window.__m3.buffer; }],
];
const out = { machine: machine(), engine: name, version: browser.version(), steps: [] };
let prev = sum(totals());
out.baseline = prev;
for (const [label, fn] of steps) {
  await page.evaluate(fn);
  await new Promise((r) => setTimeout(r, 500));
  const now = sum(totals());
  out.steps.push({ label, ...delta(prev, now) });
  console.log(name, label.padEnd(40), 'commit +', delta(prev, now).commitMiB, 'MiB | working set +', delta(prev, now).wsMiB, 'MiB');
  prev = now;
}
await browser.close();
server.close();
save(`proc-commit-${name}.json`, out);
