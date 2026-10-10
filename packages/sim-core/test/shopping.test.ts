import { describe, expect, it } from 'vitest';
import { SUPPLIERS } from '../src/agents/store.ts';
import { planConsumption } from '../src/consumption/plan.ts';
import {
  PRICE_CHANCE,
  PRICE_FIRM,
  PRICE_LINK,
  STOCKOUT_CHANCE,
  STOCKOUT_FIRM,
  STOCKOUT_LINK,
  searchShops,
} from '../src/consumption/search.ts';
import { SHOP_ORDER, SHOP_VISIT, shopDay } from '../src/consumption/shop.ts';
import { LENGNICK, type EconomyParams } from '../src/economy/params.ts';
import { STAT_SALES_CENTS, STAT_SALES_UNITS } from '../src/economy/stats.ts';
import { OK, checkCash } from '../src/money/invariants.ts';
import { MINT, transfer, walletAccount } from '../src/money/ledger.ts';
import { draw2 } from '../src/random/draw.ts';
import { DAYS_PER_MONTH } from '../src/time/calendar.ts';
import { stateHash } from '../src/world/checkpoint.ts';
import { createWorld, type World } from '../src/world/world.ts';

const SEED = 42;
const TEST_STREAM = 0x7a;
const PRICE = 2_500;
const TWO_POW_32 = 4_294_967_296;
const FIRST_SEVEN = [0, 1, 2, 3, 4, 5, 6];
const NO_SEARCH: EconomyParams = { ...LENGNICK, priceSearchPpm: 0, stockoutSearchPpm: 0 };
const PRICE_ONLY: EconomyParams = { ...LENGNICK, priceSearchPpm: 1_000_000, stockoutSearchPpm: 0 };
const STOCKOUT_ONLY: EconomyParams = { ...LENGNICK, priceSearchPpm: 0, stockoutSearchPpm: 1_000_000 };

interface FirmSpec {
  price: number;
  stock: number;
  employees?: number;
}

function marketWorld(households: number, firms: readonly FirmSpec[]): World {
  const world = createWorld(SEED, 'phone', undefined, households);
  world.firms.count[0] = firms.length;
  firms.forEach(({ price, stock, employees = 0 }, row) => {
    world.firms.price[row] = price;
    world.firms.stock[row] = stock;
    world.firms.employees[row] = employees;
  });
  return world;
}

function setCash(world: World, household: number, cents: number): void {
  const wallet = walletAccount(world.cash, household);
  transfer(world.cash, MINT, wallet, cents - world.cash.balance[wallet]);
}

function cashOf(world: World, household: number): number {
  return world.cash.balance[walletAccount(world.cash, household)];
}

function linkTo(world: World, household: number, firms: readonly number[]): void {
  firms.forEach((firm, k) => {
    world.agents.suppliers[household * SUPPLIERS + k] = firm;
  });
}

function linksOf(world: World, household: number): number[] {
  return Array.from(world.agents.suppliers.subarray(household * SUPPLIERS, (household + 1) * SUPPLIERS));
}

function holders(world: World, households: number, firm: number): number {
  let count = 0;
  for (let i = 0; i < households; i++) if (linksOf(world, i).includes(firm)) count++;
  return count;
}

// A fixed seed makes every count repeat; the band, five SDs of a binomial, keeps a test from pinning one lucky count.
function expectShare(count: number, trials: number, share: number): void {
  const spread = 5 * Math.sqrt(trials * share * (1 - share));
  expect(Math.abs(count - trials * share)).toBeLessThanOrEqual(spread);
}

// Seven linked firms at linkedPrice with no workers, then the candidates at rows 7 and up.
function searchWorld(households: number, candidates: readonly FirmSpec[], linkedPrice = PRICE): World {
  const linked = FIRST_SEVEN.map(() => ({ price: linkedPrice, stock: 100 }));
  const world = marketWorld(households, [...linked, ...candidates]);
  for (let i = 0; i < households; i++) linkTo(world, i, FIRST_SEVEN);
  return world;
}

