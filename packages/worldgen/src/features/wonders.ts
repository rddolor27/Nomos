import { below, draw2, draw3, floorDiv } from '@nomos/sim-core/kernels';
import { WONDER_NAMES } from '@nomos/sim-protocol/world-map';
import { CLIFFS, HILLS, HILLS_AT, LAKE, MOUNTAIN, OCEAN, PEAK, SAND } from '../climate/biomes.ts';
import { dist2, ORTHO, sum, xOf, yOf } from '../grid/grid.ts';
import { shuffled } from '../random/keyed.ts';
import { WONDER } from '../random/streams.ts';
import type { FeatureWorld, Spot } from '../world/draft.ts';
import { at, CAVE, COUNT, countAround, framed, heated, type Land, ORDER, TIE } from './survey.ts';

// Wonders keep 8 cells apart; this is the squared distance.
export const WONDER_GAP2 = 8 * 8;

// Below any elevation, so banks that are all sea floor are not taken for no bank at all.
const NO_BANK = -0x80000000;
const NO_EDGE = -1;

export type SiteRule = (world: FeatureWorld, land: Land, cell: number) => number;

export function waterfall(world: FeatureWorld, _land: Land, cell: number): number {
  const r = world.receiver[cell];
  if (world.river[cell] === 0 || r < 0 || world.biome[r] === LAKE) return 0;
  const drop = world.elevation[cell] - Math.max(0, world.elevation[r]);
  if (drop < 60) return 0;
  return drop * 2 + world.river[cell] * 20 + (world.elevation[cell] >= HILLS_AT ? 40 : 0);
}

// The higher of the two cells one and two steps out along a bank, or 0 when both are off the map.
function bankHeight(world: FeatureWorld, x: number, y: number, dx: number, dy: number): number {
  let top = NO_BANK;
  for (let k = 1; k <= 2; k++) {
    const c = at(world, x + k * dx, y + k * dy);
    if (c >= 0) top = Math.max(top, world.elevation[c]);
  }
  return top === NO_BANK ? 0 : top;
}

export function canyonView(world: FeatureWorld, _land: Land, cell: number): number {
  const r = world.receiver[cell];
  const e = world.elevation[cell];
  if (world.river[cell] === 0 || r < 0 || world.moisture[cell] >= 150 || e < 150 || e > 650) return 0;
  const x = xOf(cell, world.width);
  const y = yOf(cell, world.width);
  const px = yOf(r, world.width) - y;
  const py = x - xOf(r, world.width);
  const cut = Math.min(bankHeight(world, x, y, px, py), bankHeight(world, x, y, -px, -py)) - e;
  return cut >= 50 ? cut * 3 + 150 - world.moisture[cell] : 0;
}

export function giantTree(world: FeatureWorld, land: Land, cell: number): number {
  if (land.forestDepth[cell] < 2 || world.moisture[cell] < 140 || land.town[cell] < 4) return 0;
  return land.forestDepth[cell] * 25 + floorDiv(world.moisture[cell], 2);
}

function seaAhead(world: FeatureWorld, x: number, y: number, dx: number, dy: number): boolean {
  for (let k = 1; k <= 3; k++) {
    const c = at(world, x + k * dx, y + k * dy);
    if (c < 0 || world.biome[c] !== OCEAN) return false;
  }
  return true;
}

export function seaArch(world: FeatureWorld, _land: Land, cell: number): number {
  if (world.coast[cell] !== CLIFFS) return 0;
  const x = xOf(cell, world.width);
  const y = yOf(cell, world.width);
  let openSea = 0;
  for (const [dx, dy] of ORTHO) {
    if (seaAhead(world, x, y, dx, dy)) openSea++;
  }
  return openSea > 0 ? world.elevation[cell] + openSea * 40 : 0;
}

// What standing where hills meet sand adds, or NO_EDGE on any other ground.
function archEdge(world: FeatureWorld, land: Land, cell: number): number {
  const b = world.biome[cell];
  if (b === HILLS || b === MOUNTAIN) return countAround(world, land, cell, [SAND]) > 0 ? 30 : 0;
  if (b === SAND && countAround(world, land, cell, [HILLS, MOUNTAIN]) > 0) return 40;
  return NO_EDGE;
}

export function stoneArch(world: FeatureWorld, land: Land, cell: number): number {
  const t = world.temperature[cell];
  const m = world.moisture[cell];
  if (t < 130 || m > 120) return 0;
  const edge = archEdge(world, land, cell);
  if (edge === NO_EDGE) return 0;
  return land.slope[cell] * 2 + edge + t - 130 + 120 - m;
}

export function dune(world: FeatureWorld, land: Land, cell: number): number {
  if (world.biome[cell] !== SAND || world.temperature[cell] < 150 || world.moisture[cell] > 90) return 0;
  const sand = countAround(world, land, cell, [SAND]);
  if (sand < 6) return 0;
  return sand * 15 + world.temperature[cell] - 150 + 90 - world.moisture[cell];
}

