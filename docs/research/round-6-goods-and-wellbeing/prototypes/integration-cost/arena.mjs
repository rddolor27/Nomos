// One WebAssembly.Memory reserved up front and carved into typed-array views (plan, M0 / R5).
// Two passes: a counting pass sizes the memory, then the real pass hands out views.

export function createArena() {
  let off = 0, memory = null;
  const regions = [];
  const arena = {
    take(Type, count, name, group) {
      off = (off + 7) & ~7;
      const bytes = count * Type.BYTES_PER_ELEMENT;
      const view = memory ? new Type(memory.buffer, off, count) : new Type(0);
      regions.push({ name, group, bytes });
      off += bytes;
      return view;
    },
    reserve() {
      const pages = Math.max(1, Math.ceil(off / 65536));
      memory = new WebAssembly.Memory({ initial: pages, maximum: pages });
      off = 0; regions.length = 0;
      return pages * 65536;
    },
    used: () => off,
    regions,
    get memory() { return memory; },
  };
  return arena;
}
