import { below, floorDiv } from '@nomos/sim-core/kernels';
import { PLACE_TILE_PX as TILE } from '@nomos/sim-protocol/place';
import { CROWD } from '../random/streams.ts';
import { herd } from './animals.ts';
import { bare } from './decor.ts';
import { COUNT, POSE, VISTA } from './keys.ts';
import { plant } from './nature.ts';
import { populate } from './people.ts';
import { INWARD, pave, roadEntry, route, straight } from './roads.ts';
import { frame, OPEN, rise, type Cell, type Rect, type Site } from './site.ts';
import { carveBand, layRidges, layWater, riverPoints, tidyWater, type River } from './terrain.ts';

type Box = readonly [x0: number, y0: number, x1: number, y1: number];

// Where a vista's wonder stands, the water round it and the view its visitors gather in.
interface Plan {
  tx: number;
  bottom: number;
  facing: string;
  sea: string;
  cliffs: boolean;
  depth: number;
  rivers: River[];
  view: Box;
}

export const VISTA_SIZE: readonly [number, number] = [30, 18];
const WONDER_FRAMES: Readonly<Record<string, string>> = {
  waterfall: 'wonder_waterfall_0',
  'sea-arch': 'wonder_sea-arch_0',
  geyser: 'wonder_geyser_2',
  'hot-springs': 'wonder_hot-springs_0',
  'crystal-cave': 'wonder_crystal-cave_1',
};
const VISITORS: readonly [lo: number, hi: number] = [4, 8];
const VISITOR_EMOTES = ['heart', 'heart', 'question', 'food'];
const GLANCES = ['left', 'right', 'down', 'down'];
const ROCKY = ['hills', 'mountain', 'peak'];
const BOULDER_KINDS = ['geyser', 'hot-springs', 'caldera-lake', 'stone-arch'];

// Shapes the land the wonder needs, sets it where it shows best and gathers visitors in front.
export function buildVista(site: Site): void {
  const kind = site.ctx.wonder ?? '';
  const name = WONDER_FRAMES[kind] ?? `wonder_${kind}`;
  const f = frame('wonders', name);
  const fw = f.footprintW;
  const fh = f.footprintH;
  const up = rise(f);
  const cx = floorDiv(site.w, 2) + site.below(5, VISTA, 0) - 2;
  const plan = planVista(site, kind, cx, fw, fh, up);
  shapeVista(site, kind, plan, fh, up, cx, fw);
  const ty = plan.bottom - fh + 1;
  if (kind === 'sea-arch') openArch(site, plan.tx, ty, fw, plan.bottom);
  if (kind === 'dune') oasis(site, cx + (site.chance(500, VISTA, 2) ? 6 : -9), plan.bottom + 3);
  site.build('wonders', name, plan.tx, ty);
  site.cx = plan.tx + floorDiv(fw, 2);
  site.cy = plan.bottom;
  const box = viewCells(site, plan.view);
  trail(site, box);
  furnish(site, kind, box, plan.facing, [plan.tx, ty, fw, fh]);
  for (const [x, y] of box) site.keep[site.at(x, y)] = 1;
  if (kind === 'giant-tree') glade(site, plan.tx + floorDiv(fw, 2), plan.bottom + 2);
  plant(site);
  herd(site);
  visitors(site, box, plan.facing);
}

function planVista(site: Site, kind: string, cx: number, fw: number, fh: number, up: number): Plan {
  const plan: Plan = {
    tx: cx - floorDiv(fw, 2),
    bottom: 9,
    facing: 'up',
    sea: site.ctx.sea,
    cliffs: site.ctx.coast === 'cliffs',
    depth: 3,
    rivers: [],
    view: [cx - 5, 11, cx + 5, 14],
  };
  if (kind === 'waterfall' || kind === 'glacier') planFalls(site, plan, kind, cx, fw, fh, up);
  else if (kind === 'crystal-cave') {
    carveBand(site, 5, 1, 'cliff_foot', plan.tx - 4, plan.tx + fw + 3);
    plan.bottom = 7;
    plan.view = [cx - 5, 9, cx + 5, 12];
  } else if (kind === 'sea-arch') planSeaArch(site, plan, cx);
  else if (site.ctx.river) plan.rivers = riverPoints(site, [...'nesw'].filter((s) => site.ctx.river.includes(s)));
  return plan;
}

