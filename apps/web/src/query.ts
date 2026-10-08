const MAX_SEED = 4_294_967_295;

export function seedFrom(search: string, random: () => number): number {
  const value = new URLSearchParams(search).get('seed');
  if (value === null || !/^\d+$/.test(value)) return random();
  const seed = Number(value);
  return seed <= MAX_SEED ? seed : random();
}

export function backendFrom(search: string): 'auto' | 'canvas2d' {
  return new URLSearchParams(search).has('canvas') ? 'canvas2d' : 'auto';
}
