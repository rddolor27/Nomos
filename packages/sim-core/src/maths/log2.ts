import { LOG2_Q16 } from './tables.ts';

const MANTISSA_BITS = 8;

// 65,536 * log2(x) for an integer x in 1..0xFFFFFFFF, read from the 8 bits after x's leading one.
export function log2Q16(x: number): number {
  const exponent = 31 - Math.clz32(x);
  const shifted = exponent >= MANTISSA_BITS ? x >>> (exponent - MANTISSA_BITS) : x << (MANTISSA_BITS - exponent);
  return (exponent << 16) + LOG2_Q16[shifted & 0xff];
}
