import { floorDiv } from '@nomos/sim-core/kernels';
import { PLACE_TILE_PX as TILE } from '@nomos/sim-protocol/place';
import { layGrid } from './grid.ts';
import { LOT, MARK, WORK } from './keys.ts';
import { landmarkFrame } from './landmarks.ts';
import { planOf, ringOf, type Plan } from './plan.ts';
import { layRings } from './rings.ts';
import { centreSpot, pave, roadSides, straight } from './roads.ts';
import { frame, OPEN, rise, type Cell, type Lot, type Site } from './site.ts';
import type { Wall } from './walls.ts';

type Pair = readonly [number, number];

export const PLAZAS: Readonly<Record<string, Pair>> = { capital: [28, 8], city: [26, 8], town: [20, 6] };
const CAPITAL_CIVIC = [
  'civic_town-hall',
  'civic_courthouse',
  'civic_records-office',
  'civic_police-station',
  'civic_clinic',
  'civic_school',
  'shop_general',
  'shop_warehouse',
];
export const CIVIC: Readonly<Record<string, readonly string[]>> = {
  capital: CAPITAL_CIVIC,
  city: CAPITAL_CIVIC,
  town: ['civic_town-hall', 'civic_police-station', 'civic_clinic', 'civic_school', 'shop_general'],
};
const OUTSKIRTS: readonly Pair[] = [
  [-1, 0],
  [1, 0],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

export function plazaOf(site: Site): readonly [px: number, py: number, pw: number, ph: number] {
  if (site.plaza === null) throw new Error('a town stage ran before lay_town');
  return site.plaza;
}

// The plaza, the ring kept for the wall, the main roads out through it and the streets inside, as the town's plan lays
// them. Returns each main road's cells, from the plaza out.
export function layTown(site: Site): Cell[][] {
  const tier = site.ctx.tier ?? '';
  const [pw, ph] = PLAZAS[tier];
  const [px, py] = centreSpot(site, pw, ph, 4, 2, 3);
  site.plaza = [px, py, pw, ph];
  site.cx = px + floorDiv(pw, 2);
  site.cy = py + floorDiv(ph, 2);
  for (let y = py; y < py + ph; y++) {
    for (let x = px; x < px + pw; x++) {
      const c = site.at(x, y);
      site.kind[c] = 'paving';
      site.road[c] = 1;
      site.keep[c] = 1;
    }
  }
  const plan = planOf(site);
  const wall = ringOf(site, plan);
  site.plan = plan;
  site.wall = wall;
  const mains = laySpokes(site, wall);
  layStreets(site, wall, plan, mains);
  wall.reserve(site);
  return mains;
}

// A main road from the plaza's edge to each road side, along its middle column or row, that narrows to a country road
// from a tile inside the ring line to 2 tiles past it, as wide as the gate. Returns each one's main-road cells.
function laySpokes(site: Site, wall: Wall): Cell[][] {
  const [px, py, pw, ph] = plazaOf(site);
  const { cx, cy } = site;
  const ends: Readonly<Record<string, readonly [Cell, Cell]>> = {
    n: [[cx, py - 1], [cx, wall.y0 - 2]],
    e: [[px + pw, cy], [wall.x1 + 2, cy]],
    s: [[cx, py + ph], [cx, wall.y1 + 2]],
    w: [[px - 1, cy], [wall.x0 - 2, cy]],
  };
  return roadSides(site).map((side) => {
    const cells = straight(site, ...ends[side]);
    const k = cells.findIndex(([x, y]) => wall.inset(x, y) < 2);
    const main = k < 0 ? cells : cells.slice(0, k);
    pave(site, main, 'main');
    pave(site, cells.slice(main.length), 'country');
    return main;
  });
}

// The streets inside the ring: a ring town's rings and radials, or a grid, which a winding town lays until its lanes
// come.
function layStreets(site: Site, wall: Wall, plan: Plan, mains: readonly (readonly Cell[])[]): void {
  const plaza = plazaOf(site);
  if (plan.rings !== null) {
    layRings(site, wall, plaza, [plan.line.hx, plan.line.hy], plan.rings, sidesWithoutMain(site, mains));
  } else if (plan.grid !== null) {
    layGrid(site, wall, plaza, plan.grid);
  }
}

// The sides of 'nesw' that no main road leaves by: those with no road from the map, and those whose road came to
// nothing.
function sidesWithoutMain(site: Site, mains: readonly (readonly Cell[])[]): string[] {
  const sides = roadSides(site);
  return [...'nesw'].filter((side) => !sides.some((s, i) => s === side && mains[i].length > 0));
}

export function layVillage(site: Site): void {
  const hamlet = site.ctx.tier === 'hamlet';
  const gw = hamlet ? 3 : 7;
  const gh = hamlet ? 3 : 5;
  const [gx, gy] = centreSpot(site, gw, gh, 3, 2, 3);
  site.cx = gx + floorDiv(gw, 2);
  site.cy = gy + floorDiv(gh, 2);
  for (let y = gy; y < gy + gh; y++) {
    for (let x = gx; x < gx + gw; x++) layGreenTile(site, x, y, gx < x && x < gx + gw - 1 && gy < y && y < gy + gh - 1);
  }
  site.keep[site.at(site.cx, site.cy)] = 0;
  site.prop('nature', 'prop_well', site.cx, site.cy);
  site.green = [];
  for (let y = gy + 1; y < gy + gh - 1; y++) {
    for (let x = gx + 1; x < gx + gw - 1; x++) site.green.push([x, y]);
  }
}

// A green's inner tiles are meadow kept clear, and a path rings them.
function layGreenTile(site: Site, x: number, y: number, inner: boolean): void {
  const c = site.at(x, y);
  if (inner) {
    site.kind[c] = 'meadow';
    site.keep[c] = 1;
  } else {
    site.kind[c] = 'path';
    site.road[c] = 1;
  }
}

export function placeCivic(site: Site, names: readonly string[]): void {
  const [, py, , ph] = plazaOf(site);
  for (const name of names) {
    const f = frame('buildings', name);
    const fw = f.footprintW;
    let target: Cell = [site.cx, site.cy];
    if (name === 'civic_town-hall') target = [site.cx, py];
    else if (name === 'shop_warehouse') {
      target = [site.cx + floorDiv(site.w, 3) * (site.chance(500, LOT, 90) ? 1 : -1), site.cy + ph];
    }
    const salt = CAPITAL_CIVIC.indexOf(name);
    const lot = site.findLot(fw, f.footprintH, rise(f), [floorDiv(fw * TILE, 2)], target, { spur: 1, salt });
    if (lot) site.settle('buildings', name, lot);
  }
}

export function onPlaza(site: Site, x: number, y: number): boolean {
  const [px, py, pw, ph] = plazaOf(site);
  const c = site.at(x, y);
  return px <= x && x < px + pw && py < y && y < py + ph && site.solid[c] === null && !site.shade[c];
}

export function plazaPiece(site: Site, category: string, name: string, target: Cell, salt: number): Lot | null {
  const f = frame(category, name);
  const groundOk = (x: number, y: number): boolean => onPlaza(site, x, y);
  const lot = site.findLot(f.footprintW, f.footprintH, rise(f), [], target, { groundOk, salt });
  if (lot) site.build(category, name, lot.tx, lot.ty);
  return lot;
}

// The fountain in the middle of the plaza and the clock tower at one end. placeTrades sets the stalls between.
export function placePlaza(site: Site): void {
  const [px, py, pw, ph] = plazaOf(site);
  const marks = site.ctx.landmarks;
  const left = towerLeft(site);
  if (marks.includes('clock-tower')) {
    plazaPiece(site, 'landmarks', 'landmark_clock-tower', [left ? px + 1 : px + pw - 1, py + ph - 1], 1);
  }
  if (marks.includes('fountain')) plazaPiece(site, 'landmarks', landmarkFrame('fountain'), [site.cx, py + ph - 1], 2);
}

// Whether the clock tower stands at the plaza's left end, which puts the first stall at the right.
export function towerLeft(site: Site): boolean {
  return site.chance(500, MARK, 1);
}

export function placeVillageShop(site: Site): void {
  if (site.ctx.tier !== 'village') return;
  if (site.chance(500, LOT, 70)) {
    const f = frame('buildings', 'shop_general');
    const lot = site.findLot(4, 2, rise(f), [32], [site.cx, site.cy], { spur: 2, salt: 71 });
    if (lot) site.settle('buildings', 'shop_general', lot);
    return;
  }
  const f = frame('buildings', 'shop_market-stall');
  const stalls = 1 + site.below(2, LOT, 72);
  for (let i = 0; i < stalls; i++) {
    const lot = site.findLot(3, 2, rise(f), [24], [site.cx, site.cy], { spur: 1, salt: 73 + i });
    if (lot) site.settle('buildings', 'shop_market-stall', lot);
  }
}

// A keyed point between the centre and the edge of the place.
export function outskirts(site: Site, salt: number): Cell {
  const [dx, dy] = site.pick(OUTSKIRTS, WORK, salt);
  return [site.cx + floorDiv(dx * site.w, 3), site.cy + floorDiv(dy * site.h, 3)];
}

export function placeWorks(site: Site): void {
  const names = worksOf(site);
  names.forEach((name, i) => {
    const f = frame('buildings', name);
    const fw = f.footprintW;
    const fh = f.footprintH;
    const central = name === 'work_workshop' || name === 'work_fuel-works';
    const target = central ? ([site.cx, site.cy] as const) : outskirts(site, 10 + i);
    const lot =
      site.findLot(fw, fh, rise(f), [floorDiv(fw * TILE, 2)], target, { spur: 4, salt: 20 + i }) ??
      site.findLot(fw, fh, rise(f), [], target, { salt: 30 + i });
    if (lot) site.settle('buildings', name, lot);
  });
}

function worksOf(site: Site): string[] {
  const { biome, tier } = site.ctx;
  const names: string[] = [];
  if (biome === 'farmland' || biome === 'grassland') names.push(site.pick(['work_farm', 'work_pasture'], WORK, 1));
  if (biome.startsWith('forest')) names.push('work_lumber-camp');
  if (biome === 'hills' || biome === 'mountain' || biome === 'peak') {
    names.push(site.pick(['work_quarry', 'work_mine'], WORK, 2));
  }
  if (tier === 'town' || tier === 'city' || tier === 'capital') {
    names.push(site.pick(['work_workshop', 'work_fuel-works'], WORK, 3));
  }
  return names;
}

export function placeDock(site: Site): void {
  const up = rise(frame('buildings', 'work_dock'));
  let best: [cost: number, tx: number, ty: number] | null = null;
  for (let ty = 1; ty < site.h - 4; ty++) {
    for (let tx = 1; tx < site.w - 5; tx++) {
      if (!site.fits(tx, ty, 4, 2, up, (x, y) => dockGround(site, x, y, ty)) || !seaAhead(site, tx, ty)) continue;
      const cost = Math.abs(tx + 2 - site.cx) + site.below(6, WORK, 40, tx, ty);
      if (best === null || cost < best[0]) best = [cost, tx, ty];
    }
  }
  if (best === null) return;
  site.build('buildings', 'work_dock', best[1], best[2]);
  site.doors.push({ name: 'work_dock', x: best[1] - 1, y: best[2] + 1 });
}

// Sea in both rows below the dock's footprint.
function seaAhead(site: Site, tx: number, ty: number): boolean {
  for (const dy of [2, 3]) {
    for (let x = tx; x < tx + 4; x++) {
      if (!site.sea[site.at(x, ty + dy)]) return false;
    }
  }
  return true;
}

// The shed stands on land, its front row on the shore tiles of a south-facing coast.
export function dockGround(site: Site, x: number, y: number, ty: number): boolean {
  const c = site.at(x, y);
  if (!OPEN.includes(site.kind[c]) || site.road[c] || site.solid[c] !== null || site.keep[c] || site.shade[c]) return false;
  return y === ty || site.sea[site.at(x, y + 1)] === 1;
}
