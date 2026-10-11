import { describe, expect, it } from 'vitest';
import { SUPPLIERS } from '../src/agents/store.ts';
import { buyFood } from '../src/consumption/food.ts';
import { planConsumption } from '../src/consumption/plan.ts';
import { searchShops } from '../src/consumption/search.ts';
import { CITY } from '../src/economy/city.ts';
import { economyDay } from '../src/economy/economy.ts';
import type { EconomyParams } from '../src/economy/params.ts';
import { startEconomy } from '../src/economy/start.ts';
import {
  STAT_EATEN,
  STAT_GOOD_STOCK,
  STAT_MADE,
  STAT_SOLD,
  STAT_SOLD_CENTS,
  STAT_SPOILED,
  STAT_UNMET,
} from '../src/economy/stats.ts';
import { BREAD, MILK, PORTIONS_PER_DAY } from '../src/goods/goods.ts';
import { OK, checkCash } from '../src/money/invariants.ts';
import { issue, retire, walletAccount } from '../src/money/ledger.ts';
import { DAYS_PER_MONTH } from '../src/time/calendar.ts';
import { stateHash } from '../src/world/checkpoint.ts';
import { createWorld, type World } from '../src/world/world.ts';

const GOODS_CITY: EconomyParams = { ...CITY, goods: 1 };
// A town of one firm for each good and one worker each, where every household's links are the town's seven firms.
const SEVEN: EconomyParams = { ...GOODS_CITY, households: 7, firms: 7 };
const DAYS = 3 * DAYS_PER_MONTH;
const FOODS = [BREAD, BREAD + 1, BREAD + 2, MILK];
// A food firm posts a sixth of the preset's 3,200 at the start, floored.
const OPENING_PORTION_CENTS = 533;

function started(seed: number, params: EconomyParams): World {
  const world = createWorld(seed, 'phone', undefined, params.households);
  startEconomy(world, params);
  return world;
}

function foodStock(world: World): number[] {
  const stock: number[] = [];
  for (const good of FOODS) {
    let total = 0;
    for (let f = 0; f < world.firms.count[0]; f++) if (world.goods.good[f] === good) total += world.firms.stock[f];
    stock[good] = total;
  }
  return stock;
}

function setWallet(world: World, household: number, cents: number): void {
  const wallet = walletAccount(world.cash, household);
  const change = cents - world.cash.balance[wallet];
  if (change > 0) issue(world.cash, wallet, change);
  else retire(world.cash, wallet, -change);
}

