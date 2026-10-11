// Seven goods, one to each supplier link (M2.4 Ruling 1), and good 0, the generic good of a world that runs with goods 0.
// A blob's link k sells good k + 1, and the firm rows of a good run together, in this table's order.
export const GENERIC = 0;
export const BREAD = 1;
export const VEGETABLES = 2;
export const FISH = 3;
export const MILK = 4;
export const CLOTH = 5;
export const TOOLS = 6;
export const FUEL = 7;
// The generic good counts too, so a column per good has GOOD_COUNT slots.
export const GOOD_COUNT = 8;

export const GOOD_NAMES: readonly string[] = ['Generic', 'Bread', 'Vegetables', 'Fish', 'Milk', 'Cloth', 'Tools', 'Fuel'];
// What a town calls a shop of each good, until buildings name them.
export const SHOP_NAMES: readonly string[] = [
  'Shop', 'Bakery', 'Greengrocer', 'Fishmonger', 'Dairy', 'Draper', 'Smithy', 'Fuel Store',
];

// Days a batch is on sale: R6's use-by days, ambient for bread and vegetables, cool for fish and milk (inference). The
// other goods are kept, so they hold 0.
export const DAYS_ON_SALE = Uint8Array.of(0, 4, 7, 3, 14, 0, 0, 0);

// A good's share of firm rows and of jobs, in parts of 10,000: 4.5% for each food, then 27.33, 27.33 and 27.34%.
export const SHARE_PER_10K = Int32Array.of(0, 450, 450, 450, 450, 2733, 2733, 2734);
const SHARE_UNIT = 10_000;
const LISTED_GOODS = FUEL - BREAD + 1;

// A worker makes 6 portions of food where one makes a unit of anything else (18 against 3), so a portion is priced at a
// sixth of a unit.
export const PORTIONS_PER_UNIT = 6;

export function isFood(good: number): boolean {
  return good >= BREAD && good <= MILK;
}

export function goodOfLink(link: number): number {
  return link + BREAD;
}

export function outputPerWorkerDay(good: number, unitsPerWorkerDay: number): number {
  return isFood(good) ? PORTIONS_PER_UNIT * unitsPerWorkerDay : unitsPerWorkerDay;
}

// The price a firm of this good opens at, from the unit price of the preset or the record.
export function openingPriceOf(good: number, unitPriceCents: number): number {
  return isFood(good) ? Math.floor(unitPriceCents / PORTIONS_PER_UNIT) : unitPriceCents;
}

// Splits total over goods 1 to 7 into out[1..7] by their shares. Each good starts at the floor of its share, or at least
// if that is more, and single units then go to the good furthest under its share, or come back from the one furthest
// over it, ties to the lower good. So 100 rows give 5, 5, 5, 4, 27, 27 and 27, and with least 1 and 7 rows or more every
// good holds one. A good's standing is total x share less its units x 10,000, exact below 2^53.
export function splitByGood(total: number, least: number, out: Int32Array | Float64Array): void {
  if (total < least * LISTED_GOODS) {
    throw new RangeError(`${total} cannot give each of ${LISTED_GOODS} goods ${least}`);
  }
  let placed = 0;
  for (let good = BREAD; good <= FUEL; good++) {
    out[good] = Math.max(least, Math.floor((total * SHARE_PER_10K[good]) / SHARE_UNIT));
    placed += out[good];
  }
  for (; placed < total; placed++) out[mostBehind(total, out)]++;
  for (; placed > total; placed--) out[mostAhead(total, out, least)]--;
}

function standing(total: number, units: number, good: number): number {
  return total * SHARE_PER_10K[good] - units * SHARE_UNIT;
}

function mostBehind(total: number, units: Int32Array | Float64Array): number {
  let best = BREAD;
  for (let good = BREAD + 1; good <= FUEL; good++) {
    if (standing(total, units[good], good) > standing(total, units[best], best)) best = good;
  }
  return best;
}

// Among the goods above least, so none is taken below it.
function mostAhead(total: number, units: Int32Array | Float64Array, least: number): number {
  let best = -1;
  for (let good = BREAD; good <= FUEL; good++) {
    if (units[good] > least && (best < 0 || standing(total, units[good], good) < standing(total, units[best], best))) {
      best = good;
    }
  }
  return best;
}
