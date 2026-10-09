import { draw1 } from '@nomos/sim-core/kernels';
import { describe, expect, it } from 'vitest';
import { personName } from '../src/index.ts';
import { NAME_WORDS as W } from '../src/naming/words.ts';

const KEYS = 10_000;

function cap(word: string): string {
  return `${word[0].toUpperCase()}${word.slice(1)}`;
}

describe('personName', () => {
  it('reads the given word from the low half of the key and the family word from the high half', () => {
    expect(personName(0x0003_0005)).toBe(`${cap(W[5])} ${cap(W[3])}`);
  });

  it('moves the family word on when it would match the given word', () => {
    expect(personName(0x0007_0007)).toBe(`${cap(W[7])} ${cap(W[8])}`);
  });

  it('wraps from the last word to the first', () => {
    expect(personName(0xffff_ffff)).toBe(`${cap(W[1023])} ${cap(W[0])}`);
  });

  it('takes each half modulo the table size', () => {
    expect(personName(0x0400_0001)).toBe(`${cap(W[1])} ${cap(W[0])}`);
  });

  it('never repeats a word within a name', () => {
    const repeated: string[] = [];
    for (let i = 0; i < KEYS; i++) {
      const [given, family] = personName(draw1(7, 1, i)).split(' ');
      if (given === family) repeated.push(`${i}: ${given} ${family}`);
    }
    expect(repeated).toEqual([]);
  });
});
