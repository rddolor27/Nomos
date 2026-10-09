// heapq with keys of up to three integers, compared left to right as Python compares tuples. Every heap in
// tools/worldgen ends its key with a cell or a settlement, so no two live keys differ only in order, and any correct
// heap pops them in Python's order. pop() leaves the smallest key in a, b and c.
export class MinHeap {
  size = 0;
  a = 0;
  b = 0;
  c = 0;
  private keyA: Float64Array;
  private keyB: Float64Array;
  private keyC: Float64Array;

  constructor(capacity: number) {
    this.keyA = new Float64Array(Math.max(1, capacity));
    this.keyB = new Float64Array(Math.max(1, capacity));
    this.keyC = new Float64Array(Math.max(1, capacity));
  }

  push(a: number, b: number, c = 0): void {
    if (this.size === this.keyA.length) this.grow();
    let at = this.size++;
    while (at > 0) {
      const up = (at - 1) >> 1;
      if (!this.keyBefore(a, b, c, up)) break;
      this.move(up, at);
      at = up;
    }
    this.put(at, a, b, c);
  }

  pop(): void {
    if (this.size === 0) throw new RangeError('pop from an empty heap');
    this.a = this.keyA[0];
    this.b = this.keyB[0];
    this.c = this.keyC[0];
    const last = --this.size;
    const a = this.keyA[last];
    const b = this.keyB[last];
    const c = this.keyC[last];
    let at = 0;
    for (;;) {
      let child = 2 * at + 1;
      if (child >= last) break;
      if (child + 1 < last && this.slotBefore(child + 1, child)) child++;
      if (this.keyBefore(a, b, c, child)) break;
      this.move(child, at);
      at = child;
    }
    this.put(at, a, b, c);
  }

  private keyBefore(a: number, b: number, c: number, slot: number): boolean {
    if (a !== this.keyA[slot]) return a < this.keyA[slot];
    if (b !== this.keyB[slot]) return b < this.keyB[slot];
    return c < this.keyC[slot];
  }

  private slotBefore(i: number, j: number): boolean {
    return this.keyBefore(this.keyA[i], this.keyB[i], this.keyC[i], j);
  }

  private move(from: number, to: number): void {
    this.put(to, this.keyA[from], this.keyB[from], this.keyC[from]);
  }

  private put(slot: number, a: number, b: number, c: number): void {
    this.keyA[slot] = a;
    this.keyB[slot] = b;
    this.keyC[slot] = c;
  }

  private grow(): void {
    this.keyA = doubled(this.keyA);
    this.keyB = doubled(this.keyB);
    this.keyC = doubled(this.keyC);
  }
}

function doubled(keys: Float64Array): Float64Array {
  const next = new Float64Array(keys.length * 2);
  next.set(keys);
  return next;
}
