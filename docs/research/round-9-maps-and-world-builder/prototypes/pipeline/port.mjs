// Port of tools/worldgen rng.py and noise.py. Python ints never overflow and its // and divmod
// floor toward -infinity, so: draws stay uint32 (>>> 0), lattice values use >>> 16 (>> would read
// bit 31 as a sign), and divisions use Math.floor, exact for integer operands below 2^53.

export const ONE = 1 << 15;

export function mix(x) {
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

export function draw(seed, stream, ...keys) {
  let h = mix(mix(seed ^ 0x9e3779b9) ^ stream);
  for (let i = 0; i < keys.length; i++) h = mix(h ^ keys[i]);
  return h;
}

export function draw3(seed, stream, a, b, c) {
  return mix(mix(mix(mix(mix(seed ^ 0x9e3779b9) ^ stream) ^ a) ^ b) ^ c);
}

export function below(n, seed, stream, ...keys) {
  return draw(seed, stream, ...keys) % n;
}

export function floorDiv(a, b) {
  return Math.floor(a / b);
}

export function fade(t) {
  return (((t * t) >> 15) * (3 * ONE - 2 * t)) >> 15;
}

export function value(seed, stream, x, y, cell, octave = 0) {
  const ix = Math.floor(x / cell);
  const iy = Math.floor(y / cell);
  const tx = fade(Math.floor(((x - ix * cell) * ONE) / cell));
  const ty = fade(Math.floor(((y - iy * cell) * ONE) / cell));
  const a = draw3(seed, stream, octave, ix, iy) >>> 16;
  const b = draw3(seed, stream, octave, ix + 1, iy) >>> 16;
  const c = draw3(seed, stream, octave, ix, iy + 1) >>> 16;
  const d = draw3(seed, stream, octave, ix + 1, iy + 1) >>> 16;
  const top = a + (((b - a) * tx) >> 15);
  const bottom = c + (((d - c) * tx) >> 15);
  return top + (((bottom - top) * ty) >> 15);
}

// 1 << octaves and cell >> octave wrap at 32 in JS but not in Python, hence the cap.
export function fbm(seed, stream, x, y, cell, octaves = 5) {
  if (octaves > 30) throw new RangeError('octaves > 30');
  let total = 0;
  let weight = 0;
  let amp = 1 << octaves;
  for (let octave = 0; octave < octaves; octave++) {
    total += value(seed, stream, x, y, Math.max(1, cell >> octave), octave) * amp;
    weight += amp;
    amp >>= 1;
  }
  return Math.floor(total / weight);
}

export function fold(values) {
  let h = mix(0x5eed);
  for (let i = 0; i < values.length; i++) h = mix(h ^ values[i]);
  return h;
}
