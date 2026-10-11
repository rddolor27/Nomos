import { floorDiv } from '@nomos/sim-core/kernels';
import type { Style } from './context.ts';
import { gridKnobs, TIGHT, type GridKnobs } from './grid.ts';
import { PLAN } from './keys.ts';
import { ringKnobs, type RingKnobs } from './rings.ts';
import type { Site } from './site.ts';
import { Wall } from './walls.ts';

type Pair = readonly [number, number];

// The ring line of a town: its half-sizes round the plaza's centre, how far its own centre lies off the plaza's, and
// the tiles each corner is cut by.
export interface Line {
  readonly hx: number;
  readonly hy: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly cuts: number;
}

// What a capital, city or town is dealt (M3.1 Part 4): its style, its ring line and the knobs of its streets. Every
// number is a PLAN draw that reads only the seed and the tier, so a layout never follows who lives there (content
// rule 8). A winding town lays Part 3's grid until its lanes come.
export interface Plan {
  readonly style: Style;
  readonly line: Line;
  readonly rings: RingKnobs | null;
  readonly grid: GridKnobs | null;
}

export const STYLES: readonly Style[] = ['rings', 'winding', 'grid'];
// The draws out of four that deal each style, in STYLES order, by tier.
export const WEIGHTS: Readonly<Record<string, readonly number[]>> = {
  capital: [2, 1, 1],
  city: [2, 1, 1],
  town: [1, 2, 1],
};
// The ring line's half-sizes. A ring town's is rounder than Part 3's, which winding towns and grids keep, and each
// holds up to a tenth more than Part 3's area (129 × 81 and 113 × 61): at Part 3's own, Task 27's houses left the median
// capital or city at 374 inside the wall and the median ring town at 216, over the first 6 standard worlds.
const ROUND: Readonly<Record<string, Pair>> = { capital: [63, 46], city: [63, 46], town: [54, 36] };
const BOXED: Readonly<Record<string, Pair>> = { capital: [67, 42], city: [67, 42], town: [58, 31] };
// Tiles the ring line keeps from the place's edge, for the farm belt.
const BELT_MIN = 6;
// Tiles a cut corner leaves between a gate's road and the end of the straight edge.
const GATE_MARGIN = 3;

// Keys of the PLAN draws; rings.ts takes 10 and up and grid.ts 20 and up.
const DEAL = 0;
const OFFSET_X = 1;
const OFFSET_Y = 2;
const CUT = 3;
const CUT_ON = 4;

// The style a town is dealt, unless its context pins one.
export function styleOf(site: Site): Style {
  const { style, tier } = site.ctx;
  if (style !== undefined) return style;
  const weights = WEIGHTS[tier ?? ''];
  if (weights === undefined) throw new Error(`a ${tier} has no street plan`);
  let draw = site.below(
    weights.reduce((total, weight) => total + weight, 0),
    PLAN,
    DEAL,
  );
  for (let i = 0; i < STYLES.length; i++) {
    if (draw < weights[i]) return STYLES[i];
    draw -= weights[i];
  }
  throw new Error(`no style for a ${tier}`);
}

export function planOf(site: Site): Plan {
  const style = styleOf(site);
  const rings = style === 'rings' ? ringKnobs(site) : null;
  return { style, line: lineOf(site, style), rings, grid: gridOf(site, style) };
}

function gridOf(site: Site, style: Style): GridKnobs | null {
  if (style === 'grid') return gridKnobs(site);
  return style === 'winding' ? TIGHT : null;
}

function lineOf(site: Site, style: Style): Line {
  const tier = site.ctx.tier ?? '';
  if (style === 'rings') {
    const [hx, hy] = ROUND[tier];
    return { hx, hy, offsetX: 0, offsetY: 0, cuts: floorDiv(Math.min(hx, hy), 2) };
  }
  const [hx, hy] = BOXED[tier];
  if (style === 'grid') return { hx, hy, offsetX: 0, offsetY: 0, cuts: gridCuts(site) };
  return {
    hx,
    hy,
    offsetX: site.below(9, PLAN, OFFSET_X) - 4,
    offsetY: site.below(9, PLAN, OFFSET_Y) - 4,
    cuts: 6 + site.below(11, PLAN, CUT),
  };
}

// A grid is a plain rectangle half the time, and otherwise has its corners cut by 4 to 8 tiles.
function gridCuts(site: Site): number {
  return site.below(2, PLAN, CUT_ON) === 0 ? 0 : 4 + site.below(5, PLAN, CUT);
}

// The ring line of a plan round the plaza's centre, each edge kept BELT_MIN tiles inside the place. The corners are cut
// no deeper than leaves the straight edges room for the gates of the main roads.
export function ringOf(site: Site, plan: Plan): Wall {
  const { hx, hy, offsetX, offsetY, cuts } = plan.line;
  const cx = site.cx + offsetX;
  const cy = site.cy + offsetY;
  const x0 = Math.max(BELT_MIN, cx - hx);
  const y0 = Math.max(BELT_MIN, cy - hy);
  const x1 = Math.min(site.w - 1 - BELT_MIN, cx + hx);
  const y1 = Math.min(site.h - 1 - BELT_MIN, cy + hy);
  const room = Math.min(site.cx - x0, x1 - site.cx - 1, site.cy - y0, y1 - site.cy - 1) - GATE_MARGIN;
  const tier = site.ctx.tier ?? '';
  const material = tier === 'capital' || tier === 'city' ? 'stone' : 'palisade';
  return new Wall(x0, y0, x1, y1, Math.max(0, Math.min(cuts, room)), material);
}
