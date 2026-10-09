import { BIOME_NAMES, type PathTable, type WorldMap } from '@nomos/sim-protocol/world-map';
import type { MapView } from './camera.ts';

// Palette indices, in mapdraw.py's drawing order; 0 is none. Country colour c's band is BAND + c. The flat Countries
// view hides RIVER to RAIL, as countries.png draws neither water nor routes over its fills.
export const RIVER = 1;
export const LANE = 2;
export const ROAD = 3;
export const DECK = 4;
export const RAIL = 5;
export const BORDER = 6;
export const BAND = 7;

// One view's overlay in art pixels: 8 a cell in the Country view and 16 in the Region view.
export interface Overlay {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

const LAKE = BIOME_NAMES.indexOf('lake');

// mapdraw.py's sizes in each view: the river's width, the routes' dash, gap and thickness, the bridge deck along and
// across its road, and the border's line and bands.
const MARKS = {
  country: { tilePx: 8, river: 1, dash: 1, gap: 1, thick: 1, along: 4, across: 3, line: 1, band: 1 },
  region: { tilePx: 16, river: 2, dash: 2, gap: 2, thick: 2, along: 8, across: 5, line: 2, band: 2 },
} as const;

type Marks = (typeof MARKS)[MapView];

interface Pen {
  readonly map: WorldMap;
  readonly marks: Marks;
  readonly out: Overlay;
}

function fill(pen: Pen, x0: number, y0: number, x1: number, y1: number, value: number): void {
  const { width, height, pixels } = pen.out;
  for (let y = Math.max(0, y0); y <= Math.min(height - 1, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(width - 1, x1); x++) pixels[y * width + x] = value;
  }
}

function centre(pen: Pen, cell: number): [number, number] {
  const { tilePx } = pen.marks;
  const x = cell % pen.map.width;
  return [x * tilePx + (tilePx >> 1), ((cell - x) / pen.map.width) * tilePx + (tilePx >> 1)];
}

// mapdraw.py's _dots: a size-px square at each step from centre to centre, kept where k % period < dash. A river is
// dash 1 of period 1: every step.
function stroke(pen: Pen, a: number, b: number, size: number, dash: number, period: number, value: number): void {
  const [ax, ay] = centre(pen, a);
  const [bx, by] = centre(pen, b);
  const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
  for (let k = 0; k <= steps; k++) {
    if (k % period >= dash) continue;
    const x = ax + Math.floor(((bx - ax) * k) / steps);
    const y = ay + Math.floor(((by - ay) * k) / steps);
    fill(pen, x, y, x + size - 1, y + size - 1, value);
  }
}

// mapdraw.py's _rivers: each river cell to its receiver, and a lake to a river it feeds; size-3 rivers a pixel wider.
function drawRivers(pen: Pen): void {
  const { river, receiver, biome } = pen.map;
  for (let cell = 0; cell < receiver.length; cell++) {
    const to = receiver[cell];
    if (to < 0 || !(river[cell] || (biome[cell] === LAKE && river[to]))) continue;
    stroke(pen, cell, to, pen.marks.river + Number(river[cell] === 3), 1, 1, RIVER);
  }
}

function drawRoutes(pen: Pen, table: PathTable, value: number): void {
  const { thick, dash, gap } = pen.marks;
  for (let p = 0; p + 1 < table.offsets.length; p++) {
    for (let k = table.offsets[p]; k + 1 < table.offsets[p + 1]; k++) {
      stroke(pen, table.cells[k], table.cells[k + 1], thick, dash, dash + gap, value);
    }
  }
}

// mapdraw.py's _bridges: a road runs flat at a cell when, at the cell's first visit, its neighbours along the road lie
// further apart across than down.
function flatRoads(map: WorldMap): Map<number, boolean> {
  const { offsets, cells } = map.roads;
  const flat = new Map<number, boolean>();
  for (let p = 0; p + 1 < offsets.length; p++) {
    const first = offsets[p];
    const last = offsets[p + 1] - 1;
    for (let k = first; k <= last; k++) {
      if (flat.has(cells[k])) continue;
      const a = cells[Math.max(first, k - 1)];
      const b = cells[Math.min(last, k + 1)];
      const across = Math.abs((b % map.width) - (a % map.width));
      flat.set(cells[k], across >= Math.abs(Math.floor(b / map.width) - Math.floor(a / map.width)));
    }
  }
  return flat;
}

// A deck laid along its road, with a rail round its edge.
function drawBridges(pen: Pen): void {
  const flat = flatRoads(pen.map);
  const { along, across } = pen.marks;
  for (const cell of pen.map.bridges) {
    const [x, y] = centre(pen, cell);
    const [dx, dy] = flat.get(cell) ? [along, across] : [across, along];
    const x0 = x - (dx >> 1);
    const y0 = y - (dy >> 1);
    const x1 = x + ((dx - 1) >> 1);
    const y1 = y + ((dy - 1) >> 1);
    fill(pen, x0, y0, x1, y1, RAIL);
    fill(pen, x0 + 1, y0 + 1, x1 - 1, y1 - 1, DECK);
  }
}

// mapdraw.py's _strip: width px across, from start px past the edge east of the cell (vertical) or south of it.
function strip(pen: Pen, cell: number, vertical: boolean, start: number, width: number, value: number): void {
  const { tilePx } = pen.marks;
  const x = (cell % pen.map.width) * tilePx;
  const y = Math.floor(cell / pen.map.width) * tilePx;
  if (vertical) fill(pen, x + tilePx + start, y, x + tilePx + start + width - 1, y + tilePx - 1, value);
  else fill(pen, x, y + tilePx + start, x + tilePx - 1, y + tilePx + start + width - 1, value);
}

// mapdraw.py's _edges: [cell, neighbour, vertical] for each land edge between two countries, looking east and south.
function borderEdges(map: WorldMap): [number, number, boolean][] {
  const { width, height, country } = map;
  const out: [number, number, boolean][] = [];
  for (let cell = 0; cell < country.length; cell++) {
    const k = country[cell];
    if (k === 0) continue;
    const east = country[cell + 1];
    if ((cell % width) + 1 < width && east !== 0 && east !== k) out.push([cell, cell + 1, true]);
    const south = country[cell + width];
    if (Math.floor(cell / width) + 1 < height && south !== 0 && south !== k) out.push([cell, cell + width, false]);
  }
  return out;
}

// mapdraw.py's _borders: a band of each side's colour, then a neutral line over every edge, so lines run unbroken
// over the corners.
function drawBorders(pen: Pen): void {
  const { line, band } = pen.marks;
  const { country, countries } = pen.map;
  const bandOf = (cell: number): number => BAND + countries.colour[country[cell] - 1];
  const edges = borderEdges(pen.map);
  const near = -((line + 1) >> 1);
  for (const [cell, other, vertical] of edges) {
    strip(pen, cell, vertical, near - band, band, bandOf(cell));
    strip(pen, cell, vertical, line >> 1, band, bandOf(other));
  }
  for (const [cell, , vertical] of edges) strip(pen, cell, vertical, near, line, BORDER);
}

export function buildOverlay(map: WorldMap, view: MapView): Overlay {
  const marks = MARKS[view];
  const width = map.width * marks.tilePx;
  const height = map.height * marks.tilePx;
  const pen: Pen = { map, marks, out: { width, height, pixels: new Uint8Array(width * height) } };
  drawRivers(pen);
  drawRoutes(pen, map.lanes, LANE);
  drawRoutes(pen, map.roads, ROAD);
  drawBridges(pen);
  drawBorders(pen);
  return pen.out;
}
