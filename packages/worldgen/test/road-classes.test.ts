import { ROAD_CLASS_NAMES, type WorldMap, type WorldSize } from '@nomos/sim-protocol/world-map';
import { describe, expect, it } from 'vitest';
import { generateWorld } from '../src/index.ts';
import { cutOffHubs, unclassedRoads } from './major-roads.ts';

const FIRST_SEED = 0x5eed0001;
const COUNTS: Record<WorldSize, number> = { standard: 20, large: 5 };
const MINOR = ROAD_CLASS_NAMES.indexOf('minor');

interface Sample {
  name: string;
  map: WorldMap;
}

let made: Sample[] | undefined;

// The first 20 standard and 5 large worlds, made once for every test.
function sample(): Sample[] {
  made ??= (['standard', 'large'] as const).flatMap((size) =>
    Array.from({ length: COUNTS[size] }, (_, k) => {
      const seed = FIRST_SEED + k;
      return { name: `${size} ${seed.toString(16)}`, map: generateWorld(seed, size) };
    }),
  );
  return made;
}

function problems(check: (map: WorldMap) => string[]): string[] {
  return sample().flatMap(({ name, map }) => check(map).map((problem) => `${name}: ${problem}`));
}

describe('road classes', { timeout: 120_000 }, () => {
  it('classes every road', () => {
    expect(problems(unclassedRoads)).toEqual([]);
  });

  it('joins every town, city and capital of a landmass by major roads', () => {
    expect(problems(cutOffHubs)).toEqual([]);
  });

  it('leaves some roads minor, in most of them', () => {
    const withMinor = sample().filter(({ map }) => map.roadClass.includes(MINOR)).length;
    expect(withMinor).toBeGreaterThan(sample().length / 2);
  });
});
