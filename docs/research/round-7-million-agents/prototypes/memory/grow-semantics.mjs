// Does grow detach existing views? node grow-semantics.mjs            (default engine flags)
//                                  node --experimental-wasm-rab-integration grow-semantics.mjs rab
import { Worker } from 'node:worker_threads';
import { MiB, GiB, PAGE, machine, stats, save } from './lib.mjs';

const out = { machine: machine(), mode: process.argv[2] || 'default', tests: {} };
const log = (name, value) => { out.tests[name] = value; console.log(name, JSON.stringify(value)); };

function viewState(v, old, mem) {
  return {
    oldByteLength: old.byteLength,
    viewLength: v.length,
    v0: v[0],
    sameBufferObject: old === mem.buffer,
    newByteLength: mem.buffer.byteLength,
  };
}

function plainGrow() {
  const mem = new WebAssembly.Memory({ initial: 256, maximum: 1024 });
  const v = new Int32Array(mem.buffer); v[0] = 42;
  const old = mem.buffer;
  mem.grow(256);
  log('nonShared.grow(256)', viewState(v, old, mem));
  const v2 = new Int32Array(mem.buffer); v2[0] = 43;
  const old2 = mem.buffer;
  mem.grow(0);
  log('nonShared.grow(0)', viewState(v2, old2, mem));
}

function sharedGrow() {
  const mem = new WebAssembly.Memory({ initial: 256, maximum: 65536, shared: true });
  log('shared.bufferIdentityStableWithoutGrow', mem.buffer === mem.buffer);
  const v = new Int32Array(mem.buffer); v[0] = 42;
  const old = mem.buffer;
  mem.grow(256);
  const st = viewState(v, old, mem);
  v[1] = 5;
  const fresh = new Int32Array(mem.buffer);
  st.writeThroughOldViewVisibleInNew = fresh[1] === 5;
  fresh[2] = 9;
  st.writeThroughNewViewVisibleInOld = v[2] === 9;
  st.newViewLength = fresh.length;
  fresh[fresh.length - 1] = 77;
  st.oldViewIndexBeyondOldLength = v[old.byteLength / 4];
  log('shared.grow(256)', st);
  const b1 = mem.buffer;
  mem.grow(0);
  log('shared.grow(0)', { sameBufferObject: b1 === mem.buffer, oldByteLength: b1.byteLength, newByteLength: mem.buffer.byteLength });
}

async function sharedGrowAcrossWorker() {
  const mem = new WebAssembly.Memory({ initial: 256, maximum: 65536, shared: true });
  const ctl = new Int32Array(new SharedArrayBuffer(16));
  new Int32Array(mem.buffer)[0] = 42;
  const code = `
    const { parentPort, workerData } = require('node:worker_threads');
    const { mem, ctl } = workerData;
    const v = new Int32Array(mem.buffer);
    const before = { byteLength: mem.buffer.byteLength, v0: v[0] };
    Atomics.store(ctl, 0, 1); Atomics.notify(ctl, 0);
    Atomics.wait(ctl, 1, 0);
    const after = { oldViewLength: v.length, oldViewV0: v[0], memBufferByteLength: mem.buffer.byteLength };
    const fresh = new Int32Array(mem.buffer);
    fresh[fresh.length - 1] = 123;
    parentPort.postMessage({ before, after });
  `;
  const w = new Worker(code, { eval: true, workerData: { mem, ctl } });
  const msg = new Promise((r) => w.once('message', r));
  while (Atomics.load(ctl, 0) === 0) await new Promise((r) => setTimeout(r, 1));
  mem.grow(256);
  Atomics.store(ctl, 1, 1); Atomics.notify(ctl, 1);
  const res = await msg;
  const mainView = new Int32Array(mem.buffer);
  res.mainSeesWorkerWriteInGrownRegion = mainView[mainView.length - 1] === 123;
  log('shared.growSeenByWorker', res);
  await w.terminate();
}