function onePlan(world: World, cash: number, price: number): number {
  for (const row of FIRST_SEVEN) world.firms.price[row] = price;
  setCash(world, 0, cash);
  planConsumption(world, LENGNICK);
  return world.agents.plannedUnits[0];
}

// The plan is floor(min((cash / price)^0.9, cash / price)) to within the log table's 0.35%, and the floor.
function nearPlan(plan: number, cash: number, price: number): boolean {
  const ratio = cash / price;
  const exact = Math.min(Math.pow(ratio, 0.9), ratio);
  return plan <= exact * 1.004 && plan >= exact * 0.996 - 1;
}

describe('the draw purposes on the shop stream', () => {
  it('differ, so no two draws share a key', () => {
    const purposes = [
      PRICE_CHANCE,
      PRICE_LINK,
      PRICE_FIRM,
      STOCKOUT_CHANCE,
      STOCKOUT_LINK,
      STOCKOUT_FIRM,
      SHOP_ORDER,
      SHOP_VISIT,
    ];
    expect(new Set(purposes).size).toBe(purposes.length);
  });
});

describe('planConsumption', () => {
  it('plans 76 units for the preset start, 310,000 cents at a price of 2,500', () => {
    const world = marketWorld(1, FIRST_SEVEN.map(() => ({ price: PRICE, stock: 0 })));
    linkTo(world, 0, FIRST_SEVEN);
    setCash(world, 0, LENGNICK.openingCash);
    planConsumption(world, LENGNICK);
    expect(world.agents.plannedUnits[0]).toBe(76);
  });

  it("prices the plan at the floor of the mean of the 7 suppliers' prices", () => {
    const prices = [2_500, 2_500, 2_500, 2_501, 2_501, 2_501, 2_501];
    const world = marketWorld(1, prices.map((price) => ({ price, stock: 0 })));
    linkTo(world, 0, FIRST_SEVEN);
    // The mean is 2,500.57, so 2,500 cents buy a unit at 2,500 and none at the rounded 2,501.
    setCash(world, 0, 2_500);
    planConsumption(world, LENGNICK);
    expect(world.agents.plannedUnits[0]).toBe(1);
    setCash(world, 0, 2_499);
    planConsumption(world, LENGNICK);
    expect(world.agents.plannedUnits[0]).toBe(0);
  });

  it('plans floor(cash / price) while the cash does not pass the price, and none for no cash', () => {
    const world = marketWorld(1, FIRST_SEVEN.map(() => ({ price: PRICE, stock: 0 })));
    linkTo(world, 0, FIRST_SEVEN);
    const plans = [0, 1, 2_499, 2_500].map((cash) => onePlan(world, cash, PRICE));
    expect(plans).toEqual([0, 0, 0, 1]);
  });

  it("reads each household's own suppliers and cash", () => {
    const firms = [...FIRST_SEVEN.map(() => ({ price: PRICE, stock: 0 })), ...FIRST_SEVEN.map(() => ({ price: 5_000, stock: 0 }))];
    const world = marketWorld(2, firms);
    linkTo(world, 0, FIRST_SEVEN);
    linkTo(world, 1, FIRST_SEVEN.map((row) => row + SUPPLIERS));
    setCash(world, 0, 310_000);
    setCash(world, 1, 310_000);
    planConsumption(world, LENGNICK);
    const [cheap, dear] = [world.agents.plannedUnits[0], world.agents.plannedUnits[1]];
    expect([cheap, dear]).toEqual([76, 41]);
    expect(nearPlan(dear, 310_000, 5_000)).toBe(true);
  });

  it('matches floor(min((m / P)^0.9, m / P)) from Math.pow within 0.4%, from 1 cent to 2^45', () => {
    const world = marketWorld(1, FIRST_SEVEN.map(() => ({ price: PRICE, stock: 0 })));
    linkTo(world, 0, FIRST_SEVEN);
    const outside: string[] = [];
    const pairs = Array.from({ length: 3_000 }, (_, i) => {
      const bits = 1 + (draw2(SEED, TEST_STREAM, i, 1) % 32);
      return {
        price: 1 + (draw2(SEED, TEST_STREAM, i, 0) % 100_000),
        cash: 1 + Math.floor((draw2(SEED, TEST_STREAM, i, 2) / TWO_POW_32) * 2 ** bits),
      };
    });
    pairs.push({ price: PRICE, cash: 2 ** 40 }, { price: 1_000_000, cash: 2 ** 45 });
    for (const { price, cash } of pairs) {
      const plan = onePlan(world, cash, price);
      if (!nearPlan(plan, cash, price)) outside.push(`cash ${cash} at ${price}: planned ${plan}`);
    }
    expect(outside).toEqual([]);
  });
});

