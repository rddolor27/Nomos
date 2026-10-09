import { COUNTRY_COLOURS } from '@nomos/render-gl/map';
import type { WorldMap } from '@nomos/sim-protocol/world-map';

export interface LegendRow {
  name: string;
  colour: number;
  capital: string;
  settlements: number;
}

// names is placeNames' list: the countries, then the settlements in id order.
export function legendRows(map: WorldMap, names: readonly string[]): LegendRow[] {
  const countries = map.countries.capital.length;
  const held = new Int32Array(countries + 1);
  for (const k of map.settlements.country) held[k]++;
  const rows: LegendRow[] = [];
  for (let k = 1; k <= countries; k++) {
    rows.push({
      name: names[k - 1],
      colour: COUNTRY_COLOURS[map.countries.colour[k - 1]],
      capital: names[countries + map.countries.capital[k - 1]],
      settlements: held[k],
    });
  }
  return rows;
}

// The map's text alternative too: a screen reader hears each country with its capital and count.
export function mountLegend(root: HTMLElement, rows: readonly LegendRow[]): void {
  const doc = root.ownerDocument;
  const list = doc.createElement('ul');
  list.className = 'map-legend';
  list.setAttribute('aria-label', 'Countries');
  for (const row of rows) {
    const swatch = doc.createElement('span');
    swatch.className = 'map-swatch';
    swatch.setAttribute('aria-hidden', 'true');
    swatch.style.background = `#${row.colour.toString(16).padStart(6, '0')}`;
    const item = doc.createElement('li');
    const places = row.settlements === 1 ? 'settlement' : 'settlements';
    item.append(swatch, `${row.name}: capital ${row.capital}, ${row.settlements} ${places}`);
    list.append(item);
  }
  root.replaceChildren(list);
}
