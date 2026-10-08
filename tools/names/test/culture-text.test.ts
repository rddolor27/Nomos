import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CUSTOM_NOUNS, HIERARCHY_WORDS, cultureTableHits, cultureTextHits } from '../src/culture-text.ts';
import { scanPaths } from '../src/scan.ts';

const VELAN = ['Velan'];

describe('cultureTextHits', () => {
  it.each([
    ['a bare plural', 'Velans love fish', ['velans']],
    ['a name before people', 'Velan people love fish', ['velan people']],
    ['a name before a verb', 'The Velan are proud', ['velan are']],
    ['a claim about people with no share', 'People raised with Velan customs love fish', ['raised with velan customs']],
  ])('rejects generics: %s', (_why, text, hits) => {
    expect(cultureTextHits(text, VELAN)).toEqual(hits);
  });

  it.each([
    ['{culture}s love {food}', ['{culture}s']],
    ['{culture}es love {food}', ['{culture}es']],
    ['{culture} people pick {food}', ['{culture} people']],
    ['Many people raised with {culture} customs pick {food}', ['raised with {culture} customs']],
  ])('rejects the placeholder name the same way: %s', (text, hits) => {
    expect(cultureTextHits(text)).toEqual(hits);
  });

  it('rejects a name that ends a sentence or meets punctuation', () => {
    expect(cultureTextHits('She is Velan.', VELAN)).toEqual(['velan']);
    expect(cultureTextHits('The Velan, who love fish', VELAN)).toEqual(['velan']);
    expect(cultureTextHits('The Velan’s festival', VELAN)).toEqual(['velan']);
  });

  it.each([
    ['a tribal feast', 'tribal'],
    ['Exotic music', 'exotic'],
    ['the Neolithic dance', 'neolithic'],
  ])('rejects the hierarchy word in %j', (text, word) => {
    expect(cultureTextHits(text)).toEqual([word]);
  });

  it.each(HIERARCHY_WORDS)('rejects the hierarchy word %s', (word) => {
    expect(cultureTextHits(`a ${word} feast`)).toEqual([word]);
  });

  it('reads whole words, not parts of words', () => {
    expect(cultureTextHits('embrace the grace of a racecourse')).toEqual([]);
  });

  it.each([
    ['6 in 10 people raised with Velan customs pick fish', VELAN],
    ['{share} of people raised with {culture} customs pick {food}', undefined],
    ['the Velan festival starts at dusk', VELAN],
  ])('accepts shares and customs: %j', (text, names) => {
    expect(cultureTextHits(text, names)).toEqual([]);
  });

  it.each(CUSTOM_NOUNS)('accepts a name before the custom noun %s', (noun) => {
    expect(cultureTextHits(`the Velan ${noun} begin at dusk`, VELAN)).toEqual([]);
  });

  it('ignores case, accents and spacing', () => {
    expect(cultureTextHits('VELANS   love fish', VELAN)).toEqual(['velans']);
    expect(cultureTextHits('V' + 'é' + 'lans love fish', ['Vélan'])).toEqual(['velans']);
  });

  it('reads each sentence on its own for a share', () => {
    expect(cultureTextHits('Day 3 is a feast. People raised with Velan customs pick fish.', VELAN)).toEqual([
      'raised with velan customs',
    ]);
    expect(cultureTextHits('6.5 in 10 people raised with Velan customs pick fish.', VELAN)).toEqual([]);
  });

  it('checks every name it is given', () => {
    expect(cultureTextHits('Marns love fish and the Velan are proud', ['Velan', 'Marn'])).toEqual(['marns', 'velan are']);
  });

  it('refuses a culture name that is not one word', () => {
    expect(() => cultureTextHits('fine', ['Old Velan'])).toThrow(RangeError);
    expect(() => cultureTextHits('fine', [''])).toThrow(RangeError);
  });
});

describe('cultureTableHits', () => {
  it('reports each rule-breaking string with its line, and skips the keys', () => {
    const table = [
      '{',
      '  "tribe": "a quiet market",',
      '  "lines": [',
      '    "{culture}s love {food}",',
      '    "{share} of people raised with {culture} customs pick {food}",',
      '    "an exotic \\"dish\\"",',
      '    "\\u0074ribal feast"',
      '  ]',
      '}',
      '',
    ].join('\n');
    expect(cultureTableHits(table)).toEqual([
      { line: 4, text: '{culture}s love {food} [{culture}s]' },
      { line: 6, text: 'an exotic "dish" [exotic]' },
      { line: 7, text: 'tribal feast [tribal]' },
    ]);
  });

  it('reads several strings on one line', () => {
    expect(cultureTableHits('["fine", "a tribal feast", "primitive"]').map((hit) => hit.line)).toEqual([1, 1]);
  });

  it('finds nothing in a clean table', () => {
    expect(cultureTableHits('{"a": "the {culture} festival", "b": ["{share} of people pick {food}"]}\n')).toEqual([]);
  });
});

const dirs: string[] = [];

function makeTree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'nomos-culture-'));
  dirs.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('scanPaths on culture tables', () => {
  const generic = '{culture}s love {food}';
  const table = `{\n  "line": "${generic}"\n}\n`;

  it('checks every culture table under apps and packages', () => {
    const paths = ['apps/web/src/a.culture.json', 'packages/sim-culture/data/b.culture.json'];
    const root = makeTree(Object.fromEntries(paths.map((path) => [path, table])));
    expect(scanPaths(root, paths)).toEqual(paths.map((path) => ({ path, line: 2, text: `${generic} [{culture}s]` })));
  });

  it('leaves other json, and tables elsewhere, alone', () => {
    const paths = ['packages/sim-culture/data/b.json', 'tools/names/c.culture.json', 'docs/d.culture.json'];
    const root = makeTree(Object.fromEntries(paths.map((path) => [path, table])));
    expect(scanPaths(root, paths)).toEqual([]);
  });
});
