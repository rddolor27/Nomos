import { LANDMARK_SLOTS, NO_LANDMARK, type PathTable, type WorldMap } from '@nomos/sim-protocol/world-map';
import { describe, expect, it } from 'vitest';
import { INLAND } from '../src/climate/biomes.ts';
import { landmarks } from '../src/features/landmarks.ts';
import { survey } from '../src/features/survey.ts';
import { xOf, yOf } from '../src/grid/grid.ts';
import { generateWorld } from '../src/index.ts';
import type { FeatureWorld, Spot } from '../src/world/draft.ts';

const SEED = 0x5eed0001;

function pathsOf(table: PathTable): number[][] {
  const paths: number[][] = [];
  for (let p = 0; p < table.offsets.length - 1; p++) {
    paths.push(Array.from(table.cells.subarray(table.offsets[p], table.offsets[p + 1])));
  }
  return paths;
}

// What generateWorld handed survey and landmarks, read back from the map's columns.
function featureWorldOf(map: WorldMap): FeatureWorld {
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

function wonderSpots(map: WorldMap): Spot[] {
  const { kind, cell } = map.wonders;
  return Array.from(cell, (c, w) => ({ kind: kind[w], x: xOf(c, map.width), y: yOf(c, map.width) }));
}

function recordedLandmarks(map: WorldMap, id: number): number[] {
  const slots = map.settlements.landmarks.subarray(id * LANDMARK_SLOTS, (id + 1) * LANDMARK_SLOTS);
  return Array.from(slots).filter((kind) => kind !== NO_LANDMARK);
}

// Runs survey and landmarks on the world, which fills in each settlement's landmarks, and returns them by cell.
function landmarksByCell(map: WorldMap, world: FeatureWorld): Map<number, number[]> {
  landmarks(world, survey(world), wonderSpots(map));
  return new Map(world.settlements.map((s) => [s.uid, s.landmarks]));
}

describe('landmarks follow a settlement by its cell, not its id', { timeout: 60_000 }, () => {
  it("rebuilds the generator's own landmarks from the map's columns", () => {
    const map = generateWorld(SEED, 'standard');
    const world = featureWorldOf(map);
    const spots = landmarks(world, survey(world), wonderSpots(map));
    expect(spots.map((p) => p.kind)).toEqual(Array.from(map.landmarks.kind));
    expect(spots.map((p) => p.y * map.width + p.x)).toEqual(Array.from(map.landmarks.cell));
    const recorded = world.settlements.map((s) => recordedLandmarks(map, s.id));
    expect(world.settlements.map((s) => s.landmarks)).toEqual(recorded);
  });

  // Coastal settlements are left out: two of them may share a lighthouse cell, and the one that comes first takes it.
  it('gives every inland settlement the same landmarks when the ids run the other way', () => {
    const map = generateWorld(SEED, 'standard');
    const forward = featureWorldOf(map);
    const was = landmarksByCell(map, forward);

    const backward = featureWorldOf(map);
    backward.settlements = backward.settlements.reverse().map((s, id) => ({ ...s, id }));
    const now = landmarksByCell(map, backward);

    const inland = forward.settlements.filter((s) => map.coast[s.uid] === INLAND);
    expect(inland.some((s) => s.landmarks.length > 0), 'inland settlements with landmarks').toBe(true);
    for (const s of inland) {
      expect(now.get(s.uid), `the settlement at cell ${s.uid}`).toEqual(was.get(s.uid));
    }
  });
});
