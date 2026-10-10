import { floorDiv } from '@nomos/sim-core/kernels';
import { DECOR, FIELD } from './keys.ts';
import { onPlaza } from './settlement.ts';
import type { Cell, Rect, Site } from './site.ts';

const CROPS = [
  'crop_grain_seedling',
  'crop_grain_growing',
  'crop_grain_ripe',
  'crop_grain_stubble',
  'crop_veg_seedling',
  'crop_veg_growing',
  'crop_veg_ripe',
  'soil',
];
const CLUTTER: Readonly<Record<string, readonly string[]>> = {
  shop_general: ['prop_barrel', 'prop_crate'],
  shop_warehouse: ['prop_crate', 'prop_barrel', 'prop_crate'],
  work_dock: ['prop_barrel', 'prop_crate'],
  'shop_market-stall': ['prop_crate'],
  work_farm: ['prop_hay-bale', 'prop_hay-bale'],
  work_pasture: ['prop_hay-bale'],
  work_workshop: ['prop_barrel', 'prop_crate'],
  'work_fuel-works': ['prop_barrel'],
  'work_lumber-camp': ['tree_log', 'tree_deciduous_stump'],
  work_quarry: ['rock_boulder'],
  work_mine: ['rock_ore', 'rock_coal'],
};
const LAMP_STEPS: readonly Cell[] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];
const SIGN_STEPS: readonly Cell[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// Free ground no tree crown hangs over.
export function bare(site: Site, x: number, y: number): boolean {
  return site.free(x, y) && !site.crown[site.at(x, y)];
}

// Python's string order, which is code-point order, for the ASCII names here.
export function compareText(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

// Fenced fields of one crop each, and pastures, on open ground away from the centre, drawn to the sides where the
// country map shows farmland.
export function placeFields(site: Site, count: number, pasture: boolean): void {
  for (let i = 0; i < count + (pasture ? 1 : 0); i++) {
    const isPasture = pasture && i === count;
    const fw = 3 + site.below(4, FIELD, i, 0);
    const fh = 2 + site.below(2, FIELD, i, 1);
    const best = bestField(site, i, fw, fh);
    if (best === null) continue;
    const [tx, ty] = best;
    const crop = isPasture ? 'crop_pasture' : site.pick(CROPS, FIELD, i, 2);
    for (let y = ty; y < ty + fh; y++) {
      for (let x = tx; x < tx + fw; x++) {
        site.kind[site.at(x, y)] = crop;
        site.keep[site.at(x, y)] = 1;
      }
    }
    fence(site, tx - 1, ty - 1, tx + fw, ty + fh, tx + site.below(fw, FIELD, i, 3));
    (isPasture ? site.pastures : site.fields).push([tx, ty, fw, fh]);
  }
}

function bestField(site: Site, i: number, fw: number, fh: number): Cell | null {
  const open = bareTiles(site);
  let best: [cost: number, tx: number, ty: number] | null = null;
  for (let ty = 1; ty < site.h - fh; ty++) {
    for (let tx = 1; tx < site.w - fw; tx++) {
      const gap = Math.abs(tx + floorDiv(fw, 2) - site.cx) + Math.abs(ty + floorDiv(fh, 2) - site.cy);
      if (gap < 7 || !ringBare(site, open, tx, ty, fw, fh)) continue;
      const cost = gap * 3 - fieldPull(site, tx, ty, fw, fh) + site.below(10, FIELD, i, tx, ty);
      if (best === null || cost < best[0]) best = [cost, tx, ty];
    }
  }
  return best === null ? null : [best[1], best[2]];
}

// bare() of every tile, worked out once a search, which asks of each tile up to 40 times. Budget: a capital or city
// builds within twice Task 9's median (M3.1's plan, Part 3), and asking tile by tile cost about 40 ms of it.
function bareTiles(site: Site): Uint8Array {
  const open = new Uint8Array(site.w * site.h);
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) open[site.at(x, y)] = bare(site, x, y) ? 1 : 0;
  }
  return open;
}

// The field and the ring its fence stands on are all bare ground.
function ringBare(site: Site, open: Uint8Array, tx: number, ty: number, fw: number, fh: number): boolean {
  for (let y = ty - 1; y < ty + fh + 1; y++) {
    for (let x = tx - 1; x < tx + fw + 1; x++) {
      if (!open[site.at(x, y)]) return false;
    }
  }
  return true;
}

// What draws a field: a road beside it, and the side of the place that faces farmland.
function fieldPull(site: Site, tx: number, ty: number, fw: number, fh: number): number {
  const side = toward(tx + floorDiv(fw, 2) - site.cx, ty + floorDiv(fh, 2) - site.cy);
  return (roadside(site, tx, ty, fw, fh) ? 12 : 0) + (site.ctx.farmland.includes(side) ? 30 : 0);
}

function roadside(site: Site, tx: number, ty: number, fw: number, fh: number): boolean {
  for (let x = tx - 2; x < tx + fw + 2; x++) {
    for (const y of [ty - 2, ty + fh + 1]) {
      if (site.inside(x, y) && site.road[site.at(x, y)]) return true;
    }
  }
  return false;
}

export function toward(dx: number, dy: number): string {
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'e' : 'w';
  return dy > 0 ? 's' : 'n';
}

