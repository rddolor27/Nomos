import { draw } from '@nomos/sim-core/kernels';

export function chance(perMille: number, seed: number, stream: number, ...key: number[]): boolean {
  return (draw(seed, stream, ...key) >>> 0) % 1000 < perMille;
}

// rng.shuffled: each item's rank is its own draw, keyed on its index in items, with ties to the lower index.
export function shuffled<T>(items: readonly T[], seed: number, stream: number, ...key: number[]): T[] {
  const ranks = items.map((_, i) => draw(seed, stream, ...key, i));
  const order = items.map((_, i) => i).sort((i, j) => ranks[i] - ranks[j] || i - j);
  return order.map((i) => items[i]);
}
