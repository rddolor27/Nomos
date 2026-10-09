import { draw2 } from '@nomos/sim-core/kernels';
import {
  LANDMARK_SLOTS,
  NO_LANDMARK,
  WORLDGEN_VERSION,
  WORLD_SIZES,
  type PathTable,
  type WorldMap,
  type WorldSize,
} from '@nomos/sim-protocol/world-map';
import { biomes } from '../climate/biomes.ts';
import { coasts, moisture, slopes, temperature } from '../climate/climate.ts';
import { rain } from '../climate/rain.ts';
import { found } from '../countries/countries.ts';
import { drain } from '../drainage/drain.ts';
import { landmarks } from '../features/landmarks.ts';
import { survey } from '../features/survey.ts';
import { wonders } from '../features/wonders.ts';
import { sum, union } from '../grid/grid.ts';
import { SHAPE } from '../random/streams.ts';
import { regions } from '../regions/regions.ts';
import { lanes } from '../routes/lanes.ts';
import { buildRoads } from '../routes/roads.ts';
import { farm } from '../settle/farm.ts';
import { habitability } from '../settle/habitability.ts';
import { settle } from '../settle/settle.ts';
import { shape } from '../terrain/shape.ts';
import type { Draft, Spot } from './draft.ts';

export interface StageTimer {
  lap(stage: string): void;
}

// mapdraw.py's keyed tile variant, a sub-purpose of the SHAPE stream.
const VARIANT = 0x200;
const NO_TIMER: StageTimer = { lap() {} };

// world.generate, stage by stage, packed as interfaces.md's WorldMap.
export function generateWorld(seed: number, size: WorldSize, timer: StageTimer = NO_TIMER): WorldMap {
  const uint = seed >>> 0;
  const [width, height] = WORLD_SIZES[size];
  const shaped = shape(uint, width, height);
  timer.lap('shape');
  const rained = rain(uint, width, height, shaped.elevation, shaped.ocean);
  timer.lap('rain');
  const drained = drain(uint, width, height, shaped.elevation, shaped.ocean, rained.rain);
  timer.lap('drain');
  const water = union(shaped.ocean, drained.lake);
  const warmth = temperature(uint, width, height, drained.elevation);
  const wetness = moisture(uint, width, height, rained.rain, water, drained.river);
  const coast = coasts(width, height, drained.elevation, shaped.ocean);
  timer.lap('climate');
  const { elevation, lake, river, receiver } = drained;
  const biome = biomes(uint, width, height, elevation, warmth.temperature, wetness, shaped.ocean, lake, river, coast);
  const slope = slopes(width, height, elevation, water);
  const score = habitability(width, height, biome, elevation, river, coast, warmth.temperature, wetness, slope);
  timer.lap('biomes');
  const landCells = water.length - sum(water);
  const settlements = settle(uint, width, height, score, landCells);
  timer.lap('settle');
  const founded = found(uint, width, height, biome, river, receiver, settlements, landCells);
  timer.lap('countries');
  const zones = regions(width, height, biome, river, receiver, founded.country, settlements);
  timer.lap('regions');
  const farmed = farm(uint, width, biome, settlements);
  timer.lap('farm');
  const built = buildRoads(width, height, farmed, elevation, river, receiver, settlements);
  timer.lap('roads');
  const sailed = lanes(width, height, farmed, settlements);
  timer.lap('lanes');
  const draft: Draft = {
    seed: uint,
    width,
    height,
    template: shaped.template,
    wind: rained.wind,
    cold: warmth.cold,
    elevation,
    biome: farmed,
    temperature: warmth.temperature,
    moisture: wetness,
    river,
    receiver,
    coast,
    settlements,
    roads: built.roads,
    bridges: built.bridges,
    lanes: sailed,
    wonders: [],
    landmarks: [],
    country: founded.country,
    countries: founded.countries,
    zones,
  };
  const land = survey(draft);
  draft.wonders = wonders(draft, land);
  draft.landmarks = landmarks(draft, land, draft.wonders);
  timer.lap('features');
  return pack(draft);
}

function pathTable(paths: readonly (readonly number[])[]): PathTable {
  const offsets = new Int32Array(paths.length + 1);
  for (let p = 0; p < paths.length; p++) offsets[p + 1] = offsets[p] + paths[p].length;
  const cells = new Int32Array(offsets[paths.length]);
  for (let p = 0; p < paths.length; p++) cells.set(paths[p], offsets[p]);
  return { offsets, cells };
}

function spotColumns(spots: readonly Spot[], width: number): { kind: Uint8Array; cell: Int32Array } {
  return { kind: Uint8Array.from(spots, (p) => p.kind), cell: Int32Array.from(spots, (p) => p.y * width + p.x) };
}

function settlementColumns(draft: Draft): WorldMap['settlements'] {
  const { settlements, country, zones } = draft;
  const landmarks = new Uint8Array(settlements.length * LANDMARK_SLOTS).fill(NO_LANDMARK);
  settlements.forEach((s, id) => landmarks.set(s.landmarks, id * LANDMARK_SLOTS));
  return {
    cell: Int32Array.from(settlements, (s) => s.uid),
    tier: Uint8Array.from(settlements, (s) => s.tier),
    population: Int32Array.from(settlements, (s) => s.population),
    country: Uint8Array.from(settlements, (s) => country[s.uid]),
    region: Uint16Array.from(settlements, (s) => zones.region[s.uid]),
    landmarks,
  };
}

function variants(seed: number, cells: number): Uint8Array {
  const out = new Uint8Array(cells);
  for (let cell = 0; cell < cells; cell++) out[cell] = draw2(seed, SHAPE, VARIANT, cell) & 3;
  return out;
}

function pack(draft: Draft): WorldMap {
  const { seed, width, height, zones } = draft;
  return {
    version: WORLDGEN_VERSION,
    seed,
    width,
    height,
    template: draft.template,
    wind: draft.wind,
    cold: draft.cold,
    elevation: Int16Array.from(draft.elevation),
    biome: draft.biome,
    temperature: draft.temperature,
    moisture: draft.moisture,
    river: draft.river,
    receiver: draft.receiver,
    coast: draft.coast,
    variant: variants(seed, width * height),
    country: draft.country,
    region: zones.region,
    market: zones.market,
    settlements: settlementColumns(draft),
    countries: {
      capital: Int32Array.from(draft.countries, (c) => c.capital),
      colour: Uint8Array.from(draft.countries, (c) => c.colour),
    },
    regions: { seat: zones.seat, country: zones.country },
    roads: pathTable(draft.roads),
    lanes: pathTable(draft.lanes),
    bridges: Int32Array.from(draft.bridges),
    wonders: spotColumns(draft.wonders, width),
    landmarks: spotColumns(draft.landmarks, width),
  };
}
