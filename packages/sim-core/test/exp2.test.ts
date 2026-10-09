import { describe, expect, it } from 'vitest';
import { exp2Floor, log2Q16, log2Q16Wide } from '../src/maths/log2.ts';
import { draw2 } from '../src/random/draw.ts';

const Q16 = 65_536;
const TWO_POW_32 = 4_294_967_296;
const MAX_EXPONENT = 53;
// The table's 8-bit mantissa under-reads log2 by at most its widest step, 369, and rounds up by at most 1.
const LOG2_BELOW = 370;
const LOG2_ABOVE = 1;

const TWO_TO = [1];
for (let bits = 1; bits <= MAX_EXPONENT; bits++) TWO_TO.push(TWO_TO[bits - 1] * 2);

// A whole number of 1 to maxBits bits, so small and huge arguments both appear.
function keyedWhole(i: number, maxBits: number): number {
  const bits = 1 + (draw2(9, 0x7c, i, 0) % maxBits);
  const wide = (draw2(9, 0x7c, i, 1) >>> 11) * TWO_POW_32 + draw2(9, 0x7c, i, 2);
  return Math.max(1, Math.floor(wide / TWO_TO[53 - bits]));
}

describe('log2Q16Wide', () => {
  it('equals log2Q16 below 2^32', () => {
    const different: string[] = [];
    for (let i = 0; i < 10_000; i++) {
      const x = keyedWhole(i, 32);
      if (log2Q16Wide(x) !== log2Q16(x)) different.push(`x ${x}`);
    }
    expect(different).toEqual([]);
    expect(log2Q16Wide(0xffff_ffff)).toBe(log2Q16(0xffff_ffff));
  });

  it('adds 65,536 per doubling, across 2^32 and up to 2^53 - 1', () => {
    expect(log2Q16Wide(TWO_TO[32])).toBe(32 * Q16);
    expect(log2Q16Wide(TWO_TO[33])).toBe(33 * Q16);
    const off: string[] = [];
    for (let i = 0; i < 10_000; i++) {
      const x = keyedWhole(i, 52);
      if (log2Q16Wide(2 * x) !== log2Q16Wide(x) + Q16) off.push(`x ${x}`);
    }
    expect(off).toEqual([]);
  });

  it('stays within the 8-bit mantissa bound of the exact log2', () => {
    const outside: string[] = [];
    for (let i = 0; i < 10_000; i++) {
      const x = keyedWhole(i, 53);
      const exact = Q16 * Math.log2(x);
      const got = log2Q16Wide(x);
      if (got < exact - LOG2_BELOW || got > exact + LOG2_ABOVE) outside.push(`x ${x}: got ${got}, exact ${exact}`);
    }
    expect(outside).toEqual([]);
    // 52 whole doublings and the table's last mantissa step, 65,351.
    expect(log2Q16Wide(TWO_TO[53] - 1)).toBe(52 * Q16 + 65_351);
  });
});

describe('exp2Floor', () => {
  it('is exact at whole powers of two and on the first table step', () => {
    for (let e = 0; e < MAX_EXPONENT; e++) expect(exp2Floor(e * Q16), `2^${e}`).toBe(TWO_TO[e]);
    expect(exp2Floor(Q16 - 1)).toBe(1);
    // 1,024 * sqrt 2 = 1,448.15, at the table's 32nd entry.
    expect(exp2Floor(10 * Q16 + Q16 / 2)).toBe(1_448);
  });

  it('never decreases and stays within 1 + 2e-5 of the exact floor over its whole domain', () => {
    const outside: string[] = [];
    let previous = 0;
    for (let q = 0; q < MAX_EXPONENT * Q16; q++) {
      const got = exp2Floor(q);
      const exact = Math.floor(2 ** (q / Q16));
      if (got < previous) outside.push(`q ${q} fell from ${previous} to ${got}`);
      else if (!Number.isSafeInteger(got)) outside.push(`q ${q}: ${got} is no safe integer`);
      else if (Math.abs(got - exact) > 1 + 2e-5 * exact) outside.push(`q ${q}: got ${got}, exact ${exact}`);
      previous = got;
    }
    expect(outside.slice(0, 10)).toEqual([]);
  });
});
