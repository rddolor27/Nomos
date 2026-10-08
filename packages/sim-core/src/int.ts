// Python's // and % for integers. Math.floor(a / b) is exact while |a| and |b| stay below 2^31.

export function floorDiv(a: number, b: number): number {
  return Math.floor(a / b);
}

export function floorMod(a: number, b: number): number {
  return a - b * floorDiv(a, b);
}
