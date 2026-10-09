import { BIOME_NAMES } from '@nomos/sim-protocol/world-map';

// roads.py's step costs, which countries.py shares. Water has no cover: roads never enter it, and countries pay WATER.
const COVER_BY_NAME: Record<string, number> = {
  grassland: 0,
  farmland: 0,
  sand: 6,
  'forest-deciduous': 8,
  'forest-conifer': 10,
  snow: 12,
  marsh: 18,
  hills: 14,
  mountain: 48,
  peak: 160,
};
export const COVER: readonly number[] = BIOME_NAMES.map((name) => COVER_BY_NAME[name] ?? 0);
export const BRIDGE = 72;
export const STRAIGHT = 10;
export const DIAGONAL = 14;
export const SPAN2 = 14 * 14;
