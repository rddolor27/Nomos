import type { PathTable, WorldMap } from '@nomos/sim-protocol/world-map';
import { xOf, yOf } from '../src/grid/grid.ts';
import type { FeatureWorld } from '../src/world/draft.ts';

function pathsOf(table: PathTable): number[][] {
  const paths: number[][] = [];
  for (let p = 0; p < table.offsets.length - 1; p++) {
    paths.push(Array.from(table.cells.subarray(table.offsets[p], table.offsets[p + 1])));
  }
  return paths;
}

// What generateWorld handed survey and landmarks, read back from the map's columns.
export function featureWorldOf(map: WorldMap): FeatureWorld {
  const { settlements, width } = map;
  return {
    seed: map.seed,
    width,
    height: map.height,
    elevation: Int32Array.from(map.elevation),
    biome: map.biome,
    temperature: map.temperature,
    moisture: map.moisture,
    river: map.river,
    receiver: map.receiver,
    coast: map.coast,
    settlements: Array.from(settlements.cell, (cell, id) => ({
      id,
      x: xOf(cell, width),
      y: yOf(cell, width),
      tier: settlements.tier[id],
      population: settlements.population[id],
      uid: cell,
      landmarks: [],
    })),
    roads: pathsOf(map.roads),
    bridges: Array.from(map.bridges),
  };
}
