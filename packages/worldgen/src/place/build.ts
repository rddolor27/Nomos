import { floorDiv } from '@nomos/sim-core/kernels';
import type { PlaceLayout } from '@nomos/sim-protocol/place';
import { herd } from './animals.ts';
import type { PlaceContext } from './context.ts';
import { decorate, placeFields } from './decor.ts';
import { placeHouses } from './houses.ts';
import { placeLandmarks, placeWindmill } from './landmarks.ts';
import { layoutOf } from './layout.ts';
import { plant } from './nature.ts';
import { settlementPeople } from './people.ts';
import { layRoads } from './roads.ts';
import {
  CIVIC,
  layTown,
  layVillage,
  placeCivic,
  placeDock,
  placePlaza,
  placeVillageShop,
  placeWorks,
  PLAZAS,
} from './settlement.ts';
import { Site } from './site.ts';
import { layGround, layRidges, layWater, riverPoints } from './terrain.ts';
import { buildVista, VISTA_SIZE } from './vista.ts';

const SIZES: Readonly<Record<string, readonly [number, number]>> = {
  capital: [48, 28],
  city: [48, 28],
  town: [40, 24],
  village: [32, 20],
  hamlet: [32, 20],
};
const FIELDS: Readonly<Record<string, number>> = { hamlet: 1, village: 3 };
const ROCKY = ['hills', 'mountain', 'peak'];
// Biomes whose settlements keep a pasture beside their fields.
const PASTORAL = ['farmland', 'grassland', 'hills'];

// place.py's build: the layout of a settlement's district or a wonder's vista, the same for the same context.
export function buildPlace(ctx: PlaceContext): PlaceLayout {
  return layoutOf(buildSite(ctx));
}

export function buildSite(ctx: PlaceContext): Site {
  const site = siteFor(ctx);
  layGround(site);
  if (ctx.wonder) buildVista(site);
  else buildSettlement(site);
  return site;
}

// An empty site of the context's size: a wonder's vista, or its tier's district.
export function siteFor(ctx: PlaceContext): Site {
  const [w, h] = ctx.wonder ? VISTA_SIZE : SIZES[ctx.tier ?? ''];
  return new Site(ctx, w, h);
}

// place.py's SETTLEMENT_STAGES, build_settlement's stage groups in order. The goldens fingerprint the site after each
// one (tools/worldgen/place_goldens.py).
export const SETTLEMENT_STAGES: readonly ((site: Site) => void)[] = [
  settleWater,
  settleCentre,
  settleBuildings,
  decorate,
  settleNature,
  settlementPeople,
];

export function buildSettlement(site: Site): void {
  for (const stage of SETTLEMENT_STAGES) stage(site);
}

// Sea, rivers and ponds kept off the middle of the place, then ridges on high ground.
export function settleWater(site: Site): void {
  const ctx = site.ctx;
  const middle = [floorDiv(site.w, 4), floorDiv(site.h, 4), floorDiv(site.w * 3, 4), floorDiv(site.h * 3, 4)];
  const spare = (x: number, y: number): boolean => middle[0] <= x && x < middle[2] && middle[1] <= y && y < middle[3];
  const sides = [...'nesw'].filter((s) => ctx.river.includes(s));
  const depth = ctx.tier === 'city' || ctx.tier === 'capital' ? 4 : 3;
  layWater(site, ctx.sea, ctx.coast === 'cliffs', depth, sides.length > 0 ? riverPoints(site, sides) : [], spare);
  if (ROCKY.includes(ctx.biome)) layRidges(site, ctx.biome === 'hills' ? 1 : 2, spare);
}

// A town's plaza, streets, town hall, stalls and civic buildings, or a village's green, lanes and shop.
export function settleCentre(site: Site): void {
  const tier = site.ctx.tier ?? '';
  if (!(tier in PLAZAS)) {
    layVillage(site);
    layRoads(site);
    placeVillageShop(site);
    return;
  }
  layTown(site);
  layRoads(site);
  placeCivic(site, CIVIC[tier].slice(0, 1));
  placePlaza(site);
  placeCivic(site, CIVIC[tier].slice(1));
}

// The dock, landmarks, works, houses, fields and the windmill.
export function settleBuildings(site: Site): void {
  const ctx = site.ctx;
  if (ctx.sea && ctx.coast !== 'cliffs') placeDock(site);
  placeLandmarks(site);
  placeWorks(site);
  placeHouses(site);
  if (ctx.tier === 'village' || ctx.tier === 'hamlet' || ctx.biome === 'farmland' || ctx.farmland) settleFields(site);
  if (ctx.landmarks.includes('windmill')) placeWindmill(site);
}

export function settleNature(site: Site): void {
  plant(site);
  herd(site);
}

// A hamlet's field, a village's three, or one for each side that faces farmland, and one more on farmland.
function settleFields(site: Site): void {
  const { tier, biome, farmland } = site.ctx;
  const fields = (FIELDS[tier ?? ''] ?? (farmland.length || 1)) + (biome === 'farmland' ? 1 : 0);
  placeFields(site, fields, PASTORAL.includes(biome));
}
