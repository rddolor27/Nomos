import { floorDiv } from '@nomos/sim-core/kernels';
import { PLACE_TILE_PX as TILE } from '@nomos/sim-protocol/place';
import { bare } from './decor.ts';
import { AVENUE, SCATTER, TREE } from './keys.ts';
import { DIRS, OPEN, threshold, type Cell, type Site } from './site.ts';

interface Weighted {
  category: string;
  name: string;
  weight: number;
}

const DENSITY: Readonly<Record<string, number>> = {
  'forest-deciduous': 650,
  'forest-conifer': 650,
  peak: 260,
  mountain: 220,
  hills: 170,
  marsh: 110,
  farmland: 90,
};
const SCATTER_RATE: Readonly<Record<string, number>> = { peak: 260, mountain: 200, hills: 150 };
const ROCKY = ['hills', 'mountain', 'peak'];
const LILY_PADS = ['prop_lily-pads_0', 'prop_lily-pads_1'];

function weighted(category: string, name: string, weight: number): Weighted {
  return { category, name, weight };
}

// Weighted tree sprites for the climate: conifers when cold or high, palms when hot or coastal.
export function treeMix(site: Site): Weighted[] {
  const { temperature: t, biome } = site.ctx;
  if (biome === 'peak' || biome === 'mountain' || t < 70) return [weighted('nature', 'tree_conifer', 10)];
  if (site.desert() || t > 200) return [weighted('scenery', 'tree_palm', 10)];
  return [
    ...coolTrees(biome, t),
    weighted('nature', 'tree_deciduous_mature', 8),
    weighted('nature', 'tree_deciduous_young', 3),
    ...warmTrees(site),
  ];
}

function coolTrees(biome: string, t: number): Weighted[] {
  const mix: Weighted[] = [];
  if (biome === 'forest-conifer' || t < 110) {
    mix.push(weighted('nature', 'tree_conifer', biome === 'forest-conifer' ? 8 : 4));
  }
  if (t < 130) mix.push(weighted('scenery', 'tree_autumn', 3));
  return mix;
}

function warmTrees(site: Site): Weighted[] {
  const { temperature: t, moisture: m } = site.ctx;
  const mix: Weighted[] = [];
  if (m >= 150 && 90 <= t && t <= 190) mix.push(weighted('scenery', 'tree_blossom', 3));
  if (site.ctx.sea && t > 150) mix.push(weighted('scenery', 'tree_palm', 2));
  return mix;
}

export function choose(site: Site, mix: readonly Weighted[], sub: number, ...key: number[]): Weighted {
  let r = site.below(
    mix.reduce((total, item) => total + item.weight, 0),
    sub,
    ...key,
  );
  for (const item of mix) {
    if (r < item.weight) return item;
    r -= item.weight;
  }
  return mix[mix.length - 1];
}

// Trees along each main road, 2 tiles off its middle on either side, at every fourth cell from the seventh out.
export function plantAvenues(site: Site, mains: readonly (readonly Cell[])[]): void {
  const mix = treeMix(site);
  for (const cells of mains) {
    const northSouth = cells.length > 0 && cells[0][0] === cells[cells.length - 1][0];
    const dx = northSouth ? 2 : 0;
    const dy = northSouth ? 0 : 2;
    for (let k = 6; k < cells.length; k += 4) {
      const [x, y] = cells[k];
      plantAvenueTree(site, mix, x - dx, y - dy);
      plantAvenueTree(site, mix, x + dx, y + dy);
    }
  }
}

function plantAvenueTree(site: Site, mix: readonly Weighted[], x: number, y: number): void {
  if (!bare(site, x, y)) return;
  const tree = choose(site, mix, AVENUE, x, y);
  site.tree(tree.category, tree.name, x, y);
}

// Tiles within reach of a road or a building, where only garden trees grow.
export function nearBuilt(site: Site, reach: number): Uint8Array {
  const near = new Uint8Array(site.w * site.h);
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) {
      const c = site.at(x, y);
      if (!((site.road[c] && !site.water(x, y)) || site.big[c])) continue;
      for (let cy = Math.max(0, y - reach); cy < Math.min(site.h, y + reach + 1); cy++) {
        for (let cx = Math.max(0, x - reach); cx < Math.min(site.w, x + reach + 1); cx++) near[site.at(cx, cy)] = 1;
      }
    }
  }
  return near;
}

interface Planting {
  density: number;
  mix: Weighted[];
  beach: Weighted[];
  noise: Int32Array;
  mid: number;
  built: Uint8Array;
  farms: Cell[];
}

// Trees on a jittered grid, clumped by noise, thick along the edges of the view and thin in town.
export function plant(site: Site): void {
  const ctx = site.ctx;
  let density = DENSITY[ctx.biome] ?? 130;
  if (!ctx.biome.startsWith('forest')) density = floorDiv(density * (ctx.moisture + 100), 250);
  if (site.desert()) density = 70;
  const noise = site.noiseGrid(TREE, 80);
  const planting: Planting = {
    density,
    mix: treeMix(site),
    beach: ctx.sea && ctx.temperature > 120 ? [weighted('scenery', 'tree_palm', 1)] : [],
    noise,
    mid: threshold(noise, 500),
    built: nearBuilt(site, 2),
    farms: farmsOf(site),
  };
  for (let by = 0; by < site.h; by += 2) {
    for (let bx = 0; bx < site.w; bx += 2) plantAt(site, bx, by, planting);
  }
  scatter(site);
}

