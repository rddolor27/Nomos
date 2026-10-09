import { fbm, floorDiv } from '@nomos/sim-core/kernels';
import { ELEVATION } from '../random/streams.ts';
import { RELIEF } from './templates.ts';

export function reliefOf(seed: number, width: number, height: number): Int32Array {
  const out = new Int32Array(width * height);
  let i = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      out[i++] = floorDiv((fbm(seed, ELEVATION, x, y, 24, 5) - 32768) * RELIEF, 16);
    }
  }
  return out;
}

// sorted(values)[n - n * landPermille // 1000]: the cut that leaves about landPermille thousandths of the cells above it.
export function cut(values: ArrayLike<number>, landPermille: number): number {
  const n = values.length;
  const sorted = Array.from(values).sort((a, b) => a - b);
  return sorted[n - floorDiv(n * landPermille, 1000)];
}

// The sea-level cut of falloff + relief, and each cell's falloff above it.
export function riseOf(
  falloff: Int32Array,
  relief: Int32Array,
  landPermille: number,
): { coastCut: number; rise: Int32Array } {
  const lifted = new Int32Array(falloff.length);
  for (let i = 0; i < lifted.length; i++) lifted[i] = falloff[i] + relief[i];
  const coastCut = cut(lifted, landPermille);
  const rise = new Int32Array(falloff.length);
  for (let i = 0; i < rise.length; i++) rise[i] = falloff[i] - coastCut;
  return { coastCut, rise };
}
