import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { rejectName } from '../src/filters/name-filter.ts';
import { FIXTURES } from '../src/filters/real-world.ts';
import { loadSoundSet } from '../src/sound-set/sound-set.ts';
import { PERSON_TABLE, PLACE_TABLE, TABLE_WORDS, buildTable, tableSource, type Table } from '../scripts/words.ts';

const ROOT = new URL('../../../', import.meta.url);
const TIMEOUT_MS = 60_000;

// Git on Windows checks text out with CRLF.
function read(url: URL): string {
  return readFileSync(url, 'utf8').replace(/\r\n/g, '\n');
}

for (const spec of [PERSON_TABLE, PLACE_TABLE]) {
  describe(`the ${spec.constant} table`, { timeout: TIMEOUT_MS }, () => {
    let table: Table;
    beforeAll(() => {
      table = buildTable(spec.seed);
    }, TIMEOUT_MS);

    it('matches a fresh build', () => {
      expect(read(new URL(`${spec.folder}words.ts`, ROOT))).toBe(tableSource(table.words, spec.constant));
      expect(read(new URL(`${spec.folder}LICENSE-fmg.txt`, ROOT))).toBe(read(new URL('LICENSE-fmg.txt', FIXTURES)));
    });

    it('keeps 1,024 words of 4-10 letters that pass the filter', () => {
      const { sources } = loadSoundSet();
      expect(table.words).toHaveLength(TABLE_WORDS);
      expect(new Set(table.words).size).toBe(TABLE_WORDS);
      expect(table.words.filter((word) => !/^[a-z]{4,10}$/.test(word))).toEqual([]);
      expect(table.words.filter((word) => sources.has(word))).toEqual([]);
      expect(table.words.filter((word) => rejectName(word) !== null)).toEqual([]);
    });
  });
}
