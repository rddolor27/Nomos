// Free of Node imports, so the same file runs in Node, Bun and, bundled, in each browser. goldens.py's stages, line
// for line: each block runs a stage the way goldens.py opens world.generate up, and folds what it made. Each port task
// appends its block before the return.
import { WORLD_SIZES, type WorldSize } from '@nomos/sim-protocol/world-map';
import { fold, type Part } from './fold.ts';
import { falloffOf, landPermilleOf, templateOf } from '../../src/terrain/templates.ts';
import { chains } from '../../src/terrain/chains.ts';
import { cut, landOf, rawOf, reliefOf, riseOf, shape } from '../../src/terrain/shape.ts';
import { rain } from '../../src/climate/rain.ts';
import { EROSION_PASSES, accumulate, erode, flood } from '../../src/drainage/flood.ts';
import { lakes } from '../../src/drainage/lakes.ts';
import { drain } from '../../src/drainage/drain.ts';

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

  return prints;
}
