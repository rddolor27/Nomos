import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KiB = 1024, MiB = 1024 * KiB, GiB = 1024 * MiB, PAGE = 65536;
export const HERE = dirname(fileURLToPath(import.meta.url));

export function machine() {
  const c = os.cpus();
  return {
    cpu: c[0].model.trim(),
    logicalCpus: c.length,
    ramGiB: +(os.totalmem() / GiB).toFixed(2),
    freeGiB: +(os.freemem() / GiB).toFixed(2),
    node: process.version,
    v8: process.versions.v8,
    os: `${os.platform()} ${os.release()} ${os.arch()}`,
  };
}

// Windows has no /proc/loadavg and os.loadavg() returns zeros, so report busy logical CPUs instead.
export async function cpuBusy(ms = 1000) {
  const a = os.cpus();
  await new Promise((r) => setTimeout(r, ms));
  const b = os.cpus();
  let idle = 0, total = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i].times, y = b[i].times;
    total += (y.user - x.user) + (y.nice - x.nice) + (y.sys - x.sys) + (y.idle - x.idle) + (y.irq - x.irq);
    idle += y.idle - x.idle;
  }
  return +((1 - idle / total) * a.length).toFixed(2);
}

// Working set = resident pages; private bytes = commit charge; virtual = reserved + committed address space.
export function procMem(pid = process.pid) {
  if (process.platform !== 'win32') return { workingSet: process.memoryUsage().rss };
  const cmd = `$p=Get-Process -Id ${pid}; "$($p.WorkingSet64) $($p.PrivateMemorySize64) $($p.VirtualMemorySize64)"`;
  const out = execFileSync('powershell.exe', ['-NoProfile', '-Command', cmd], { encoding: 'utf8' }).trim();
  const [workingSet, commit, virtual] = out.split(/\s+/).map(Number);
  return { workingSet, commit, virtual };
}

export const mib = (b) => +(b / MiB).toFixed(1);

export function stats(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  const med = n % 2 ? s[(n - 1) >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2;
  return { median: +med.toFixed(4), min: +s[0].toFixed(4), max: +s[n - 1].toFixed(4), n };
}

export function fmt(st, unit = '') {
  return `${st.median}${unit} [${st.min}–${st.max}] (n=${st.n})`;
}

export function save(name, data) {
  const dir = join(HERE, 'results');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), JSON.stringify(data, null, 2));
}