describe('searchShops', () => {
  it('fills firmPrefix with the running sum of employees', () => {
    const employees = [3, 0, 2, 5, 0, 1, 4, 2];
    const world = marketWorld(1, employees.map((count) => ({ price: PRICE, stock: 0, employees: count })));
    searchShops(world, NO_SEARCH, 0);
    expect(Array.from(world.economyScratch.firmPrefix.subarray(0, 8))).toEqual([3, 3, 5, 10, 10, 11, 15, 17]);
  });

  it('clears every stock-out bit and moves no link when neither search runs', () => {
    const world = searchWorld(20, [{ price: 1, stock: 100, employees: 10 }]);
    world.agents.stockedOut.fill(0b1010101, 0, 20);
    searchShops(world, NO_SEARCH, 0);
    expect(world.agents.stockedOut.subarray(0, 20).every((bits) => bits === 0)).toBe(true);
    expect(linksOf(world, 7)).toEqual(FIRST_SEVEN);
  });

  describe('the cheaper-shop search', () => {
    const HOUSEHOLDS = 50;

    it('switches at a price 1% under the link and not a cent above', () => {
      const edge = searchWorld(HOUSEHOLDS, [{ price: 2_475, stock: 100, employees: 10 }]);
      searchShops(edge, PRICE_ONLY, 0);
      expect(holders(edge, HOUSEHOLDS, 7)).toBe(HOUSEHOLDS);
      const over = searchWorld(HOUSEHOLDS, [{ price: 2_476, stock: 100, employees: 10 }]);
      searchShops(over, PRICE_ONLY, 0);
      expect(holders(over, HOUSEHOLDS, 7)).toBe(0);
    });

    it('floors the 1% against the link, as every price step does', () => {
      // floor(0.01 * 2,550) is 25.
      const edge = searchWorld(HOUSEHOLDS, [{ price: 2_525, stock: 100, employees: 10 }], 2_550);
      searchShops(edge, PRICE_ONLY, 0);
      expect(holders(edge, HOUSEHOLDS, 7)).toBe(HOUSEHOLDS);
      const over = searchWorld(HOUSEHOLDS, [{ price: 2_526, stock: 100, employees: 10 }], 2_550);
      searchShops(over, PRICE_ONLY, 0);
      expect(holders(over, HOUSEHOLDS, 7)).toBe(0);
    });

    it('never duplicates a link, however often the same cheap firm is drawn', () => {
      const world = searchWorld(200, [{ price: 1, stock: 100, employees: 10 }]);
      for (let month = 0; month < 6; month++) searchShops(world, PRICE_ONLY, month);
      const bad: number[] = [];
      for (let i = 0; i < 200; i++) {
        const links = linksOf(world, i);
        if (new Set(links).size !== SUPPLIERS || links.filter((firm) => firm === 7).length !== 1) bad.push(i);
      }
      expect(bad).toEqual([]);
    });

    it('compares the new firm with one random link, not the dearest or the first', () => {
      const households = 1_000;
      const world = searchWorld(households, [{ price: 2_700, stock: 100, employees: 10 }]);
      world.firms.price[0] = 2_000;
      for (const row of FIRST_SEVEN.slice(1)) world.firms.price[row] = 3_000;
      searchShops(world, PRICE_ONLY, 0);
      // The link to firm 0 is under the newcomer's price, so it never moves, and the others always do.
      const kept = Array.from({ length: households }, (_, i) => linksOf(world, i)[0]);
      expect(kept.every((firm) => firm === 0)).toBe(true);
      expectShare(holders(world, households, 7), households, 6 / 7);
    });

    it('runs with the chance of its ppm', () => {
      const households = 4_000;
      const world = searchWorld(households, [{ price: 1, stock: 100, employees: 10 }]);
      searchShops(world, LENGNICK, 0);
      // LENGNICK also runs the stock-out search, which has no bits to act on here.
      expectShare(holders(world, households, 7), households, 0.25);
    });

    it('draws the new firm by its share of workers', () => {
      const households = 2_000;
      const shares = [1, 0, 3, 6];
      const world = searchWorld(
        households,
        shares.map((employees) => ({ price: 1, stock: 100, employees })),
      );
      searchShops(world, PRICE_ONLY, 0);
      const picks = shares.map((_, k) => holders(world, households, 7 + k));
      expect(picks[1]).toBe(0);
      expectShare(picks[0], households, 0.1);
      expectShare(picks[2], households, 0.3);
      expectShare(picks[3], households, 0.6);
    });

    it('draws uniformly when no firm has workers', () => {
      const households = 3_400;
      const world = searchWorld(
        households,
        Array.from({ length: 10 }, () => ({ price: 1, stock: 100 })),
      );
      searchShops(world, PRICE_ONLY, 0);
      for (let firm = 7; firm < 17; firm++) expectShare(holders(world, households, firm), households, 1 / 17);
    });
  });

  describe('the stock-out search', () => {
    const HOUSEHOLDS = 1_000;
    const SLOTS_1_AND_4 = 0b0010010;

    it('replaces one stocked-out link with a firm drawn by workers, whatever its price, and clears the bits', () => {
      const world = searchWorld(HOUSEHOLDS, [{ price: 5_000, stock: 100, employees: 10 }]);
      world.agents.stockedOut.fill(SLOTS_1_AND_4, 0, HOUSEHOLDS);
      searchShops(world, STOCKOUT_ONLY, 0);
      let slotOne = 0;
      const bad: number[] = [];
      for (let i = 0; i < HOUSEHOLDS; i++) {
        const links = linksOf(world, i);
        const changed = links.map((firm, k) => (firm === k ? -1 : k)).filter((k) => k >= 0);
        if (changed.length !== 1 || ![1, 4].includes(changed[0]) || links[changed[0]] !== 7) bad.push(i);
        if (changed[0] === 1) slotOne++;
      }
      expect(bad).toEqual([]);
      expectShare(slotOne, HOUSEHOLDS, 0.5);
      expect(world.agents.stockedOut.subarray(0, HOUSEHOLDS).every((bits) => bits === 0)).toBe(true);
    });

    it('leaves the links alone when nothing ran short', () => {
      const world = searchWorld(HOUSEHOLDS, [{ price: 1, stock: 100, employees: 10 }]);
      searchShops(world, STOCKOUT_ONLY, 0);
      expect(holders(world, HOUSEHOLDS, 7)).toBe(0);
    });

    it('counts a firm that is already linked as a miss', () => {
      const world = searchWorld(10, [{ price: 1, stock: 100, employees: 10 }]);
      for (let i = 0; i < 10; i++) linkTo(world, i, [7, 1, 2, 3, 4, 5, 6]);
      world.agents.stockedOut.fill(1 << 3, 0, 10);
      searchShops(world, STOCKOUT_ONLY, 0);
      expect(linksOf(world, 0)).toEqual([7, 1, 2, 3, 4, 5, 6]);
      expect(world.agents.stockedOut[0]).toBe(0);
    });
  });
});

