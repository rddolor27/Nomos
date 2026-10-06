import { below, draw, fade, fbm, fold, mix, value, ONE } from './port.mjs';

// Mistakes a straight transliteration makes, kept only to count how often each would bite.
const naive = {
  signedDraw: (seed, stream, ...keys) => draw(seed, stream, ...keys) | 0,
  valueShift(seed, stream, x, y, cell, octave = 0) {
    const ix = Math.floor(x / cell);
    const iy = Math.floor(y / cell);
    const tx = fade(Math.floor(((x - ix * cell) * ONE) / cell));
    const ty = fade(Math.floor(((y - iy * cell) * ONE) / cell));
    const corner = (dx, dy) => draw(seed, stream, octave, ix + dx, iy + dy) >> 16;
    const [a, b, c, d] = [corner(0, 0), corner(1, 0), corner(0, 1), corner(1, 1)];
    const top = a + (((b - a) * tx) >> 15);
    const bottom = c + (((d - c) * tx) >> 15);
    return top + (((bottom - top) * ty) >> 15);
  },
  valueTrunc(seed, stream, x, y, cell, octave = 0) {
    const ix = Math.trunc(x / cell);
    const iy = Math.trunc(y / cell);
    const tx = fade(Math.trunc(((x % cell) * ONE) / cell));
    const ty = fade(Math.trunc(((y % cell) * ONE) / cell));
    const corner = (dx, dy) => draw(seed, stream, octave, ix + dx, iy + dy) >>> 16;
    const [a, b, c, d] = [corner(0, 0), corner(1, 0), corner(0, 1), corner(1, 1)];
    const top = a + (((b - a) * tx) >> 15);
    const bottom = c + (((d - c) * tx) >> 15);
    return top + (((bottom - top) * ty) >> 15);
  },
};

// Expressions copied from terrain.py and climate.py, Python // against JS truncation, for every
// value fbm can return (0..65535).
const TERRAIN_ONE = 1 << 14;
const FLOOR_PATTERNS = {
  'terrain._edges wiggle (v-32768)*ONE*3//32768//8': [
    (v) => Math.floor(Math.floor(((v - 32768) * TERRAIN_ONE * 3) / 32768) / 8),
    (v) => Math.trunc(Math.trunc(((v - 32768) * TERRAIN_ONE * 3) / 32768) / 8),
  ],
  'terrain.shape relief (v-32768)*5//16': [
    (v) => Math.floor(((v - 32768) * 5) / 16),
    (v) => Math.trunc(((v - 32768) * 5) / 16),
  ],
  'terrain._chains crest (v-32768)*4//3': [
    (v) => Math.floor(((v - 32768) * 4) / 3),
    (v) => Math.trunc(((v - 32768) * 4) / 3),
  ],
  'climate.moisture (v-32768)//150': [
    (v) => Math.floor((v - 32768) / 150),
    (v) => Math.trunc((v - 32768) / 150),
  ],
  'climate.temperature (v-32768)//1024 as >> 10': [
    (v) => Math.floor((v - 32768) / 1024),
    (v) => (v - 32768) >> 10,
  ],
};

export function compare(vectors) {
  const out = { fade: 0, draws: 0, below: 0, value: 0, fbm: 0, grids: [], naive: {}, floorPatterns: {} };

  vectors.fade.forEach((expected, t) => { if (fade(t) !== expected) out.fade++; });

  const drawResults = [];
  let signedBelow = 0;
  let belowCases = 0;
  for (const [seed, stream, keys, expected] of vectors.draws) {
    const got = draw(seed, stream, ...keys);
    drawResults.push(got);
    if (got !== expected) out.draws++;
    for (const n of [3, 7, 100, 1000]) {
      belowCases++;
      if (below(n, seed, stream, ...keys) !== expected % n) out.below++;
      if (naive.signedDraw(seed, stream, ...keys) % n !== expected % n) signedBelow++;
    }
  }
  out.foldDraws = fold(drawResults) === vectors.fold_draws;

  const noiseResults = [];
  let shiftMiss = 0;
  let truncMiss = 0;
  let truncNegative = 0;
  let valueCases = 0;
  for (const [kind, seed, stream, x, y, cell, extra, expected] of vectors.noise) {
    const got = kind === 'value' ? value(seed, stream, x, y, cell, extra) : fbm(seed, stream, x, y, cell, extra);
    noiseResults.push(got);
    if (got !== expected) out[kind]++;
    if (kind === 'value') {
      valueCases++;
      if (naive.valueShift(seed, stream, x, y, cell, extra) !== expected) shiftMiss++;
      if (naive.valueTrunc(seed, stream, x, y, cell, extra) !== expected) {
        truncMiss++;
        if (x < 0 || y < 0) truncNegative++;
      }
    }
  }
  out.foldNoise = fold(noiseResults) === vectors.fold_noise;

  for (const [seed, stream, width, height, cell, octaves, expected] of vectors.grids) {
    const values = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) values.push(fbm(seed, stream, x, y, cell, octaves));
    out.grids.push({ seed: seed.toString(16), width, height, cell, octaves, match: fold(values) === expected });
  }

  out.cases = { fade: vectors.fade.length, draws: vectors.draws.length, below: belowCases, noise: vectors.noise.length, value: valueCases };
  out.naive = {
    'signed draw then % n': `${signedBelow} of ${belowCases}`,
    'lattice >> 16 instead of >>> 16': `${shiftMiss} of ${valueCases}`,
    'truncating divmod': `${truncMiss} of ${valueCases} (${truncNegative} with a negative coordinate)`,
  };
  for (const [name, [floorFn, truncFn]] of Object.entries(FLOOR_PATTERNS)) {
    let miss = 0;
    for (let v = 0; v < 65536; v++) if (floorFn(v) !== truncFn(v)) miss++;
    out.floorPatterns[name] = `${miss} of 65536`;
  }
  out.mixSelfTest = mix(0) === 0 && mix(1) === mix(1 + 2 ** 32);
  return out;
}
