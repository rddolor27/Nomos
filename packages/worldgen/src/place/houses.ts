import { floorDiv } from '@nomos/sim-core/kernels';
import { PLACE_TILE_PX as TILE } from '@nomos/sim-protocol/place';
import { FORM, STYLE } from './keys.ts';
import { frame, type Lot, type Site } from './site.ts';

export const MATERIALS = ['brick', 'cottage', 'plaster', 'stone', 'timber'];
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
const APARTMENTS: Readonly<Record<string, number>> = { town: 15, city: 35, capital: 40 };
const DENSE = ['town', 'city', 'capital'];

// Material and roof are uniform draws keyed by the house alone, so no style can mark wealth.
export function houseName(site: Site, i: number, unit: number, form: string): string {
  const material = site.pick(MATERIALS, STYLE, i, unit, 0);
  const roof = site.pick(ROOFS, STYLE, i, unit, 1);
  return `house_${material}_${form}_roof-${roof}`;
}

export function houseForms(site: Site, i: number, dense: boolean, left: number): string[] {
  const r = site.below(100, FORM, i);
  if (!dense) return [villageForm(r)];
  const tier = site.ctx.tier ?? '';
  if (r < APARTMENTS[tier]) return ['apartment'];
  const units = Math.min(left, 2 + site.below(tier === 'town' ? 3 : 4, FORM, i, 1));
  if (units < 2) return ['detached'];
  return ['row-left', ...new Array<string>(units - 2).fill('row-middle'), 'row-right'];
}

function villageForm(r: number): string {
  if (r < 35) return 'hut';
  return r < 80 ? 'detached' : 'farmhouse';
}

export function placeHouses(site: Site): void {
  const tier = site.ctx.tier ?? '';
  const [lo, hi] = HOUSES[tier];
  const count = lo + site.below(hi - lo + 1, FORM, 0);
  const dense = DENSE.includes(tier);
  let made = 0;
  let misses = 0;
  for (let i = 0; i < count * 3 && made < count && misses < MISSES; i++) {
    const units = placeAttempt(site, i, count - made, dense);
    made += units;
    misses = units > 0 ? 0 : misses + 1;
  }
}

// The houses the first way of housing attempt i that finds a lot makes, or 0 when none does.
function placeAttempt(site: Site, i: number, left: number, dense: boolean): number {
  const forms = houseForms(site, i, dense, left);
  const options = [forms];
  if (forms.length > 2) options.push(['row-left', 'row-right']);
  if (dense) options.push(['detached']);
  for (const opts of options) {
    if (placeRow(site, i, opts, dense)) return opts.length;
  }
  return 0;
}

// A row of houses side by side on one lot, each with its door on a road. Whether it found a lot.
function placeRow(site: Site, i: number, forms: readonly string[], dense: boolean): boolean {
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
  const spur = forms.length > 1 ? 0 : spurFor(dense);
  const lot = site.findLot(fw, fh, 0, doors, [site.cx, site.cy], { spur, salt: 100 + i });
  if (lot === null) return false;
  buildRow(site, lot, names, doors, fh);
  return true;
}

function spurFor(dense: boolean): number {
  return dense ? 1 : 3;
}

function buildRow(site: Site, lot: Lot, names: readonly string[], doors: readonly number[], fh: number): void {
  let x = lot.tx;
  names.forEach((name, k) => {
    site.build('houses', name, x, lot.ty);
    site.doors.push({ name, x: lot.tx + floorDiv(doors[k], TILE), y: lot.ty + fh });
    x += frame('houses', name).footprintW;
  });
  for (const path of lot.spurs) site.layPath(path);
}
