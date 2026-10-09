import type { MapCamera, MapView } from '@nomos/render-gl/map';
import { TIER_NAMES, type WorldMap } from '@nomos/sim-protocol/world-map';

const CITY = TIER_NAMES.indexOf('city');

// Every candidate label in R4's priority order: the countries, then settlements by tier and then id. name indexes
// placeNames' list; anchors are in cells; width and height are CSS px, measured once by mountLabels.
export interface LabelSet {
  readonly count: number;
  readonly name: Int32Array;
  readonly anchorX: Float64Array;
  readonly anchorY: Float64Array;
  // 1 for a country's name, centred on its land; 0 for a settlement's, hung below its cell.
  readonly centred: Uint8Array;
  readonly inCountry: Uint8Array;
  readonly inRegion: Uint8Array;
  readonly width: Float64Array;
  readonly height: Float64Array;
  // The boxes a pass has placed, four numbers each, so a pass allocates nothing.
  readonly placed: Float64Array;
}

export interface Labels {
  update(camera: MapCamera, view: MapView, cssWidth: number, cssHeight: number, dpr: number): void;
}

function emptySet(count: number): LabelSet {
  return {
    count,
    name: new Int32Array(count),
    anchorX: new Float64Array(count),
    anchorY: new Float64Array(count),
    centred: new Uint8Array(count),
    inCountry: new Uint8Array(count),
    inRegion: new Uint8Array(count),
    width: new Float64Array(count),
    height: new Float64Array(count),
    placed: new Float64Array(4 * count),
  };
}

// A country's name sits at the mean of its land cells' centres.
function addCountries(set: LabelSet, map: WorldMap): void {
  const countries = map.countries.capital.length;
  const sumX = new Float64Array(countries + 1);
  const sumY = new Float64Array(countries + 1);
  const cells = new Float64Array(countries + 1);
  for (let cell = 0; cell < map.country.length; cell++) {
    const k = map.country[cell];
    if (k === 0) continue;
    sumX[k] += (cell % map.width) + 0.5;
    sumY[k] += Math.floor(cell / map.width) + 0.5;
    cells[k]++;
  }
  for (let k = 1; k <= countries; k++) {
    set.name[k - 1] = k - 1;
    set.anchorX[k - 1] = sumX[k] / cells[k];
    set.anchorY[k - 1] = sumY[k] / cells[k];
    set.centred[k - 1] = 1;
    set.inCountry[k - 1] = 1;
  }
}

function addSettlements(set: LabelSet, map: WorldMap): void {
  const { cell, tier } = map.settlements;
  const countries = map.countries.capital.length;
  const order = Array.from(tier, (_, id) => id).sort((a, b) => tier[a] - tier[b] || a - b);
  order.forEach((id, rank) => {
    const i = countries + rank;
    set.name[i] = countries + id;
    set.anchorX[i] = (cell[id] % map.width) + 0.5;
    set.anchorY[i] = Math.floor(cell[id] / map.width) + 1;
    set.inCountry[i] = tier[id] <= CITY ? 1 : 0;
    set.inRegion[i] = 1;
  });
}

export function labelSet(map: WorldMap): LabelSet {
  const set = emptySet(map.countries.capital.length + map.settlements.tier.length);
  addCountries(set, map);
  addSettlements(set, map);
  return set;
}

function overlaps(boxes: Float64Array, count: number, left: number, top: number, right: number, bottom: number): boolean {
  for (let b = 0; b < count; b++) {
    const at = 4 * b;
    if (left < boxes[at + 2] && boxes[at] < right && top < boxes[at + 3] && boxes[at + 1] < bottom) return true;
  }
  return false;
}

// Writes each label's top-left in whole CSS px into x and y, or NaN when it hides, and returns how many show. Labels go
// in priority order, and one is dropped when it would overlap a label already placed.
export function placeLabels(
  set: LabelSet,
  view: MapView,
  camera: MapCamera,
  dpr: number,
  cssWidth: number,
  cssHeight: number,
  x: Float64Array,
  y: Float64Array,
): number {
  const cssPerCell = camera.cellPx / dpr;
  const shown = view === 'country' ? set.inCountry : set.inRegion;
  let placed = 0;
  for (let i = 0; i < set.count; i++) {
    x[i] = Number.NaN;
    y[i] = Number.NaN;
    if (!shown[i]) continue;
    const left = Math.round((set.anchorX[i] - camera.x) * cssPerCell - set.width[i] / 2);
    const top = Math.round((set.anchorY[i] - camera.y) * cssPerCell - (set.centred[i] ? set.height[i] / 2 : 0));
    const right = left + set.width[i];
    const bottom = top + set.height[i];
    if (right <= 0 || bottom <= 0 || left >= cssWidth || top >= cssHeight) continue;
    if (overlaps(set.placed, placed, left, top, right, bottom)) continue;
    set.placed[4 * placed] = left;
    set.placed[4 * placed + 1] = top;
    set.placed[4 * placed + 2] = right;
    set.placed[4 * placed + 3] = bottom;
    x[i] = left;
    y[i] = top;
    placed++;
  }
  return placed;
}

function moveLabel(span: HTMLSpanElement, i: number, x: number, y: number, shown: Float64Array): void {
  if (Number.isNaN(x)) {
    if (!Number.isNaN(shown[2 * i])) span.style.visibility = 'hidden';
    shown[2 * i] = Number.NaN;
    return;
  }
  if (x === shown[2 * i] && y === shown[2 * i + 1]) return;
  if (Number.isNaN(shown[2 * i])) span.style.visibility = 'visible';
  span.style.transform = `translate(${x}px, ${y}px)`;
  shown[2 * i] = x;
  shown[2 * i + 1] = y;
}

// One span per candidate, measured once while the map shows; a span's style is written only when its place changes.
export function mountLabels(layer: HTMLElement, map: WorldMap, names: readonly string[]): Labels {
  const set = labelSet(map);
  const spans: HTMLSpanElement[] = [];
  for (let i = 0; i < set.count; i++) {
    const span = layer.ownerDocument.createElement('span');
    span.className = set.centred[i] ? 'map-label map-country' : 'map-label';
    span.textContent = names[set.name[i]];
    span.style.visibility = 'hidden';
    spans.push(span);
  }
  layer.replaceChildren(...spans);
  spans.forEach((span, i) => {
    set.width[i] = span.offsetWidth;
    set.height[i] = span.offsetHeight;
  });
  const x = new Float64Array(set.count);
  const y = new Float64Array(set.count);
  const shown = new Float64Array(2 * set.count).fill(Number.NaN);
  return {
    update(camera, view, cssWidth, cssHeight, dpr) {
      placeLabels(set, view, camera, dpr, cssWidth, cssHeight, x, y);
      for (let i = 0; i < set.count; i++) moveLabel(spans[i], i, x[i], y[i], shown);
    },
  };
}
