// Keyed systematic sampling (R8 conflict d): each group gets the floor of n * c / N, then one more for each threshold
// u + t * N, with u = word % N, that falls in its stretch of the remainders laid end to end. A remainder is below N,
// so no group gets two, and each group's expected share is exactly n * c / N, unlike flooring or largest remainder.
export function splitByCounts(n: number, counts: ArrayLike<number>, k: number, out: Int32Array, word: number): void {
  if (n === 0) {
    for (let j = 0; j < k; j++) out[j] = 0;
    return;
  }
  let people = 0;
  for (let j = 0; j < k; j++) people += counts[j];
  let threshold = word % people;
  let stretchEnd = 0;
  for (let j = 0; j < k; j++) {
    const share = n * counts[j];
    const floor = Math.floor(share / people);
    stretchEnd += share - floor * people;
    if (threshold < stretchEnd) {
      out[j] = floor + 1;
      threshold += people;
    } else {
      out[j] = floor;
    }
  }
}
