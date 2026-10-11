import { BREAD, CLOTH, FISH, FUEL, MILK, TOOLS, VEGETABLES } from '@nomos/sim-core/kernels';
import { ENTITY_SHOP, ENTITY_WORKPLACE, type MapV1 } from './map.ts';

// Where blobs buy (M2.7 Part 1, Ruling 1). A premises is a shop or stall in a place's map, and its frame names what it
// sells, so the map format itself holds nothing more.
const SHEET = 'buildings';
// Every market stall frame, the generic one and the three that show their good, starts with this.
const STALL_FRAME = `${SHEET}/shop_market-stall`;

// One good and the frames of the buildings that sell it. A front with two looks lists both, and a town draws one for
// each building.
export interface Trade {
  good: number;
  frames: readonly string[];
}

export const TRADES: readonly Trade[] = [
  { good: VEGETABLES, frames: ['shop_market-stall_vegetables'] },
  { good: FISH, frames: ['shop_market-stall_fish'] },
  { good: MILK, frames: ['shop_market-stall_milk'] },
  { good: BREAD, frames: ['shop_bakery'] },
  { good: CLOTH, frames: ['shop_draper_bolts', 'shop_draper_rail'] },
  { good: TOOLS, frames: ['work_smithy'] },
  { good: FUEL, frames: ['shop_fuel-store_shed', 'shop_fuel-store_stack'] },
];

// What a village's one general shop or stall sells: every good. A town's general shop sells a good only when no premises
// of that trade stands in the map.
export const GENERAL_FRAMES: readonly string[] = ['shop_general', 'shop_market-stall'];

// A premises's goods are a mask with bit g set for good g, and the seven goods run from BREAD (1) to FUEL (7).
export const EVERY_GOOD = (1 << (FUEL + 1)) - (1 << BREAD);

export interface Premises {
  // The shop or stall's index in the map's entities.
  entity: number;
  // Bit g is set when it sells good g.
  goods: number;
  doorX: number;
  doorY: number;
  // A market stall, whose first worker keeps its counter in the open instead of going indoors.
  stall: boolean;
}

const GOOD_OF_FRAME = new Map<string, number>();
for (const trade of TRADES) {
  for (const name of trade.frames) GOOD_OF_FRAME.set(`${SHEET}/${name}`, trade.good);
}
const GENERAL = new Set(GENERAL_FRAMES.map((name) => `${SHEET}/${name}`));

export function sells(premises: Premises, good: number): boolean {
  return ((premises.goods >> good) & 1) === 1;
}

// The goods a frame sells on its own: one good's bit, EVERY_GOOD for a general frame, or 0 for any other.
function goodsOfFrame(frame: string): number {
  const good = GOOD_OF_FRAME.get(frame);
  if (good !== undefined) return 1 << good;
  return GENERAL.has(frame) ? EVERY_GOOD : 0;
}

// Every premises of a map, in the order of its entities, which is reading order. The Smithy is a workplace entity and
// every other premises a shop. Where a good has a premises of its own trade, no general shop sells it, so a town's
// general shop sells nothing and a village's sells every good.
export function premisesOf(map: MapV1): Premises[] {
  const found: Premises[] = [];
  let ownTrade = 0;
  map.entities.forEach((entity, index) => {
    if (entity.kind !== ENTITY_SHOP && entity.kind !== ENTITY_WORKPLACE) return;
    const frame = map.frames[entity.frame];
    const goods = goodsOfFrame(frame);
    if (goods === 0) return;
    if (goods !== EVERY_GOOD) ownTrade |= goods;
    found.push({ entity: index, goods, doorX: entity.doorX, doorY: entity.doorY, stall: frame.startsWith(STALL_FRAME) });
  });
  const premises: Premises[] = [];
  for (const p of found) {
    const goods = p.goods === EVERY_GOOD ? EVERY_GOOD & ~ownTrade : p.goods;
    if (goods !== 0) premises.push({ ...p, goods });
  }
  return premises;
}

// The indexes in `premises` of those that sell a good, in order: the n of them that a firm row of the good trades from, row r
// from the (r mod n)-th.
export function sellersOf(premises: readonly Premises[], good: number): number[] {
  const sellers: number[] = [];
  premises.forEach((p, index) => {
    if (sells(p, good)) sellers.push(index);
  });
  return sellers;
}