// The middles of the fields, then the doors of farmhouses and farms, where fruit trees grow.
function farmsOf(site: Site): Cell[] {
  const farms: Cell[] = site.fields.map(([fx, fy, fw, fh]) => [fx + floorDiv(fw, 2), fy + floorDiv(fh, 2)]);
  for (const door of site.doors) {
    if (door.name.includes('farmhouse') || door.name === 'work_farm') farms.push([door.x, door.y]);
  }
  return farms;
}

// bare() holds only inside the place, so a tile it accepts is a tile of the grid.
function plantAt(site: Site, bx: number, by: number, planting: Planting): void {
  const x = bx + site.below(2, TREE, bx, by, 0);
  const y = by + site.below(2, TREE, bx, by, 1);
  if (!bare(site, x, y) || nearBig(site, x, y)) return;
  const sand = site.kind[site.at(x, y)] === 'sand' && !site.desert();
  if (sand && planting.beach.length === 0) return;
  if (!site.chance(treeOdds(site, x, y, sand, planting), TREE, bx, by, 2)) return;
  const nearFarm = planting.farms.some(([fx, fy]) => Math.abs(x - fx) + Math.abs(y - fy) < 6);
  if (nearFarm && site.chance(500, TREE, x, y, 3)) {
    site.tree('nature', 'tree_fruit', x, y);
    return;
  }
  const tree = choose(site, sand ? planting.beach : planting.mix, TREE, x, y, 4);
  site.tree(tree.category, tree.name, x, y);
}

// Per mille: denser where the noise clumps, thinner near roads and buildings, and thick on the outer two rings.
function treeOdds(site: Site, x: number, y: number, sand: boolean, planting: Planting): number {
  let p = floorDiv(planting.density * (planting.noise[site.at(x, y)] >= planting.mid ? 3 : 1), 2);
  if (planting.built[site.at(x, y)]) p = floorDiv(p, 3);
  if (Math.min(x, y, site.w - 1 - x, site.h - 1 - y) <= 1 && !sand && !site.desert()) p = Math.max(p, 650);
  return p;
}

// A footprint on the tile or next to it.
function nearBig(site: Site, x: number, y: number): boolean {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (site.inside(x + dx, y + dy) && site.big[site.at(x + dx, y + dy)]) return true;
    }
  }
  return false;
}

function scatterItems(site: Site, rocky: boolean): Weighted[] {
  const ctx = site.ctx;
  const items = site.desert()
    ? [
        weighted('scenery', 'prop_reeds', 4),
        weighted('scenery', 'prop_beach-rocks', 2),
        weighted('nature', 'rock_boulder', 1),
        weighted('nature', 'rock_outcrop', 1),
      ]
    : [
        weighted('nature', 'prop_bush', 3),
        weighted('nature', 'prop_flower-patch', 2 + floorDiv(ctx.moisture, 80)),
        weighted('nature', 'rock_boulder', rocky ? 8 : 1),
      ];
  if (rocky) items.push(weighted('nature', 'rock_outcrop', ctx.biome === 'peak' ? 6 : 3));
  return items;
}

// Bushes, flowers and rocks between the trees, then lily pads and reeds by fresh water.
export function scatter(site: Site): void {
  const items = scatterItems(site, ROCKY.includes(site.ctx.biome));
  const rate = site.desert() ? 140 : (SCATTER_RATE[site.ctx.biome] ?? 80);
  for (let by = 0; by < site.h; by += 3) {
    for (let bx = 0; bx < site.w; bx += 3) scatterAt(site, bx, by, items, rate);
  }
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) {
      if (site.water(x, y)) lilyPads(site, x, y);
      if (reedy(site, x, y) && site.chance(250, SCATTER, x, y, 8)) site.prop('scenery', 'prop_reeds', x, y);
    }
  }
}

function scatterAt(site: Site, bx: number, by: number, items: readonly Weighted[], rate: number): void {
  const x = bx + site.below(3, SCATTER, bx, by, 0);
  const y = by + site.below(3, SCATTER, bx, by, 1);
  if (!site.inside(x, y) || !bare(site, x, y) || !site.chance(rate, SCATTER, bx, by, 2)) return;
  if (DIRS.some(([dx, dy]) => site.inside(x + dx, y + dy) && site.solid[site.at(x + dx, y + dy)] !== null)) return;
  if (site.plaza && Math.abs(x - site.cx) + Math.abs(y - site.cy) < 6) return;
  const item = choose(site, items, SCATTER, x, y);
  if (item.name !== 'rock_outcrop') site.prop(item.category, item.name, x, y);
  else if (bare(site, x + 1, y)) site.prop(item.category, item.name, x, y, true);
}

// Lily pads on fresh water away from its banks, now and then.
function lilyPads(site: Site, x: number, y: number): void {
  const c = site.at(x, y);
  if (site.sea[c] || !site.wet4(x, y) || !site.chance(70, SCATTER, x, y, 5)) return;
  const land = DIRS.some(([dx, dy]) => site.inside(x + dx, y + dy) && !site.water(x + dx, y + dy));
  if (site.ctx.biome !== 'marsh' && !site.chance(400, SCATTER, x, y, 6)) return;
  if (land || site.road[c] || site.solid[c] !== null) return;
  const name = site.pick(LILY_PADS, SCATTER, x, y, 7);
  site.put('scenery', name, x * TILE + floorDiv(TILE, 2), y * TILE + 11, true);
}

// Open marsh ground beside water that nothing else uses.
function reedy(site: Site, x: number, y: number): boolean {
  const c = site.at(x, y);
  if (site.ctx.biome !== 'marsh' || !OPEN.includes(site.kind[c]) || !site.wet4(x, y)) return false;
  return !site.road[c] && site.solid[c] === null && !site.keep[c];
}
