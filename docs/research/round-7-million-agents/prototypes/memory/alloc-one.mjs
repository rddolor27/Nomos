// One allocation trial in a fresh process: node alloc-one.mjs <kind> <bytes> <touchBytes> [maxBytes] [mem]
// kind: ab | sab | sabGrowable | wasm | wasmShared
import { PAGE, MiB, procMem } from './lib.mjs';

const [kind, bytesArg, touchArg, maxArg, memArg] = process.argv.slice(2);
const bytes = Number(bytesArg), touch = Number(touchArg), maxBytes = Number(maxArg || bytesArg);
const withMem = memArg !== 'nomem';

function make(k, n, max) {
  switch (k) {
    case 'ab': return new ArrayBuffer(n);
    case 'sab': return new SharedArrayBuffer(n);
    case 'sabGrowable': return new SharedArrayBuffer(n, { maxByteLength: max });
    case 'wasm': return new WebAssembly.Memory({ initial: n / PAGE }).buffer;
    case 'wasmShared': return new WebAssembly.Memory({ initial: n / PAGE, maximum: max / PAGE, shared: true }).buffer;
    default: throw new Error(`unknown kind ${k}`);
  }
}

function touchPages(u8, n) {
  for (let i = 0; i < n; i += 4096) u8[i] = 1;
}

const warm = new Uint8Array(make(kind, MiB, 16 * MiB));
touchPages(warm, MiB);

const m0 = withMem ? procMem() : null;
const t0 = performance.now();
let buf, error = null;
try { buf = make(kind, bytes, maxBytes); } catch (e) { error = `${e.name}: ${e.message}`; }
const allocMs = performance.now() - t0;
if (error) {
  console.log(JSON.stringify({ kind, bytes, maxBytes, touch, allocMs, error }));
  process.exit(0);
}
const m1 = withMem ? procMem() : null;

const tv = performance.now();
const u8 = new Uint8Array(buf);
const viewMs = performance.now() - tv;

let firstTouchMs = 0, secondTouchMs = 0, fillMs = 0, m2 = null;
if (touch > 0) {
  const a = performance.now(); touchPages(u8, touch); firstTouchMs = performance.now() - a;
  const b = performance.now(); touchPages(u8, touch); secondTouchMs = performance.now() - b;
  const c = performance.now(); u8.fill(2, 0, touch); fillMs = performance.now() - c;
  m2 = withMem ? procMem() : null;
}
let sum = 0;
for (let i = 0; i < touch; i += 1 << 20) sum += u8[i];

console.log(JSON.stringify({
  kind, bytes, maxBytes, touch, byteLength: buf.byteLength, allocMs, viewMs,
  firstTouchMs, secondTouchMs, fillMs, m0, m1, m2, check: sum,
}));
