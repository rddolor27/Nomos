import { dayOf } from '../time/calendar.ts';
import type { Ground } from '../world/ground.ts';
import { STREETS, TICK, type World } from '../world/world.ts';
import { buildFields, requireFields } from './fields.ts';
import type { Shops } from './shops.ts';
import { sleepUntil } from './timetable.ts';

// The shops' doors as the cells (y * width + x) that buildFields takes.
export function createDoorCells(shops: Shops, width: number): Int32Array {
  const cells = new Int32Array(shops.count);
  for (let p = 0; p < shops.count; p++) cells[p] = shops.doorY[p] * width + shops.doorX[p];
  return cells;
}

// Whether the flow fields of `shops` on `ground` fit the layout, which switchTown and requestTown ask before they fold the live
// town. A town with no shops makes no streets and always fits.
export function streetsFit(world: World, ground: Ground, shops: Shops): boolean {
  if (shops.count === 0) return true;
  try {
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

// Gives the live town its streets: the flow field to each shop's door, the doors and the firm rows they trade, and a night for
// every blob to wake from, in a keyed minute of the planning window of today. The world must be a freshly spawned town, whose
// errand store is empty. A ground or layout the fields do not fit throws before anything is written.
export function createStreets(world: World, shops: Shops): void {
  const { ground, errands, fields, globals } = world;
  buildFields(ground, createDoorCells(shops, ground.width), fields);
  for (let p = 0; p < shops.count; p++) {
    errands.shopDoorX[p] = shops.doorX[p];
    errands.shopDoorY[p] = shops.doorY[p];
    errands.shopStall[p] = shops.stall[p];
  }
  assignFirmShops(world, shops);
  globals[STREETS] = 1;
  const day = dayOf(globals[TICK]);
  for (let i = 0; i < world.agents.count[0]; i++) sleepUntil(world, i, day);
}

// Empties the errand store and marks the town as one that wanders, when the live town is folded away.
export function closeStreets(world: World): void {
  world.errands.bytes.fill(0);
  world.globals[STREETS] = 0;
}
