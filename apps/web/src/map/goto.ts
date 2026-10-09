import { MAP_CELL_PX, type MapCamera } from '@nomos/render-gl/map';
import type { WorldMap } from '@nomos/sim-protocol/world-map';

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

// The view centred on a settlement's cell, at the close step.
export function cameraOn(map: WorldMap, id: number, deviceWidth: number, deviceHeight: number, dpr: number): MapCamera {
  const cellPx = closeStep(dpr);
  const cell = map.settlements.cell[id];
  const x = (cell % map.width) + 0.5 - deviceWidth / cellPx / 2;
  const y = Math.floor(cell / map.width) + 0.5 - deviceHeight / cellPx / 2;
  return { x, y, cellPx };
}

// The settlement whose cell centre lies nearest the tapped device point, within the tap's reach, or -1. A tie goes to the
// lower id, the larger place.
export function settlementUnder(map: WorldMap, camera: MapCamera, deviceX: number, deviceY: number, dpr: number): number {
  const reach = Math.max(TAP_CELLS, (TAP_CSS_PX * dpr) / camera.cellPx);
  const x = camera.x + deviceX / camera.cellPx;
  const y = camera.y + deviceY / camera.cellPx;
  const { cell } = map.settlements;
  let best = -1;
  let bestSquared = reach * reach;
  for (let id = 0; id < cell.length; id++) {
    const dx = (cell[id] % map.width) + 0.5 - x;
    const dy = Math.floor(cell[id] / map.width) + 0.5 - y;
    if (dx * dx + dy * dy < bestSquared) {
      best = id;
      bestSquared = dx * dx + dy * dy;
    }
  }
  return best;
}