// A cliff across the view with the falls pouring from it, and the river that leaves their pool.
function planFalls(site: Site, plan: Plan, kind: string, cx: number, fw: number, fh: number, up: number): void {
  const top = kind === 'waterfall' ? 3 : 2;
  carveBand(site, top, 2, 'cliff_foot', 0, site.w - 1);
  plan.bottom = top + up + fh - 1;
  const pool = plan.tx + floorDiv(fw, 2) - 1;
  const out = [...'swe'].find((s) => site.ctx.river.includes(s)) ?? 's';
  plan.rivers.push([[pool, plan.bottom + 1], mouthOf(site, out, pool, plan.bottom)]);
  if (site.ctx.river.includes('n')) {
    for (let y = 0; y < top; y++) {
      site.kind[site.at(pool, y)] = 'water';
      site.kind[site.at(pool + 1, y)] = 'water';
    }
  }
  plan.view = [cx - 6, plan.bottom + 1, cx + 6, plan.bottom + 5];
}

function mouthOf(site: Site, out: string, pool: number, bottom: number): Cell {
  if (out === 'e') return [site.w - 1, bottom + 4];
  if (out === 'w') return [0, bottom + 4];
  return [pool + site.below(7, VISTA, 1) - 3, site.h - 1];
}

function planSeaArch(site: Site, plan: Plan, cx: number): void {
  const { w, h } = site;
  plan.sea = plan.sea || 's';
  const side = [...'snew'].find((s) => plan.sea.includes(s));
  plan.cliffs = false;
  if (side === 's') {
    plan.depth = 6;
    plan.cliffs = site.ctx.coast !== 'beach';
    plan.bottom = h - 4;
    plan.facing = 'down';
    plan.view = [cx - 6, 5, cx + 6, h - plan.depth - 4];
  } else if (side === 'n') {
    plan.depth = 7;
    plan.bottom = 4;
    plan.view = [cx - 6, 10, cx + 6, 13];
  } else {
    const east = side === 'e';
    plan.depth = 10;
    plan.bottom = floorDiv(h, 2) + 1;
    plan.tx = east ? w - 8 : 3;
    plan.facing = east ? 'right' : 'left';
    plan.view = east ? [w - 19, plan.bottom - 4, w - 14, plan.bottom + 2] : [13, plan.bottom - 4, 18, plan.bottom + 2];
  }
}

function shapeVista(site: Site, kind: string, plan: Plan, fh: number, up: number, cx: number, fw: number): void {
  const keepOut: Box = [plan.tx - 2, plan.bottom - fh - up - 1, plan.tx + fw + 1, plan.view[3] + 1];
  const spare = (x: number, y: number): boolean => within(keepOut, x, y);
  const falls = kind === 'waterfall' || kind === 'glacier';
  const dry = falls ? (_x: number, y: number): boolean => y <= plan.bottom : null;
  layWater(site, plan.sea, plan.cliffs, plan.depth, plan.rivers, spare, dry);
  const biome = site.ctx.biome;
  if (ROCKY.includes(biome)) layRidges(site, biome === 'hills' || falls ? 1 : 2, spare);
  if (falls) pave(site, straight(site, [cx - 5, plan.bottom + 3], [cx + 5, plan.bottom + 3]));
}

function within([x0, y0, x1, y1]: Box, x: number, y: number): boolean {
  return x0 <= x && x <= x1 && y0 <= y && y <= y1;
}

