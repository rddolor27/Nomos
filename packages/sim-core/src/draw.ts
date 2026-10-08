const GOLDEN_RATIO = 0x9e3779b9;

// lowbias32 (Chris Wellons, public domain), ported from tools/worldgen/rng.py: Math.imul and >>> keep it in 32 bits.
export function mix(x: number): number {
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

// The seed is hashed before the stream and keys, so neighbouring seeds give unrelated worlds.
function streamStart(seed: number, stream: number): number {
  return mix(mix(seed ^ GOLDEN_RATIO) ^ stream);
}

export function draw(seed: number, stream: number, ...keys: number[]): number {
  let h = streamStart(seed, stream);
  for (let i = 0; i < keys.length; i++) h = mix(h ^ keys[i]);
  return h;
}

// Fixed-arity draws for per-tick code, where draw's rest parameter would allocate an array per call.
export function draw1(seed: number, stream: number, a: number): number {
  return mix(streamStart(seed, stream) ^ a);
}

export function draw2(seed: number, stream: number, a: number, b: number): number {
  return mix(draw1(seed, stream, a) ^ b);
}

export function draw3(seed: number, stream: number, a: number, b: number, c: number): number {
  return mix(draw2(seed, stream, a, b) ^ c);
}

export function draw4(seed: number, stream: number, a: number, b: number, c: number, d: number): number {
  return mix(draw3(seed, stream, a, b, c) ^ d);
}

export function below(n: number, seed: number, stream: number, ...keys: number[]): number {
  return draw(seed, stream, ...keys) % n;
}
