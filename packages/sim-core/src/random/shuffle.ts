import { drawBelow3 } from './draw.ts';

// Fisher-Yates over 0..n-1 into out, with each swap partner keyed by (time, i, purpose): the order depends on the keys
// alone, never on how many draws came before. random/ is not linted as hot code, so this stays allocation-free by hand.
export function keyedShuffle(out: Int32Array, n: number, seed: number, stream: number, time: number, purpose: number): void {
  for (let i = 0; i < n; i++) out[i] = i;
  for (let i = n - 1; i > 0; i--) {
    const j = drawBelow3(seed, stream, time, i, purpose, i + 1);
    const held = out[i];
    out[i] = out[j];
    out[j] = held;
  }
}