export function fence(site: Site, x0: number, y0: number, x1: number, y1: number, gate: number): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (y === y1 && x === gate && x !== x0 && x !== x1) {
        site.keep[site.at(x, y)] = 1;
        continue;
      }
      const name = fencePiece(x, y, x0, y0, x1, y1);
      if (name !== null) site.prop('nature', name, x, y);
    }
  }
}

function fencePiece(x: number, y: number, x0: number, y0: number, x1: number, y1: number): string | null {
  if (y !== y0 && y !== y1) return x === x0 || x === x1 ? 'prop_fence_vertical' : null;
  const end = y === y0 ? 'top' : 'bottom';
  if (x === x0) return `prop_fence_corner_${end}-left`;
  if (x === x1) return `prop_fence_corner_${end}-right`;
  return 'prop_fence_horizontal';
}

// Lamp posts, benches, signposts and the clutter of trade beside the buildings.
export function decorate(site: Site): void {
  const town = site.plaza !== null;
  if (site.plaza !== null) decoratePlaza(site, site.plaza);
  else if (site.green.length > 0) decorateGreen(site);
  lampRoads(site, town);
  for (const entry of site.entries) {
    const spot = SIGN_STEPS.find(([dx, dy]) => bare(site, entry.x + dx, entry.y + dy));
    if (spot) site.prop('nature', 'prop_signpost', entry.x + spot[0], entry.y + spot[1]);
  }
  for (const name of [...site.places.keys()].sort(compareText)) {
    for (const rect of site.places.get(name) ?? []) clutter(site, CLUTTER[name] ?? [], rect);
  }
  site.fields.forEach(([tx, ty, fw, fh], i) => {
    const x = tx + fw + 1;
    const y = ty + fh;
    if (!bare(site, x, y) || !bare(site, x + 1, y)) return;
    if (site.chance(500, DECOR, 5, i)) site.prop('nature', 'prop_cart_grain_left', x, y, true);
    else site.prop('nature', 'prop_hay-bale', x, y);
  });
}

function decoratePlaza(site: Site, [px, py, pw, ph]: Rect): void {
  const corners: Cell[] = [
    [px, py + ph - 1],
    [px + pw - 1, py + ph - 1],
    [px, py],
    [px + pw - 1, py],
  ];
  for (const [x, y] of corners) {
    if (site.solid[site.at(x, y)] === null && !site.shade[site.at(x, y)]) site.prop('nature', 'prop_lamp-post', x, y);
  }
  plazaBenches(site, px, py, pw, ph);
}

function plazaBenches(site: Site, px: number, py: number, pw: number, ph: number): void {
  const spots: Cell[] = [];
  for (let y = py + 1; y < py + ph; y++) {
    for (let x = px + 1; x < px + pw - 1; x++) {
      if (onPlaza(site, x, y) && !crowded(site, x, y)) spots.push([x, y]);
    }
  }
  const benches = Math.min(spots.length, 2 + site.below(2, DECOR, 1));
  for (let i = 0; i < benches; i++) {
    const [x, y] = spots[site.below(spots.length, DECOR, 2, i)];
    if (!crowded(site, x, y)) site.prop('nature', 'prop_bench', x, y);
  }
}

// Something stands on the tile or next to it.
function crowded(site: Site, x: number, y: number): boolean {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (site.solid[site.at(x + dx, y + dy)] !== null) return true;
    }
  }
  return false;
}

function decorateGreen(site: Site): void {
  const spots = site.green.filter(
    ([x, y]) => site.solid[site.at(x, y)] === null && Math.abs(x - site.cx) + Math.abs(y - site.cy) > 1,
  );
  for (let i = 0; i < Math.min(spots.length, 2); i++) {
    const [x, y] = spots[site.below(spots.length, DECOR, 3, i)];
    if (site.solid[site.at(x, y)] === null) site.prop('nature', i === 0 ? 'prop_bench' : 'prop_flower-patch', x, y);
  }
}

// Lamps, or in a village flowers, beside about a third of the dirt-path tiles, spaced apart.
function lampRoads(site: Site, town: boolean): void {
  const lamps: Cell[] = [];
  const spacing = town ? 7 : 6;
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) {
      const c = site.at(x, y);
      if (!site.road[c] || site.kind[c] !== 'path' || !site.chance(300, DECOR, x, y)) continue;
      if (lamps.some(([lx, ly]) => Math.abs(x - lx) + Math.abs(y - ly) < spacing)) continue;
      const step = LAMP_STEPS.find(([dx, dy]) => bare(site, x + dx, y + dy));
      if (!step) continue;
      site.prop('nature', town ? 'prop_lamp-post' : 'prop_flower-patch', x + step[0], y + step[1]);
      lamps.push([x + step[0], y + step[1]]);
    }
  }
}

// A building's clutter, each piece on the first bare tile of the ring beside its front, starting one further round.
function clutter(site: Site, props: readonly string[], [tx, ty, fw, fh]: readonly number[]): void {
  const ring: Cell[] = [
    [tx - 1, ty + fh - 1],
    [tx + fw, ty + fh - 1],
    [tx - 1, ty + fh],
    [tx + fw, ty + fh],
  ];
  props.forEach((name, k) => {
    const spot = [...ring.slice(k), ...ring.slice(0, k)].find(([x, y]) => bare(site, x, y));
    if (spot) site.prop('nature', name, spot[0], spot[1]);
  });
}
