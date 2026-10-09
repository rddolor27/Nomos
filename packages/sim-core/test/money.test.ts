import { describe, expect, it } from 'vitest';
import { draw2 } from '../src/random/draw.ts';
import { MAX_SAFE_CENTS } from '../src/money/invariants.ts';
import { PPM, mulPpm, mulPpmUp } from '../src/money/ppm.ts';

const TWO_TO = [1];
for (let bits = 1; bits <= 53; bits++) TWO_TO.push(TWO_TO[bits - 1] * 2);

// BigInt division truncates toward zero, so an inexact negative quotient steps down to the floor.
function referenceMulPpm(cents: number, ppm: number): number {
  const product = BigInt(cents) * BigInt(ppm);
  const quotient = product / BigInt(PPM);
  return Number(product % BigInt(PPM) < 0n ? quotient - 1n : quotient);
}

// BigInt division truncates toward zero, which is already the ceiling of a negative quotient.
function referenceMulPpmUp(cents: number, ppm: number): number {
  const product = BigInt(cents) * BigInt(ppm);
  const quotient = product / BigInt(PPM);
  return Number(product % BigInt(PPM) > 0n ? quotient + 1n : quotient);
}

// Magnitudes of 1 to 53 bits, so small balances and balances near 2^53 both appear.
function keyedCents(i: number): number {
  const bits = 1 + (draw2(7, 1, i, 0) % 53);
  const wide = (draw2(7, 1, i, 1) >>> 11) * 4_294_967_296 + draw2(7, 1, i, 2);
  const magnitude = Math.floor(wide / TWO_TO[53 - bits]);
  return draw2(7, 1, i, 3) % 2 === 0 ? magnitude : 0 - magnitude;
}

describe('mulPpm', () => {
  it('floors cents times ppm exactly', () => {
    for (let i = 0; i < 100_000; i++) {
      const cents = keyedCents(i);
      const ppm = draw2(7, 2, i, 0) % (PPM + 1);
      expect(mulPpm(cents, ppm), `mulPpm(${cents}, ${ppm})`).toBe(referenceMulPpm(cents, ppm));
    }
    expect(mulPpm(MAX_SAFE_CENTS, PPM)).toBe(MAX_SAFE_CENTS);
    expect(mulPpm(-MAX_SAFE_CENTS, PPM)).toBe(-MAX_SAFE_CENTS);
    expect(mulPpm(-1, 1)).toBe(-1);
    expect(mulPpm(120_000_000_000, 74_100)).toBe(8_892_000_000);
  });

  it('stays exact at the ends of its domain and beside whole quotients', () => {
    const topQuotient = Math.floor(MAX_SAFE_CENTS / PPM);
    const cases = [0, 1, PPM - 1, PPM, MAX_SAFE_CENTS - 1, MAX_SAFE_CENTS, TWO_TO[52]];
    // Quotients above 2^33 are where a double division has the least room before it could round across an integer.
    for (const quotient of [1, 2, TWO_TO[20], TWO_TO[33] - 1, TWO_TO[33], TWO_TO[33] + 1, topQuotient - 1, topQuotient]) {
      cases.push(quotient * PPM - 1, quotient * PPM, quotient * PPM + 1);
    }
    for (const magnitude of cases) {
      for (const cents of [magnitude, 0 - magnitude]) {
        for (const ppm of [0, 1, 2, 74_100, PPM / 2, PPM - 1, PPM]) {
          expect(mulPpm(cents, ppm), `mulPpm(${cents}, ${ppm})`).toBe(referenceMulPpm(cents, ppm));
        }
      }
    }
  });
});

describe('mulPpmUp', () => {
  it('ceils cents times ppm exactly', () => {
    for (let i = 0; i < 100_000; i++) {
      const cents = keyedCents(i);
      const ppm = draw2(7, 2, i, 0) % (PPM + 1);
      expect(mulPpmUp(cents, ppm), `mulPpmUp(${cents}, ${ppm})`).toBe(referenceMulPpmUp(cents, ppm));
    }
    expect(mulPpmUp(MAX_SAFE_CENTS, PPM)).toBe(MAX_SAFE_CENTS);
    expect(mulPpmUp(-MAX_SAFE_CENTS, PPM)).toBe(-MAX_SAFE_CENTS);
    expect(mulPpmUp(1, 1)).toBe(1);
    expect(mulPpmUp(-1, 1)).toBe(0);
    expect(mulPpmUp(120_000_000_001, 74_100)).toBe(8_892_000_001);
  });

  it('stays exact at the ends of its domain and on whole quotients', () => {
    const magnitudes = [0, 1, PPM - 1, PPM, PPM + 1, 2 * PPM, MAX_SAFE_CENTS - 1, MAX_SAFE_CENTS, TWO_TO[52]];
    for (const magnitude of magnitudes) {
      for (const cents of [magnitude, 0 - magnitude]) {
        for (const ppm of [0, 1, 74_100, PPM / 2, PPM - 1, PPM]) {
          expect(mulPpmUp(cents, ppm), `mulPpmUp(${cents}, ${ppm})`).toBe(referenceMulPpmUp(cents, ppm));
        }
      }
    }
  });

  it('is the floor, or one above when the quotient is not whole', () => {
    expect(mulPpmUp(1_000_000, 500_000)).toBe(mulPpm(1_000_000, 500_000));
    expect(mulPpmUp(1_000_001, 500_000)).toBe(mulPpm(1_000_001, 500_000) + 1);
    expect(mulPpmUp(-1_000_001, 500_000)).toBe(mulPpm(-1_000_001, 500_000) + 1);
  });

  it('never returns -0, which would change the state hash', () => {
    expect(Object.is(mulPpmUp(0, 5), 0)).toBe(true);
    expect(Object.is(mulPpmUp(-0, 5), 0)).toBe(true);
    expect(Object.is(mulPpmUp(-1, 1), 0)).toBe(true);
    expect(Object.is(mulPpmUp(-999_999, 1), 0)).toBe(true);
    expect(Object.is(mulPpmUp(5, 0), 0)).toBe(true);
    expect(Object.is(mulPpmUp(-5, 0), 0)).toBe(true);
  });
});
