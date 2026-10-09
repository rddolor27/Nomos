// Python's // and % for integers. Math.floor(a / b) is exact while |a| and |b| stay below 2^31.

export function floorDiv(a: number, b: number): number {
  return Math.floor(a / b);
}

export function floorMod(a: number, b: number): number {
  return a - b * floorDiv(a, b);
}

// Python's math.isqrt for 0 <= n < 2^52: the float root is off by at most one, so one step either way corrects it.
export function isqrt(n: number): number {
  if (n < 0) throw new RangeError(`isqrt of ${n}`);
  let root = Math.floor(Math.sqrt(n));
  while (root * root > n) root--;
  while ((root + 1) * (root + 1) <= n) root++;
  return root;
}