describe('eating', () => {
  it('keeps every food exact for 63 days: made = sold + spoiled + the change in stock, and eaten = sold', () => {
    const world = started(42, GOODS_CITY);
    const stats = world.economyScratch.stats;
    const stock = foodStock(world);
    const totals = { eaten: 0, spoiled: 0, unmet: 0, cents: 0 };
    for (let day = 0; day < DAYS; day++) {
      economyDay(world, GOODS_CITY, day);
      let sold = 0;
      for (const good of FOODS) {
        const now = stats[STAT_GOOD_STOCK + good];
        const flows = stats[STAT_SOLD + good] + stats[STAT_SPOILED + good] + now - stock[good];
        expect(stats[STAT_MADE + good], `day ${day}, good ${good}`).toBe(flows);
        stock[good] = now;
        sold += stats[STAT_SOLD + good];
        totals.spoiled += stats[STAT_SPOILED + good];
        totals.cents += stats[STAT_SOLD_CENTS + good];
      }
      expect(stats[STAT_EATEN], `day ${day}`).toBe(sold);
      expect(stats[STAT_EATEN] + stats[STAT_UNMET], `day ${day}`).toBe(PORTIONS_PER_DAY * GOODS_CITY.households);
      totals.eaten += stats[STAT_EATEN];
      totals.unmet += stats[STAT_UNMET];
    }
    expect(checkCash(world.cash)).toBe(OK);
    // The identity is not met by zeros: food sold and spoiled both, and some portions went short.
    expect(totals.eaten).toBeGreaterThan(PORTIONS_PER_DAY * GOODS_CITY.households * DAYS * 0.9);
    expect(totals.spoiled).toBeGreaterThan(0);
    expect(totals.unmet).toBeGreaterThan(0);
    expect(totals.cents).toBeGreaterThan(totals.eaten * OPENING_PORTION_CENTS * 0.8);
  });

  it('logs the 3 portions of an empty wallet as unmet, and the rest of a short one', () => {
    const world = started(42, SEVEN);
    const stats = world.economyScratch.stats;
    setWallet(world, 3, 0);
    // Cash for one portion and 532 cents over, which buys no second at any shop.
    setWallet(world, 4, 2 * OPENING_PORTION_CENTS - 1);
    buyFood(world, 0);
    expect([stats[STAT_EATEN], stats[STAT_UNMET]]).toEqual([5 * PORTIONS_PER_DAY + 1, PORTIONS_PER_DAY + 2]);
    expect(world.cash.balance[walletAccount(world.cash, 4)]).toBe(OPENING_PORTION_CENTS - 1);
    expect(checkCash(world.cash)).toBe(OK);
  });

  it('replays to one hash, and does nothing in a world with goods off', () => {
    function hashAfter(params: EconomyParams): number {
      const world = started(7, params);
      for (let day = 0; day < DAYS_PER_MONTH; day++) economyDay(world, params, day);
      return stateHash(world);
    }
    expect(hashAfter(GOODS_CITY)).toBe(hashAfter(GOODS_CITY));
    expect(hashAfter(GOODS_CITY)).not.toBe(hashAfter({ ...CITY, goods: 0 }));

    const off = started(7, { ...CITY, goods: 0 });
    buyFood(off, 0);
    expect([off.economyScratch.stats[STAT_EATEN], off.economyScratch.stats[STAT_UNMET]]).toEqual([0, 0]);
  });
});

describe('planning and searching with goods', () => {
  const SET_ASIDE_CENTS = PORTIONS_PER_DAY * DAYS_PER_MONTH * OPENING_PORTION_CENTS;
  const GOODS_PRICE_CENTS = 3_200;

  it('sets aside a month of food at the food links before it plans a unit, to the cent', () => {
    const world = started(42, SEVEN);
    function planned(cents: number): number {
      setWallet(world, 0, cents);
      planConsumption(world, SEVEN);
      return world.agents.plannedUnits[0];
    }
    expect(SET_ASIDE_CENTS).toBe(33_579);
    expect([planned(SET_ASIDE_CENTS), planned(SET_ASIDE_CENTS + GOODS_PRICE_CENTS - 1)]).toEqual([0, 0]);
    expect(planned(SET_ASIDE_CENTS + GOODS_PRICE_CENTS)).toBe(1);
    // 310,000 cents leave 276,421 for goods at 3,200: (86.4)^0.9 is 55.3.
    expect(planned(SEVEN.openingCash)).toBe(55);
    expect(planned(0)).toBe(0);
  });

  it('replaces a link only with a firm of its own good, and moves links all the same', () => {
    const world = started(42, GOODS_CITY);
    const { agents, goods } = world;
    const links = GOODS_CITY.households * SUPPLIERS;
    const before = agents.suppliers.slice(0, links);
    const params = { ...GOODS_CITY, priceSearchPpm: 1_000_000, stockoutSearchPpm: 1_000_000 };
    for (let month = 0; month < 3; month++) {
      agents.stockedOut.fill((1 << SUPPLIERS) - 1, 0, GOODS_CITY.households);
      searchShops(world, params, month);
    }
    let moved = 0;
    let wrongGood = 0;
    for (let link = 0; link < links; link++) {
      if (goods.good[agents.suppliers[link]] !== (link % SUPPLIERS) + BREAD) wrongGood++;
      if (agents.suppliers[link] !== before[link]) moved++;
    }
    expect(wrongGood).toBe(0);
    expect(moved).toBeGreaterThan(links / 20);
  });
});
