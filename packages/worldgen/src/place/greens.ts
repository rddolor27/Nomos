import { floorDiv } from '@nomos/sim-core/kernels';
import { GREEN } from './keys.ts';
import type { Lot, Site } from './site.ts';
import { SECTORS } from './trades.ts';

// The greens of a walled town (M3.1's Part 3, Task 13, Rule 9), 6 by 4 tiles each.
const GREENS: Readonly<Record<string, number>> = { capital: 3, city: 3, town: 2 };
const GREEN_W = 6;
const GREEN_H = 4;
// Lot salts of the greens, clear of the houses' and the premises'.
const GREEN_SALT = 400;

// Each green aims two thirds of the way from the plaza's middle to the ring line, in a keyed one of the eight sectors,
// and takes the nearest free lot. Its tiles turn meadow and stay clear, for M3.2's leisure.
export function placeGreens(site: Site): void {
  const { wall } = site;
  if (wall === null) return;
  for (let g = 0; g < (GREENS[site.ctx.tier ?? ''] ?? 0); g++) {
    const [dx, dy] = site.pick(SECTORS, GREEN, g);
    const hx = dx < 0 ? site.cx - wall.x0 : wall.x1 - site.cx;
    const hy = dy < 0 ? site.cy - wall.y0 : wall.y1 - site.cy;
    const target = [site.cx + floorDiv(dx * hx * 2, 3), site.cy + floorDiv(dy * hy * 2, 3)] as const;
    const lot = site.findLot(GREEN_W, GREEN_H, 0, [], target, { salt: GREEN_SALT + g });
    if (lot !== null) layGreen(site, lot);
  }
}

function layGreen(site: Site, lot: Lot): void {
  for (let y = lot.ty; y < lot.ty + GREEN_H; y++) {
    for (let x = lot.tx; x < lot.tx + GREEN_W; x++) {
      site.kind[site.at(x, y)] = 'meadow';
      site.keep[site.at(x, y)] = 1;
    }
  }
  site.townGreens.push([lot.tx, lot.ty, GREEN_W, GREEN_H]);
}
