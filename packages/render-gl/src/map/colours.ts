import { CROWD_HUES } from '@nomos/sim-protocol/world-map';
import table from './map-colours.json';

// One table with tools/worldgen/mapdraw.py's previews. The country colours are the owner's five (9 October 2026), and
// map-only: no body, building, soldier or police officer ever wears one (Countries rule 5).
export const COUNTRY_COLOURS: readonly number[] = table.countries.map(rgbOf);

// The crowd's body hues by CROWD_HUES index: spritekit.py's BODY_HUES bases, which test_worldgen.py holds them to,
// and the dark outline characters wear by day (web rules).
export const CROWD_COLOURS: readonly number[] = CROWD_HUES.map((hue) => rgbOf(table.crowd[hue]));
export const CROWD_OUTLINE = rgbOf(table.outline);

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
