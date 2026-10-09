import { WORLD_SIZES, type WorldSize } from '@nomos/sim-protocol/world-map';
import { describe, expect, it } from 'vitest';
import { GRASSLAND, OCEAN, biomes } from '../src/climate/biomes.ts';
import { coasts, moisture, slopes, temperature } from '../src/climate/climate.ts';
import { rain } from '../src/climate/rain.ts';
import { found } from '../src/countries/countries.ts';
import { drain } from '../src/drainage/drain.ts';
import { sum, union } from '../src/grid/grid.ts';
import { regions, type Regions } from '../src/regions/regions.ts';
import { habitability } from '../src/settle/habitability.ts';
import { CAPITAL, TOWN, settle, type Settlement } from '../src/settle/settle.ts';
import { shape } from '../src/terrain/shape.ts';

function town(id: number, uid: number, tier: number): Settlement {
  return { id, x: uid, y: 0, tier, population: 100_000 - id, uid, landmarks: [] };
}

// One character per cell: a country's number on grassland, or O for ocean.
function regionsOn(rows: readonly string[], seats: readonly Settlement[]): Regions {
  const cells = rows.join('');
  const biome = Uint8Array.from(cells, (c) => (c === 'O' ? OCEAN : GRASSLAND));
  const country = Uint8Array.from(cells, (c) => (c === 'O' ? 0 : Number(c)));
  const river = new Uint8Array(cells.length);
  const receiver = new Int32Array(cells.length).fill(-1);
  return regions(rows[0].length, rows.length, biome, river, receiver, country, seats);
}

// world.generate up to the countries stage, as the goldens' mirror runs it.
function countriesOf(seed: number, size: WorldSize) {
  const [width, height] = WORLD_SIZES[size];
  const shaped = shape(seed, width, height);
  const rained = rain(seed, width, height, shaped.elevation, shaped.ocean);
  const drained = drain(seed, width, height, shaped.elevation, shaped.ocean, rained.rain);
  const water = union(shaped.ocean, drained.lake);
  const warmth = temperature(seed, width, height, drained.elevation);
  const wetness = moisture(seed, width, height, rained.rain, water, drained.river);
  const coast = coasts(width, height, drained.elevation, shaped.ocean);
  const { elevation, lake, river, receiver } = drained;
  const biome = biomes(seed, width, height, elevation, warmth.temperature, wetness, shaped.ocean, lake, river, coast);
  const slope = slopes(width, height, elevation, water);
  const score = habitability(width, height, biome, elevation, river, coast, warmth.temperature, wetness, slope);
  const landCells = water.length - sum(water);
  const settlements = settle(seed, width, height, score, landCells);
  const { country } = found(seed, width, height, biome, river, receiver, settlements, landCells);
  return { width, height, biome, river, receiver, country, settlements };
}

const SAMPLE: [number, WorldSize][] = [
  ...Array.from({ length: 10 }, (_, k): [number, WorldSize] => [0x5eed0001 + k, 'standard']),
  [0x5eed0001, 'large'],
  [0x5eed0002, 'large'],
];

describe('regions and market territories', { timeout: 120_000 }, () => {
  // The town at 7 reaches 13 more cheaply straight through country 2 than the capital at 0 does around it.
  it('never grows a region across a border, though its market crosses', () => {
    const seats = [town(0, 0, CAPITAL), town(1, 10, CAPITAL), town(2, 7, TOWN)];
    const zones = regionsOn(['1111111', '1222221'], seats);
    expect([...zones.seat]).toEqual([0, 1, 2]);
    expect([...zones.country]).toEqual([1, 2, 1]);
    expect([...zones.region]).toEqual([1, 1, 1, 1, 1, 1, 1, 3, 2, 2, 2, 2, 2, 1]);
    expect([...zones.market]).toEqual([1, 1, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2]);
  });

  it("joins an island without a seat to its own country's nearest region, across the water", () => {
    const seats = [town(0, 0, CAPITAL), town(1, 6, CAPITAL), town(2, 1, TOWN)];
    const zones = regionsOn(['111O1O22'], seats);
    expect([...zones.region]).toEqual([1, 3, 3, 0, 3, 0, 2, 2]);
    expect([...zones.market]).toEqual([1, 3, 3, 0, 2, 0, 2, 2]);
  });

  it('gives every land cell a region of its own country, and every seat its own region', () => {
    for (const [seed, size] of SAMPLE) {
      const world = countriesOf(seed, size);
      const { width, height, biome, river, receiver, country, settlements } = world;
      const zones = regions(width, height, biome, river, receiver, country, settlements);
      const where = `${size} ${seed.toString(16)}`;
      const strays = Array.from(country.keys()).filter((cell) => {
        const r = zones.region[cell];
        if (country[cell] === 0) return r !== 0 || zones.market[cell] !== 0;
        return r === 0 || zones.country[r - 1] !== country[cell] || zones.market[cell] === 0;
      });
      expect(strays, `${where}: cells with the wrong region or market`).toEqual([]);
      zones.seat.forEach((id, r) => {
        expect(zones.region[settlements[id].uid], `${where}: seat of region ${r + 1}`).toBe(r + 1);
      });
    }
  });
});
