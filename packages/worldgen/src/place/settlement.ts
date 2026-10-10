import { floorDiv } from '@nomos/sim-core/kernels';
import { PLACE_TILE_PX as TILE } from '@nomos/sim-protocol/place';
import { LOT, MARK, WORK } from './keys.ts';
import { landmarkFrame } from './landmarks.ts';
import { centreSpot, layRoad, pave, ROADS, roadSides, straight } from './roads.ts';
import { frame, OPEN, rise, type Cell, type Lot, type Site } from './site.ts';
import { Wall } from './walls.ts';

type Pair = readonly [number, number];

export const PLAZAS: Readonly<Record<string, Pair>> = { capital: [28, 8], city: [26, 8], town: [20, 6] };
// A wall ring's half-sizes round the plaza's centre, each edge kept BELT_MIN tiles inside the place for the farm belt.
const RINGS: Readonly<Record<string, Pair>> = { capital: [64, 40], city: [64, 40], town: [56, 30] };
const BELT_MIN = 6;
// Rows from one street to the next, and columns from one cross street to the next.
const BLOCK = 6;
const CROSS = 24;
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
const STALLS: Readonly<Record<string, number>> = { capital: 3, city: 3, town: 2 };
const OUTSKIRTS: readonly Pair[] = [
  [-1, 0],
  [1, 0],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

function plazaOf(site: Site): readonly [px: number, py: number, pw: number, ph: number] {
  if (site.plaza === null) throw new Error('a town stage ran before lay_town');
  return site.plaza;
}

// The plaza, the ring kept for the wall, the main roads out through it and the streets inside. Returns each main road's
// cells, from the plaza out.
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
  const wall = ringOf(site, tier);
  site.wall = wall;
  const mains = laySpokes(site, wall);
  layStreets(site, wall);
  wall.reserve(site);
  return mains;
}

function ringOf(site: Site, tier: string): Wall {
  const [hx, hy] = RINGS[tier];
  return new Wall(
    Math.max(BELT_MIN, site.cx - hx),
    Math.max(BELT_MIN, site.cy - hy),
    Math.min(site.w - 1 - BELT_MIN, site.cx + hx),
    Math.min(site.h - 1 - BELT_MIN, site.cy + hy),
    tier === 'capital' || tier === 'city' ? 'stone' : 'palisade',
  );
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

// Cobbled streets in a grid inside the ring: rows every BLOCK tiles north and south of the plaza, and columns beside it
// and every CROSS tiles out. Each runs from 2 tiles inside one ring line to 2 inside the other and skips water, so a
// town's bridges are its main roads'.
function layStreets(site: Site, wall: Wall): void {
  const [px, py, pw, ph] = plazaOf(site);
  for (let r = py - BLOCK; r > wall.y0 + 1; r -= BLOCK) layStreetRow(site, wall, r);
  for (let r = py + ph - 2 + BLOCK; r < wall.y1 - 2; r += BLOCK) layStreetRow(site, wall, r);
  for (let c = px - 2; c > wall.x0 + 1; c -= CROSS) layStreetColumn(site, wall, c);
  for (let c = px + pw; c < wall.x1 - 2; c += CROSS) layStreetColumn(site, wall, c);
}

function layStreetRow(site: Site, wall: Wall, r: number): void {
  for (let x = wall.x0 + 2; x < wall.x1 - 1; x++) {
    layStreet(site, x, r);
    layStreet(site, x, r + 1);
  }
}

function layStreetColumn(site: Site, wall: Wall, c: number): void {
  for (let y = wall.y0 + 2; y < wall.y1 - 1; y++) {
    layStreet(site, c, y);
    layStreet(site, c + 1, y);
  }
}

function layStreet(site: Site, x: number, y: number): void {
  if (!site.water(x, y)) layRoad(site, x, y, ROADS.street[1]);
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

// The fountain in the middle of the plaza, the clock tower at one end, stalls between.
export function placePlaza(site: Site): void {
  const [px, py, pw, ph] = plazaOf(site);
  const marks = site.ctx.landmarks;
  const left = site.chance(500, MARK, 1);
  if (marks.includes('clock-tower')) {
    plazaPiece(site, 'landmarks', 'landmark_clock-tower', [left ? px + 1 : px + pw - 1, py + ph - 1], 1);
  }
  if (marks.includes('fountain')) plazaPiece(site, 'landmarks', landmarkFrame('fountain'), [site.cx, py + ph - 1], 2);
  const f = frame('buildings', 'shop_market-stall');
  const stalls = STALLS[site.ctx.tier ?? ''];
  for (let i = 0; i < stalls; i++) {
    const target: Cell = [((i & 1) === 0) === left ? px + pw - 3 : px + 2, py + ph - 1];
    if (plazaPiece(site, 'buildings', 'shop_market-stall', target, 10 + i)) continue;
    const lot = site.findLot(3, 2, rise(f), [24], [site.cx, py], { spur: 0, salt: 20 + i });
    if (lot) site.settle('buildings', 'shop_market-stall', lot);
  }
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
