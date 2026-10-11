import { PLAN } from './keys.ts';
import { layStreet } from './roads.ts';
import type { Rect, Site } from './site.ts';
import type { Wall } from './walls.ts';

// The knobs of a grid of streets: tiles from one row to the next and from one cross street to the next, how far a row
// may move off its line, and the per mille of the pieces of a row between cross streets that are left out.
export interface GridKnobs {
  readonly rowGap: number;
  readonly crossGap: number;
  readonly shift: number;
  readonly skip: number;
}

// Part 3's grid, which every town laid before the styles, and which winding towns lay until their lanes come.
export const TIGHT: GridKnobs = { rowGap: 6, crossGap: 24, shift: 0, skip: 0 };

// Keys of the PLAN draws, after plan.ts's from 0 and rings.ts's from 10.
const ROW_GAP = 20;
const CROSS_GAP = 21;
const SHIFT = 22;
const SKIP = 23;
const ROW = 24;
const PIECE = 25;
// Ids of the south rows start here, so a north and a south row never share a draw.
const SOUTH = 16;

interface Row {
  y: number;
  id: number;
}

export function gridKnobs(site: Site): GridKnobs {
  return {
    rowGap: 6 + site.below(3, PLAN, ROW_GAP),
    crossGap: 16 + site.below(17, PLAN, CROSS_GAP),
    shift: site.below(2, PLAN, SHIFT),
    // Up to a tenth, where Part 4 dealt a fifth: a block whose row piece is left out has no street to face, and with a
    // fifth Task 27's median grid capital held 358 houses inside the wall, in the first 2 standard worlds.
    skip: site.below(101, PLAN, SKIP),
  };
}

// Cobbled streets in a grid inside the ring: rows north and south of the plaza, and columns beside it and further out.
// Each runs from 2 tiles inside one ring line to 2 inside the other and skips water, so a town's bridges are its main
// roads'.
export function layGrid(site: Site, wall: Wall, plaza: Rect, knobs: GridKnobs): void {
  const columns = crossColumns(wall, plaza, knobs.crossGap);
  for (const row of rowsOf(site, wall, plaza, knobs)) layRow(site, wall, row, columns, knobs.skip);
  for (const c of columns) layColumn(site, wall, c);
}

function rowsOf(site: Site, wall: Wall, [, py, , ph]: Rect, knobs: GridKnobs): Row[] {
  const rows: Row[] = [];
  for (let k = 1; ; k++) {
    const y = py - knobs.rowGap * k + shiftOf(site, knobs, k);
    if (y <= wall.y0 + 1) break;
    rows.push({ y, id: k });
  }
  for (let k = 1; ; k++) {
    const y = py + ph - 2 + knobs.rowGap * k + shiftOf(site, knobs, SOUTH + k);
    if (y >= wall.y1 - 2) break;
    rows.push({ y, id: SOUTH + k });
  }
  return rows;
}

function shiftOf(site: Site, knobs: GridKnobs, id: number): number {
  return knobs.shift === 0 ? 0 : site.below(knobs.shift + 1, PLAN, ROW, id);
}

// The left column of each cross street, left to right: the two beside the plaza, and one every crossGap tiles out.
function crossColumns(wall: Wall, [px, , pw]: Rect, gap: number): number[] {
  const columns: number[] = [];
  for (let c = px - 2; c > wall.x0 + 1; c -= gap) columns.push(c);
  for (let c = px + pw; c < wall.x1 - 2; c += gap) columns.push(c);
  return columns.sort((a, b) => a - b);
}

function layRow(site: Site, wall: Wall, row: Row, columns: readonly number[], skip: number): void {
  const out = piecesLeftOut(site, row.id, columns.length + 1, skip);
  let piece = 0;
  for (let x = wall.x0 + 2; x < wall.x1 - 1; x++) {
    while (piece < columns.length && columns[piece] <= x) piece++;
    if (out[piece] || wall.inset(x, row.y) < 2 || wall.inset(x, row.y + 1) < 2) continue;
    layStreet(site, x, row.y);
    layStreet(site, x, row.y + 1);
  }
}

// Which pieces of a row, between its cross streets, are left out.
function piecesLeftOut(site: Site, id: number, count: number, skip: number): boolean[] {
  const out: boolean[] = [];
  for (let piece = 0; piece < count; piece++) out.push(skip > 0 && site.chance(skip, PLAN, PIECE, id, piece));
  return out;
}

function layColumn(site: Site, wall: Wall, c: number): void {
  for (let y = wall.y0 + 2; y < wall.y1 - 1; y++) {
    if (wall.inset(c, y) < 2 || wall.inset(c + 1, y) < 2) continue;
    layStreet(site, c, y);
    layStreet(site, c + 1, y);
  }
}
