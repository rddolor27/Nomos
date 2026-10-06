// Deterministic helpers: keyed counter-based draw, log2 lookup in Q16, FNV hash of typed arrays.
// Only + - * /, Math.floor, Math.imul, Math.clz32 and bit operations are used (sim-core rule).

export function mix32(h) {
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16; return h >>> 0;
}

// draw(seed, entity, tick, stream): the seed is hashed before the entity is mixed in (plan, M0 / R4).
export function draw(seed, entity, tick, stream) {
  let h = mix32(seed ^ 0x9e3779b9);
  h = mix32(h ^ entity);
  h = mix32(h ^ Math.imul(tick, 0x85ebca6b));
  return mix32(h ^ Math.imul(stream, 0xc2b2ae35));
}

// floor(log2(y) * 65536) for y in [1, 2) by repeated squaring. Squaring and halving are correctly
// rounded IEEE operations, so the table is identical in every engine; no Math.log at run time.
function log2Frac16(y) {
  let r = 0;
  for (let b = 15; b >= 0; b--) {
    y = y * y;
    if (y >= 2) { y = y / 2; r |= 1 << b; }
  }
  return r;
}

export const LOG2_FRAC = new Int32Array(256);
for (let m = 0; m < 256; m++) LOG2_FRAC[m] = log2Frac16(1 + m / 256);

// log2(x) in Q16 for integer-valued x >= 1 (x < 2^53), from 8 mantissa bits: max error log2(1 + 1/256) = 0.0056.
export function log2Q16(x) {
  let e = 0;
  if (x >= 4294967296) { x = Math.floor(x / 2097152); e = 21; }
  const u = x >>> 0;
  const p = 31 - Math.clz32(u);
  const m = p >= 8 ? (u >>> (p - 8)) & 255 : (u << (8 - p)) & 255;
  return ((p + e) << 16) + LOG2_FRAC[m];
}

export function fnv(h, ta) {
  const b = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength);
  for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
