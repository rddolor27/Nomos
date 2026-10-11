import { floorDiv } from '@nomos/sim-core/kernels';
import { PLACE_TILE_PX as TILE } from '@nomos/sim-protocol/place';
import { FORM, SPREAD, STYLE } from './keys.ts';
import { frame, MARGIN, type Cell, type Lot, type Site } from './site.ts';
import { zone, type Zone } from './zone.ts';

export const MATERIALS = ['board', 'brick', 'cottage', 'plaster', 'rubble', 'stone', 'timber'];
export const ROOFS = ['green', 'plum', 'slate', 'terracotta', 'thatch'];
const HOUSES: Readonly<Record<string, readonly [lo: number, hi: number]>> = {
  capital: [380, 520],
  city: [380, 520],
  town: [240, 340],
  village: [30, 50],
  hamlet: [8, 14],
};
// Attempts in a row that find no lot, after which a place has no room left for houses.
const MISSES = 6;
// A walled place's targets spread to this share, per mille, of its half-width and half-height (Irwin-Hall, below). The
// plan's 900 left the median place with 5.4% of its houses past the wall, the floor of its 5-20% band, so Task 27 took 1200.
const SPREAD_PER_MILLE = 1200;

// What an attempt aims to build, per mille of the attempts aimed in each zone (M3.1's Part 3, Task 13, Rule 4). A terrace
// is a row of houses on one lot. The rim's detached houses are row terraces: the plan's first tuning when a capital holds
// under 380 houses.
const SUBURBAN: readonly (readonly [kind: string, perMille: number])[] = [
  ['detached', 300],
  ['cabin', 300],
  ['hut', 200],
  ['farmhouse', 200],
];
const ZONE_FORMS: Readonly<Record<Zone, readonly (readonly [kind: string, perMille: number])[]>> = {
  centre: [['townhouse', 650], ['apartment', 200], ['row', 150]],
  rim: [['row', 850], ['townhouse', 150]],
  outside: SUBURBAN,
  open: SUBURBAN,
};
// The pieces of each terrace kind: its left end, a middle piece and its right end.
const TERRACES: Readonly<Record<string, readonly [left: string, middle: string, right: string]>> = {
  townhouse: ['corner-left', 'townhouse-middle', 'corner-right'],
  row: ['row-left', 'row-middle', 'row-right'],
};
const HANDED = '-handed';
const DETACHED = 'detached';
// A cabin is as wide as a terrace house, so it fills the 2-wide gaps the terraces leave.
const INFILL = 'cabin';

// What a lot needs: how far a single house's door may lie from a road, and how many tiles stay clear round the lot.
// Inside the wall houses stand side by side. Outside it, and in open places, a tile stays clear round each.
interface Lots {
  spur: number;
  margin: number;
}
const INSIDE: Lots = { spur: 1, margin: 0 };
const OUTSIDE: Lots = { spur: 3, margin: MARGIN };

// A corner house's plain end: its form, the column of the tile beside the corner's outer side and how far the end's left
// moves from the corner's. A corner is 3 wide and its plain end the 2 inner columns.
interface PlainEnd {
  form: string;
  beside: number;
  shift: number;
}
const PLAIN_ENDS: Readonly<Partial<Record<string, PlainEnd>>> = {
  'corner-left': { form: 'townhouse-left', beside: -1, shift: 1 },
  'corner-right': { form: 'townhouse-right', beside: 3, shift: 0 },
};

// A house of a row: its sprite and the column of its footprint's left.
interface Piece {
  name: string;
  x: number;
}

// Material and roof are uniform draws keyed by the house alone, so no style can mark wealth.
export function houseName(site: Site, i: number, unit: number, form: string): string {
  const material = site.pick(MATERIALS, STYLE, i, unit, 0);
  const roof = site.pick(ROOFS, STYLE, i, unit, 1);
  return `house_${material}_${form}_roof-${roof}`;
}

function kindOf(where: Zone, perMille: number): string {
  let left = perMille;
  for (const [kind, share] of ZONE_FORMS[where]) {
    if (left < share) return kind;
    left -= share;
  }
  throw new Error(`the forms of the ${where} zone sum to less than 1000`);
}

function walled(where: Zone): boolean {
  return where === 'centre' || where === 'rim';
}

// Whether house `unit` of attempt i is the handed version of its form, by a draw of its own.
function handed(site: Site, i: number, unit: number): boolean {
  return site.below(2, FORM, i, unit, 2) === 1;
}

// A terrace of `units` houses. A corner house has no handed version.
function terrace(site: Site, kind: string, i: number, units: number): string[] {
  const [left, middle, right] = TERRACES[kind];
  const forms = [left, ...new Array<string>(units - 2).fill(middle), right];
  return forms.map((form, unit) => (!form.startsWith('corner') && handed(site, i, unit) ? form + HANDED : form));
}

// The ways attempt i may house its lot, tried in turn. A terrace takes its length, then the shortest, and a townhouse
// terrace is tried in rows too where the block is too shallow for it. Inside the wall a detached house comes next, and a
// cabin last.
function houseWays(site: Site, i: number, where: Zone, left: number): string[][] {
  const kind = kindOf(where, site.below(1000, FORM, i));
  const ways: string[][] = [];
  if (Object.hasOwn(TERRACES, kind)) {
    const units = Math.min(left, 2 + site.below(4, FORM, i, 1));
    const kinds = kind === 'townhouse' ? [kind, 'row'] : [kind];
    for (const length of units > 2 ? [units, 2] : [units]) {
      for (const k of kinds) if (length >= 2) ways.push(terrace(site, k, i, length));
    }
  } else {
    ways.push([kind]);
  }
  if (walled(where)) ways.push([DETACHED], [INFILL]);
  return ways;
}

