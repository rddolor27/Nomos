import { mix } from '../random/draw.ts';
import { take, type Arena } from '../memory/arena.ts';

// While total * max weight stays below 2^53 the product is exact, and so is its floor division by the weight sum
// (R4 architecture §3).
const TWO_53 = 9_007_199_254_740_992;

export interface ApportionScratch {
  readonly rem: Float64Array;
  readonly heap: Int32Array;
}

export function createApportionScratch(arena: Arena, capacity: number): ApportionScratch {
  return { rem: take(arena, Float64Array, capacity, false), heap: take(arena, Int32Array, capacity, false) };
}

// Largest remainder: floors, then one unit each to the largest remainders, ties to the lower index (R4).
export function apportion(
  total: number,
  weights: ArrayLike<number>,
  n: number,
  out: Float64Array,
  scratch: ApportionScratch,
): void {
  const rem = scratch.rem;
  const heap = scratch.heap;
  let leftover = floors(total, weights, n, out, rem);
  if (leftover === 0) return;
  for (let i = 0; i < n; i++) heap[i] = i;
  for (let i = (n >> 1) - 1; i >= 0; i--) siftDown(heap, rem, n, i);
  for (let size = n - 1; leftover > 0; leftover--, size--) {
    out[heap[0]] += 1;
    heap[0] = heap[size];
    siftDown(heap, rem, size, 0);
  }
}

// Floors, then each leftover cent to one positive weight along a keyed stride coprime with n, for cash over agents
// (R4 architecture §3.3). Fewer cents are left over than there are positive weights, so one lap pays them all.
export function apportionByStride(
  total: number,
  weights: ArrayLike<number>,
  n: number,
  out: Float64Array,
  word: number,
): void {
  // With no entry, the stride search below never finds a stride and never returns.
  if (n < 1) throw new RangeError(`apportionByStride needs at least one weight, not ${n}`);
  let leftover = floors(total, weights, n, out, null);
  const stride = coprimeStride(1 + (mix(word) % n), n);
  for (let i = word % n; leftover > 0; i = (i + stride) % n) {
    if (weights[i] === 0) continue;
    out[i] += 1;
    leftover--;
  }
}

// Writes each floor of total * w / W to out, and each remainder to rem when given; returns the units left over.
function floors(
  total: number,
  weights: ArrayLike<number>,
  n: number,
  out: Float64Array,
  rem: Float64Array | null,
): number {
  let sum = 0;
  let maxWeight = 0;
  for (let i = 0; i < n; i++) {
    sum += weights[i];
    maxWeight = Math.max(maxWeight, weights[i]);
  }
  if (total * maxWeight < TWO_53) exactFloors(total, weights, n, sum, out, rem);
  else bigFloors(total, weights, n, sum, out, rem);
  let given = 0;
  for (let i = 0; i < n; i++) given += out[i];
  return total - given;
}

function exactFloors(
  total: number,
  weights: ArrayLike<number>,
  n: number,
  sum: number,
  out: Float64Array,
  rem: Float64Array | null,
): void {
  for (let i = 0; i < n; i++) {
    const share = total * weights[i];
    const floor = Math.floor(share / sum);
    out[i] = floor;
    if (rem !== null) rem[i] = share - floor * sum;
  }
}

// Quotas are at most the total and remainders below the weight sum, so Number() brings both back exactly.
function bigFloors(
  total: number,
  weights: ArrayLike<number>,
  n: number,
  sum: number,
  out: Float64Array,
  rem: Float64Array | null,
): void {
  const bigTotal = BigInt(total);
  const bigSum = BigInt(sum);
  for (let i = 0; i < n; i++) {
    const share = bigTotal * BigInt(weights[i]);
    out[i] = Number(share / bigSum);
    if (rem !== null) rem[i] = Number(share % bigSum);
  }
}

function ranksAbove(rem: Float64Array, a: number, b: number): boolean {
  return rem[a] > rem[b] || (rem[a] === rem[b] && a < b);
}

function siftDown(heap: Int32Array, rem: Float64Array, size: number, root: number): void {
  let parent = root;
  for (;;) {
    const left = 2 * parent + 1;
    let top = parent;
    if (left < size && ranksAbove(rem, heap[left], heap[top])) top = left;
    if (left + 1 < size && ranksAbove(rem, heap[left + 1], heap[top])) top = left + 1;
    if (top === parent) return;
    const moved = heap[parent];
    heap[parent] = heap[top];
    heap[top] = moved;
    parent = top;
  }
}

// A stride coprime with n visits every entry once before repeating, so no entry gets two leftover cents.
function coprimeStride(start: number, n: number): number {
  let stride = start;
  while (gcd(stride, n) !== 1) stride++;
  return stride;
}

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const r = a % b;
    a = b;
    b = r;
  }
  return a;
}
