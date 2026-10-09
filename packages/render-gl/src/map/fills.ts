import type { WorldMap } from '@nomos/sim-protocol/world-map';
import { COUNTRY_COLOURS, LINE_COLOURS } from './colours.ts';

// The flat Countries view, one RGBA pixel a cell: each country's land in its colour, and water. Both painters draw it.
export function flatFills(map: WorldMap): Uint8Array {
  const out = new Uint8Array(4 * map.country.length);
  for (let cell = 0; cell < map.country.length; cell++) {
    const k = map.country[cell];
    const colour = k === 0 ? LINE_COLOURS.water : COUNTRY_COLOURS[map.countries.colour[k - 1]];
    out[4 * cell] = (colour >> 16) & 255;
    out[4 * cell + 1] = (colour >> 8) & 255;
    out[4 * cell + 2] = colour & 255;
    out[4 * cell + 3] = 255;
  }
  return out;
}
