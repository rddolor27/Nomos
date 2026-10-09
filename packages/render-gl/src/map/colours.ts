import table from './map-colours.json';

// One table with tools/worldgen/mapdraw.py's previews. The country colours are the owner's five (9 October 2026), and
// map-only: no body, building, soldier or police officer ever wears one (Countries rule 5).
export const COUNTRY_COLOURS: readonly number[] = table.countries.map(rgbOf);

export const LINE_COLOURS = {
  water: rgbOf(table.water),
  river: rgbOf(table.river),
  lane: rgbOf(table.lane),
  road: rgbOf(table.road),
  deck: rgbOf(table.deck),
  rail: rgbOf(table.rail),
  border: rgbOf(table.border),
};

function rgbOf(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}
