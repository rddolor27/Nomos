// Memory64 support, limits and speed against memory32 in this V8.
// node mem64.mjs                                            (default: V8 guard regions for memory64)
// node --no-wasm-memory64-trap-handling mem64.mjs bounds    (explicit bounds checks)
import { GiB, PAGE, machine, cpuBusy, save } from './lib.mjs';
import { buildModule, prepare, timeKernels, LAYOUT } from './wasmgen.mjs';

const mode = process.argv[2] || 'default';
const res = { machine: machine(), mode, execArgv: process.execArgv, support: {}, kernels: [] };

function tryMem(label, desc) {
  try { const m = new WebAssembly.Memory(desc); res.support[label] = { ok: true, bytes: m.buffer.byteLength }; }
  catch (e) { res.support[label] = { ok: false, error: `${e.name}: ${e.message}` }; }
}

tryMem('i64.numberSizes', { address: 'i64', initial: 1, maximum: 2 });
tryMem('i64.bigintSizes', { address: 'i64', initial: 1n, maximum: 2n });
tryMem('i64.legacyIndexField', { index: 'i64', initial: 1n, maximum: 2n });
tryMem('i64.max262144pages(16GiB)', { address: 'i64', initial: 1n, maximum: 262144n });
tryMem('i64.max262145pages', { address: 'i64', initial: 1n, maximum: 262145n });
tryMem('i64.shared', { address: 'i64', initial: 1n, maximum: 16n, shared: true });
for (const [k, v] of Object.entries(res.support)) console.log(k, JSON.stringify(v));

function bench(label, is64, shared, base) {
  const pages = (base + LAYOUT.bytes) / PAGE;
  const desc = is64 ? { address: 'i64', initial: BigInt(pages), maximum: BigInt(pages), shared } : { initial: pages, maximum: pages, shared };
  let mem;
  try { mem = new WebAssembly.Memory(desc); } catch (e) { res.kernels.push({ label, error: e.message }); console.log(label, 'skip', e.message); return; }
  const inst = new WebAssembly.Instance(new WebAssembly.Module(buildModule(is64, shared, pages, pages)), { env: { mem } });
  const row = { label, is64, shared, baseGiB: base / GiB, ...timeKernels(prepare(mem, inst, is64, base)) };
  res.kernels.push(row);
  console.log(label.padEnd(24), 'ns/elem  sum', row.sum.median, '| hist', row.hist.median, '| gather', row.gather.median, '| move', row.move.median);
}

res.busyBefore = await cpuBusy(1000);
bench('mem32', false, false, 0);
bench('mem32 shared', false, true, 0);
bench('mem64', true, false, 0);
bench('mem64 shared', true, true, 0);
bench('mem64 data at 4.5 GiB', true, false, 4.5 * GiB);
res.busyAfter = await cpuBusy(1000);
console.log('busy CPUs before/after', res.busyBefore, res.busyAfter);
save(`mem64-${mode}.json`, res);
