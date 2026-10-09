// Free of Node imports, so the same file runs in Node, Bun and, bundled, in each browser. goldens.py's stages, line
// for line: each block runs a stage the way goldens.py opens world.generate up, and folds what it made. Each port task
// appends its block before the return.
import { WORLD_SIZES, type WorldSize } from '@nomos/sim-protocol/world-map';
import { fold } from './fold.ts';
import { falloffOf, landPermilleOf, templateOf } from '../../src/terrain/templates.ts';

export function stagePrints(seed: number, size: WorldSize): Map<string, number> {
  const [width, height] = WORLD_SIZES[size];
  const prints = new Map<string, number>();

  const template = templateOf(seed);
  const landPermille = landPermilleOf(seed, template);
  const falloff = falloffOf(seed, width, height, template, landPermille);
  prints.set('falloff', fold(template, landPermille, falloff));

  return prints;
}
