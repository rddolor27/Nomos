import { below, floorDiv, isqrt } from '@nomos/sim-core/kernels';
import { LAKE, OCEAN } from '../climate/biomes.ts';
import { dist2 } from '../grid/grid.ts';
import { shuffled } from '../random/keyed.ts';
import { COUNTRY } from '../random/streams.ts';
import { CAPITAL, CITY, TOWN, type Settlement } from '../settle/settle.ts';
import { grow } from './grow.ts';

// countries.py's sub-purposes of the COUNTRY stream, by value.
export const COUNT = 0;
export const COLOUR = 1;
export const COLOURS = 5;
export const CAPITAL_TIERS: readonly number[] = [CAPITAL, CITY, TOWN];
export const MIN_SETTLEMENTS = 3;

export interface Country {
  // 1..K, its value in the country map.
  id: number;
  // A settlement id.
  capital: number;
  // An index into the map colour table.
  colour: number;
}

interface Grown {
  ids: number[];
  label: Int32Array;
}

export function count(seed: number): number {
  return 3 + below(3, seed, COUNTRY, COUNT);
}

function apart(chosen: readonly Settlement[], s: Settlement, spacing: number): boolean {
  for (let i = 0; i < chosen.length; i++) {
    if (dist2(s.x, s.y, chosen[i].x, chosen[i].y) < spacing * spacing) return false;
  }
  return true;
}

// Settlement ids: the largest first, then each town or larger in population order at least a spacing from every capital
// chosen; the spacing shrinks by a quarter until k fit.
export function capitals(settlements: readonly Settlement[], k: number, landCells: number): number[] {
  const candidates = settlements.filter((s) => CAPITAL_TIERS.includes(s.tier));
  let spacing = isqrt(floorDiv(landCells, k));
  for (;;) {
    const chosen: Settlement[] = [];
    for (const s of candidates) {
      if (!apart(chosen, s, spacing)) continue;
      chosen.push(s);
      if (chosen.length === k) return chosen.map((c) => c.id);
    }
    if (spacing === 0) return chosen.map((c) => c.id);
    spacing = floorDiv(spacing * 3, 4);
  }
}

// The capitals, after the first, whose countries hold fewer than MIN_SETTLEMENTS settlements, in id order.
function smallCapitals(ids: readonly number[], label: Int32Array, settlements: readonly Settlement[]): number[] {
  const held = new Int32Array(ids.length + 1);
  for (let i = 0; i < settlements.length; i++) held[label[settlements[i].uid]]++;
  const small: number[] = [];
  for (let n = 2; n <= ids.length; n++) {
    if (held[n] < MIN_SETTLEMENTS) small.push(ids[n - 1]);
  }
  return small;
}

function growCapitals(
  seed: number,
  width: number,
  height: number,
  biome: Uint8Array,
  river: Uint8Array,
  receiver: Int32Array,
  settlements: readonly Settlement[],
  landCells: number,
): Grown {
  const k = count(seed);
  const passed = new Uint8Array(settlements.length);
  for (;;) {
    const eligible = settlements.filter((s) => passed[s.id] === 0);
    const ids = capitals(eligible, k, landCells);
    const label = grow(width, height, biome, river, receiver, ids.map((i) => settlements[i].uid));
    const small = smallCapitals(ids, label, settlements);
    if (small.length === 0) return { ids, label };
    passed[small[small.length - 1]] = 1;
  }
}

// Each cell's country, 0 for water, and the countries in id order. A capital whose country would hold fewer than
// MIN_SETTLEMENTS settlements is passed over for the next town in line, the least populous first and never the largest
// settlement. Each capital takes the capital tier; nothing else changes.
export function found(
  seed: number,
  width: number,
  height: number,
  biome: Uint8Array,
  river: Uint8Array,
  receiver: Int32Array,
  settlements: Settlement[],
  landCells: number,
): { country: Uint8Array; countries: Country[] } {
  const { ids, label } = growCapitals(seed, width, height, biome, river, receiver, settlements, landCells);
  const country = new Uint8Array(biome.length);
  for (let i = 0; i < biome.length; i++) country[i] = biome[i] === OCEAN || biome[i] === LAKE ? 0 : label[i];
  const colours = shuffled(Array.from({ length: COLOURS }, (_, i) => i), seed, COUNTRY, COLOUR);
  for (let n = 0; n < ids.length; n++) settlements[ids[n]].tier = CAPITAL;
  return { country, countries: ids.map((capital, n) => ({ id: n + 1, capital, colour: colours[n] })) };
}
