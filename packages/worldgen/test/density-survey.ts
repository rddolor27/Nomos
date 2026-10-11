import { generateWorld, placeContexts } from '../src/index.ts';
import { buildSite } from '../src/place/build.ts';
import type { PlaceContext } from '../src/place/context.ts';
import { CLIFFS, type Cell, type Site } from '../src/place/site.ts';
import { zone, type Zone } from '../src/place/zone.ts';

// What the density tests read off a walled place, so each place is built once and every test reads its share of it.
export const WALLED = ['capital', 'city', 'town'];
export const WALLED_ZONES: readonly Zone[] = ['centre', 'rim', 'outside'];
const FIRST_SEED = 0x5eed0001;
// Tiles round a house within which a road counts as beside it.
const NEAR = 3;
const HANDED = '-handed';
const TERRACE_FORMS = ['row-left', 'row-middle', 'row-right', 'townhouse-left', 'townhouse-middle', 'townhouse-right'];
const OUTSIDE_WORKS = ['work_farm', 'work_pasture', 'work_quarry', 'work_mine', 'work_lumber-camp'];

export interface House {
  material: string;
  form: string;
  roof: string;
  handed: boolean;
  zone: Zone;
  inside: boolean;
  // A road lies within NEAR tiles of the footprint.
  nearRoad: boolean;
  // A corner house's outer side has a road beside it on the front row; null for any other form.
  cornerBesideRoad: boolean | null;
}

export interface Survey {
  label: string;
  tier: string;
  style: string;
  landmarks: string[];
  houses: House[];
  // Per walled zone, the tiles of land (no water, road or other building) and the tiles of it under houses.
  land: Record<string, number>;
  under: Record<string, number>;
  buildings: string[];
  // Whether each farm, pasture, quarry, mine or lumber camp lies wholly outside the wall.
  worksOutside: boolean[];
  greens: number;
  greensMeadow: boolean;
}

function roadWithin(site: Site, tx: number, ty: number, fw: number, fh: number): boolean {
  for (let y = ty - NEAR; y < ty + fh + NEAR; y++) {
    for (let x = tx - NEAR; x < tx + fw + NEAR; x++) {
      if (site.inside(x, y) && site.road[site.at(x, y)]) return true;
    }
  }
  return false;
}

function cornerBeside(site: Site, form: string, tx: number, ty: number, fw: number, fh: number): boolean | null {
  if (form !== 'corner-left' && form !== 'corner-right') return null;
  const x = form === 'corner-left' ? tx - 1 : tx + fw;
  return site.inside(x, ty + fh - 1) && site.road[site.at(x, ty + fh - 1)] === 1;
}

function houseOf(site: Site, name: string, [tx, ty, fw, fh]: readonly number[]): House {
  const [, material, formName, roof] = name.split('_');
  const wall = site.wall;
  const form = formName.replace(HANDED, '');
  return {
    material,
    form,
    roof: roof.replace('roof-', ''),
    handed: formName.endsWith(HANDED),
    zone: zone(site, tx, ty),
    inside: wall !== null && wall.contains(tx, ty),
    nearRoad: roadWithin(site, tx, ty, fw, fh),
    cornerBesideRoad: cornerBeside(site, form, tx, ty, fw, fh),
  };
}

// Land is what a house could stand on but for the rest of the town: not water, a road, another building or the rows its
// image rises over.
function isLand(site: Site, c: number): boolean {
  const kind = site.kind[c];
  if (kind === 'water' || CLIFFS.includes(kind) || site.road[c] || site.shade[c]) return false;
  return !site.big[c] || (site.solid[c] ?? '').startsWith('house_');
}

function landOf(site: Site): { land: Record<string, number>; under: Record<string, number> } {
  const land: Record<string, number> = { centre: 0, rim: 0, outside: 0 };
  const under: Record<string, number> = { centre: 0, rim: 0, outside: 0 };
  for (let y = 0; y < site.h; y++) {
    for (let x = 0; x < site.w; x++) {
      const c = site.at(x, y);
      if (!isLand(site, c)) continue;
      const where = zone(site, x, y);
      land[where]++;
      if (site.big[c]) under[where]++;
    }
  }
  return { land, under };
}

function worksOutside(site: Site): boolean[] {
  const wall = site.wall;
  const outside: boolean[] = [];
  for (const name of OUTSIDE_WORKS) {
    for (const [tx, ty, fw, fh] of site.places.get(name) ?? []) {
      const corners: Cell[] = [[tx, ty], [tx + fw - 1, ty], [tx, ty + fh - 1], [tx + fw - 1, ty + fh - 1]];
      outside.push(wall !== null && corners.every(([x, y]) => !wall.contains(x, y) && !wall.onLine(x, y)));
    }
  }
  return outside;
}

export function surveyOf(label: string, ctx: PlaceContext): Survey {
  const site = buildSite(ctx);
  const houses: House[] = [];
  for (const [name, rects] of site.places) {
    if (!name.startsWith('house_')) continue;
    for (const rect of rects) houses.push(houseOf(site, name, rect));
  }
  const { land, under } = landOf(site);
  const meadow = site.townGreens.every(([tx, ty, fw, fh]) => {
    for (let y = ty; y < ty + fh; y++) {
      for (let x = tx; x < tx + fw; x++) {
        if (site.kind[site.at(x, y)] !== 'meadow' || !site.keep[site.at(x, y)]) return false;
      }
    }
    return true;
  });
  return {
    label,
    tier: ctx.tier ?? '',
    style: site.plan?.style ?? '',
    landmarks: ctx.landmarks,
    houses,
    land,
    under,
    buildings: [...site.places.keys()],
    worksOutside: worksOutside(site),
    greens: site.townGreens.length,
    greensMeadow: meadow,
  };
}

// The walled places of the first `worlds` standard worlds, each surveyed once.
export function surveyWalled(worlds: number): Survey[] {
  const surveys: Survey[] = [];
  for (let k = 0; k < worlds; k++) {
    const seed = FIRST_SEED + k;
    placeContexts(generateWorld(seed, 'standard')).forEach((ctx, i) => {
      if (WALLED.includes(ctx.tier ?? '')) surveys.push(surveyOf(`${seed.toString(16)} place ${i} (${ctx.tier})`, ctx));
    });
  }
  return surveys;
}

export function isTerrace(house: House): boolean {
  return TERRACE_FORMS.includes(house.form);
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function insideCount(survey: Survey): number {
  return survey.houses.filter((house) => house.inside).length;
}
