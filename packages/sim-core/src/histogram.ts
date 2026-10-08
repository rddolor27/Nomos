import { take, type Arena } from './memory.ts';
import { PPM, mulPpm } from './money.ts';

const STEP_BITS = 4;
export const BINS_PER_OCTAVE = 1 << STEP_BITS;
const OCTAVES = 53;
// Bin 0 holds the zeros; each octave k then holds the values from 2^k to 2^(k+1) - 1 in 16 steps.
export const HISTOGRAM_BINS = 1 + OCTAVES * BINS_PER_OCTAVE;

const TWO_POW_32 = 4_294_967_296;

export interface Histogram {
  readonly count: Float64Array;
  readonly sum: Float64Array;
}

// Not canonical: the day pass clears and refills it, so it adds nothing to the state hash.
export function createHistogram(arena: Arena): Histogram {
  return {
    count: take(arena, Float64Array, HISTOGRAM_BINS, false),
    sum: take(arena, Float64Array, HISTOGRAM_BINS, false),
  };
}

export function clearHistogram(h: Histogram): void {
  h.count.fill(0);
  h.sum.fill(0);
}

// aligned is the value shifted left until its leading one sits at bit 31; the STEP_BITS bits under it pick the step.
function binAt(octave: number, aligned: number): number {
  const step = (aligned >>> (31 - STEP_BITS)) & (BINS_PER_OCTAVE - 1);
  return 1 + octave * BINS_PER_OCTAVE + step;
}

// For integers 0 <= v < 2^53. Math.clz32 on a 32-bit half finds the octave, so no Math.log2 is needed.
export function binOf(v: number): number {
  if (v < 1) return 0;
  const hi = Math.floor(v / TWO_POW_32);
  const lo = v >>> 0;
  if (hi === 0) {
    const loLead = Math.clz32(lo);
    return binAt(31 - loLead, lo << loLead);
  }
  // v < 2^53 keeps hi under 2^21, so hiLead is at least 11 and the shift of lo below stays within 1 to 21 bits.
  const hiLead = Math.clz32(hi);
  return binAt(63 - hiLead, (hi << hiLead) | (lo >>> (32 - hiLead)));
}

export function addValue(h: Histogram, v: number): void {
  const bin = binOf(v);
  h.count[bin] += 1;
  h.sum[bin] += v;
}

// The top entries number floor(entries * topPpm / PPM). Bins above the cut count in full and the cut bin counts its sum
// pro rata, which is where the result drifts from a sort (R6 measured 0.03 points).
export function topShare(h: Histogram, topPpm: number): number {
  let entries = 0;
  let total = 0;
  for (let bin = 0; bin < HISTOGRAM_BINS; bin++) {
    entries += h.count[bin];
    total += h.sum[bin];
  }
  if (total === 0) return 0;
  let wanted = mulPpm(entries, topPpm);
  let top = 0;
  for (let bin = HISTOGRAM_BINS - 1; bin >= 0 && wanted > 0; bin--) {
    const n = h.count[bin];
    if (n <= wanted) {
      top += h.sum[bin];
      wanted -= n;
    } else {
      top += (h.sum[bin] * wanted) / n;
      wanted = 0;
    }
  }
  return Math.floor((top / total) * PPM);
}
