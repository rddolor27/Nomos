// Environment record. On Windows os.loadavg() is always [0, 0, 0], so the load proxy is the number of
// busy logical CPUs from os.cpus() time deltas.
import os from 'node:os';

export function envInfo() {
  const c = os.cpus();
  return {
    node: process.version, v8: process.versions.v8, platform: `${os.platform()} ${os.release()}`,
    cpu: c[0].model.trim(), logicalCpus: c.length, totalMemGiB: +(os.totalmem() / 2 ** 30).toFixed(2),
    freeMemGiB: +(os.freemem() / 2 ** 30).toFixed(2), loadavg: os.loadavg(),
  };
}

export function cpuTimes() { return os.cpus().map((c) => c.times); }

export function busyBetween(a, b) {
  let busy = 0;
  for (let k = 0; k < a.length; k++) {
    const x = a[k], y = b[k];
    const db = (y.user - x.user) + (y.nice - x.nice) + (y.sys - x.sys) + (y.irq - x.irq);
    const dt = db + (y.idle - x.idle);
    if (dt > 0) busy += db / dt;
  }
  return +busy.toFixed(2);
}

export async function sampleBusy(ms) {
  const a = cpuTimes();
  await new Promise((r) => setTimeout(r, ms));
  return busyBetween(a, cpuTimes());
}

export function stats(arr, n) {
  const a = Array.from(arr.subarray(0, n)).sort((x, y) => x - y);
  const q = (p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
  return { med: a[a.length >> 1], min: a[0], max: a[a.length - 1], p95: q(0.95), n: a.length };
}