// The sea runs in under the arch, with rocks offshore beside it.
function openArch(site: Site, tx: number, ty: number, fw: number, bottom: number): void {
  for (let y = ty - 1; y < bottom + 2; y++) {
    for (let x = tx - 1; x < tx + fw + 1; x++) {
      if (!site.inside(x, y) || !OPEN.includes(site.kind[site.at(x, y)])) continue;
      site.kind[site.at(x, y)] = 'water';
      site.sea[site.at(x, y)] = 1;
    }
  }
  tidyWater(site);
  [tx - 2, tx + fw + 1, tx + fw + 4].forEach((x, k) => {
    const y = ty + 1 + site.below(2, VISTA, 3, k);
    if (site.water(x, y) && site.water(x + 1, y)) site.prop('scenery', 'prop_beach-rocks', x, y);
  });
}

function viewCells(site: Site, [x0, y0, x1, y1]: Box): Cell[] {
  const box: Cell[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (site.inside(x, y) && site.standable(x, y)) box.push([x, y]);
    }
  }
  return box;
}

// A pool with a grass bank in a grove of palms, the shade a desert view needs.
export function oasis(site: Site, x0: number, y0: number): void {
  fill(site, x0 - 1, y0 - 1, x0 + 4, y0 + 3, 'grass');
  fill(site, x0, y0, x0 + 3, y0 + 2, 'water');
  tidyWater(site);
  const grove: Cell[] = [
    [x0 - 2, y0],
    [x0 + 4, y0 + 1],
    [x0 + 1, y0 - 2],
    [x0 + 3, y0 + 3],
    [x0 - 2, y0 + 2],
    [x0 + 4, y0 - 1],
    [x0 - 1, y0 - 2],
    [x0 + 3, y0 - 2],
  ];
  for (const [x, y] of grove) {
    if (bare(site, x, y)) site.tree('scenery', 'tree_palm', x, y);
  }
}

function fill(site: Site, x0: number, y0: number, x1: number, y1: number, kind: string): void {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (site.inside(x, y)) site.kind[site.at(x, y)] = kind;
    }
  }
}

// Keeps a sunny clearing of wildflowers in front of the giant tree.
export function glade(site: Site, x0: number, y0: number): void {
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) {
      const c = site.at(x, y);
      const dx = x - x0;
      const dy = y - y0;
      if (dx * dx * 25 + dy * dy * 64 > 1600 || !OPEN.includes(site.kind[c]) || site.solid[c] !== null) continue;
      if (!site.road[c]) site.kind[c] = 'meadow';
      site.keep[c] = 1;
    }
  }
}

// A footpath from the edge of the view to the visitors' spot.
export function trail(site: Site, box: readonly Cell[]): void {
  const goal = new Set(box.map(([x, y]) => site.at(x, y)));
  const sides = [...[...'nesw'].filter((s) => site.ctx.roads.includes(s)), 's', 'w', 'e', 'n'];
  for (let i = 0; i < sides.length; i++) {
    const side = sides[i];
    if (site.ctx.sea.includes(side)) continue;
    const start = roadEntry(site, side, 90 + i);
    const path = start && route(site, start, INWARD[side], (x, y) => goal.has(site.at(x, y)));
    if (!start || !path) continue;
    pave(site, path);
    site.entries.push({ side, x: start[0], y: start[1] });
    return;
  }
}

// The props of a viewpoint: a rail at the edge, a viewer, a picnic table and benches.
export function furnish(site: Site, kind: string, box: readonly Cell[], facing: string, rect: Rect): void {
  if (box.length === 0) return;
  if (kind === 'sea-arch' && facing === 'down') railRim(site, box);
  const [tx, ty, fw, fh] = rect;
  if (kind === 'canyon-view') {
    for (let x = tx + 1; x < tx + fw - 1; x++) {
      if (site.free(x, ty + fh)) site.prop('scenery', 'prop_viewpoint-rail', x, ty + fh);
    }
  }
  if (kind === 'crystal-cave' && site.kind[site.at(tx - 2, ty)] === 'cliff_face') {
    site.put('scenery', 'prop_stone-steps', (tx - 2) * TILE + floorDiv(TILE, 2), (ty + 1) * TILE, true);
  }
  if (BOULDER_KINDS.includes(kind)) boulders(site, rect);
  viewpoint(site, box, facing);
}

