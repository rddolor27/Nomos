import { ROAD_CLASS_NAMES, TIER_NAMES, type WorldMap } from '@nomos/sim-protocol/world-map';
import { landmasses } from '../src/routes/graph.ts';

const MAJOR = ROAD_CLASS_NAMES.indexOf('major');
// Capitals, cities and towns: the tiers up to town.
const TOWN = TIER_NAMES.indexOf('town');

// Every road path has one class, a ROAD_CLASS_NAMES index.
export function unclassedRoads(map: WorldMap): string[] {
  const roads = map.roads.offsets.length - 1;
  const classes = map.roadClass.length;
  const valid = map.roadClass.every((roadClass) => roadClass < ROAD_CLASS_NAMES.length);
  return classes === roads && valid ? [] : [`${classes} classes for ${roads} roads, all valid: ${valid}`];
}

function find(root: Int32Array, cell: number): number {
  let at = cell;
  while (root[at] !== at) {
    root[at] = root[root[at]];
    at = root[at];
  }
  return at;
}

// Joins each major road's cells step by step, so major roads that meet at any cell share a root.
function majorRoots(map: WorldMap): Int32Array {
  const root = Int32Array.from({ length: map.width * map.height }, (_, cell) => cell);
  const { offsets, cells } = map.roads;
  for (let p = 0; p < map.roadClass.length; p++) {
    if (map.roadClass[p] !== MAJOR) continue;
    for (let k = offsets[p] + 1; k < offsets[p + 1]; k++) root[find(root, cells[k - 1])] = find(root, cells[k]);
  }
  return root;
}

// The capitals, cities and towns that major roads leave cut off from the first of them on their landmass.
export function cutOffHubs(map: WorldMap): string[] {
  const root = majorRoots(map);
  const mass = landmasses(map.width, map.height, map.biome);
  const { cell, tier } = map.settlements;
  const firstHub = new Map<number, number>();
  const out: string[] = [];
  for (let s = 0; s < cell.length; s++) {
    if (tier[s] > TOWN) continue;
    const hub = firstHub.get(mass[cell[s]]) ?? s;
    firstHub.set(mass[cell[s]], hub);
    if (find(root, cell[s]) !== find(root, cell[hub])) {
      out.push(`${TIER_NAMES[tier[s]]}-${s} has no major road to ${TIER_NAMES[tier[hub]]}-${hub}`);
    }
  }
  return out;
}
