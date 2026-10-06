// Throwaway research code for round 8 (culture transmission). Never import from product code.
import os from 'node:os';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = dirname(fileURLToPath(import.meta.url));

// Keyed counter-based draw from round 4 (lowbias32 rounds); depends only on its four inputs.
export function mix32(x) {
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15; x = Math.imul(x, 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}
export function draw(seed, entity, tick, stream) {
  return mix32(mix32(mix32(mix32(seed ^ 0x85ebca6b) ^ entity) ^ tick) ^ (stream + 0x9e3779b9));
}

// Probability as an unsigned 32-bit threshold: event iff draw < thr.
export const thr = (p) => (p <= 0 ? 0 : p >= 1 ? 0x100000000 : Math.floor(p * 0x100000000));

export function machine() {
  const c = os.cpus();
  return {
    cpu: c[0].model.trim(),
    logicalCpus: c.length,
    ramGiB: +(os.totalmem() / 2 ** 30).toFixed(1),
    node: process.version,
    v8: process.versions.v8,
    os: `${os.platform()} ${os.release()} ${os.arch()}`,
  };
}

// Windows has no load average; report busy logical CPUs over a short window instead.
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

export function stats(xs) {
  const s = Float64Array.from(xs).sort();
  const n = s.length;
  const med = n % 2 ? s[(n - 1) >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2;
  return { median: +med.toPrecision(4), min: +s[0].toPrecision(4), max: +s[n - 1].toPrecision(4), n };
}

export const fmt = (st, unit = '') => `${st.median}${unit} [${st.min}-${st.max}] (n=${st.n})`;

export function save(name, data) {
  const dir = join(HERE, 'results');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), JSON.stringify(data, null, 1));
}

export function parseArgs(argv, defaults) {
  const out = { ...defaults };
  for (const a of argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (!m) continue;
    const k = m[1], v = m[2];
    out[k] = typeof defaults[k] === 'number' ? Number(v) : v;
  }
  return out;
}

// FNV-1a over typed-array bytes, for replay hashes.
export function hashArrays(...arrs) {
  let h = 0x811c9dc5;
  for (const a of arrs) {
    const u8 = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
    for (let i = 0; i < u8.length; i++) { h ^= u8[i]; h = Math.imul(h, 0x01000193); }
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