interface LimitCase {
  name: string;
  cash: number;
  stock: number;
  units: number;
  cents: number;
  demand: number;
  shorts: number;
}

// Every case wants 10 units at 100 cents on day 0, from 7 firms of its own, so each firm's demand is its household's.
const LIMIT_CASES: readonly LimitCase[] = [
  { name: 'ample cash and stock', cash: 1_000_000, stock: 100, units: 10, cents: 1_000, demand: 10, shorts: 0 },
  { name: 'cash for exactly the day', cash: 1_000, stock: 100, units: 10, cents: 1_000, demand: 10, shorts: 0 },
  { name: 'cash for two units', cash: 250, stock: 100, units: 2, cents: 200, demand: 2, shorts: 0 },
  { name: 'cash a cent under one unit', cash: 99, stock: 100, units: 0, cents: 0, demand: 0, shorts: 0 },
  { name: 'one unit on every shelf', cash: 1_000_000, stock: 1, units: 7, cents: 700, demand: 49, shorts: 7 },
  { name: 'two units on every shelf', cash: 1_000_000, stock: 2, units: 10, cents: 1_000, demand: 30, shorts: 4 },
  { name: 'bare shelves', cash: 1_000_000, stock: 0, units: 0, cents: 0, demand: 70, shorts: 7 },
  { name: 'cash for two units, one on every shelf', cash: 250, stock: 1, units: 2, cents: 200, demand: 3, shorts: 1 },
];