async function growableSab() {
  const sab = new SharedArrayBuffer(16 * MiB, { maxByteLength: GiB });
  const tracking = new Int32Array(sab);
  const fixed = new Int32Array(sab, 0, 1024);
  tracking[0] = 42;
  sab.grow(32 * MiB);
  log('growableSab.grow', {
    growable: sab.growable, maxByteLength: sab.maxByteLength, byteLength: sab.byteLength,
    trackingLength: tracking.length, fixedLength: fixed.length, v0: tracking[0],
  });
  const ctl = new Int32Array(new SharedArrayBuffer(16));
  const code = `
    const { parentPort, workerData } = require('node:worker_threads');
    const { sab, ctl } = workerData;
    const t = new Int32Array(sab);
    const before = t.length;
    Atomics.store(ctl, 0, 1); Atomics.notify(ctl, 0);
    Atomics.wait(ctl, 1, 0);
    parentPort.postMessage({ before, after: t.length, byteLength: sab.byteLength });
  `;
  const w = new Worker(code, { eval: true, workerData: { sab, ctl } });
  const msg = new Promise((r) => w.once('message', r));
  while (Atomics.load(ctl, 0) === 0) await new Promise((r) => setTimeout(r, 1));
  sab.grow(64 * MiB);
  Atomics.store(ctl, 1, 1); Atomics.notify(ctl, 1);
  log('growableSab.seenByWorker', await msg);
  await w.terminate();
}

function growTimings() {
  const rows = { sharedTo1GiB: [], nonSharedTo1GiB: [], growableSabTo1GiB: [], sharedSteps16MiB: [] };
  for (let s = 0; s < 5; s++) {
    let m = new WebAssembly.Memory({ initial: 256, maximum: 16384, shared: true });
    let t = performance.now(); m.grow(16384 - 256); rows.sharedTo1GiB.push(performance.now() - t);
    m = new WebAssembly.Memory({ initial: 256, maximum: 16384 });
    t = performance.now(); m.grow(16384 - 256); rows.nonSharedTo1GiB.push(performance.now() - t);
    const g = new SharedArrayBuffer(16 * MiB, { maxByteLength: GiB });
    t = performance.now(); g.grow(GiB); rows.growableSabTo1GiB.push(performance.now() - t);
    m = new WebAssembly.Memory({ initial: 256, maximum: 16384, shared: true });
    t = performance.now(); for (let k = 0; k < 63; k++) m.grow(256); rows.sharedSteps16MiB.push((performance.now() - t) / 63);
    m = null;
  }
  const res = {};
  for (const k of Object.keys(rows)) res[k] = stats(rows[k]);
  log('growTimingsMs', res);
}

function rabIntegration() {
  const has = typeof WebAssembly.Memory.prototype.toResizableBuffer === 'function';
  log('rab.toResizableBufferAvailable', has);
  if (!has) return;
  const sm = new WebAssembly.Memory({ initial: 256, maximum: 4096, shared: true });
  const rb = sm.toResizableBuffer();
  const lt = new Int32Array(rb);
  lt[0] = 42;
  const before = lt.length;
  sm.grow(256);
  log('rab.shared', {
    isSAB: rb instanceof SharedArrayBuffer, growable: rb.growable, maxByteLength: rb.maxByteLength,
    trackingBefore: before, trackingAfterMemGrow: lt.length, sameObjectAfterGrow: sm.buffer === rb, v0: lt[0],
  });
  rb.grow(rb.byteLength + 16 * MiB);
  log('rab.shared.bufferGrowGrowsMemory', { memBytes: sm.buffer.byteLength, tracking: lt.length });
  const pm = new WebAssembly.Memory({ initial: 256, maximum: 4096 });
  const prb = pm.toResizableBuffer();
  const plt = new Int32Array(prb);
  plt[0] = 7;
  pm.grow(256);
  const st = { resizable: prb.resizable, detached: prb.detached, trackingAfterGrow: plt.length, v0: plt[0], sameObject: pm.buffer === prb };
  const fixed = pm.toFixedLengthBuffer();
  st.afterToFixed = { oldDetached: prb.detached, fixedResizable: fixed.resizable, trackingLength: plt.length };
  log('rab.nonShared', st);
}

if (out.mode === 'rab') {
  rabIntegration();
} else {
  plainGrow();
  sharedGrow();
  await sharedGrowAcrossWorker();
  await growableSab();
  growTimings();
  rabIntegration();
}
save(`grow-semantics-${out.mode}.json`, out);