export function glacier(world: FeatureWorld, _land: Land, cell: number): number {
  const b = world.biome[cell];
  if ((b !== PEAK && b !== MOUNTAIN) || world.temperature[cell] > 40) return 0;
  return (40 - world.temperature[cell]) * 4 + floorDiv(world.elevation[cell], 10) + 1;
}

export function crystalCave(world: FeatureWorld, land: Land, cell: number): number {
  const b = world.biome[cell];
  if ((b !== HILLS && b !== MOUNTAIN) || world.river[cell] !== 0 || land.slope[cell] < 60) return 0;
  return land.slope[cell] + ((draw2(world.seed, WONDER, CAVE, cell) >>> 0) % 64);
}

export function hotSprings(world: FeatureWorld, land: Land, cell: number): number {
  const b = world.biome[cell];
  const hilly = b === HILLS || countAround(world, land, cell, [HILLS]) > 0;
  const barred = b === MOUNTAIN || b === PEAK || !hilly;
  if (!heated(world, land, cell) || land.water[cell] !== 0 || barred || land.wet[cell] > 2) return 0;
  return 100 - 30 * land.wet[cell] + floorDiv(land.slope[cell], 4);
}

export function geyser(world: FeatureWorld, land: Land, cell: number): number {
  const b = world.biome[cell];
  const barred = b === MOUNTAIN || b === PEAK || b === HILLS;
  if (!heated(world, land, cell) || land.water[cell] !== 0 || barred || land.slope[cell] > 40) return 0;
  return 100 - land.slope[cell];
}

export function calderaLake(world: FeatureWorld, land: Land, cell: number): number {
  const b = world.biome[cell];
  if (!heated(world, land, cell) || (b !== HILLS && b !== MOUNTAIN)) return 0;
  return floorDiv(world.elevation[cell], 4);
}

const RULES: Record<(typeof WONDER_NAMES)[number], SiteRule> = {
  waterfall,
  'giant-tree': giantTree,
  'sea-arch': seaArch,
  'stone-arch': stoneArch,
  'hot-springs': hotSprings,
  geyser,
  'crystal-cave': crystalCave,
  'caldera-lake': calderaLake,
  'canyon-view': canyonView,
  glacier,
  dune,
};

// By WONDER_NAMES index. Typing RULES by name is features.py's assert that every wonder has a rule.
export const SITES: readonly SiteRule[] = WONDER_NAMES.map((name) => RULES[name]);

const KINDS = WONDER_NAMES.map((_, kind) => kind);

// Land at least 2 steps from a settlement and 3 from the capital or a city, with room above for an icon.
function eligible(world: FeatureWorld, land: Land, cell: number): boolean {
  return land.water[cell] === 0 && land.town[cell] >= 2 && land.big[cell] >= 3 && framed(world, cell);
}

export function crowded(x: number, y: number, placed: readonly Spot[]): boolean {
  for (let k = 0; k < placed.length; k++) {
    if (dist2(x, y, placed[k].x, placed[k].y) < WONDER_GAP2) return true;
  }
  return false;
}

// Python compares (score, tie draw) tuples, so the second part decides only between equal scores.
function beats(score: number, tie: number, bestScore: number, bestTie: number): boolean {
  return score > bestScore || (score === bestScore && tie > bestTie);
}

// The cell where the kind's rule scores highest, or -1 when none qualifies. A strict comparison keeps the first of two
// equal keys, and every candidate scores above the empty start of 0.
function bestSite(world: FeatureWorld, land: Land, kind: number, placed: readonly Spot[]): number {
  const rule = SITES[kind];
  let best = -1;
  let bestScore = 0;
  let bestTie = 0;
  for (let i = 0; i < world.width * world.height; i++) {
    if (!eligible(world, land, i)) continue;
    const score = rule(world, land, i);
    if (score <= 0 || crowded(xOf(i, world.width), yOf(i, world.width), placed)) continue;
    const tie = draw3(world.seed, WONDER, TIE, kind, i);
    if (beats(score, tie, bestScore, bestTie)) {
      best = i;
      bestScore = score;
      bestTie = tie;
    }
  }
  return best;
}

// 4 to 8 kinds, tried in a keyed order; each takes its best site, if it has one.
export function wonders(world: FeatureWorld, land: Land): Spot[] {
  const { seed, width, height } = world;
  const landCells = width * height - sum(land.water);
  const wanted = Math.max(4, Math.min(8, 2 + floorDiv(landCells, 900) + below(3, seed, WONDER, COUNT)));
  const placed: Spot[] = [];
  for (const kind of shuffled(KINDS, seed, WONDER, ORDER)) {
    if (placed.length === wanted) break;
    const cell = bestSite(world, land, kind, placed);
    if (cell >= 0) placed.push({ kind, x: xOf(cell, width), y: yOf(cell, width) });
  }
  return placed;
}
