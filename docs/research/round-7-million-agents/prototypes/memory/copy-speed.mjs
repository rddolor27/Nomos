// fill / set / loop-copy throughput on ArrayBuffer vs SharedArrayBuffer vs shared WebAssembly.Memory.
// A 1M-agent render snapshot is 12 MB, so its copy speed decides copy-vs-shared double buffering.
import { MiB, PAGE, machine, cpuBusy, stats, save } from './lib.mjs';

const BYTES = 12 * MiB, WARM = 3, SAMPLES = 9;
const backings = {
  ab: () => new ArrayBuffer(BYTES),
  sab: () => new SharedArrayBuffer(BYTES),
  wasmShared: () => new WebAssembly.Memory({ initial: BYTES / PAGE, maximum: BYTES / PAGE, shared: true }).buffer,
};
const types = { Uint8Array, Int32Array, Float64Array };

function loopCopy(dst, src) {
  for (let i = 0; i < src.length; i++) dst[i] = src[i];
}

function time(fn) {
  for (let i = 0; i < WARM; i++) fn();
  const xs = [];
  for (let i = 0; i < SAMPLES; i++) { const t = performance.now(); fn(); xs.push(performance.now() - t); }
  return stats(xs.map((ms) => BYTES / 1e9 / (ms / 1000)));
}

const res = { machine: machine(), bytes: BYTES, warm: WARM, samples: SAMPLES, busyBefore: await cpuBusy(1000), rows: [] };
for (const [bname, make] of Object.entries(backings)) {
  for (const [tname, T] of Object.entries(types)) {
    const a = new T(make()), plainDst = new T(new ArrayBuffer(BYTES)), plainSrc = new T(new ArrayBuffer(BYTES));
    a.fill(1); plainDst.fill(1); plainSrc.fill(3);
    const row = { backing: bname, type: tname };
    row.fillGBps = time(() => a.fill(7));
    row.setFromPlainGBps = time(() => a.set(plainSrc));
    row.setIntoPlainGBps = time(() => plainDst.set(a));
    row.loopCopyIntoPlainGBps = time(() => loopCopy(plainDst, a));
    res.rows.push(row);
    console.log(bname.padEnd(10), tname.padEnd(12), 'fill', row.fillGBps.median, '| set from plain', row.setFromPlainGBps.median,
      '| set into plain', row.setIntoPlainGBps.median, '| loop into plain', row.loopCopyIntoPlainGBps.median, 'GB/s');
  }
}
res.busyAfter = await cpuBusy(1000);
console.log('busy CPUs before/after', res.busyBefore, res.busyAfter);
save('copy-speed.json', res);
