import { describe, expect, it } from 'vitest';
import { eatingOf, facingOf, indoorsOf, isTrueOnly, itemOf, jobOf, lookOf, packVisual } from '../src/index.ts';

const RESERVED_BIT_31 = 0x80000000;

describe('the street bits of the visual word', () => {
  it('round-trip indoors, the item carried and eating, and leave look, job, facing and trueOnly alone', () => {
    for (const item of [0, 1, 7]) {
      for (const [indoors, eating] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const word = packVisual(95, 7, 31, 255, 3, 1, indoors, item, eating);

        expect([indoorsOf(word), itemOf(word), eatingOf(word)]).toEqual([indoors, item, eating]);
        expect([lookOf(word), jobOf(word), facingOf(word), isTrueOnly(word)]).toEqual([95, 255, 3, 1]);
        expect([(word >>> 0) === word, word & RESERVED_BIT_31]).toEqual([true, 0]);
      }
    }
  });

  it('leave a word with no street exactly as it was packed before, and mask a stray street value to nothing', () => {
    const before = 37 | (1 << 8) | (4 << 16) | (2 << 24);

    expect(packVisual(37, 1, 0, 4, 2, 0)).toBe(before);
    expect(packVisual(37, 1, 0, 4, 2, 0, 0, 0, 0)).toBe(before);
    expect(packVisual(0, 0, 0, 0, 0, 0, 2, 8, 2)).toBe(0);
  });
});
