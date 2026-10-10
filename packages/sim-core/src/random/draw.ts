const GOLDEN_RATIO = 0x9e3779b9;

// lowbias32 (Chris Wellons, public domain), ported from tools/worldgen/rng.py: Math.imul and >>> keep it in 32 bits. The
// result is signed, which is how drawBelowN passes it on; mix is the same bits unsigned.
function mixBits(x: number): number {
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  return x ^ (x >>> 16);
}

export function mix(x: number): number {
  return mixBits(x) >>> 0;
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

// A draw of 2^31 or more is a heap number to V8 when it crosses a call that is not inlined, and a caller that is not yet
// optimized does not inline. So per-tick code takes its draw already reduced: drawBelowN(…, n) is exactly drawN(…) % n, a
// small integer that is never boxed. The mixing in between passes signed values, which are small integers on Node, and
// goes unsigned only in the last step, in the function that returns.
function streamBits(seed: number, stream: number): number {
  return mixBits(mixBits(seed ^ GOLDEN_RATIO) ^ stream);
}

export function drawBelow2(seed: number, stream: number, a: number, b: number, n: number): number {
  return (mixBits(mixBits(streamBits(seed, stream) ^ a) ^ b) >>> 0) % n;
}

export function drawBelow3(seed: number, stream: number, a: number, b: number, c: number, n: number): number {
  return (mixBits(mixBits(mixBits(streamBits(seed, stream) ^ a) ^ b) ^ c) >>> 0) % n;
}

export function drawBelow4(seed: number, stream: number, a: number, b: number, c: number, d: number, n: number): number {
  return (mixBits(mixBits(mixBits(mixBits(streamBits(seed, stream) ^ a) ^ b) ^ c) ^ d) >>> 0) % n;
}

// JS % follows the dividend's sign and Python's the divisor's, so they agree only on an unsigned dividend (R9). draw
// already returns unsigned values, since mix ends in >>> 0; the extra >>> 0 is there only so the generator lint
// accepts the %.
export function below(n: number, seed: number, stream: number, ...keys: number[]): number {
  return (draw(seed, stream, ...keys) >>> 0) % n;
}