// A rail along the cliff top below the lowest row of the view, between its ends.
function railRim(site: Site, box: readonly Cell[]): void {
  const rim = Math.max(...box.map(([, y]) => y)) + 1;
  const xs = box.filter(([, y]) => y === rim - 1).map(([x]) => x);
  for (let x = Math.min(...xs) + 1; x < Math.max(...xs); x++) {
    const c = site.at(x, rim);
    if (site.kind[c] === 'cliff_top' && site.solid[c] === null) site.prop('scenery', 'prop_viewpoint-rail', x, rim);
  }
}

function boulders(site: Site, [tx, ty, fw, fh]: Rect): void {
  for (let y = ty - 1; y < ty + fh + 1; y++) {
    for (const x of [tx - 2, tx - 1, tx + fw, tx + fw + 1]) {
      if (bare(site, x, y) && site.chance(400, VISTA, 20, x, y)) site.prop('nature', 'rock_boulder', x, y);
    }
  }
}

// How far a cell lies from the wonder along the way the view faces, nearest first.
function nearness(facing: string, [x, y]: Cell): number {
  if (facing === 'up') return y;
  if (facing === 'down') return -y;
  return facing === 'left' ? x : -x;
}

// A viewer at the front, a picnic table and benches at the back, and flowers anywhere in the view.
function viewpoint(site: Site, box: readonly Cell[], facing: string): void {
  const cells = box.filter(([x, y]) => bare(site, x, y));
  const ordered = cells.sort(
    (a, b) => nearness(facing, a) - nearness(facing, b) || a[0] - b[0] || a[1] - b[1],
  );
  const front = ordered.slice(0, floorDiv(ordered.length, 3));
  const back = ordered.slice(floorDiv(ordered.length, 2));
  const decor = site.desert() ? ['scenery', 'prop_reeds'] : ['nature', 'prop_flower-patch'];
  const pieces: readonly (readonly [string, string, readonly Cell[], boolean])[] = [
    ['scenery', 'prop_viewer', front, false],
    ['scenery', 'prop_picnic-table', back, true],
    ['nature', 'prop_bench', back, false],
    ['nature', 'prop_bench', back, false],
    [decor[0], decor[1], ordered, false],
    [decor[0], decor[1], ordered, false],
  ];
  pieces.forEach(([category, name, pool, wide], k) => {
    const room = pool.filter(([x, y]) => roomFor(site, x, y, wide));
    if (room.length === 0) return;
    const [x, y] = room[site.below(room.length, VISTA, 10, k)];
    site.prop(category, name, x, y, wide);
  });
}

// Bare ground for the piece, one tile or two, with nothing standing around it.
function roomFor(site: Site, x: number, y: number, wide: boolean): boolean {
  if (!bare(site, x, y) || (wide && !bare(site, x + 1, y))) return false;
  for (let dx = -1; dx <= 2; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (site.inside(x + dx, y + dy) && site.solid[site.at(x + dx, y + dy)] !== null) return false;
    }
  }
  return true;
}

// Visitors in the view, and on up to four road tiles beyond it, mostly facing the wonder.
function visitors(site: Site, box: readonly Cell[], facing: string): void {
  const seed = site.ctx.seed;
  const [lo, hi] = VISITORS;
  const count = lo + below(hi - lo + 1, seed, CROWD, COUNT);
  const spots = box.filter(([x, y]) => site.standable(x, y));
  const inView = new Set(spots.map(([x, y]) => site.at(x, y)));
  const roads: Cell[] = [];
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) {
      const c = site.at(x, y);
      if (site.road[c] && site.standable(x, y) && !inView.has(c)) roads.push([x, y]);
    }
  }
  const toward = (i: number): string => {
    const r = below(10, seed, CROWD, POSE, i, 6);
    return r < 6 ? facing : GLANCES[r - 6];
  };
  populate(site, count, [], [...spots, ...roads.slice(0, 4)], toward, VISITOR_EMOTES);
}
