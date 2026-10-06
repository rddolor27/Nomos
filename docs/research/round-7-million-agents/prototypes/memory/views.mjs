// Cost of creating typed-array views once at start, and whether views reach past 2 GiB and 4 GiB.
import { GiB, MiB, PAGE, machine, cpuBusy, stats, save } from './lib.mjs';

const res = { machine: machine(), busyBefore: await cpuBusy(1000) };
const T = [Int32Array, Uint16Array, Uint8Array, Float64Array, Float32Array, Uint32Array, Int16Array];

function viewCost(buf, label) {
  const N = 10000, xs = [];
  let sink = 0;
  for (let w = 0; w < 3; w++) for (let i = 0; i < N; i++) sink += new T[i % 7](buf, (i * 4096) % (buf.byteLength - 8 * MiB), 1024).length;
  for (let s = 0; s < 9; s++) {
    const t = performance.now();
    for (let i = 0; i < N; i++) sink += new T[i % 7](buf, (i * 4096) % (buf.byteLength - 8 * MiB), 1024).length;
    xs.push(((performance.now() - t) * 1000) / N);
  }
  res[label] = stats(xs);
  console.log(label, 'µs per view', res[label], sink > 0);
}

viewCost(new ArrayBuffer(64 * MiB), 'viewUsAb');
viewCost(new SharedArrayBuffer(64 * MiB), 'viewUsSab');
viewCost(new WebAssembly.Memory({ initial: 1024, maximum: 1024, shared: true }).buffer, 'viewUsWasmShared');

function probe(label, fn) {
  try { res[label] = fn(); } catch (e) { res[label] = `${e.name}: ${e.message}`; }
  console.log(label, res[label]);
}

const mem4 = new WebAssembly.Memory({ initial: PAGE, maximum: PAGE, shared: true });
const b4 = mem4.buffer;
probe('wasmShared4GiB.byteLength', () => b4.byteLength);
probe('u8.lengthOver4GiBBuffer', () => new Uint8Array(b4).length);
probe('f64.viewAtOffset3GiB', () => { const v = new Float64Array(b4, 3 * GiB, 1024); v[1023] = 1.5; return { length: v.length, last: v[1023] }; });
probe('i32.viewEndingAt4GiB', () => { const v = new Int32Array(b4, 4 * GiB - 4096, 1024); v[1023] = 7; return { byteOffset: v.byteOffset, last: v[1023] }; });
probe('wasm.maximumOver65536Pages', () => new WebAssembly.Memory({ initial: 1, maximum: PAGE + 1, shared: true }).buffer.byteLength);
probe('wasm.initialOver65536Pages', () => new WebAssembly.Memory({ initial: PAGE + 1 }).buffer.byteLength);
probe('sab.over4GiB', () => new SharedArrayBuffer(4 * GiB + PAGE).byteLength);
probe('typedArray.maxLengthHint', () => { const v = new Uint8Array(new ArrayBuffer(4 * GiB + 8)); return v.length; });
res.busyAfter = await cpuBusy(1000);
save('views.json', res);