function bitCount(bits: number): number {
  return FIRST_SEVEN.filter((k) => (bits >> k) & 1).length;
}

function limitWorld(): World {
  const firms = LIMIT_CASES.flatMap(({ stock }) => FIRST_SEVEN.map(() => ({ price: 100, stock })));
  const world = marketWorld(LIMIT_CASES.length, firms);
  LIMIT_CASES.forEach(({ cash }, c) => {
    linkTo(world, c, FIRST_SEVEN.map((k) => c * SUPPLIERS + k));
    setCash(world, c, cash);
    world.agents.plannedUnits[c] = 10 * DAYS_PER_MONTH;
  });
  return world;
}

function limitOutcome(world: World, c: number, stock: number): Omit<LimitCase, 'name' | 'cash' | 'stock'> {
  let units = 0;
  let demand = 0;
  for (const k of FIRST_SEVEN) {
    const row = c * SUPPLIERS + k;
    units += stock - world.firms.stock[row];
    demand += world.firms.demand[row];
  }
  return { units, cents: LIMIT_CASES[c].cash - cashOf(world, c), demand, shorts: bitCount(world.agents.stockedOut[c]) };
}

describe('shopDay', () => {
  it('buys the A6 schedule each day, and the days of a month add up to the plan', () => {
    const households = 60;
    const world = marketWorld(
      households,
      Array.from({ length: 10 }, () => ({ price: PRICE, stock: 100_000, employees: 10 })),
    );
    for (let i = 0; i < households; i++) {
      linkTo(world, i, FIRST_SEVEN.map((k) => (i + k) % 10));
      setCash(world, i, 30_000 + 40_000 * (i % 8));
    }
    planConsumption(world, LENGNICK);
    const plans = Array.from(world.agents.plannedUnits.subarray(0, households));
    const bought = plans.map(() => 0);
    const wrong: string[] = [];
    for (let j = 0; j < DAYS_PER_MONTH; j++) {
      const before = plans.map((_, i) => cashOf(world, i));
      shopDay(world, LENGNICK, 3 * DAYS_PER_MONTH + j);
      plans.forEach((plan, i) => {
        const units = (before[i] - cashOf(world, i)) / PRICE;
        if (units !== Math.floor(((j + 1) * plan) / DAYS_PER_MONTH) - Math.floor((j * plan) / DAYS_PER_MONTH)) {
          wrong.push(`household ${i} on day ${j} bought ${units} of a plan of ${plan}`);
        }
        bought[i] += units;
      });
      expect(checkCash(world.cash)).toBe(OK);
    }
    expect(wrong).toEqual([]);
    expect(bought).toEqual(plans);
    expect(Math.max(...plans)).toBeGreaterThan(DAYS_PER_MONTH);
    const total = plans.reduce((sum, plan) => sum + plan, 0);
    const { stats } = world.economyScratch;
    expect([stats[STAT_SALES_UNITS], stats[STAT_SALES_CENTS]]).toEqual([total, total * PRICE]);
    // A7: with ample stock, every household's ask is met, so the firms' demand is the units wanted.
    expect(world.firms.demand.subarray(0, 10).reduce((sum, units) => sum + units, 0)).toBe(total);
  });

  it('never sells past a buyer or a shelf, marks a stock-out with the right bit, and marks a cash shortfall with none', () => {
    const world = limitWorld();
    shopDay(world, LENGNICK, 0);
    const outcomes = LIMIT_CASES.map(({ stock }, c) => limitOutcome(world, c, stock));
    expect(outcomes).toEqual(LIMIT_CASES.map(({ units, cents, demand, shorts }) => ({ units, cents, demand, shorts })));
    LIMIT_CASES.forEach(({ stock }, c) => {
      for (const k of FIRST_SEVEN) {
        const row = c * SUPPLIERS + k;
        const supplied = stock - world.firms.stock[row];
        expect(world.firms.stock[row]).toBeGreaterThanOrEqual(0);
        // Bit k is set exactly when supplier k was asked for more than it supplied.
        expect((world.agents.stockedOut[c] >> k) & 1).toBe(world.firms.demand[row] > supplied ? 1 : 0);
      }
    });
    expect(LIMIT_CASES.every((_, c) => cashOf(world, c) >= 0)).toBe(true);
    expect(checkCash(world.cash)).toBe(OK);
    const { stats } = world.economyScratch;
    const units = LIMIT_CASES.reduce((sum, row) => sum + row.units, 0);
    expect([stats[STAT_SALES_UNITS], stats[STAT_SALES_CENTS]]).toEqual([units, units * 100]);
  });

  it('gives the last unit to a different shopper as the day changes, so the lower index does not always win', () => {
    const days = 60;
    const world = marketWorld(2, [{ price: 100, stock: 0 }, ...FIRST_SEVEN.slice(1).map(() => ({ price: 100, stock: 0 }))]);
    for (let i = 0; i < 2; i++) {
      linkTo(world, i, FIRST_SEVEN);
      world.agents.plannedUnits[i] = DAYS_PER_MONTH;
    }
    let lowerWins = 0;
    for (let day = 0; day < days; day++) {
      world.firms.stock[0] = 1;
      setCash(world, 0, 10_000);
      setCash(world, 1, 10_000);
      shopDay(world, LENGNICK, day);
      const buyers = [0, 1].filter((i) => cashOf(world, i) < 10_000);
      expect(buyers, `day ${day}`).toHaveLength(1);
      if (buyers[0] === 0) lowerWins++;
    }
    expectShare(lowerWins, days, 0.5);
    expect(lowerWins).toBeGreaterThan(0);
    expect(lowerWins).toBeLessThan(days);
  });

  it('stops at 95% met and goes on below it', () => {
    const world = marketWorld(1, FIRST_SEVEN.map(() => ({ price: 100, stock: 19 })));
    linkTo(world, 0, FIRST_SEVEN);
    setCash(world, 0, 100_000);
    world.agents.plannedUnits[0] = 20 * DAYS_PER_MONTH;
    shopDay(world, LENGNICK, 0);
    // 19 of 20 is 95%: one supplier is drained, asked for 20, and the other six are never visited.
    expect(Array.from(world.firms.stock.subarray(0, 7)).sort((a, b) => a - b)).toEqual([0, 19, 19, 19, 19, 19, 19]);
    expect(Array.from(world.firms.demand.subarray(0, 7)).sort((a, b) => a - b)).toEqual([0, 0, 0, 0, 0, 0, 20]);

    const again = marketWorld(1, FIRST_SEVEN.map(() => ({ price: 100, stock: 19 })));
    linkTo(again, 0, FIRST_SEVEN);
    setCash(again, 0, 100_000);
    again.agents.plannedUnits[0] = 21 * DAYS_PER_MONTH;
    shopDay(again, LENGNICK, 0);
    // 19 of 21 is 90%, so a second supplier is asked for the last 2.
    expect(Array.from(again.firms.stock.subarray(0, 7)).sort((a, b) => a - b)).toEqual([0, 17, 19, 19, 19, 19, 19]);
    expect(Array.from(again.firms.demand.subarray(0, 7)).sort((a, b) => a - b)).toEqual([0, 0, 0, 0, 0, 2, 21]);
  });

  it('finds the one supplier with stock, wherever its link sits', () => {
    for (const k of FIRST_SEVEN) {
      const world = marketWorld(1, FIRST_SEVEN.map((row) => ({ price: 100, stock: row === k ? 5 : 0 })));
      linkTo(world, 0, FIRST_SEVEN);
      world.agents.plannedUnits[0] = DAYS_PER_MONTH;
      for (let day = 0; day < 20; day++) {
        world.firms.stock[k] = 5;
        setCash(world, 0, 1_000);
        shopDay(world, LENGNICK, day);
        expect(cashOf(world, 0), `link ${k}, day ${day}`).toBe(900);
      }
    }
  });

  it('visits the 7 links in each of 42 orders', () => {
    const days = 2_100;
    const world = marketWorld(1, FIRST_SEVEN.map(() => ({ price: 100, stock: 1 })));
    linkTo(world, 0, FIRST_SEVEN);
    world.agents.plannedUnits[0] = 2 * DAYS_PER_MONTH;
    const orders = new Map<number, number>();
    for (let day = 0; day < days; day++) {
      world.firms.stock.fill(1, 0, 7);
      world.firms.demand.fill(0, 0, 7);
      setCash(world, 0, 100_000);
      shopDay(world, LENGNICK, day);
      // Two units wanted: the first link is asked for 2 and supplies 1, then the second is asked for the last 1.
      const first = Array.from(world.firms.demand.subarray(0, 7)).indexOf(2);
      const second = Array.from(world.firms.demand.subarray(0, 7)).indexOf(1);
      orders.set(first * SUPPLIERS + second, (orders.get(first * SUPPLIERS + second) ?? 0) + 1);
    }
    expect(orders.size).toBe(SUPPLIERS * (SUPPLIERS - 1));
    for (const count of orders.values()) expectShare(count, days, 1 / 42);
  });
});

