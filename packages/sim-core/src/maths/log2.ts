import { EXP2_Q30, LOG2_Q16 } from './tables.ts';

const MANTISSA_BITS = 8;
const TWO_POW_32 = 4_294_967_296;
const SEGMENT_BITS = 10;
const SEGMENT_SIZE = 1 << SEGMENT_BITS;
const SEGMENT_MASK = SEGMENT_SIZE - 1;
const Q30_BITS = 30;

// 65,536 * log2(x) for an integer x in 1..0xFFFFFFFF, read from the 8 bits after x's leading one.
export function log2Q16(x: number): number {
  const exponent = 31 - Math.clz32(x);
  const shifted = exponent >= MANTISSA_BITS ? x >>> (exponent - MANTISSA_BITS) : x << (MANTISSA_BITS - exponent);
  return (exponent << 16) + LOG2_Q16[shifted & 0xff];
}

// 65,536 * log2(x) for a whole x in 1..2^53 - 1. It halves x into log2Q16's range and adds 65,536 per halving; the bit length
// of x's high word is the number of halvings that leave x in 2^31..2^32 - 1.
export function log2Q16Wide(x: number): number {
  if (x < TWO_POW_32) return log2Q16(x);
  const halvings = 32 - Math.clz32(Math.floor(x / TWO_POW_32));
  return log2Q16(Math.floor(x / (1 << halvings))) + (halvings << 16);
}

// floor(2^(q16 / 65,536)) for q16 in 0..53 * 65,536 - 1, so the result stays below 2^53. The 6 bits under q16's whole part
// pick a segment of EXP2_Q30, the low 10 bits interpolate linearly inside it, and a shift scales the Q30 result to the whole
// part. The interpolation overshoots 2^x by at most 1.5e-5 of its value (computed). Every product is exact in a double.
export function exp2Floor(q16: number): number {
  const exponent = q16 >> 16;
  const fraction = q16 & 0xffff;
  const segment = fraction >> SEGMENT_BITS;
  const lower = EXP2_Q30[segment];
  const rise = EXP2_Q30[segment + 1] - lower;
  const mantissaQ30 = lower + Math.floor((rise * (fraction & SEGMENT_MASK)) / SEGMENT_SIZE);
  return exponent >= Q30_BITS ? mantissaQ30 * (1 << (exponent - Q30_BITS)) : mantissaQ30 >>> (Q30_BITS - exponent);
}
