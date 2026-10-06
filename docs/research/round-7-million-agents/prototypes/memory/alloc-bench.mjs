// Fresh-process samples of allocation, commit and first-touch cost. Writes results/alloc.json.
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { HERE, GiB, MiB, machine, cpuBusy, stats, fmt, mib, save } from './lib.mjs';

const SAMPLES = Number(process.env.SAMPLES || 5);
const child = join(HERE, 'alloc-one.mjs');

function run(args) {
  const out = execFileSync(process.execPath, [child, ...args.map(String)], { encoding: 'utf8', maxBuffer: 1 << 20 });
  return JSON.parse(out.trim().split('\n').pop());
}

function touchThatFits(want) {
  const spare = os.freemem() - 1.0 * GiB;
  for (const t of [want, GiB, 512 * MiB, 256 * MiB]) if (t <= want && t <= spare) return t;
  return 0;
}

const configs = [];
for (const kind of ['ab', 'sab', 'wasm', 'wasmShared'])
  for (const g of [1, 2, 3, 4]) configs.push({ group: 'alloc', kind, bytes: g * GiB, touch: 0 });
for (const kind of ['ab', 'sab', 'wasmShared'])
  for (const t of [256 * MiB, GiB]) configs.push({ group: 'touch', kind, bytes: GiB, touch: t });
for (const g of [1, 4]) configs.push({ group: 'growable', kind: 'sabGrowable', bytes: 16 * MiB, max: g * GiB, touch: 0 });

const results = { machine: machine(), samples: SAMPLES, configs: [] };
console.log(results.machine);
for (const c of configs) {
  const busyBefore = await cpuBusy(1000);
  const rows = [];
  for (let s = 0; s < SAMPLES; s++) {
    const touch = c.touch ? touchThatFits(c.touch) : 0;
    if (c.touch && !touch) { rows.push({ skipped: 'not enough free RAM', freeGiB: os.freemem() / GiB }); continue; }
    rows.push(run([c.kind, c.bytes, touch, c.max || c.bytes]));
  }
  const ok = rows.filter((r) => !r.error && !r.skipped);
  const summary = { ...c, busyBefore, errors: rows.filter((r) => r.error).map((r) => r.error), skipped: rows.filter((r) => r.skipped).length };
  if (ok.length) {
    summary.allocMs = stats(ok.map((r) => r.allocMs));
    summary.commitDeltaMiB = stats(ok.map((r) => mib(r.m1.commit - r.m0.commit)));
    summary.virtualDeltaMiB = stats(ok.map((r) => mib(r.m1.virtual - r.m0.virtual)));
    summary.wsDeltaAfterAllocMiB = stats(ok.map((r) => mib(r.m1.workingSet - r.m0.workingSet)));
    if (c.touch) {
      summary.touchedMiB = stats(ok.map((r) => mib(r.touch)));
      summary.firstTouchNsPerPage = stats(ok.map((r) => (r.firstTouchMs * 1e6) / (r.touch / 4096)));
      summary.firstTouchMsPerGiB = stats(ok.map((r) => r.firstTouchMs * (GiB / r.touch)));
      summary.secondTouchMsPerGiB = stats(ok.map((r) => r.secondTouchMs * (GiB / r.touch)));
      summary.fillGBps = stats(ok.map((r) => r.touch / 1e9 / (r.fillMs / 1000)));
      summary.wsDeltaAfterTouchMiB = stats(ok.map((r) => mib(r.m2.workingSet - r.m0.workingSet)));
    }
  }
  summary.busyAfter = await cpuBusy(1000);
  results.configs.push({ summary, rows });
  const line = [`${c.group} ${c.kind} ${mib(c.bytes)} MiB${c.max ? ` max ${mib(c.max)}` : ''}${c.touch ? ` touch ${mib(c.touch)}` : ''}`,
    `busy ${summary.busyBefore}/${summary.busyAfter}`];
  if (summary.allocMs) line.push(`alloc ${fmt(summary.allocMs, ' ms')}`, `commit+ ${summary.commitDeltaMiB.median} MiB`, `virt+ ${summary.virtualDeltaMiB.median} MiB`);
  if (summary.firstTouchNsPerPage) line.push(`1st touch ${fmt(summary.firstTouchNsPerPage, ' ns/page')}`, `2nd ${summary.secondTouchMsPerGiB.median} ms/GiB`, `fill ${summary.fillGBps.median} GB/s`);
  if (summary.errors.length) line.push(`errors: ${summary.errors[0]}`);
  if (summary.skipped) line.push(`skipped ${summary.skipped}`);
  console.log(line.join(' | '));
}
save('alloc.json', results);
