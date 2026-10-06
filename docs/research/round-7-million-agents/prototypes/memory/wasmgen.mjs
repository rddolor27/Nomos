// Minimal hand encoder for four Int32 kernels over an imported memory (i32 or i64 addresses).
// Runs in Node and in browsers, so the same bytes are timed in every engine.
const uleb = (n) => { n = BigInt(n); const o = []; do { let b = Number(n & 0x7fn); n >>= 7n; if (n) b |= 0x80; o.push(b); } while (n); return o; };
const sleb = (n) => { n = BigInt(n); const o = []; for (;;) { const b = Number(n & 0x7fn); n >>= 7n; if ((n === 0n && !(b & 0x40)) || (n === -1n && b & 0x40)) { o.push(b); return o; } o.push(b | 0x80); } };
const str = (s) => [...uleb(s.length), ...new TextEncoder().encode(s)];
const vec = (items) => [...uleb(items.length), ...items.flat()];
const section = (id, body) => [id, ...uleb(body.length), ...body];

const I32 = 0x7f, I64 = 0x7e;
const op = {
  block: [0x02, 0x40], loop: [0x03, 0x40], end: 0x0b, br: 0x0c, br_if: 0x0d,
  get: 0x20, set: 0x21, tee: 0x22, load: 0x28, store: 0x36,
  i32c: 0x41, i64c: 0x42, i32add: 0x6a, i32shl: 0x74, i32geu: 0x4f,
  i64add: 0x7c, i64shl: 0x86, i64geu: 0x5a, ext: 0xad,
};

function kernels(is64) {
  const A = is64 ? I64 : I32;
  const c = (v) => (is64 ? [op.i64c, ...sleb(v)] : [op.i32c, ...sleb(v)]);
  const add = is64 ? op.i64add : op.i32add, shl = is64 ? op.i64shl : op.i32shl, geu = is64 ? op.i64geu : op.i32geu;
  const ld = [op.load, 2, 0], st = [op.store, 2, 0];
  const idxToAddr = is64 ? [op.ext, ...c(2), shl] : [...c(2), shl];
  const g = (i) => [op.get, i], s = (i) => [op.set, i], t = (i) => [op.tee, i];
  const loopHead = [...op.block, ...op.loop, ...g(0), ...g(3), geu, op.br_if, 1];
  const loopTail = [...g(0), ...c(4), add, ...s(0), op.br, 0, op.end, op.end];
  const setEnd = [...g(0), ...g(1), ...c(2), shl, add, ...s(3)];
  return {
    // sum of n Int32 at p
    sum: { params: [A, A], results: [I32], locals: [[1, I32], [1, A]],
      body: [...setEnd, ...loopHead, ...g(2), ...g(0), ...ld, op.i32add, ...s(2), ...loopTail, ...g(2)] },
    // counts[idx[i]]++
    hist: { params: [A, A, A], results: [], locals: [[2, A]],
      body: [...setEnd, ...loopHead, ...g(2), ...g(0), ...ld, ...idxToAddr, add, ...t(4), ...g(4), ...ld, op.i32c, 1, op.i32add, ...st, ...loopTail] },
    // sum of data[idx[i]]
    gather: { params: [A, A, A], results: [I32], locals: [[1, A], [1, I32]],
      body: [...setEnd, ...loopHead, ...g(4), ...g(2), ...g(0), ...ld, ...idxToAddr, add, ...ld, op.i32add, ...s(4), ...loopTail, ...g(4)] },
    // x[i] += vx[i], where vx sits param2 bytes after x
    move: { params: [A, A, A], results: [], locals: [[2, A]],
      body: [...setEnd, ...loopHead, ...g(0), ...g(0), ...ld, ...g(0), ...g(2), add, ...ld, op.i32add, ...st, ...loopTail] },
  };
}

export const KERNELS = ['sum', 'hist', 'gather', 'move'];

export function buildModule(is64, shared, minPages, maxPages) {
  const ks = kernels(is64);
  const flags = 0x01 | (shared ? 0x02 : 0) | (is64 ? 0x04 : 0);
  const types = KERNELS.map((n) => [0x60, ...vec(ks[n].params.map((p) => [p])), ...vec(ks[n].results.map((r) => [r]))]);
  const imports = [[...str('env'), ...str('mem'), 0x02, flags, ...uleb(minPages), ...uleb(maxPages)]];
  const funcs = KERNELS.map((_, i) => uleb(i));
  const exports = KERNELS.map((n, i) => [...str(n), 0x00, ...uleb(i)]);
  const codes = KERNELS.map((n) => {
    const k = ks[n];
    const fn = [...vec(k.locals.map(([cnt, ty]) => [...uleb(cnt), ty])), ...k.body, op.end];
    return [...uleb(fn.length), ...fn];
  });
  return new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    ...section(1, vec(types)), ...section(2, vec(imports)), ...section(3, vec(funcs)),
    ...section(7, vec(exports)), ...section(10, vec(codes))]);
}

const MiB = 1 << 20;
export const N = 4 * 1024 * 1024, HIST = 1 << 20;
export const LAYOUT = { idx: 0, data: 16 * MiB, counts: 32 * MiB, vx: 48 * MiB, bytes: 64 * MiB };

// Fills the four arrays at byte offset base and returns timed calls in ns per element.
export function prepare(mem, inst, is64, base) {
  const buf = mem.buffer;
  const idx = new Int32Array(buf, base + LAYOUT.idx, N), data = new Int32Array(buf, base + LAYOUT.data, N);
  const vx = new Int32Array(buf, base + LAYOUT.vx, N);
  let x = 2463534242;
  for (let i = 0; i < N; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; idx[i] = (x >>> 0) % HIST; data[i] = i & 1023; vx[i] = (i & 7) - 3; }
  const A = (v) => (is64 ? BigInt(v) : v);
  const e = inst.exports;
  return {
    sum: () => e.sum(A(base + LAYOUT.data), A(N)),
    hist: () => e.hist(A(base + LAYOUT.idx), A(N), A(base + LAYOUT.counts)),
    gather: () => e.gather(A(base + LAYOUT.idx), A(N), A(base + LAYOUT.data)),
    move: () => e.move(A(base + LAYOUT.data), A(N), A(LAYOUT.vx - LAYOUT.data)),
  };
}

export function timeKernels(calls, warm = 5, samples = 9) {
  const out = {};
  for (const [k, fn] of Object.entries(calls)) {
    for (let i = 0; i < warm; i++) fn();
    const xs = [];
    for (let i = 0; i < samples; i++) { const t = performance.now(); fn(); xs.push(((performance.now() - t) * 1e6) / N); }
    xs.sort((a, b) => a - b);
    out[k] = { median: +xs[(samples - 1) >> 1].toFixed(4), min: +xs[0].toFixed(4), max: +xs[samples - 1].toFixed(4), n: samples };
  }
  return out;
}
