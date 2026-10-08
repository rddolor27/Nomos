function fillRow(a: string, b: string, i: number, prev: Int32Array, next: Int32Array): number {
  next[0] = i;
  let rowMin = i;
  for (let j = 1; j <= b.length; j++) {
    const substitution = prev[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1);
    const best = Math.min(substitution, prev[j] + 1, next[j - 1] + 1);
    next[j] = best;
    if (best < rowMin) rowMin = best;
  }
  return rowMin;
}

// Levenshtein distance, abandoned once a whole row is past max: no later row can come back under it.
export function withinDistance(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = new Int32Array(b.length + 1);
  let next = new Int32Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    if (fillRow(a, b, i, prev, next) > max) return false;
    const spent = prev;
    prev = next;
    next = spent;
  }
  return prev[b.length] <= max;
}
