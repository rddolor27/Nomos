import { draw } from '@nomos/sim-core/kernels';
import {
  BIOME_NAMES,
  LANDMARK_NAMES,
  LANDMARK_SLOTS,
  NO_LANDMARK,
  TIER_NAMES,
  WONDER_NAMES,
  type WorldMap,
} from '@nomos/sim-protocol/world-map';
import { inside, neighbours, side, sidesText, xOf, yOf } from '../grid/grid.ts';
import { PLACE } from '../random/streams.ts';
import type { PlaceContext } from './context.ts';
import type { Cell } from './site.ts';

const OCEAN = BIOME_NAMES.indexOf('ocean');
const LAKE = BIOME_NAMES.indexOf('lake');
const FARMLAND = BIOME_NAMES.indexOf('farmland');
// climate.py's COASTS: a place by the sea names its coast, and inland is no coast at all.
const COASTS = ['', 'beach', 'cliffs'];
// The cells on each side of a cell, diagonals included, for the sea or the fields a place faces.
const FACING: readonly (readonly [string, readonly Cell[]])[] = [
  ['n', [[-1, -1], [0, -1], [1, -1]]],
  ['e', [[1, -1], [1, 0], [1, 1]]],
  ['s', [[-1, 1], [0, 1], [1, 1]]],
  ['w', [[-1, -1], [-1, 0], [-1, 1]]],
];

type Extra = Pick<PlaceContext, 'tier' | 'population' | 'landmarks' | 'wonder'>;

// world.py's place_contexts: one per settlement in id order, then one per wonder, each with its own keyed seed.
// Place p of the map worker's requests is contexts[p].
export function placeContexts(map: WorldMap): PlaceContext[] {
  const { settlements, wonders } = map;
  const contexts: PlaceContext[] = [];
  for (let id = 0; id < settlements.cell.length; id++) {
    const tier = TIER_NAMES[settlements.tier[id]];
    const uid = settlements.cell[id];
    const extra: Extra = { tier, population: settlements.population[id], landmarks: landmarksOf(map, id), wonder: null };
    contexts.push(contextOf(map, uid, draw(map.seed, PLACE, 0, uid), `${tier}-${id}`, extra));
  }
  for (let k = 0; k < wonders.kind.length; k++) {
    const kind = WONDER_NAMES[wonders.kind[k]];
    const extra: Extra = { tier: null, population: 0, landmarks: [], wonder: kind };
    contexts.push(contextOf(map, wonders.cell[k], draw(map.seed, PLACE, 1, wonders.kind[k]), `wonder-${kind}`, extra));
  }
  return contexts;
}

function landmarksOf(map: WorldMap, id: number): string[] {
  const names: string[] = [];
  for (let slot = 0; slot < LANDMARK_SLOTS; slot++) {
    const code = map.settlements.landmarks[id * LANDMARK_SLOTS + slot];
    if (code !== NO_LANDMARK) names.push(LANDMARK_NAMES[code]);
  }
  return names;
}

// world.py's _context, with model.py's field order, so the record reads as Python's does.
function contextOf(map: WorldMap, cell: number, seed: number, name: string, extra: Extra): PlaceContext {
  const x = xOf(cell, map.width);
  const y = yOf(cell, map.width);
  const sea = facing(map, x, y, OCEAN);
  return {
    seed,
    name,
    biome: BIOME_NAMES[map.biome[cell]],
    temperature: map.temperature[cell],
    moisture: map.moisture[cell],
    tier: extra.tier,
    population: extra.population,
    sea,
    coast: sea ? COASTS[map.coast[cell]] : '',
    river: sidesText(riverSides(map, cell)),
    roads: sidesText(roadSides(map, cell, sea)),
    farmland: facing(map, x, y, FARMLAND),
    landmarks: extra.landmarks,
    wonder: extra.wonder,
  };
}

function facing(map: WorldMap, x: number, y: number, kind: number): string {
  let sides = '';
  for (const [letter, cells] of FACING) {
    const faces = cells.some(
      ([dx, dy]) => inside(x + dx, y + dy, map.width, map.height) && map.biome[(y + dy) * map.width + x + dx] === kind,
    );
    if (faces) sides += letter;
  }
  return sidesText(sides);
}

// The sides a river leaves by, to its receiver, and comes in by, from the rivers and lakes that drain into the cell.
function riverSides(map: WorldMap, cell: number): string {
  if (!map.river[cell]) return '';
  const nbrs = neighbours(map.width, map.height);
  const flows = map.receiver[cell] >= 0 ? [map.receiver[cell]] : [];
  for (let k = nbrs.start[cell]; k < nbrs.start[cell + 1]; k++) {
    const u = nbrs.cells[k];
    if (map.receiver[u] === cell && (map.river[u] || map.biome[u] === LAKE)) flows.push(u);
  }
  let sides = '';
  for (const c of flows) sides += stepSide(map, cell, c, sides);
  return sides;
}

// The sides the roads through the cell leave by, a step either way along each road.
function roadSides(map: WorldMap, cell: number, sea: string): string {
  const { offsets, cells } = map.roads;
  let sides = '';
  for (let p = 0; p + 1 < offsets.length; p++) {
    for (let k = offsets[p]; k < offsets[p + 1]; k++) {
      if (cells[k] !== cell) continue;
      if (k - 1 >= offsets[p]) sides += stepSide(map, cell, cells[k - 1], sides + sea);
      if (k + 1 < offsets[p + 1]) sides += stepSide(map, cell, cells[k + 1], sides + sea);
    }
  }
  return sides;
}

function stepSide(map: WorldMap, from: number, to: number, taken: string): string {
  return side(xOf(to, map.width) - xOf(from, map.width), yOf(to, map.width) - yOf(from, map.width), taken);
}
