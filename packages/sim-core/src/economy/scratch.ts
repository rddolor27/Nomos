import { take, type Arena } from '../memory/arena.ts';
import { STATS } from './stats.ts';

// The value agents/store.ts gives an agent with no employer.
const NO_FIRM = -1;

// A power of two, so a purchase's slot is its number under a mask.
export const PURCHASE_RING = 16;
const PURCHASE_MASK = PURCHASE_RING - 1;

// Working arrays the economy day reuses, outside the state hash. Each has one owner, named here. No system holds order,
// weights or shares between days, so spawn/ borrows all three before the first day.
export interface EconomyScratch {
  // Refilled by keyedShuffle just before each use.
  readonly order: Int32Array;
  // wealth/ and money/fiat.ts.
  readonly weights: Float64Array;
  readonly shares: Float64Array;
  // consumption/.
  readonly firmPrefix: Int32Array;
  // labour/.
  readonly firmTally: Int32Array;
  // wages/ writes each firm's pay per worker at a month's end, and firms/renew.ts reads it.
  readonly pay: Float64Array;
  // The economy day sets the day-end slots, and each system adds to its own.
  readonly stats: Float64Array;
  // economy/stats.ts: each person's month ends in a row out of work, and the employer and wage at the last year end.
  readonly spellMonths: Uint8Array;
  readonly yearEmployer: Int32Array;
  readonly yearWage: Float64Array;
  // 1 for a firm that exits with workers at this month's end: firms/renew.ts writes it, and labour/layoffs.ts reads it.
  readonly exiting: Uint8Array;
  // consumption/shop.ts: the day's last PURCHASE_RING purchases, for the app's table of trades. A purchase names the shop
  // that sold and never a buyer. purchaseCount[0] is how many the day has made, and purchase n sits in slot n mod the ring.
  readonly purchaseShop: Int32Array;
  readonly purchaseUnits: Int32Array;
  readonly purchaseCents: Float64Array;
  readonly purchaseCount: Int32Array;
}

export function createEconomyScratch(arena: Arena, agents: number, firms: number): EconomyScratch {
  const scratch: EconomyScratch = {
    order: take(arena, Int32Array, agents, false),
    weights: take(arena, Float64Array, agents, false),
    shares: take(arena, Float64Array, agents, false),
    firmPrefix: take(arena, Int32Array, firms, false),
    firmTally: take(arena, Int32Array, firms, false),
    pay: take(arena, Float64Array, firms, false),
    stats: take(arena, Float64Array, STATS, false),
    spellMonths: take(arena, Uint8Array, agents, false),
    yearEmployer: take(arena, Int32Array, agents, false),
    yearWage: take(arena, Float64Array, firms, false),
    exiting: take(arena, Uint8Array, firms, false),
    purchaseShop: take(arena, Int32Array, PURCHASE_RING, false),
    purchaseUnits: take(arena, Int32Array, PURCHASE_RING, false),
    purchaseCents: take(arena, Float64Array, PURCHASE_RING, false),
    purchaseCount: take(arena, Int32Array, 1, false),
  };
  // Nobody held a job at a year end that has not come yet, so no one is a stayer at the first.
  scratch.yearEmployer.fill(NO_FIRM);
  return scratch;
}

function purchaseSlot(purchase: number): number {
  return purchase & PURCHASE_MASK;
}

// shopDay opens each day with the ring empty.
export function clearPurchases(scratch: EconomyScratch): void {
  scratch.purchaseCount[0] = 0;
}

export function logPurchase(scratch: EconomyScratch, shop: number, units: number, cents: number): void {
  const purchase = scratch.purchaseCount[0];
  const slot = purchaseSlot(purchase);
  scratch.purchaseShop[slot] = shop;
  scratch.purchaseUnits[slot] = units;
  scratch.purchaseCents[slot] = cents;
  scratch.purchaseCount[0] = purchase + 1;
}

// Copies the purchases the ring holds, oldest first, into three arrays of PURCHASE_RING and zeroes the rest, so what is
// left of an earlier day never reads as a trade. Returns how many it holds.
export function copyPurchases(scratch: EconomyScratch, shop: Int32Array, units: Int32Array, cents: Float64Array): number {
  const made = scratch.purchaseCount[0];
  const held = Math.min(made, PURCHASE_RING);
  const oldest = made - held;
  for (let i = 0; i < held; i++) {
    const slot = purchaseSlot(oldest + i);
    shop[i] = scratch.purchaseShop[slot];
    units[i] = scratch.purchaseUnits[slot];
    cents[i] = scratch.purchaseCents[slot];
  }
  for (let i = held; i < PURCHASE_RING; i++) {
    shop[i] = 0;
    units[i] = 0;
    cents[i] = 0;
  }
  return held;
}
