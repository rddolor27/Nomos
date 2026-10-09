// Free of Node imports, so the same file runs in Node, Bun and, bundled, in each browser. goldens.py's stages, line
// for line: each block runs a stage the way goldens.py opens world.generate up, and folds what it made. Each port task
// appends its block before the return.
import { WORLD_SIZES, type WorldSize } from '@nomos/sim-protocol/world-map';
import { fold, paths, rows, type Part } from './fold.ts';
import { falloffOf, landPermilleOf, templateOf } from '../../src/terrain/templates.ts';
import { chains } from '../../src/terrain/chains.ts';
import { cut, landOf, rawOf, reliefOf, riseOf, shape } from '../../src/terrain/shape.ts';
import { rain } from '../../src/climate/rain.ts';
import { EROSION_PASSES, accumulate, erode, flood } from '../../src/drainage/flood.ts';
import { lakes } from '../../src/drainage/lakes.ts';
import { drain } from '../../src/drainage/drain.ts';
import { sum, union } from '../../src/grid/grid.ts';
import { coasts, moisture, slopes, temperature } from '../../src/climate/climate.ts';
import { biomes } from '../../src/climate/biomes.ts';
import { habitability } from '../../src/settle/habitability.ts';
import { settle } from '../../src/settle/settle.ts';
import { found } from '../../src/countries/countries.ts';
import { regions } from '../../src/regions/regions.ts';
import { farm } from '../../src/settle/farm.ts';
import { landmasses, routeGraph } from '../../src/routes/graph.ts';
import { buildRoads } from '../../src/routes/roads.ts';
import { lanes } from '../../src/routes/lanes.ts';
import { survey } from '../../src/features/survey.ts';
import { wonders } from '../../src/features/wonders.ts';
import { landmarks } from '../../src/features/landmarks.ts';
import { generateWorld, worldFingerprint } from '../../src/index.ts';
import type { FeatureWorld } from '../../src/world/draft.ts';

export function stagePrints(seed: number, size: WorldSize): Map<string, number> {
  const [width, height] = WORLD_SIZES[size];
  const prints = new Map<string, number>();

  const template = templateOf(seed);
  const landPermille = landPermilleOf(seed, template);
  const falloff = falloffOf(seed, width, height, template, landPermille);
  prints.set('falloff', fold(template, landPermille, falloff));

  const relief = reliefOf(seed, width, height);
  prints.set('relief', fold(relief));
  const { coastCut, rise } = riseOf(falloff, relief, landPermille);
  const ridges = chains(seed, width, height, rise);
  prints.set('chains', fold(coastCut, ridges));

  const raw = rawOf(seed, rise, relief, ridges);
  const sea = cut(raw, landPermille);
  prints.set('raw', fold(sea, raw));
  prints.set('land', fold(landOf(raw, sea, width, height)));
  const shaped = shape(seed, width, height);
  prints.set('shape', fold(shaped.template, shaped.elevation, shaped.ocean));

  const rained = rain(seed, width, height, shaped.elevation, shaped.ocean);
  prints.set('rain', fold(rained.wind, rained.rain));

  let eroded = shaped.elevation;
  const passes: Part[] = [];
  for (let pass = 0; pass < EROSION_PASSES; pass++) {
    const flooded = flood(seed, width, height, eroded, shaped.ocean);
    const flow = accumulate(flooded.order, flooded.receiver, rained.rain, shaped.ocean);
    eroded = erode(eroded, flooded.filled, flooded.receiver, flow, shaped.ocean);
    passes.push(flooded.filled, flooded.receiver, flooded.order, flow, eroded);
  }
  prints.set('erode', fold(...passes));

  const settled = flood(seed, width, height, eroded, shaped.ocean);
  const pools = lakes(width, height, eroded, settled.filled, shaped.ocean);
  prints.set('lakes', fold(settled.filled, settled.receiver, settled.order, pools.lake, pools.terminal, pools.level));
  const drained = drain(seed, width, height, shaped.elevation, shaped.ocean, rained.rain);
  prints.set('drain', fold(drained.elevation, drained.lake, drained.receiver, drained.flow, drained.river));

  const water = union(shaped.ocean, drained.lake);
  const warmth = temperature(seed, width, height, drained.elevation);
  const wetness = moisture(seed, width, height, rained.rain, water, drained.river);
  const coast = coasts(width, height, drained.elevation, shaped.ocean);
  prints.set('climate', fold(warmth.cold, warmth.temperature, wetness, coast));

  const biome = biomes(
    seed,
    width,
    height,
    drained.elevation,
    warmth.temperature,
    wetness,
    shaped.ocean,
    drained.lake,
    drained.river,
    coast,
  );
  prints.set('biomes', fold(biome));
  const slope = slopes(width, height, drained.elevation, water);
  const score = habitability(
    width,
    height,
    biome,
    drained.elevation,
    drained.river,
    coast,
    warmth.temperature,
    wetness,
    slope,
  );
  prints.set('habitability', fold(slope, score));

  const landCells = water.length - sum(water);
  const settlements = settle(seed, width, height, score, landCells);
  prints.set('settle', fold(rows(settlements.map((s) => [s.id, s.x, s.y, s.tier, s.population, s.uid]))));

  const founded = found(seed, width, height, biome, drained.river, drained.receiver, settlements, landCells);
  const nations = rows(founded.countries.map((c) => [c.id, c.capital, c.colour]));
  prints.set('countries', fold(founded.country, nations, settlements.map((s) => s.tier)));

  // Python has no regions, so frozen-v1.json holds their prints.
  const zoned = regions(width, height, biome, drained.river, drained.receiver, founded.country, settlements);
  prints.set('regions', fold(zoned.region, zoned.market, zoned.seat, zoned.country));

  const farmed = farm(seed, width, biome, settlements);
  prints.set('farm', fold(farmed));
  const mass = landmasses(width, height, farmed);
  prints.set('routes', fold(rows(routeGraph(settlements, settlements.map((s) => mass[s.uid])))));
  const built = buildRoads(width, height, farmed, drained.elevation, drained.river, drained.receiver, settlements);
  prints.set('roads', fold(paths(built.roads), built.bridges));
  const sailed = lanes(width, height, farmed, settlements);
  prints.set('lanes', fold(paths(sailed)));

  const world: FeatureWorld = {
    seed,
    width,
    height,
    elevation: drained.elevation,
    biome: farmed,
    temperature: warmth.temperature,
    moisture: wetness,
    river: drained.river,
    receiver: drained.receiver,
    coast,
    settlements,
    roads: built.roads,
    bridges: built.bridges,
  };
  const land = survey(world);
  prints.set('survey', fold(land.slope, land.forestDepth, land.town, land.big, land.wet, land.hotspot, land.hotReach));
  const spots = wonders(world, land);
  prints.set('wonders', fold(rows(spots.map((p) => [p.kind, p.x, p.y]))));
  const own = landmarks(world, land, spots);
  prints.set('landmarks', fold(rows(own.map((p) => [p.kind, p.x, p.y])), paths(settlements.map((s) => s.landmarks))));

  prints.set('world', worldFingerprint(generateWorld(seed, size)));

  return prints;
}
