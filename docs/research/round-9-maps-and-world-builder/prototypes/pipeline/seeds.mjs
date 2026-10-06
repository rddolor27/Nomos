// node seeds.mjs: are draws for neighbouring world seeds unrelated once the seed is hashed first?
// Compares worldgen's draw with the earlier unhashed form, where seed ^ entity let two seeds that
// differ in low bits produce the same draws, shuffled among entities.
import { draw, mix } from './port.mjs';

const unhashed = (seed, stream, entity) => mix(mix(seed ^ entity) ^ stream);
const ENTITIES = 4096;
const SEEDS = 1000;

function overlap(fn, a, b) {
  const seen = new Set();
  for (let e = 0; e < ENTITIES; e++) seen.add(fn(a, 7, e));
  let shared = 0;
  for (let e = 0; e < ENTITIES; e++) if (seen.has(fn(b, 7, e))) shared++;
  return shared;
}

function popcount(x) {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (Math.imul((x + (x >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24);
}

for (const [name, fn] of [['unhashed seed ^ entity', unhashed], ['worldgen draw', draw]]) {
  let shared = 0;
  let worst = 0;
  let bits = 0;
  let pairs = 0;
  for (let s = 0; s < SEEDS; s++) {
    const o = overlap(fn, s * 2, s * 2 + 1);
    shared += o;
    worst = Math.max(worst, o);
    for (let e = 0; e < 256; e++) {
      bits += popcount(fn(s, 7, e) ^ fn(s + 1, 7, e));
      pairs++;
    }
  }
  console.log(`${name}: seeds 2s and 2s+1 share ${(shared / SEEDS).toFixed(1)} of ${ENTITIES} draws on average ` +
    `(worst ${worst}); seeds s and s+1 differ in ${(bits / pairs).toFixed(2)} of 32 bits per draw`);
}
