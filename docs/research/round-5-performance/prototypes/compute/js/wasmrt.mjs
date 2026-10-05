// Minimal runtime for the raw-ABI Rust module: bump arena in linear memory, grown ONCE up front (growth detaches views).
export async function loadWasm(bytes, totalBytes = 96 << 20) {
  const t0 = performance.now();
  const mod = await WebAssembly.compile(bytes);
  const t1 = performance.now();
  const inst = await WebAssembly.instantiate(mod, {});
  const t2 = performance.now();
  const ex = inst.exports, mem = ex.memory;
  const base = ex.__heap_base ? ex.__heap_base.value : (2 << 20);
  const need = totalBytes - mem.buffer.byteLength;
  if (need > 0) mem.grow(Math.ceil(need / 65536));
  let top = (base + 63) & ~63;
  const arena = {
    ex, mem, compileMs: t1 - t0, instantiateMs: t2 - t1,
    alloc(Type, n) { const p = top; top = (p + n * Type.BYTES_PER_ELEMENT + 63) & ~63; if (top > mem.buffer.byteLength) throw new Error('arena full'); return new Type(mem.buffer, p, n); },
    copy(src) { const v = arena.alloc(src.constructor, src.length); v.set(src); return v; },
    mark() { return top; }, release(m) { top = m; },
  };
  return arena;
}
export const P = (ta) => ta.byteOffset;
