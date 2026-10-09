import { CAPITAL_TIERS } from '../countries/countries.ts';
import { grow, wetCells } from '../countries/grow.ts';
import type { Settlement } from '../settle/settle.ts';

// Provisional for M7.3 to adopt or revise (M8.1 plan, Ruling 10). Region r is index r - 1 of seat and country.
export interface Regions {
  // Per cell: 0 for water, else the region of its country that reaches it cheapest.
  region: Uint16Array;
  // Per cell: 0 for water, else the region whose seat's market reaches it cheapest, borders aside.
  market: Uint16Array;
  // Each region's seat, a settlement id.
  seat: Int32Array;
  // Each region's country.
  country: Uint8Array;
}

// Country k's regions grow from its own seats over its own land and any water, so an island of k with no seat of its
// own still joins one of k's regions, across the sea.
function regionsOf(
  width: number,
  height: number,
  biome: Uint8Array,
  river: Uint8Array,
  receiver: Int32Array,
  country: Uint8Array,
  seats: readonly Settlement[],
  zones: Regions,
): void {
  const wet = wetCells(biome);
  const open = new Uint8Array(country.length);
  for (let k = 1; k <= Math.max(0, ...zones.country); k++) {
    const own = seats.map((_, r) => r).filter((r) => zones.country[r] === k);
    for (let i = 0; i < country.length; i++) open[i] = wet[i] !== 0 || country[i] === k ? 1 : 0;
    const label = grow(width, height, biome, river, receiver, own.map((r) => seats[r].uid), open);
    for (let i = 0; i < country.length; i++) {
      if (country[i] === k) zones.region[i] = own[label[i] - 1] + 1;
    }
  }
}

// Every capital, city and town seats one region, in id order. Regions grow inside their country with the countries'
// growth, and market territories from the same seats across every border, since trade crosses them (Countries).
export function regions(
  width: number,
  height: number,
  biome: Uint8Array,
  river: Uint8Array,
  receiver: Int32Array,
  country: Uint8Array,
  settlements: readonly Settlement[],
): Regions {
  const seats = settlements.filter((s) => CAPITAL_TIERS.includes(s.tier));
  const zones: Regions = {
    region: new Uint16Array(country.length),
    market: new Uint16Array(country.length),
    seat: Int32Array.from(seats, (s) => s.id),
    country: Uint8Array.from(seats, (s) => country[s.uid]),
  };
  regionsOf(width, height, biome, river, receiver, country, seats, zones);
  const markets = grow(width, height, biome, river, receiver, seats.map((s) => s.uid));
  for (let i = 0; i < country.length; i++) zones.market[i] = country[i] === 0 ? 0 : markets[i];
  return zones;
}
