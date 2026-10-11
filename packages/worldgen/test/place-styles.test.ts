import { describe, expect, it } from 'vitest';
import { generateWorld, placeContexts, TOWN } from '../src/index.ts';
import { buildSite, siteFor } from '../src/place/build.ts';
import type { PlaceContext } from '../src/place/context.ts';
import { planOf, ringOf, STYLES } from '../src/place/plan.ts';
import type { Site } from '../src/place/site.ts';

// M3.1's Part 4, Task 22: every capital, city and town is dealt one of three street plans by a keyed draw that reads
// only its seed and tier, and Highcourt is pinned to rings. The places are those of the first two standard worlds.
const WORLDS = 2;
const FIRST_SEED = 0x5eed0001;
const WALLED = ['capital', 'city', 'town'];
// Part 3's ring line, in tiles with its own line counted: 129 × 81 round a capital's or city's plaza, 113 × 61 round a
// town's.
const PART_3_AREA: Readonly<Record<string, number>> = { capital: 129 * 81, city: 129 * 81, town: 113 * 61 };
// A style holds at least this share of the walled places, and every ring line at least this share of Part 3's area.
const SHARE = 0.1;
const AREA_WITHIN = 0.1;
// Rivers a style is tried on.
const RIVER_PLACES = 2;

const contexts: PlaceContext[] = [];
for (let k = 0; k < WORLDS; k++) {
  for (const ctx of placeContexts(generateWorld(FIRST_SEED + k, 'standard'))) {
    if (WALLED.includes(ctx.tier ?? '')) contexts.push(ctx);
  }
}

// The tiles on or inside the ring line of a plan on a centred plaza.
function ringArea(ctx: PlaceContext): number {
  const site = siteFor(ctx);
  const wall = ringOf(site, planOf(site));
  let area = 0;
  for (let y = wall.y0; y <= wall.y1; y++) {
    for (let x = wall.x0; x <= wall.x1; x++) {
      if (wall.inset(x, y) >= 0) area++;
    }
  }
  return area;
}

// Water tiles a road lies on with no bridge piece over them.
function roadsOnWater(site: Site): number {
  let tiles = 0;
  for (let c = 0; c < site.w * site.h; c++) {
    if (site.kind[c] === 'water' && site.road[c] && !site.bridged[c]) tiles++;
  }
  return tiles;
}

describe('the street plans of the walled places of the first 2 standard worlds', () => {
  it('deal each style to a tenth or more of the places', () => {
    const dealt = contexts.map((ctx) => planOf(siteFor(ctx)).style);

    expect(dealt.length).toBeGreaterThan(25);
    for (const style of STYLES) {
      expect(dealt.filter((s) => s === style).length).toBeGreaterThanOrEqual(dealt.length * SHARE);
    }
  });

  it('give no two capitals the same style and knobs', () => {
    const plans = contexts.filter((ctx) => ctx.tier === 'capital').map((ctx) => JSON.stringify(planOf(siteFor(ctx))));

    expect(plans.length).toBeGreaterThanOrEqual(8);
    expect(new Set(plans).size).toBe(plans.length);
  });

  it("give each style a ring line within 10% of the area of Part 3's", () => {
    for (const ctx of contexts) {
      for (const style of STYLES) {
        const part3 = PART_3_AREA[ctx.tier ?? ''];
        expect(Math.abs(ringArea({ ...ctx, style }) - part3)).toBeLessThanOrEqual(part3 * AREA_WITHIN);
      }
    }
  });

  it('lay no street on water where a river crosses a town, in any style', () => {
    const river = contexts.filter((ctx) => ctx.river !== '').slice(0, RIVER_PLACES);

    expect(river.length).toBe(RIVER_PLACES);
    for (const style of STYLES) {
      for (const ctx of river) expect(roadsOnWater(buildSite({ ...ctx, style }))).toBe(0);
    }
  });
});

describe('Highcourt', () => {
  it('is a ring town inside an octagon', () => {
    const site = buildSite(TOWN);

    expect(site.plan?.style).toBe('rings');
    expect(site.plan?.grid).toBeNull();
    expect(site.wall?.cuts).toBeGreaterThan(0);
  });
});