// Four uniform draws on 0..n, less their mean 2n: a bell from -2n to 2n with a standard deviation of about 0.58n.
function spread(site: Site, n: number, i: number, axis: number): number {
  let sum = 0;
  for (let k = 0; k < 4; k++) sum += site.below(n + 1, SPREAD, i, axis, k);
  return sum - 2 * n;
}

// Where house i aims: a walled place's houses fall round the plaza in a bell, and an open place's all aim at its middle.
function targetOf(site: Site, i: number): Cell {
  const { wall } = site;
  if (wall === null) return [site.cx, site.cy];
  const sx = floorDiv(floorDiv(wall.x1 - wall.x0, 2) * SPREAD_PER_MILLE, 1000);
  const sy = floorDiv(floorDiv(wall.y1 - wall.y0, 2) * SPREAD_PER_MILLE, 1000);
  return [site.cx + spread(site, sx, i, 0), site.cy + spread(site, sy, i, 1)];
}

export function placeHouses(site: Site): void {
  const tier = site.ctx.tier ?? '';
  const [lo, hi] = HOUSES[tier];
  const count = lo + site.below(hi - lo + 1, FORM, 0);
  const failed = new Set<string>();
  let made = 0;
  let misses = 0;
  for (let i = 0; i < count * 3 && made < count && misses < MISSES; i++) {
    const units = placeAttempt(site, i, count - made, failed);
    made += units;
    misses = units > 0 ? 0 : misses + 1;
  }
}

// The houses the first way of housing attempt i that finds a lot makes, or 0 when none does.
function placeAttempt(site: Site, i: number, left: number, failed: Set<string>): number {
  const target = targetOf(site, i);
  const where = zone(site, target[0], target[1]);
  for (const forms of houseWays(site, i, where, left)) {
    if (placeRow(site, i, forms, target, where, failed)) return forms.length;
  }
  return 0;
}

// A row of houses side by side on one lot, each with its door on a road. Whether it found a lot. A search finds no lot only
// where none fits anywhere, whatever its target, and building only takes ground, so a shape that failed fails again until a
// spur lays a road a door could reach: `failed` holds those shapes. Budget: a capital or city builds within 250 ms at the
// median, where the failed searches of its last houses took half of it.
function placeRow(site: Site, i: number, forms: readonly string[], target: Cell, where: Zone, failed: Set<string>): boolean {
  const names = forms.map((form, unit) => houseName(site, i, unit, form));
  const frames = names.map((name) => frame('houses', name));
  const doors: number[] = [];
  let x = 0;
  for (const f of frames) {
    doors.push(x + f.doorX);
    x += f.footprintW * TILE;
  }
  const fw = frames.reduce((total, f) => total + f.footprintW, 0);
  const fh = frames[0].footprintH;
  const rules = walled(where) ? INSIDE : OUTSIDE;
  const spur = forms.length > 1 ? 0 : rules.spur;
  const shape = `${fw}.${fh}.${doors.join(',')}.${spur}.${rules.margin}`;
  if (failed.has(shape)) return false;
  const lot = site.findLot(fw, fh, 0, doors, target, { spur, margin: rules.margin, salt: 100 + i });
  if (lot === null) {
    failed.add(shape);
    return false;
  }
  if (lot.spurs.some((path) => path.length > 0)) failed.clear();
  const pieces: Piece[] = [];
  let left = lot.tx;
  forms.forEach((form, unit) => {
    const piece = atStreet(site, i, unit, form, names[unit], left, lot.ty + fh - 1);
    pieces.push(piece);
    left = piece.x + frame('houses', piece.name).footprintW;
  });
  buildRow(site, lot, pieces);
  return true;
}

// Corner houses stand where a terrace meets a street (the houses designer's advice). Where the tile beside a corner's
// outer side, on the terrace's front row, is no road, the corner gives way to a plain end on its two inner columns,
// leaving its outer column free, if that end's door is on a road; otherwise the corner stays.
function atStreet(site: Site, i: number, unit: number, form: string, name: string, x: number, front: number): Piece {
  const end = PLAIN_ENDS[form];
  if (end === undefined || roadAt(site, x + end.beside, front)) return { name, x };
  const plain = houseName(site, i, unit, handed(site, i, unit) ? end.form + HANDED : end.form);
  const door = x + end.shift + floorDiv(frame('houses', plain).doorX, TILE);
  return roadAt(site, door, front + 1) ? { name: plain, x: x + end.shift } : { name, x };
}

function roadAt(site: Site, x: number, y: number): boolean {
  return site.inside(x, y) && site.road[site.at(x, y)] === 1;
}

function buildRow(site: Site, lot: Lot, pieces: readonly Piece[]): void {
  for (const { name, x } of pieces) {
    const f = frame('houses', name);
    site.build('houses', name, x, lot.ty);
    site.doors.push({ name, x: x + floorDiv(f.doorX, TILE), y: lot.ty + f.footprintH });
  }
  for (const path of lot.spurs) site.layPath(path);
}
