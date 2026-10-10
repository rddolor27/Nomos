import { describe, expect, it } from 'vitest';
import { economyDay } from '../src/economy/economy.ts';
import { LENGNICK } from '../src/economy/params.ts';
import { startEconomy } from '../src/economy/start.ts';
import { firmAccount, transfer, walletAccount } from '../src/money/ledger.ts';
import { foldToLedger } from '../src/spawn/fold.ts';
import {
  LEDGER_EMPLOYED,
  LEDGER_FIELDS,
  LEDGER_FIRMS,
  LEDGER_FIRM_CASH,
  LEDGER_HOUSEHOLDS,
  LEDGER_HOUSEHOLD_CASH,
  LEDGER_PRICE,
  LEDGER_STOCK,
  LEDGER_UNEMPLOYED,
  LEDGER_WAGE,
  checkRecord,
  populationOf,
} from '../src/spawn/record.ts';
import { DAYS_PER_MONTH } from '../src/time/calendar.ts';
import { stateHash } from '../src/world/checkpoint.ts';
import { OPENING_CENTS, createWorld, type World } from '../src/world/world.ts';

const HOUSEHOLD_CASH = LENGNICK.households * LENGNICK.openingCash;
// Households of 1 to 6, employed, unemployed, firms, the two cash fields, price, wage and stock.
const LENGNICK_RECORD = [1_000, 0, 0, 0, 0, 0, 1_000, 0, 100, 310_000_000, 0, 2_500, 142_800, 3_000];

function startedWorld(seed: number): World {
  const world = createWorld(seed, 'phone', undefined, LENGNICK.households);
  startEconomy(world, LENGNICK);
  return world;
}

function folded(world: World): Float64Array {
  const record = new Float64Array(LEDGER_FIELDS);
  foldToLedger(world, record);
  return record;
}

function withFields(base: Float64Array, edits: Record<number, number>): Float64Array {
  const record = Float64Array.from(base);
  for (const [field, value] of Object.entries(edits)) record[Number(field)] = value;
  return record;
}

