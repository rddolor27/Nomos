import { openLife } from '../life/store.ts';
import type { Homes } from '../spawn/homes.ts';
import { dayOf } from '../time/calendar.ts';
import type { Ground } from '../world/ground.ts';
import { STREETS, TICK, type World } from '../world/world.ts';
import { MAX_PREMISES, buildFields, requireFields } from './fields.ts';
import type { Shops } from './shops.ts';
import { sleepUntil } from './timetable.ts';

// The sites' doors, premises and leisure sites in turn, as the cells (y * width + x) that buildFields takes.
export function createDoorCells(shops: Shops, width: number): Int32Array {
  const cells = new Int32Array(shops.count);
  for (let p = 0; p < shops.count; p++) cells[p] = shops.doorY[p] * width + shops.doorX[p];
  return cells;
}

// Throws what createStreets would for the sites, before it writes anything: the store keeps a keeper and a stall flag for at most
// MAX_PREMISES premises.
function requireSites(shops: Shops): void {
  if (shops.premises > MAX_PREMISES) {
    throw new RangeError(`${shops.premises} premises are past the ${MAX_PREMISES} a layout reserves`);
  }
}

// Whether the flow fields of `shops` on `ground` fit the layout, which switchTown and requestTown ask before they fold the live
// town. A town with no premises makes no streets and always fits.
export function streetsFit(world: World, ground: Ground, shops: Shops): boolean {
  if (shops.premises === 0) return true;
  try {
    requireSites(shops);
    requireFields(ground, createDoorCells(shops, ground.width), world.fields.length);
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }
  return true;
}

function sellersOf(shops: Shops, good: number): number {
  let sellers = 0;
  for (let p = 0; p < shops.count; p++) sellers += (shops.goods[p] >> good) & 1;
  return sellers;
}

// The n-th of the shops that sell a good, in the order of the shops.
function nthSeller(shops: Shops, good: number, n: number): number {
  let left = n;
  for (let p = 0; p < shops.count; p++) {
    if (((shops.goods[p] >> good) & 1) === 0) continue;
    if (left === 0) return p;
    left--;
  }
  return -1;
}

// Row r of a good trades from the (r mod n)-th of the n shops that sell it, r counted from the good's first row, so a shop has
// as many rows as any other, give or take one (Ruling 1). A good no shop sells has no premises, and its rows no trips.
function assignFirmShops(world: World, shops: Shops): void {
  const { firms, goods, errands } = world;
  for (let f = 0; f < firms.count[0]; f++) {
    const good = goods.good[f];
    const sellers = sellersOf(shops, good);
    errands.firmShop[f] = sellers === 0 ? 0 : nthSeller(shops, good, (f - goods.firstRow[good]) % sellers) + 1;
  }
}

// Each blob's home door tile, household by household as spawnPeople seated them.
function fillHomeCells(world: World, homes: Homes): void {
  const { households, errands, ground } = world;
  let blob = 0;
  for (let h = 0; h < households.count[0]; h++) {
    const home = households.home[h];
    const cell = homes.doorY[home] * ground.width + homes.doorX[home];
    for (let member = 0; member < households.size[h]; member++) errands.homeCell[blob++] = cell;
  }
}

// Gives the live town its streets: the flow field to each site, the sites and the firm rows the premises trade, each blob's home
// tile, the ground its leisure sites cover, and a night for every blob to wake from, in a keyed minute of the planning window of
// today. The world must be a freshly spawned town, whose errand and life stores are empty but for the traits spawn drew. A ground
// or layout the fields do not fit throws before anything is written.
export function createStreets(world: World, shops: Shops, homes: Homes): void {
  const { ground, errands, fields, globals } = world;
  requireSites(shops);
  buildFields(ground, createDoorCells(shops, ground.width), fields);
  for (let p = 0; p < shops.count; p++) {
    errands.siteKind[p] = shops.kind[p];
    errands.siteX[p] = shops.doorX[p];
    errands.siteY[p] = shops.doorY[p];
  }
  for (let p = 0; p < shops.premises; p++) errands.shopStall[p] = shops.stall[p];
  assignFirmShops(world, shops);
  fillHomeCells(world, homes);
  openLife(world.life, shops, world.agents.count[0], globals[TICK], world.seed);
  globals[STREETS] = 1;
  const day = dayOf(globals[TICK]);
  for (let i = 0; i < world.agents.count[0]; i++) sleepUntil(world, i, day);
}

// Empties the errand and life stores and marks the town as one that wanders, when the live town is folded away.
export function closeStreets(world: World): void {
  world.errands.bytes.fill(0);
  world.life.bytes.fill(0);
  world.globals[STREETS] = 0;
}
