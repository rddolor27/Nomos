export const PHONE_MEMORY_BYTES = 33_554_432;
export const DESKTOP_MEMORY_BYTES = 67_108_864;

const WASM_PAGE_BYTES = 65_536;

export interface Arena {
  readonly memory: WebAssembly.Memory;
  top: number;
  readonly canonical: number[];
}

export interface ViewCtor<T> {
  readonly BYTES_PER_ELEMENT: number;
  new (buffer: ArrayBuffer, byteOffset: number, length: number): T;
}

// initial equals maximum, so grow throws rather than detach the views made at start (R5). The memory is not shared:
// M0 runs one sim worker, and more workers pay only above 20-25k agents (R5 compute §2).
export function reserveArena(bytes: number): Arena {
  const pages = bytes / WASM_PAGE_BYTES;
  return { memory: new WebAssembly.Memory({ initial: pages, maximum: pages }), top: 0, canonical: [] };
}

export function take<T>(arena: Arena, ctor: ViewCtor<T>, length: number, canonical: boolean): T {
  const offset = alignTo8(arena.top);
  const paddedBytes = alignTo8(length * ctor.BYTES_PER_ELEMENT);
  const capacityBytes = arena.memory.buffer.byteLength;
  if (offset + paddedBytes > capacityBytes) {
    throw new RangeError(`take of ${paddedBytes} bytes at ${offset} overflows the ${capacityBytes}-byte arena`);
  }
  const view = new ctor(arena.memory.buffer, offset, length);
  arena.top = offset + paddedBytes;
  if (canonical) arena.canonical.push(offset, paddedBytes);
  return view;
}

// Whole 8-byte regions keep every Float64Array aligned and let the state hash read whole 32-bit words.
function alignTo8(bytes: number): number {
  return (bytes + 7) & ~7;
}
