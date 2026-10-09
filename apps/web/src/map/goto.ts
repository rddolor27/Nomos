import { MAP_CELL_PX, type MapCamera } from '@nomos/render-gl/map';
import { TIER_NAMES, WONDER_NAMES, type WorldMap } from '@nomos/sim-protocol/world-map';

// What the town view tells of a place. A place is settlement p, or wonder p minus the settlement count, as the map
// worker numbers them.
export interface PlaceInfo {
  place: number;
  name: string;
  // A tier name, or 'wonder'.
  kind: string;
  // 0 for a wonder.
  population: number;
  // The country's name, or '' where no country holds the cell.
  country: string;
}

export interface GoToGroup {
  country: string;
  places: { id: number; name: string }[];
}

// A settlement opens at the ladder step nearest 64 CSS px a cell, close enough to follow its crowd (owner, 9 October
// 2026).
const CLOSE_CSS_PX = 64;
// A tap reaches about 1.5 cells, or 12 CSS px where cells are smaller than 8 CSS px.
const TAP_CELLS = 1.5;
const TAP_CSS_PX = 12;

// names is placeNames' list: the countries, then the settlements in id order. Each country lists its capital first,
// then its other settlements by id, which is by size.
export function goToGroups(map: WorldMap, names: readonly string[]): GoToGroup[] {
  const countries = map.countries.capital.length;
  const groups: GoToGroup[] = [];
  for (let k = 1; k <= countries; k++) {
    const capital = map.countries.capital[k - 1];
    const places = [{ id: capital, name: names[countries + capital] }];
    map.settlements.country.forEach((owner, id) => {
      if (owner === k && id !== capital) places.push({ id, name: names[countries + id] });
    });
    groups.push({ country: names[k - 1], places });
  }
  return groups;
}

export function mountGoTo(select: HTMLSelectElement, groups: readonly GoToGroup[]): void {
  const doc = select.ownerDocument;
  for (const group of groups) {
    const optgroup = doc.createElement('optgroup');
    optgroup.label = group.country;
    for (const place of group.places) {
      const option = doc.createElement('option');
      option.value = String(place.id);
      option.textContent = place.name;
      optgroup.append(option);
    }
    select.append(optgroup);
  }
  select.disabled = false;
}

// A tie goes to the lower step, which shows more of the land around.
function closeStep(dpr: number): number {
  const want = CLOSE_CSS_PX * dpr;
  let best = MAP_CELL_PX[0];
  for (const step of MAP_CELL_PX) {
    if (Math.abs(step - want) < Math.abs(best - want)) best = step;
  }
  return best;
}

export function placeCount(map: WorldMap): number {
  return map.settlements.cell.length + map.wonders.cell.length;
}

function placeCell(map: WorldMap, place: number): number {
  const settlements = map.settlements.cell.length;
  return place < settlements ? map.settlements.cell[place] : map.wonders.cell[place - settlements];
}

// The view centred on a place's cell, at the close step.
export function cameraOn(map: WorldMap, place: number, deviceWidth: number, deviceHeight: number, dpr: number): MapCamera {
  const cellPx = closeStep(dpr);
  const cell = placeCell(map, place);
  const x = (cell % map.width) + 0.5 - deviceWidth / cellPx / 2;
  const y = Math.floor(cell / map.width) + 0.5 - deviceHeight / cellPx / 2;
  return { x, y, cellPx };
}

// The place whose cell centre lies nearest the device point, within the tap's reach, or -1. A tie goes to the lower
// place, a settlement before a wonder and the larger settlement first.
export function placeUnder(map: WorldMap, camera: MapCamera, deviceX: number, deviceY: number, dpr: number): number {
  const reach = Math.max(TAP_CELLS, (TAP_CSS_PX * dpr) / camera.cellPx);
  const x = camera.x + deviceX / camera.cellPx;
  const y = camera.y + deviceY / camera.cellPx;
  let best = -1;
  let bestSquared = reach * reach;
  for (let place = 0; place < placeCount(map); place++) {
    const cell = placeCell(map, place);
    const dx = (cell % map.width) + 0.5 - x;
    const dy = Math.floor(cell / map.width) + 0.5 - y;
    if (dx * dx + dy * dy < bestSquared) {
      best = place;
      bestSquared = dx * dx + dy * dy;
    }
  }
  return best;
}

// The place at the view's centre, which a tap on it or the Enter button opens.
export function placeInFocus(map: WorldMap, camera: MapCamera, deviceWidth: number, deviceHeight: number, dpr: number): number {
  return placeUnder(map, camera, deviceWidth / 2, deviceHeight / 2, dpr);
}

function countryName(names: readonly string[], country: number): string {
  return country > 0 ? names[country - 1] : '';
}

// A wonder goes by its kind, such as "Giant tree"; names holds placeNames' countries, then settlements.
export function placeInfo(map: WorldMap, names: readonly string[], place: number): PlaceInfo {
  const { settlements, wonders } = map;
  if (place < settlements.cell.length) {
    return {
      place,
      name: names[map.countries.capital.length + place],
      kind: TIER_NAMES[settlements.tier[place]],
      population: settlements.population[place],
      country: countryName(names, settlements.country[place]),
    };
  }
  const k = place - settlements.cell.length;
  const wonder = WONDER_NAMES[wonders.kind[k]].replaceAll('-', ' ');
  const name = wonder[0].toUpperCase() + wonder.slice(1);
  return { place, name, kind: 'wonder', population: 0, country: countryName(names, map.country[wonders.cell[k]]) };
}