const REPLAY_HOUSEHOLDS = 200;
const REPLAY_FIRMS = 40;

function shelfOf(firm: number): number {
  return 14 + (firm % 17);
}

// Three months in a market a little short of the households' wants: wages are put back each month and the shelves each
// day, so some suppliers run short and both searches move links.
function replayWorld(): World {
  const firms = Array.from({ length: REPLAY_FIRMS }, (_, f) => ({
    price: 2_300 + 10 * (f % 41),
    stock: shelfOf(f),
    employees: 1 + (f % 5),
  }));
  const world = marketWorld(REPLAY_HOUSEHOLDS, firms);
  for (let i = 0; i < REPLAY_HOUSEHOLDS; i++) linkTo(world, i, FIRST_SEVEN.map((k) => (3 * i + 5 * k) % REPLAY_FIRMS));
  for (let month = 0; month < 3; month++) {
    for (let i = 0; i < REPLAY_HOUSEHOLDS; i++) setCash(world, i, LENGNICK.openingCash);
    searchShops(world, LENGNICK, month);
    planConsumption(world, LENGNICK);
    for (let j = 0; j < DAYS_PER_MONTH; j++) {
      for (let f = 0; f < REPLAY_FIRMS; f++) world.firms.stock[f] = shelfOf(f);
      shopDay(world, LENGNICK, month * DAYS_PER_MONTH + j);
    }
    expect(checkCash(world.cash)).toBe(OK);
  }
  return world;
}

function checksum(values: ArrayLike<number>, from: number, count: number): number {
  let sum = 0;
  for (let i = from; i < from + count; i++) sum = (Math.imul(sum, 31) + values[i]) >>> 0;
  return sum;
}

describe('the consumption replay', () => {
  it('repeats to the same hash, and pins three months at seed 42', () => {
    const [first, second] = [replayWorld(), replayWorld()];
    expect(stateHash(second)).toBe(stateHash(first));
    const { stats } = first.economyScratch;
    const { suppliers } = first.agents;
    // The links, the households' leftover cash and the firms' demand all depend on who reached a shelf first.
    expect([
      stats[STAT_SALES_UNITS],
      stats[STAT_SALES_CENTS],
      checksum(suppliers, 0, REPLAY_HOUSEHOLDS * SUPPLIERS),
      checksum(first.cash.balance, first.cash.firstWallet, REPLAY_HOUSEHOLDS),
      checksum(first.firms.demand, 0, REPLAY_FIRMS),
    ]).toEqual([45_590, 113_797_820, 1_944_476_838, 1_934_495_892, 223_536_417]);
  });
});
