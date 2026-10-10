import { take, type Arena } from '../memory/arena.ts';
import { BREAD, FUEL, GOOD_COUNT, splitByGood } from './goods.ts';

// A firm row keeps its food as portions by the day they were made, in the slot that day's number takes under the mask
// (M2.4 Ruling 2). 16 slots hold the 14 days the longest-lived food is on sale and the day it spoils.
export const FOOD_RING = 16;
const RING_MASK = FOOD_RING - 1;

// One row per firm, beside FirmStore. good, ring and wasted are canonical, 69 bytes a firm, but off the arena's canonical
// list: stateHash mixes them in last, and only while globals[GOODS] is 1, so a world without goods hashes as it always did.
export interface GoodsStore {
  readonly capacity: number;
  // The firm row's good, 0 for the generic good.
  readonly good: Uint8Array;
  // FOOD_RING slots to a row, at row x FOOD_RING + slot. firms.stock stays the total of a row's slots.
  readonly ring: Int32Array;
  // Portions that spoiled at this firm since it last decided, which food hiring reads (firms/decide.ts).
  readonly wasted: Int32Array;
  // The hash's region: the three columns above and their padding.
  readonly byteOffset: number;
  readonly byteLength: number;
  // Scratch outside the hash, indexed by good. assignGoods fills firstRow and rowCount from the layout, which start and
  // spawn set once and nothing moves; spawn also puts each good's jobs in jobs.
  readonly firstRow: Int32Array;
  readonly rowCount: Int32Array;
  readonly jobs: Int32Array;
}

export function createGoodsStore(arena: Arena, capacity: number): GoodsStore {
  const good = take(arena, Uint8Array, capacity, false);
  const ring = take(arena, Int32Array, capacity * FOOD_RING, false);
  const wasted = take(arena, Int32Array, capacity, false);
  const byteLength = arena.top - good.byteOffset;
  return {
    capacity,
    good,
    ring,
    wasted,
    byteOffset: good.byteOffset,
    byteLength,
    firstRow: take(arena, Int32Array, GOOD_COUNT, false),
    rowCount: take(arena, Int32Array, GOOD_COUNT, false),
    jobs: take(arena, Int32Array, GOOD_COUNT, false),
  };
}

// The ring index of the batch a firm made on day. A day before the first wraps, so day -1 is slot 15.
export function ringSlot(firm: number, day: number): number {
  return firm * FOOD_RING + (day & RING_MASK);
}

// Gives each good its share of the first `firms` rows, one row at least, in table order: the foods first, then cloth, tools
// and fuel. A firm row keeps its good for the life of the world, as an entrant takes over an exiting firm's row.
export function assignGoods(goods: GoodsStore, firms: number): void {
  const { good, firstRow, rowCount } = goods;
  splitByGood(firms, 1, rowCount);
  let row = 0;
  for (let kind = BREAD; kind <= FUEL; kind++) {
    firstRow[kind] = row;
    const end = row + rowCount[kind];
    for (; row < end; row++) good[row] = kind;
  }
}
