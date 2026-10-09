const BATCH = 5;

function batchMean(series: Float64Array, batch: number): number {
  const first = batch * BATCH;
  let sum = 0;
  for (let i = 0; i < BATCH; i++) sum += series[first + i];
  return sum / BATCH;
}

// MSER-5 (White 1997): on the B batch means Y, a truncation of k batches scores g_k = sum((Y_i - mean_k)^2) / (B - k)^2
// over the batches that remain, and the best k is the lowest score. One pass from the last batch back to the first grows
// the remaining batches by one a step. Welford's update keeps a flat series at exactly 0, where a sum of squares can leave
// rounding noise. Returns the truncation in observations, 5k, or -1 when the lowest score falls on the last k searched,
// floor(B / 2): the run is too short to show a steady state (R2's first-half rule). A tie goes to the smaller k.
export function mser5(series: Float64Array, length: number): number {
  const batches = Math.floor(length / BATCH);
  const lastK = Math.floor(batches / 2);
  let bestK = lastK;
  let bestScore = Infinity;
  let count = 0;
  let mean = 0;
  let spread = 0;
  for (let k = batches - 1; k >= 0; k--) {
    const y = batchMean(series, k);
    count++;
    const step = y - mean;
    mean += step / count;
    spread += step * (y - mean);
    const score = spread / (count * count);
    if (k <= lastK && score <= bestScore) {
      bestScore = score;
      bestK = k;
    }
  }
  return bestK === lastK ? -1 : bestK * BATCH;
}