describe('the ledger record', () => {
  it('has 14 fields, the six household sizes first', () => {
    const fields = [
      LEDGER_HOUSEHOLDS,
      LEDGER_EMPLOYED,
      LEDGER_UNEMPLOYED,
      LEDGER_FIRMS,
      LEDGER_HOUSEHOLD_CASH,
      LEDGER_FIRM_CASH,
      LEDGER_PRICE,
      LEDGER_WAGE,
      LEDGER_STOCK,
    ];
    expect(fields).toEqual([0, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(LEDGER_FIELDS).toBe(14);
  });

  it('counts a population of s people for every household of s', () => {
    const record = new Float64Array(LEDGER_FIELDS);
    record.set([3, 2, 1, 0, 0, 1]);
    expect(populationOf(record)).toBe(3 * 1 + 2 * 2 + 1 * 3 + 1 * 6);
  });
});

describe('foldToLedger', () => {
  it('folds the LENGNICK start into its exact record', () => {
    expect(Array.from(folded(startedWorld(1)))).toEqual(LENGNICK_RECORD);
    expect(Array.from(folded(startedWorld(2)))).toEqual(LENGNICK_RECORD);
  });

  it('reads sizes, employers, wallets, firm accounts, prices, wages and stock', () => {
    const world = startedWorld(1);
    const { households, agents, firms, cash } = world;
    households.size.set([2, 6, 3, 2]);
    agents.employer[5] = -1;
    agents.employer[6] = -1;
    transfer(cash, walletAccount(cash, 1), firmAccount(cash, 3), 1_234);
    firms.price[0] += 99;
    firms.wage[0] += 99;
    firms.stock[0] += 5;

    const record = folded(world);

    expect(Array.from(record.subarray(LEDGER_HOUSEHOLDS, LEDGER_EMPLOYED))).toEqual([996, 2, 1, 0, 0, 1]);
    expect([record[LEDGER_EMPLOYED], record[LEDGER_UNEMPLOYED]]).toEqual([998, 2]);
    expect([record[LEDGER_HOUSEHOLD_CASH], record[LEDGER_FIRM_CASH]]).toEqual([HOUSEHOLD_CASH - 1_234, 1_234]);
    // 2,500.99 and 142,800.99 round down.
    expect([record[LEDGER_PRICE], record[LEDGER_WAGE], record[LEDGER_STOCK]]).toEqual([2_500, 142_800, 3_005]);
  });

  it('writes price and wage as 0 with no firms, and counts blobs with no household rows', () => {
    const world = createWorld(1, 'phone', undefined, 10);
    expect(Array.from(folded(world))).toEqual([0, 0, 0, 0, 0, 0, 0, 10, 0, 10 * OPENING_CENTS, 0, 0, 0, 0]);
  });

  it('overwrites every field of a used record, and only reads the world', () => {
    const world = startedWorld(1);
    const hash = stateHash(world);
    const record = new Float64Array(LEDGER_FIELDS).fill(7);
    foldToLedger(world, record);
    expect(Array.from(record)).toEqual(LENGNICK_RECORD);
    foldToLedger(world, record);
    expect(Array.from(record)).toEqual(LENGNICK_RECORD);
    expect(stateHash(world)).toBe(hash);
  });

  it('keeps the money and the people exact over 63 days of closed money', () => {
    const world = startedWorld(1);
    for (let day = 0; day < 3 * DAYS_PER_MONTH; day++) economyDay(world, LENGNICK, day);
    const record = folded(world);
    expect(record[LEDGER_HOUSEHOLD_CASH] + record[LEDGER_FIRM_CASH]).toBe(HOUSEHOLD_CASH);
    expect(record[LEDGER_EMPLOYED] + record[LEDGER_UNEMPLOYED]).toBe(LENGNICK.households);
    expect(() => checkRecord(record, world)).not.toThrow();
  });
});

describe('checkRecord', () => {
  const world = startedWorld(1);
  const base = folded(world);

  function refuses(edits: Record<number, number>, message: RegExp): void {
    const record = withFields(base, edits);
    expect(() => checkRecord(record, world), JSON.stringify(edits)).toThrow(RangeError);
    expect(() => checkRecord(record, world), JSON.stringify(edits)).toThrow(message);
  }

  function accepts(edits: Record<number, number>): void {
    expect(() => checkRecord(withFields(base, edits), world), JSON.stringify(edits)).not.toThrow();
  }

  it('passes the fold of the LENGNICK start', () => {
    expect(() => checkRecord(base, world)).not.toThrow();
  });

  it('refuses a field that is not a whole number of 0 or more, naming it', () => {
    refuses({ [LEDGER_PRICE]: 2_500.5 }, /^price must be a whole number of 0 or more, not 2500\.5/);
    refuses({ [LEDGER_FIRM_CASH]: -1 }, /^firmCash must be a whole number of 0 or more, not -1/);
    refuses({ [LEDGER_STOCK]: Number.NaN }, /^stock must be a whole number of 0 or more, not NaN/);
    refuses({ [LEDGER_HOUSEHOLDS + 2]: 1.5 }, /^householdsOf3 must be a whole number/);
    refuses({ [LEDGER_UNEMPLOYED]: Number.POSITIVE_INFINITY }, /^unemployed must be a whole number/);
  });

  it('refuses a short record, naming its first missing field', () => {
    expect(() => checkRecord(base.subarray(0, LEDGER_FIELDS - 1), world)).toThrow(/^stock must be a whole number/);
  });

  it('refuses a population of 0 or past the agent slots', () => {
    refuses({ [LEDGER_HOUSEHOLDS]: 0, [LEDGER_EMPLOYED]: 0 }, /^population must be 1 to 10000, not 0/);
    refuses({ [LEDGER_HOUSEHOLDS]: 10_001, [LEDGER_EMPLOYED]: 10_001 }, /^population must be 1 to 10000, not 10001/);
    accepts({ [LEDGER_HOUSEHOLDS]: 10_000, [LEDGER_EMPLOYED]: 10_000 });
    accepts({ [LEDGER_HOUSEHOLDS]: 7, [LEDGER_EMPLOYED]: 7, [LEDGER_FIRMS]: 7 });
  });

  it('refuses employed and unemployed that do not add up to the population', () => {
    refuses({ [LEDGER_UNEMPLOYED]: 1 }, /^employed \+ unemployed must equal the population 1000, not 1001/);
    refuses({ [LEDGER_EMPLOYED]: 999 }, /^employed \+ unemployed must equal the population 1000, not 999/);
    accepts({ [LEDGER_EMPLOYED]: 400, [LEDGER_UNEMPLOYED]: 600 });
  });

  it('refuses fewer firms than suppliers, and more than the people or the firm slots', () => {
    refuses({ [LEDGER_FIRMS]: 6 }, /^firms must be 7 to 1000, not 6/);
    accepts({ [LEDGER_FIRMS]: 7 });
    const small = { [LEDGER_HOUSEHOLDS]: 500, [LEDGER_EMPLOYED]: 500 };
    refuses({ ...small, [LEDGER_FIRMS]: 501 }, /^firms must be 7 to 500, not 501/);
    accepts({ ...small, [LEDGER_FIRMS]: 500 });
    const large = { [LEDGER_HOUSEHOLDS]: 2_000, [LEDGER_EMPLOYED]: 2_000 };
    refuses({ ...large, [LEDGER_FIRMS]: 1_001 }, /^firms must be 7 to 1000, not 1001/);
    accepts({ ...large, [LEDGER_FIRMS]: 1_000 });
  });

  it('refuses a price or a wage under 100 cents, which would draw a price of 0', () => {
    refuses({ [LEDGER_PRICE]: 99 }, /^price must be 100 or more, not 99/);
    refuses({ [LEDGER_WAGE]: 99 }, /^wage must be 100 or more, not 99/);
    accepts({ [LEDGER_PRICE]: 100, [LEDGER_WAGE]: 100 });
  });

  it('refuses stock past an Int32 and cash past the exact cents, counting both cash fields together', () => {
    refuses({ [LEDGER_STOCK]: 2 ** 31 }, /^stock must be 2147483647 or less, not 2147483648/);
    accepts({ [LEDGER_STOCK]: 2 ** 31 - 1 });
    const exact = Number.MAX_SAFE_INTEGER;
    const pastExact = /^householdCash \+ firmCash must be 9007199254740991 or less/;
    refuses({ [LEDGER_HOUSEHOLD_CASH]: exact + 1, [LEDGER_FIRM_CASH]: 0 }, pastExact);
    refuses({ [LEDGER_HOUSEHOLD_CASH]: 0, [LEDGER_FIRM_CASH]: exact + 1 }, pastExact);
    refuses({ [LEDGER_HOUSEHOLD_CASH]: 2 ** 52, [LEDGER_FIRM_CASH]: 2 ** 52 }, /not 4503599627370496 \+ 4503599627370496/);
    refuses({ [LEDGER_HOUSEHOLD_CASH]: exact - 4, [LEDGER_FIRM_CASH]: 5 }, pastExact);
    accepts({ [LEDGER_HOUSEHOLD_CASH]: exact - 5, [LEDGER_FIRM_CASH]: 5 });
  });

  it('refuses a price whose total over the firms passes the exact cents', () => {
    // floor((2^53 - 1) / 100), the most a price may be across the record's 100 firms.
    const most = 90_071_992_547_409;
    accepts({ [LEDGER_PRICE]: most });
    refuses({ [LEDGER_PRICE]: most + 1 }, /^price x firms must be 9007199254740991 or less, not 90071992547410 x 100$/);
  });

  it('refuses a record folded from a household row of the wrong size', () => {
    const corrupt = startedWorld(1);
    corrupt.households.size[0] = 7;
    expect(() => checkRecord(folded(corrupt), corrupt)).toThrow(/^employed \+ unemployed must equal the population 999/);
  });
});
