import {
  BIOME_NAMES,
  CROWD_HUES,
  CROWD_Q,
  CROWD_STOPS,
  type MapCrowd,
  type WorldMap,
} from '@nomos/sim-protocol/world-map';
import { describe, expect, it } from 'vitest';
import { crowdOf } from '../src/crowd/crowd.ts';
import { generateWorld } from '../src/index.ts';

const WATER = new Set([BIOME_NAMES.indexOf('ocean'), BIOME_NAMES.indexOf('lake')]);
const WORLDS: [number, 'standard' | 'large'][] = [
  ...Array.from({ length: 10 }, (_, k): [number, 'standard'] => [0x5eed0001 + k, 'standard']),
  [0x5eed0001, 'large'],
  [0x5eed0002, 'large'],
];

// Each dot's settlement: dots come settlement by settlement, a dot per 100 people and at least one.
function owners(map: WorldMap): number[] {
  const dotsOf = (people: number): number => Math.max(1, Math.floor(people / 100));
  return Array.from(map.settlements.population, (people, s) => Array<number>(dotsOf(people)).fill(s)).flat();
}

// Every stop off its settlement's country or on water.
function strays(map: WorldMap, crowd: MapCrowd, owner: readonly number[]): string[] {
  const out: string[] = [];
  owner.forEach((s, dot) => {
    for (let stop = 0; stop < CROWD_STOPS; stop++) {
      const at = 2 * (dot * CROWD_STOPS + stop);
      const cell = Math.floor(crowd.stops[at + 1] / CROWD_Q) * map.width + Math.floor(crowd.stops[at] / CROWD_Q);
      const home = map.country[cell] === map.settlements.country[s];
      if (!home || WATER.has(map.biome[cell])) out.push(`dot ${dot} stop ${stop}`);
    }
  });
  return out;
}

describe('the map crowd on real worlds', { timeout: 120_000 }, () => {
  it("puts a dot per 100 people on its own country's land, in every hue", () => {
    for (const [seed, size] of WORLDS) {
      const map = generateWorld(seed, size);
      const crowd = crowdOf(map);
      const owner = owners(map);
      expect(crowd.hue.length, `${size} ${seed}`).toBe(owner.length);
      expect(strays(map, crowd, owner), `${size} ${seed}`).toEqual([]);
      expect(new Set(crowd.hue).size, `${size} ${seed}`).toBe(CROWD_HUES.length);
    }
  });
});
