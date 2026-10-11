import { beforeAll, describe, expect, it } from 'vitest';
import { TOWN } from '../src/index.ts';
import { buildSite } from '../src/place/build.ts';
import { MATERIALS, ROOFS } from '../src/place/houses.ts';
import { STYLES } from '../src/place/plan.ts';
import { zone } from '../src/place/zone.ts';
import { insideCount, isTerrace, median, surveyWalled, WALLED_ZONES, type House, type Survey } from './density-survey.ts';

// M3.1's Part 3, Task 13, built as Part 4's Task 27: a walled town is packed round its plaza and thins out toward and past
// its wall. The places are the walled ones of the first two standard worlds, each surveyed once.
const WORLDS = 2;
// Houses inside the wall of the median capital or city, and of the median town, in every style.
const BIG = [380, 520];
const TOWN_HOUSES = [240, 340];
const PAST_WALL = [0.05, 0.2];
// A zone draws a material or roof at between these multiples of its overall share.
const SHARE_BAND = [0.5, 2];
const CORNERS_AT_STREETS = 0.8;
const HANDED = [0.4, 0.6];
const LARGE_CIVIC = ['civic_town-hall_large', 'civic_courthouse_large', 'civic_clinic_large', 'civic_school_large'];
const SMALL_CIVIC = ['civic_town-hall', 'civic_clinic', 'civic_school', 'civic_police-station', 'shop_general'];

let surveys: Survey[];
let houses: House[];
const big = (): Survey[] => surveys.filter((s) => s.tier !== 'town');
const towns = (): Survey[] => surveys.filter((s) => s.tier === 'town');

function share(survey: Survey, where: string): number {
  return survey.under[where] / survey.land[where];
}

function between(value: number, [lo, hi]: readonly number[]): boolean {
  return lo <= value && value <= hi;
}

beforeAll(() => {
  surveys = surveyWalled(WORLDS);
  houses = surveys.flatMap((s) => s.houses);
}, 600_000);

describe(`the walled places of the first ${WORLDS} standard worlds`, { timeout: 600_000 }, () => {
  it('hold 380-520 houses inside the wall of the median capital or city, and 240-340 in the median town, in each style', () => {
    expect(big().length).toBeGreaterThan(10);
    expect(towns().length).toBeGreaterThan(15);
    for (const style of STYLES) {
      const capitals = big().filter((s) => s.style === style).map(insideCount);
      const smaller = towns().filter((s) => s.style === style).map(insideCount);
      expect(capitals.length, `${style} capitals and cities`).toBeGreaterThan(0);
      expect(smaller.length, `${style} towns`).toBeGreaterThan(0);
      expect(between(median(capitals), BIG), `${style} capitals and cities ${median(capitals)}`).toBe(true);
      expect(between(median(smaller), TOWN_HOUSES), `${style} towns ${median(smaller)}`).toBe(true);
    }
  });

  it('cover more land with houses by the plaza than by the wall, and more inside the wall than past it', () => {
    const [centre, rim, outside] = WALLED_ZONES.map((where) => median(surveys.map((s) => share(s, where))));

    expect(centre).toBeGreaterThan(rim);
    expect(rim).toBeGreaterThan(outside);
  });

  it('put 5-20% of their houses past the wall in the median, each within 3 tiles of a road', () => {
    const past = surveys.map((s) => s.houses.filter((h) => !h.inside).length / s.houses.length);

    expect(between(median(past), PAST_WALL), `${median(past)} of the houses past the wall`).toBe(true);
    expect(houses.filter((h) => !h.inside && !h.nearRoad)).toEqual([]);
  });

  it('draw each material and roof in every zone at half to twice its overall share', () => {
    const problems: string[] = [];
    for (const [key, values] of [['material', MATERIALS], ['roof', ROOFS]] as const) {
      for (const where of WALLED_ZONES) {
        const here = houses.filter((h) => h.zone === where);
        for (const value of values) {
          const ratio = here.filter((h) => h[key] === value).length / here.length / (houses.filter((h) => h[key] === value).length / houses.length);
          if (!between(ratio, SHARE_BAND)) problems.push(`${value} ${key} in the ${where} at ${ratio.toFixed(2)} of its share`);
        }
      }
    }

    expect(problems).toEqual([]);
  });

  it('stand corner houses where terraces meet roads', () => {
    const corners = houses.filter((h) => h.cornerBesideRoad !== null);

    expect(corners.length).toBeGreaterThan(100);
    expect(corners.filter((h) => h.cornerBesideRoad).length / corners.length).toBeGreaterThanOrEqual(CORNERS_AT_STREETS);
  });

  it('draw handed pieces for about half the terrace houses', () => {
    const terraces = houses.filter(isTerrace);

    expect(between(terraces.filter((h) => h.handed).length / terraces.length, HANDED)).toBe(true);
  });

  it("build the large civic set in capitals and cities, and today's in towns", () => {
    for (const s of big()) {
      expect(s.buildings, s.label).toEqual(expect.arrayContaining(LARGE_CIVIC));
      expect(s.buildings.includes('civic_library_large'), `${s.label} library`).toBe(!s.landmarks.includes('library'));
    }
    for (const s of towns()) {
      expect(s.buildings, s.label).toEqual(expect.arrayContaining(SMALL_CIVIC));
      expect(s.buildings.filter((name) => name.endsWith('_large')), s.label).toEqual([]);
    }
  });

  it('keep farms, pastures, quarries, mines and lumber camps outside the wall', () => {
    const works = surveys.flatMap((s) => s.worksOutside);

    expect(works.length).toBeGreaterThan(20);
    expect(works.every(Boolean)).toBe(true);
  });

  it('keep an inn and a stable, and greens of meadow, in every town', () => {
    for (const s of surveys) {
      expect(s.buildings, s.label).toEqual(expect.arrayContaining(['shop_inn', 'work_stable']));
      expect(s.greens, s.label).toBeGreaterThan(0);
      expect(s.greensMeadow, s.label).toBe(true);
    }
  });
});

describe('the zones of a town', () => {
  it("are centre twice as far out as the ring line holds, rim inside it, and outside beyond it, and open with no wall", () => {
    const site = buildSite(TOWN);
    const { wall, cx, cy } = site;
    if (wall === null) throw new Error('Highcourt has no wall');

    expect(zone(site, cx, cy)).toBe('centre');
    expect(zone(site, cx + Math.floor((wall.x1 - cx) / 2) - 1, cy)).toBe('centre');
    expect(zone(site, cx + Math.floor((wall.x1 - cx) / 2) + 1, cy)).toBe('rim');
    expect(zone(site, wall.x1 - 1, cy)).toBe('rim');
    expect(zone(site, wall.x1, cy)).toBe('outside');
    expect(zone(site, wall.x1 + 3, cy)).toBe('outside');
    expect(zone(buildSite({ ...TOWN, tier: 'village', style: undefined }), 10, 10)).toBe('open');
  });
});
