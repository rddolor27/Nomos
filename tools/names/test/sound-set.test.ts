import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NAME_BASES, chainOf, drawWord, loadSoundSet, pickOthers } from '../src/sound-set/sound-set.ts';

const MAX_LETTERS = 11;

describe('the shared mixed sound set', { timeout: 30_000 }, () => {
  const sounds = loadSoundSet();

  it('learns a base as letter chains of order 2', () => {
    const chain = chainOf(['abc']);
    expect([...chain].map(([context, next]) => [context, Object.fromEntries(next)])).toEqual([
      ['^^', { a: 1 }],
      ['^a', { b: 1 }],
      ['ab', { c: 1 }],
      ['bc', { $: 1 }],
    ]);
  });

  it('picks two other bases per word, and every one in turn', () => {
    const seen = new Set<number>();
    let repeats = 0;
    for (let n = 0; n < 10_000; n++) {
      const [first, second] = pickOthers(32, 1, n);
      if (first === second || first < 0 || second < 0 || first >= 32 || second >= 32) repeats++;
      seen.add(first).add(second);
    }
    expect(repeats).toBe(0);
    expect(seen.size).toBe(32);
  });

  it('draws the same word every time, in letters a to z', () => {
    for (let n = 0; n < 200; n++) {
      const word = drawWord(sounds, 1, n);
      expect(drawWord(sounds, 1, n)).toBe(word);
      expect(word).toMatch(/^[a-z]+$/);
      expect(word.length).toBeLessThanOrEqual(MAX_LETTERS);
    }
  });

  it('mixes only the lead base and the two picked for the word', () => {
    const strays: string[] = [];
    for (let n = 0; n < 1_000; n++) {
      const [first, second] = pickOthers(sounds.others.length, 1, n);
      const chains = [sounds.lead, sounds.others[first], sounds.others[second]];
      const word = drawWord(sounds, 1, n);
      // A word cut at the cap drew no end.
      const padded = `^^${word}${word.length < MAX_LETTERS ? '$' : ''}`;
      for (let k = 2; k < padded.length; k++) {
        const context = padded.slice(k - 2, k);
        if (!chains.some((chain) => (chain.get(context)?.get(padded[k]) ?? 0) > 0)) strays.push(`${word} at ${k}`);
      }
    }
    expect(strays).toEqual([]);
  });

  it('reads the 33 real-world bases, Greek among them', () => {
    const bases = JSON.parse(readFileSync(NAME_BASES, 'utf8')) as Record<string, string[]>;
    expect(Object.keys(bases)).toHaveLength(33);
    expect(Object.keys(bases)).toContain('Greek');
    for (const [name, tokens] of Object.entries(bases)) {
      expect(tokens.length, name).toBeGreaterThanOrEqual(100);
      expect(tokens.every((token) => /^[a-z]{3,}$/.test(token)), name).toBe(true);
    }
    expect(sounds.others).toHaveLength(32);
    expect(sounds.sources.size).toBeGreaterThan(7_000);
  });

  it("keeps Fantasy Map Generator's licence beside its bases", () => {
    expect(readFileSync(new URL('LICENSE-fmg.txt', NAME_BASES), 'utf8')).toMatch(/Permission is hereby granted/);
  });
});
