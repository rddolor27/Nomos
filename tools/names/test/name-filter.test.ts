import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { franchiseHits } from '../src/filters/franchise.ts';
import { nearAny, profane, rejectName } from '../src/filters/name-filter.ts';
import { FIXTURES } from '../src/filters/real-world.ts';

interface SourceNote {
  readonly count: number;
}

const LISTS = ['avoid-places', 'avoid-species', 'profanity'];

function lines(file: string): string[] {
  return readFileSync(new URL(file, FIXTURES), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line !== '');
}

// One letter off at the end, inside every list's edit allowance, so no test spells a banned word.
function oneLetterOff(word: string): string {
  return `${word.slice(0, -1)}${word.endsWith('z') ? 'y' : 'z'}`;
}

describe('the person-name filter', { timeout: 30_000 }, () => {
  it('allows one edit up to 5 letters and two above', () => {
    expect(nearAny('zorbax', ['zorbix'])).toBe(true);
    expect(nearAny('zorb', ['zorbi'])).toBe(true);
    expect(nearAny('zorb', ['zarbo'])).toBe(false);
  });

  it('matches 3-letter profanity whole and longer entries anywhere', () => {
    expect(profane('cde', ['cde'])).toBe(true);
    expect(profane('abcdefg', ['cde'])).toBe(false);
    expect(profane('xxbadwxx', ['badw'])).toBe(true);
  });

  it('rejects near misses of the franchise lists and words holding profanity', () => {
    for (const list of ['avoid-places', 'avoid-species']) {
      for (const token of lines(`${list}.txt`).slice(0, 20)) {
        expect(rejectName(oneLetterOff(token)), `${list}: ${token}`).not.toBeNull();
      }
    }
    for (const entry of lines('profanity.txt').filter((line) => line.length >= 4).slice(0, 20)) {
      expect(rejectName(`qq${entry}qq`)).not.toBeNull();
    }
  });

  it('rejects creature-style words ending in mon', () => {
    expect(rejectName('dalmon')).toBe('franchise');
  });

  it('passes a clean word', () => {
    expect(rejectName('quvexil')).toBeNull();
  });

  it('keeps each list folded, sorted and unique, as counted in its note', () => {
    const notes = JSON.parse(readFileSync(new URL('sources.json', FIXTURES), 'utf8')) as Record<string, SourceNote>;
    for (const list of LISTS) {
      const tokens = lines(`${list}.txt`);
      expect(tokens.every((token) => /^[a-z]{3,}$/.test(token)), list).toBe(true);
      expect([...new Set(tokens)].sort(), list).toEqual(tokens);
      expect(notes[list].count, list).toBe(tokens.length);
      expect(tokens.filter((token) => franchiseHits(token).length > 0), list).toEqual([]);
    }
    expect(lines('avoid-places.txt').every((token) => token.length >= 4)).toBe(true);
    expect(lines('avoid-species.txt')).toHaveLength(1_023);
  });

  it('pins every franchise item by its revision', () => {
    const pins = lines('avoid-items.txt');
    expect(pins).toHaveLength(1_109);
    expect(pins.every((pin) => /^Q\d+ \d+ (species|place)$/.test(pin))).toBe(true);
    expect([...pins].sort()).toEqual(pins);
  });

  it('attributes the profanity lists and names every change', () => {
    const licence = readFileSync(new URL('LICENSE-ldnoobw.txt', FIXTURES), 'utf8');
    expect(licence).toContain('commit 5faf2ba42d7b1c0977169ec3611df25a3c08eb13');
    expect(licence).toMatch(/Modified: Latin-script lists merged/);
    expect(licence).toMatch(/Attribution 4\.0 International/);
  });
});
