import { draw3 } from '@nomos/sim-core/kernels';
import type { WorldMap } from '@nomos/sim-protocol/world-map';
import { NAME } from '../random/streams.ts';
import { PLACE_WORDS } from './words.ts';

// Keyed into every draw, so a country and a settlement on the same cell take different words.
const KIND_COUNTRY = 0;
const KIND_SETTLEMENT = 1;
const NO_SETTLEMENT = -1;

// The first attempt whose word nobody holds yet, as an index into PLACE_WORDS. Keyed on the place's cell, so a name
// never depends on an id or a population rank.
function freeWord(seed: number, kind: number, cell: number, taken: Uint8Array): number {
  for (let attempt = 0; ; attempt++) {
    const word = (draw3(seed, NAME, kind, cell, attempt) >>> 0) % PLACE_WORDS.length;
    if (taken[word] === 0) {
      taken[word] = 1;
      return word;
    }
  }
}

// Each name's index into PLACE_WORDS: the countries by id, then the settlements by id. Countries claim words first,
// then settlements in cell order, so a collision falls on the later claimant whatever order the ids run in.
export function placeWordIndexes(map: WorldMap): Int32Array {
  const countries = map.countries.capital.length;
  const settlements = map.settlements.cell.length;
  const places = countries + settlements;
  // Without this a full table would loop forever looking for a free word.
  if (places > PLACE_WORDS.length) throw new RangeError(`${places} places, but the table holds ${PLACE_WORDS.length} words`);
  const taken = new Uint8Array(PLACE_WORDS.length);
  const indexes = new Int32Array(places);
  for (let k = 0; k < countries; k++) {
    const capitalCell = map.settlements.cell[map.countries.capital[k]];
    indexes[k] = freeWord(map.seed, KIND_COUNTRY, capitalCell, taken);
  }
  const idAt = new Int32Array(map.width * map.height).fill(NO_SETTLEMENT);
  for (let id = 0; id < settlements; id++) idAt[map.settlements.cell[id]] = id;
  for (let cell = 0; cell < idAt.length; cell++) {
    const id = idAt[cell];
    if (id !== NO_SETTLEMENT) indexes[countries + id] = freeWord(map.seed, KIND_SETTLEMENT, cell, taken);
  }
  return indexes;
}

function capitalised(word: string): string {
  return `${word[0].toUpperCase()}${word.slice(1)}`;
}

// The K country names, then the settlement names in id order. Display text, outside the map and its fingerprint.
export function placeNames(map: WorldMap): string[] {
  const indexes = placeWordIndexes(map);
  const names: string[] = [];
  for (let i = 0; i < indexes.length; i++) names.push(capitalised(PLACE_WORDS[indexes[i]]));
  return names;
}
