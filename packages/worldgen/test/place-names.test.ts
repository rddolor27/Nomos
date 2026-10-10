import { draw3 } from '@nomos/sim-core/kernels';
import type { WorldMap, WorldSize } from '@nomos/sim-protocol/world-map';
import { describe, expect, it } from 'vitest';
import { generateWorld } from '../src/index.ts';
import { placeNames } from '../src/names/place-names.ts';
import { PLACE_WORDS } from '../src/names/words.ts';
import { NAME } from '../src/random/streams.ts';

const SEED = 0x5eed0001;
const COUNTRY = 0;
const SETTLEMENT = 1;
const SIDE = 16;
const CELLS = SIDE * SIDE;

// Attempt n's word for a place, as the table's picker defines it.
function drawn(kind: number, cell: number, attempt: number): string {
  const word = PLACE_WORDS[(draw3(SEED, NAME, kind, cell, attempt) >>> 0) % PLACE_WORDS.length];
  return `${word[0].toUpperCase()}${word.slice(1)}`;
}

// Only the columns the picker reads: the settlements' cells, and which of them is the one country's capital.
function tinyMap(cells: readonly number[], capital: number): WorldMap {
  return {
    seed: SEED,
    width: SIDE,
    height: SIDE,
    settlements: { cell: Int32Array.from(cells) },
    countries: { capital: Int32Array.of(capital) },
  } as unknown as WorldMap;
}

// The first two cells whose first draws match for a kind, the lower one first.
function firstRepeat(kind: number): [first: number, second: number] {
  const seen = new Map<string, number>();
  for (let cell = 0; cell < CELLS; cell++) {
    const word = drawn(kind, cell, 0);
    const first = seen.get(word);
    if (first !== undefined) return [first, cell];
    seen.set(word, cell);
  }
  throw new Error('no two cells share a first draw');
}

// A country's capital cell and another cell whose settlement draws the country's word first.
function firstOverlap(): [capital: number, other: number] {
  const countryCells = new Map<string, number>();
  for (let cell = 0; cell < CELLS; cell++) countryCells.set(drawn(COUNTRY, cell, 0), cell);
  for (let cell = 0; cell < CELLS; cell++) {
    const capital = countryCells.get(drawn(SETTLEMENT, cell, 0));
    if (capital !== undefined && capital !== cell) return [capital, cell];
  }
  throw new Error('no settlement draws a country word');
}

// The same world with its settlements numbered the other way, and each capital pointing at its new id.
function withIdsReversed(map: WorldMap): WorldMap {
  const last = map.settlements.cell.length - 1;
  return {
    ...map,
    settlements: { ...map.settlements, cell: map.settlements.cell.slice().reverse() },
    countries: { ...map.countries, capital: map.countries.capital.map((id) => last - id) },
  };
}

describe('place names', { timeout: 60_000 }, () => {
  const WORLDS: [WorldSize, number][] = [
    ['standard', SEED],
    ['standard', SEED + 1],
    ['large', SEED],
    ['large', SEED + 1],
  ];

  it('names each country, then each settlement, once, with a capitalised word of the table', () => {
    const table = new Set(PLACE_WORDS);
    for (const [size, seed] of WORLDS) {
      const label = `${size} ${seed.toString(16)}`;
      const map = generateWorld(seed, size);
      const names = placeNames(map);
      expect(names, label).toHaveLength(map.countries.capital.length + map.settlements.cell.length);
      expect(new Set(names).size, `${label} repeats a name`).toBe(names.length);
      expect(names.filter((name) => !/^[A-Z][a-z]+$/.test(name) || !table.has(name.toLowerCase())), label).toEqual([]);
    }
    const map = generateWorld(SEED, 'standard');
    const names = placeNames(map);
    const count = map.countries.capital.length;
    expect(names.slice(0, count)).toEqual(['Karapit', 'Chuen', 'Neixo', 'Ephanystra', 'Byzach']);
    expect(Array.from(map.countries.capital, (id) => names[count + id])).toEqual([
      'Thra',
      'Megandos',
      'Agreira',
      'Papseunos',
      'Kullut',
    ]);
  });

  it('keeps every name with its cell when the ids run the other way', () => {
    for (const [size, seed] of WORLDS.slice(0, 2)) {
      const map = generateWorld(seed, size);
      const names = placeNames(map);
      const reversed = placeNames(withIdsReversed(map));
      const count = map.countries.capital.length;
      const settlements = map.settlements.cell.length;
      expect(reversed.slice(0, count), `${size} ${seed.toString(16)} countries`).toEqual(names.slice(0, count));
      for (let id = 0; id < settlements; id++) {
        expect(reversed[count + settlements - 1 - id], `cell ${map.settlements.cell[id]}`).toBe(names[count + id]);
      }
    }
  });

  it('hands a word already taken to the next attempt: countries first, then cells in order', () => {
    // Settlement 0 sits on the higher of two cells with the same first draw, so the ids run against the cell order.
    const [lower, higher] = firstRepeat(SETTLEMENT);
    expect(placeNames(tinyMap([higher, lower], 1))).toEqual([
      drawn(COUNTRY, lower, 0),
      drawn(SETTLEMENT, higher, 1),
      drawn(SETTLEMENT, lower, 0),
    ]);

    const [capital, other] = firstOverlap();
    expect(placeNames(tinyMap([capital, other], 0))).toEqual([
      drawn(COUNTRY, capital, 0),
      drawn(SETTLEMENT, capital, 0),
      drawn(SETTLEMENT, other, 1),
    ]);
  });
});
