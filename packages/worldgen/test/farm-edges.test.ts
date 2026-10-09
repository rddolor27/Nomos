import { describe, expect, it } from 'vitest';
import { farm } from '../src/settle/farm.ts';
import { CAPITAL, TOWN, type Settlement } from '../src/settle/settle.ts';

// Choices the 200 golden worlds barely or never see: flipping any one of them leaves nearly every golden fingerprint
// unchanged. Every expected picture is what tools/worldgen/settle.py returns for the same input: farm.
const SEED = 4;

// A glyph for each biome code up to broadleaf forest: sea, lake, grassland, farmland and forest.
const GLYPHS = '~L.fd';

// A map 12 cells wide and 9 high, the capital's window exactly: 4 rows each side of row 4, so nothing here is clipped
// above or below.
const GRASS = Array.from({ length: 9 }, () => '.'.repeat(12));

function biomeOf(rows: readonly string[]): Uint8Array {
  return Uint8Array.from(rows.join(''), (glyph) => GLYPHS.indexOf(glyph));
}

function rowsOf(biome: Uint8Array, width: number): string[] {
  const rows: string[] = [];
  for (let start = 0; start < biome.length; start += width) {
    rows.push(Array.from(biome.subarray(start, start + width), (code) => GLYPHS[code]).join(''));
  }
  return rows;
}

function placeAt(width: number, x: number, y: number, tier: number): Settlement {
  return { id: 0, x, y, tier, population: 1_000, uid: y * width + x, landmarks: [] };
}

function fieldsOf(rows: readonly string[], x: number, y: number, tier: number): string[] {
  const width = rows[0].length;
  return rowsOf(farm(SEED, width, biomeOf(rows), [placeAt(width, x, y, tier)]), width);
}

describe('the farmland choices the goldens barely see', () => {
  it('stops a capital near the left edge at column 0, not wrapping its fields onto the row above', () => {
    // A capital's fields reach 3 cells and its window one more. At x = 2, the nearest the settling margin lets a place
    // stand, the fields would reach x = -1. A window left unclipped reads that cell on the capital's row as (11, 3),
    // the last cell of the row above, and farms it whatever the draw. Clipping a column too many would leave column 0
    // bare.
    expect(fieldsOf(GRASS, 2, 4, CAPITAL)).toEqual([
      '............',
      '..ff........',
      'fffff.......',
      'fffff.......',
      'ff.fff......',
      'ffffff......',
      'fffff.......',
      '..ff........',
      '............',
    ]);
  });

  it('stops a capital near the right edge at the last column, not wrapping its fields onto the row below', () => {
    // At x = 9, the furthest right the margin allows on a map 12 wide, the fields reach x = 12. A window left unclipped
    // reads that cell on the capital's row as (0, 5), the first cell of the row below, and farms it whatever the draw.
    // Clipping a column too many would leave column 11 bare.
    expect(fieldsOf(GRASS, 9, 4, CAPITAL)).toEqual([
      '............',
      '........ff..',
      '.......fffff',
      '......ffffff',
      '......fff.ff',
      '.......fffff',
      '.......fffff',
      '........fff.',
      '............',
    ]);
  });

  it('returns a new array and leaves the biome it was given as it was', () => {
    // Python's bytearray(biome) copies it. A farm that laid its fields in its input would return the same picture, so
    // only the input afterwards tells, and the goldens never read it again. The town's own forest and the sea stay as
    // they are, and so does the forest at (2, 1): its squared distance is 5, and the radius allows 4 plus a draw of 0.
    const rows = ['.........', '..d......', '....d....', '......~..', '.........'];
    const biome = biomeOf(rows);
    const before = biome.slice();
    const out = farm(SEED, rows[0].length, biome, [placeAt(rows[0].length, 4, 2, TOWN)]);
    expect(biome).toEqual(before);
    expect(rowsOf(out, rows[0].length)).toEqual([
      '...fff...',
      '..dffff..',
      '..ffdff..',
      '..ffff~..',
      '...ff....',
    ]);
  });
});
