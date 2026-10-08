import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { franchiseHits } from '../src/franchise.ts';
import { CATEGORIES, FIXTURES, loadRealWorld, nearRealWorld, type Category, type RealWorld } from '../src/real-world.ts';

interface SourceNote {
  readonly query: string;
  readonly date: string;
  readonly licence: string;
  readonly count: number;
}

const MIN_ENTRIES: Record<Category, number> = { countries: 190, languages: 100, demonyms: 100, ethnonyms: 100, religions: 100 };
const LICENCES = ['CC0-1.0', 'Unicode-3.0'];

function readFixture(file: string): string {
  return readFileSync(new URL(file, FIXTURES), 'utf8');
}

function readLines(file: string): string[] {
  return readFixture(file).replace(/\r?\n$/, '').split(/\r?\n/);
}

describe('nearRealWorld', () => {
  const tiny: RealWorld = new Map<string, Category>([
    ['france', 'countries'],
    ['japan', 'countries'],
    ['hindu', 'demonyms'],
    ['spanish', 'languages'],
  ]);

  it('allows one edit up to five letters', () => {
    expect(nearRealWorld('Japn', tiny)).toBe('japan');
    expect(nearRealWorld('Jxpan', tiny)).toBe('japan');
    expect(nearRealWorld('Hindo', tiny)).toBe('hindu');
  });

  it('lets a five-letter name two edits away pass', () => {
    expect(nearRealWorld('Jxpxn', tiny)).toBeNull();
  });

  it('allows two edits from six letters up', () => {
    expect(nearRealWorld('Franse', tiny)).toBe('france');
    expect(nearRealWorld('Fxxnce', tiny)).toBe('france');
    expect(nearRealWorld('Spanesh', tiny)).toBe('spanish');
    expect(nearRealWorld('Fxxxce', tiny)).toBeNull();
  });

  it('folds accents and case', () => {
    expect(nearRealWorld('JAPÓN', tiny)).toBe('japan');
    expect(nearRealWorld('Ja' + 'pán', tiny)).toBe('japan');
  });

  it('checks each word of a longer name, and not the short ones', () => {
    expect(nearRealWorld('Velan Japn', tiny)).toBe('japan');
    expect(nearRealWorld('Qzorvex of Velan', tiny)).toBeNull();
    expect(nearRealWorld('Ja', tiny)).toBeNull();
  });
});

describe('the real-world fixture', () => {
  it.each(CATEGORIES)('keeps %s clean', (category) => {
    const lines = readLines(`${category}.txt`);
    const generic = new Set(readLines('generic-words.txt'));
    expect(lines.length).toBeGreaterThanOrEqual(MIN_ENTRIES[category]);
    expect(lines.filter((line) => !/^[a-z]{3,}$/.test(line))).toEqual([]);
    expect(lines).toEqual([...lines].sort());
    expect(new Set(lines).size).toBe(lines.length);
    expect(lines.filter((line) => franchiseHits(line).length > 0)).toEqual([]);
    expect(lines.filter((line) => generic.has(line))).toEqual([]);
  });

  it('keeps the generic words sorted and unique', () => {
    const lines = readLines('generic-words.txt');
    expect(lines.filter((line) => !/^[a-z]+$/.test(line))).toEqual([]);
    expect(lines).toEqual([...lines].sort());
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('carries both licences and a source note per category', () => {
    expect(readFixture('LICENSE-cldr.txt')).toMatch(/unicode license v3/i);
    expect(readFixture('LICENSE-wikidata.txt')).toMatch(/CC0 1\.0 Universal/i);
    const sources = JSON.parse(readFixture('sources.json')) as Record<Category, SourceNote>;
    for (const category of CATEGORIES) {
      const note = sources[category];
      expect(LICENCES).toContain(note.licence);
      expect(note.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(note.query).not.toBe('');
      expect(note.count).toBe(readLines(`${category}.txt`).length);
    }
  });
});

describe('against the real fixture', () => {
  let fixture: RealWorld;

  beforeAll(() => {
    fixture = loadRealWorld();
  });

  it('maps each token to the first category that holds it', () => {
    expect(fixture.get('japan')).toBe('countries');
    expect(fixture.size).toBeGreaterThanOrEqual(CATEGORIES.length * 100);
  });

  it.each(['Japn', 'Franse', 'Spanesh', 'Hindo'])('rejects %s, a slip from a real place, people or faith', (name) => {
    expect(nearRealWorld(name, fixture)).not.toBeNull();
  });

  it('lets a five-letter name two edits away pass and rejects a six-letter one', () => {
    expect(nearRealWorld('Jxpxn', fixture)).toBeNull();
    expect(nearRealWorld('Fxxnce', fixture)).toBe('france');
  });

  it('passes a name that is nowhere near', () => {
    expect(nearRealWorld('Qzorvex', fixture)).toBeNull();
  });
});
