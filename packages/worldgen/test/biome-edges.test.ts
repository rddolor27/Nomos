import { describe, expect, it } from 'vitest';
import { BEACH, CLIFFS, FARMLAND, INLAND, MOUNTAIN, PEAK, biomes } from '../src/climate/biomes.ts';
import { habitability } from '../src/settle/habitability.ts';

// Choices the 200 golden worlds barely or never see: flipping any one of them leaves nearly every golden fingerprint
// unchanged. Every expected picture and number is what tools/worldgen returns for the same input: climate.biomes and
// settle.habitability.
interface Recipe {
  elevation: number;
  temperature: number;
  moisture: number;
  ocean?: boolean;
  coast?: number;
}

// Each glyph names the cover its cell is built to give: grass, hot dry sand, snow, hills and sea. B and C are grass on a
// beach and on cliffs, A and ^ are cold high ground, and v is deep sea.
const RECIPES: Record<string, Recipe> = {
  '.': { elevation: 50, temperature: 100, moisture: 100 },
  s: { elevation: 50, temperature: 200, moisture: 50 },
  n: { elevation: 50, temperature: 20, moisture: 100 },
  h: { elevation: 400, temperature: 100, moisture: 100 },
  '~': { elevation: -10, temperature: 100, moisture: 100, ocean: true },
  B: { elevation: 50, temperature: 100, moisture: 100, coast: BEACH },
  C: { elevation: 50, temperature: 100, moisture: 100, coast: CLIFFS },
  '^': { elevation: 600, temperature: 20, moisture: 100 },
  A: { elevation: 500, temperature: 20, moisture: 100 },
  v: { elevation: -1000, temperature: 20, moisture: 100, ocean: true },
};

// A glyph for each biome code, from ocean to snow.
const GLYPHS = '~L.fdcmshMPn';

function picture(rows: readonly string[], seed = 1): string[] {
  const width = rows[0].length;
  const cells = Array.from(rows.join(''), (glyph) => RECIPES[glyph]);
  const none = new Uint8Array(cells.length);
  const biome = biomes(
    seed,
    width,
    rows.length,
    Int32Array.from(cells, (cell) => cell.elevation),
    Uint8Array.from(cells, (cell) => cell.temperature),
    Uint8Array.from(cells, (cell) => cell.moisture),
    Uint8Array.from(cells, (cell) => (cell.ocean ? 1 : 0)),
    none,
    none,
    Uint8Array.from(cells, (cell) => cell.coast ?? INLAND),
  );
  const out: string[] = [];
  for (let start = 0; start < cells.length; start += width) {
    out.push(Array.from(biome.subarray(start, start + width), (code) => GLYPHS[code]).join(''));
  }
  return out;
}

// The cover of a beach or cliff cell at (x, y) with sea above it and hot dry sand to its west, on grass.
function coverOnShore(seed: number, x: number, y: number, shore: 'B' | 'C'): string {
  const rows = Array.from({ length: y + 2 }, () => Array.from({ length: x + 2 }, () => '.'));
  rows[y - 1][x] = '~';
  rows[y][x - 1] = 's';
  rows[y][x] = shore;
  return picture(rows.map((row) => row.join('')), seed)[y][x];
}

// The score of cells standing on a size-3 river in a sea, two apart along row 5 and clear of the settling margins, so
// that none sees another's river. A mild, damp, flat cell scores its BASE, plus 30 + 10 * 3 for the river, less a
// twelfth of its height, rounded down.
function riverScores(cells: ReadonlyArray<readonly [cover: number, elevation: number]>): number[] {
  const width = 13;
  const height = 11;
  const n = width * height;
  const at = (k: number): number => 5 * width + 4 + 2 * k;
  const biome = new Uint8Array(n);
  const elevation = new Int32Array(n).fill(50);
  const river = new Uint8Array(n);
  for (let k = 0; k < cells.length; k++) {
    biome[at(k)] = cells[k][0];
    elevation[at(k)] = cells[k][1];
    river[at(k)] = 3;
  }
  const mild = new Uint8Array(n).fill(100);
  const score = habitability(width, height, biome, elevation, river, new Uint8Array(n), mild, mild, new Int32Array(n));
  return cells.map((_, k) => score[at(k)]);
}

describe('the biome and habitability choices the goldens barely see', () => {
  it('gives a beach sand from a noise value of exactly 30000, and not from 29999', () => {
    // The beach noise, value(seed, MOISTURE, x, y, 10, 0x105), is 30000 at (2, 3) under seed 3036 and 29999 at (1, 4)
    // under seed 1588.
    expect(coverOnShore(3036, 2, 3, 'B')).toBe('s');
    expect(coverOnShore(1588, 1, 4, 'B')).toBe('.');
  });

  it('gives sand to a beach and not to cliffs, though the noise at the same cell would allow it', () => {
    expect(coverOnShore(3036, 2, 3, 'C')).toBe('.');
  });

  it('weighs a summit against its neighbours as they are, a sunken one counting as far below', () => {
    // The 500 summit has seven neighbours at 600 and one at -1000. It is a crest only while -1000 is not raised to 0.
    expect(picture(['^^^', '^A^', '^^v'])).toEqual(['PPP', 'PPP', 'PP~']);
  });

  it('gives a lone cell to sand over snow when its neighbours tie, since sand comes first', () => {
    // The middle cell has two sand neighbours and two snow ones; the cells round it settle as Python settles them.
    expect(picture(['snh', 'h.h', 'nsh'])).toEqual(['..h', 'hsh', '..h']);
  });

  it('scores a mountain on a river from a base of 5', () => {
    // The base 5, plus 60 for the river, less 41 for the height.
    expect(riverScores([[MOUNTAIN, 500]])).toEqual([24]);
  });

  it('scores a peak and farmland 0 on a river, since neither has a base', () => {
    // Any base would lift both above 0 on this river.
    expect(riverScores([[PEAK, 700], [FARMLAND, 100]])).toEqual([0, 0]);
  });
});
