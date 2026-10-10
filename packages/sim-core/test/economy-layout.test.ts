import { describe, expect, it } from 'vitest';
import { SUPPLIERS } from '../src/agents/store.ts';
import { CITY } from '../src/economy/city.ts';
import { LENGNICK, checkParams, type EconomyParams } from '../src/economy/params.ts';
import { createEconomyScratch } from '../src/economy/scratch.ts';
import * as stats from '../src/economy/stats.ts';
import { createFirmStore } from '../src/firms/store.ts';
import { PHONE_MEMORY_BYTES, reserveArena } from '../src/memory/arena.ts';
import { TIER_AGENTS, TIER_FIRMS, type Tier } from '../src/memory/tiers.ts';
import { firmAccount } from '../src/money/ledger.ts';
import {
  CULTURE,
  FESTIVAL,
  FIRM_DRAW,
  LABOUR_DRAW,
  PERSON_NAME,
  SHOP_DRAW,
  SPAWN,
  START_DRAW,
  STRIDE,
  WAGE_DRAW,
  WANDER,
  WEALTH_DRAW,
  layerOf,
} from '../src/random/streams.ts';
import { DAYS_PER_MONTH, dayOfMonth, monthOf } from '../src/time/calendar.ts';
import { checkpoint, restoreWorld, stateHash } from '../src/world/checkpoint.ts';
import { createWorld } from '../src/world/world.ts';

const TIERS: readonly Tier[] = ['phone', 'phone-plus', 'desktop'];

function isZeroed(column: ArrayBufferView): boolean {
  return new Uint8Array(column.buffer, column.byteOffset, column.byteLength).every((byte) => byte === 0);
}

function refuses(change: Partial<EconomyParams>, field: string, tier: Tier = 'phone'): void {
  const check = () => checkParams({ ...LENGNICK, ...change }, tier);
  expect(check, JSON.stringify(change)).toThrow(RangeError);
  expect(check, JSON.stringify(change)).toThrow(new RegExp(`^${field} `));
}

function accepts(change: Partial<EconomyParams>, tier: Tier = 'phone'): void {
  expect(() => checkParams({ ...LENGNICK, ...change }, tier), JSON.stringify(change)).not.toThrow();
}

describe('the economy month', () => {
  it('is 21 days, counted from 0', () => {
    expect(DAYS_PER_MONTH).toBe(21);
    expect([0, 20, 21, 41, 42].map(monthOf)).toEqual([0, 0, 1, 1, 2]);
    expect([0, 20, 21, 41, 42].map(dayOfMonth)).toEqual([0, 20, 0, 20, 0]);
    for (let day = 0; day < 1_000; day++) expect(monthOf(day) * DAYS_PER_MONTH + dayOfMonth(day)).toBe(day);
  });
});

describe('the economy streams', () => {
  it('give each drawing folder an agent stream of its own after PERSON_NAME', () => {
    const economy = [FIRM_DRAW, WAGE_DRAW, LABOUR_DRAW, SHOP_DRAW, WEALTH_DRAW, START_DRAW];
    expect(economy).toEqual([0x107, 0x108, 0x109, 0x10a, 0x10b, 0x10c]);
    expect(economy.map(layerOf)).toEqual(economy.map(() => 'agent'));
    const taken = [CULTURE, SPAWN, WANDER, STRIDE, FESTIVAL, PERSON_NAME];
    expect(new Set([...taken, ...economy]).size).toBe(taken.length + economy.length);
  });
});

describe('the economy parameters', () => {
  it("hold Lengnick's Table 1 and the replication's start, frozen", () => {
    expect(Object.isFrozen(LENGNICK)).toBe(true);
    expect(LENGNICK).toEqual({
      households: 1_000,
      firms: 100,
      priceSearchPpm: 250_000,
      cheaperPpm: 10_000,
      stockoutSearchPpm: 250_000,
      jobSearches: 5,
      onJobSearchPpm: 100_000,
      consumptionPowerPpm: 900_000,
      reservationCutPpm: 100_000,
      wageCutMonths: 24,
      wageStepPpm: 19_000,
      stockLowPpm: 250_000,
      stockHighPpm: 0,
      markupLowPpm: 25_000,
      markupHighPpm: 150_000,
      markupClamp: 0,
      priceStepPpm: 20_000,
      priceChancePpm: 750_000,
      unitsPerWorkerDay: 3,
      bufferPpm: 100_000,
      demandFloor: 63,
      idleMonthsToExit: 3,
      shortPayExitPpm: 0,
      slowSearcherPpm: 0,
      slowJobSearches: 5,
      fiatIssuePpm: 0,
      openingCash: 310_000,
      openingWage: 142_800,
      openingPrice: 2_500,
      burnInDays: 9_893,
    });
  });

  it('switch the city mechanisms off in the replication', () => {
    expect([LENGNICK.markupClamp, LENGNICK.shortPayExitPpm, LENGNICK.slowSearcherPpm]).toEqual([0, 0, 0]);
    // Its slow searchers would look as often as everyone else if the share were on.
    expect(LENGNICK.slowJobSearches).toBe(LENGNICK.jobSearches);
    // The top of the stock band is the excess over one month's demand, so 0 is a month.
    expect(LENGNICK.stockHighPpm).toBe(0);
  });

  it('pass the preset in every tier', () => {
    for (const tier of TIERS) accepts({}, tier);
  });

  it('take a whole town of households and one firm to ten, in each tier', () => {
    for (const tier of TIERS) {
      expect(TIER_FIRMS[tier] * 10).toBe(TIER_AGENTS[tier]);
      accepts({ households: TIER_AGENTS[tier], firms: TIER_FIRMS[tier] }, tier);
      refuses({ households: TIER_AGENTS[tier] + 1 }, 'households', tier);
      refuses({ firms: TIER_FIRMS[tier] + 1 }, 'firms', tier);
    }
    expect(TIER_FIRMS).toEqual({ phone: 1_000, 'phone-plus': 2_500, desktop: 10_000 });
  });

  it('need at least as many firms as a household has suppliers', () => {
    accepts({ firms: 7 });
    refuses({ firms: 6 }, 'firms');
  });

  it('keep every ppm field within 0 to 1,000,000 and fiat issue within 1% a month', () => {
    const ppm = Object.keys(LENGNICK).filter((field) => field.endsWith('Ppm')) as (keyof EconomyParams)[];
    expect(ppm).toHaveLength(17);
    for (const field of ppm) {
      const most = field === 'fiatIssuePpm' ? 10_000 : 1_000_000;
      // A markup of 0 on top, or of 100% below, leaves the opening price outside its band, which is checked on its own.
      if (field !== 'markupHighPpm') accepts({ [field]: 0 });
      if (field !== 'markupLowPpm') accepts({ [field]: most });
      refuses({ [field]: most + 1 }, field);
      refuses({ [field]: -1 }, field);
    }
  });

  it('keep a month count within the byte that counts it', () => {
    for (const field of ['wageCutMonths', 'idleMonthsToExit'] as const) {
      accepts({ [field]: 255 });
      refuses({ [field]: 256 }, field);
    }
  });

  it("keep a slow searcher's visits from 1 up to everyone else's, and the markup clamp a switch", () => {
    const some = { slowSearcherPpm: 100_000 };
    accepts({ ...some, slowJobSearches: 1 });
    accepts({ ...some, slowJobSearches: 5 });
    refuses({ ...some, slowJobSearches: 0 }, 'slowJobSearches');
    refuses({ ...some, slowJobSearches: 6 }, 'slowJobSearches');
    accepts({ ...some, jobSearches: 3, slowJobSearches: 3 });
    refuses({ ...some, jobSearches: 3 }, 'slowJobSearches');
    accepts({ markupClamp: 1 });
    refuses({ markupClamp: 2 }, 'markupClamp');
    refuses({ markupClamp: -1 }, 'markupClamp');
  });

  it("leave a slow searcher's visits unchecked where nobody is slow, so a grid can lower jobSearches alone", () => {
    accepts({ jobSearches: 3 });
    accepts({ slowJobSearches: 6 });
    // A single slow searcher in a million turns the check on.
    refuses({ slowSearcherPpm: 1, jobSearches: 3 }, 'slowJobSearches');
  });

  it('refuse a fractional or negative field, since cents and counts are whole', () => {
    refuses({ openingCash: 0.5 }, 'openingCash');
    refuses({ openingWage: -1 }, 'openingWage');
    refuses({ jobSearches: Number.NaN }, 'jobSearches');
    refuses({ demandFloor: 1.5 }, 'demandFloor');
  });

  it('price the opening goods inside the markup band over a month of one worker', () => {
    expect(DAYS_PER_MONTH * LENGNICK.unitsPerWorkerDay * LENGNICK.openingPrice).toBe(157_500);
    // At a wage of 63,000 the band is 64,575 to 72,450, which are 63 x 1,025 and 63 x 1,150 exactly.
    accepts({ openingWage: 63_000, openingPrice: 1_025 });
    accepts({ openingWage: 63_000, openingPrice: 1_150 });
    refuses({ openingWage: 63_000, openingPrice: 1_024 }, 'openingPrice');
    refuses({ openingWage: 63_000, openingPrice: 1_151 }, 'openingPrice');
    // At the preset's wage the band is 146,370 to 164,220, which no whole price meets exactly.
    accepts({ openingPrice: 2_324 });
    accepts({ openingPrice: 2_606 });
    refuses({ openingPrice: 2_323 }, 'openingPrice');
    refuses({ openingPrice: 2_607 }, 'openingPrice');
    expect(() => checkParams({ ...LENGNICK, openingPrice: 2_323 }, 'phone')).toThrow(
      "openingPrice prices a month's output at 146349 cents, outside the band 146370 to 164220",
    );
  });
});

describe('the city preset', () => {
  it('writes out every field of the replication, and changes the ones in the presets table', () => {
    expect(Object.isFrozen(CITY)).toBe(true);
    const changed = {
      stockLowPpm: 800_000,
      stockHighPpm: 600_000,
      markupLowPpm: 360_000,
      markupHighPpm: 500_000,
      markupClamp: 1,
      openingPrice: 3_200,
      priceChancePpm: 220_000,
      wageCutMonths: 25,
      onJobSearchPpm: 127_732,
      shortPayExitPpm: 0,
      slowSearcherPpm: 227_437,
      slowJobSearches: 1,
      burnInDays: 18_428,
    };
    expect(CITY).toEqual({ ...LENGNICK, ...changed });
    expect(Object.keys(CITY).sort()).toEqual(Object.keys(LENGNICK).sort());
  });

  it('passes in every tier, with closed money', () => {
    for (const tier of TIERS) expect(() => checkParams(CITY, tier), tier).not.toThrow();
    expect(CITY.fiatIssuePpm).toBe(0);
  });

  it('opens at 1.41 wages for a month of output, inside the markups of 1.36 to 1.50', () => {
    const monthPrice = DAYS_PER_MONTH * CITY.unitsPerWorkerDay * CITY.openingPrice;
    // The band is 142,800 + 36% = 194,208 to 142,800 + 50% = 214,200.
    expect(monthPrice).toBe(201_600);
    expect(monthPrice).toBeGreaterThanOrEqual(194_208);
    expect(monthPrice).toBeLessThanOrEqual(214_200);
  });
});

describe('the economy statistics', () => {
  const slotConstants = (): [string, number][] => {
    const found: [string, number][] = [];
    for (const [name, value] of Object.entries(stats)) {
      if (name.startsWith('STAT_') && typeof value === 'number') found.push([name, value]);
    }
    return found;
  };

  it('number their slots from 0 without a gap or a repeat', () => {
    const slots = slotConstants().map(([, slot]) => slot);
    expect(slots.sort((a, b) => a - b)).toEqual(Array.from({ length: stats.STATS }, (_, slot) => slot));
    expect(stats.STATS).toBe(29);
  });

  it('name every slot in flow-log schema 1, the levels first and then the flows', () => {
    expect(stats.FLOW_LOG_SCHEMA).toBe(1);
    expect(stats.STAT_NAMES).toEqual([
      'unemployed', 'vacancies', 'price_mean', 'wage_mean', 'household_cash', 'firm_cash', 'stock', 'size_squares',
      'size_cubes', 'sales_units', 'sales_cents', 'price_changes', 'price_change_ppm', 'hires', 'switches', 'firings',
      'wage_bill', 'profits_paid', 'exits', 'issued', 'produced', 'write_off', 'job_visits', 'above_markup',
      'spell_months', 'long_spells', 'stayers', 'stayer_cuts', 'taxes',
    ]);
    for (const [constant, slot] of slotConstants()) {
      expect(stats.STAT_NAMES[slot], constant).toBe(constant.slice('STAT_'.length).toLowerCase());
    }
  });

  it('clear the flows each morning and leave the levels as the last day set them', () => {
    const row = new Float64Array(stats.STATS).fill(7);
    stats.clearFlows(row);
    expect(Array.from(row.subarray(0, stats.STAT_SALES_UNITS))).toEqual(new Array(stats.STAT_SALES_UNITS).fill(7));
    expect(Array.from(row.subarray(stats.STAT_SALES_UNITS))).toEqual(new Array(stats.STATS - stats.STAT_SALES_UNITS).fill(0));
  });
});

describe('the firm store', () => {
  it('holds ten canonical columns of the kinds the economy needs, and a count', () => {
    const arena = reserveArena(PHONE_MEMORY_BYTES);
    const firms = createFirmStore(arena, 1_000);
    const kinds = {
      price: Float64Array,
      wage: Float64Array,
      stock: Int32Array,
      employees: Int32Array,
      demand: Int32Array,
      lastDemand: Int32Array,
      vacancy: Uint8Array,
      notice: Uint8Array,
      monthsFull: Uint8Array,
      idleMonths: Uint8Array,
    };
    for (const name of Object.keys(kinds) as (keyof typeof kinds)[]) {
      expect(firms[name], name).toBeInstanceOf(kinds[name]);
      expect(firms[name], name).toHaveLength(1_000);
    }
    const canonicalOffsets = arena.canonical.filter((_, i) => i % 2 === 0);
    for (const [name, column] of Object.entries(firms)) {
      if (ArrayBuffer.isView(column)) expect(canonicalOffsets, name).toContain(column.byteOffset);
    }
    expect([firms.capacity, firms.count[0]]).toEqual([1_000, 0]);
  });
});

describe('the economy scratch', () => {
  it('is sized by its owners and kept out of the hash', () => {
    const arena = reserveArena(PHONE_MEMORY_BYTES);
    const scratch = createEconomyScratch(arena, 500, 50);
    const shapes = {
      order: [Int32Array, 500],
      weights: [Float64Array, 500],
      shares: [Float64Array, 500],
      firmPrefix: [Int32Array, 50],
      firmTally: [Int32Array, 50],
      pay: [Float64Array, 50],
      stats: [Float64Array, stats.STATS],
      spellMonths: [Uint8Array, 500],
      yearEmployer: [Int32Array, 500],
      yearWage: [Float64Array, 50],
      exiting: [Uint8Array, 50],
    } as const;
    for (const name of Object.keys(shapes) as (keyof typeof shapes)[]) {
      const [kind, length] = shapes[name];
      expect(scratch[name], name).toBeInstanceOf(kind);
      expect(scratch[name], name).toHaveLength(length);
    }
    expect(arena.canonical).toEqual([]);
  });

  it("opens last year's employers as nobody's, so no one is a stayer before the first year end", () => {
    const { yearEmployer } = createEconomyScratch(reserveArena(PHONE_MEMORY_BYTES), 500, 50);
    expect(yearEmployer.every((employer) => employer === -1)).toBe(true);
  });
});

describe('the economy layout of a world', () => {
  it('gives every tier a firm slot to ten agent slots, a firm account to each, and scratch for its whole count', () => {
    for (const tier of TIERS) {
      const { cash, firms, economyScratch } = createWorld(42, tier, undefined, 10);
      expect(firms.capacity, tier).toBe(TIER_FIRMS[tier]);
      expect(cash.firstFirm - cash.firstWallet, tier).toBe(TIER_AGENTS[tier]);
      expect(cash.accounts - cash.firstFirm, tier).toBe(TIER_FIRMS[tier]);
      expect(economyScratch.order, tier).toHaveLength(TIER_AGENTS[tier]);
      expect(economyScratch.firmPrefix, tier).toHaveLength(TIER_FIRMS[tier]);
    }
  });

  it('starts a phone world with 1,000 empty firms, and every blob unemployed and unlinked', () => {
    const { agents, firms, cash, economyScratch } = createWorld(42, 'phone');
    const blobs = agents.count[0];
    expect(blobs).toBe(10_000);
    expect(firms.capacity).toBe(1_000);
    expect(agents.employer.subarray(0, blobs).every((employer) => employer === -1)).toBe(true);
    expect(agents.suppliers.subarray(0, blobs * SUPPLIERS).every((supplier) => supplier === -1)).toBe(true);
    const { yearEmployer, ...zeroScratch } = economyScratch;
    const zeroed = {
      ...firms,
      ...zeroScratch,
      reservationWage: agents.reservationWage,
      stockedOut: agents.stockedOut,
      plannedUnits: agents.plannedUnits,
      firmCash: cash.balance.subarray(cash.firstFirm),
    };
    for (const [name, column] of Object.entries(zeroed)) {
      if (ArrayBuffer.isView(column)) expect(isZeroed(column), name).toBe(true);
    }
    expect(yearEmployer.every((employer) => employer === -1)).toBe(true);
  });

  it('hashes the economy columns, firm rows and firm accounts, and skips the scratch', () => {
    const world = createWorld(42, 'phone', undefined, 10);
    const { agents, firms, cash, economyScratch } = world;
    const clean = stateHash(world);
    for (const [name, column] of Object.entries(economyScratch)) {
      column[3] = 7;
      expect(stateHash(world), name).toBe(clean);
    }
    const hashed = {
      employer: agents.employer,
      reservationWage: agents.reservationWage,
      suppliers: agents.suppliers,
      stockedOut: agents.stockedOut,
      plannedUnits: agents.plannedUnits,
      ...firms,
      firmCash: cash.balance.subarray(cash.firstFirm),
    };
    for (const [name, column] of Object.entries(hashed)) {
      if (!ArrayBuffer.isView(column)) continue;
      const cell = column as Int32Array;
      const was = cell[0];
      cell[0] = was + 1;
      expect(stateHash(world), name).not.toBe(clean);
      cell[0] = was;
    }
    expect(stateHash(world)).toBe(clean);
  });

  it('carries the economy state through a checkpoint, the scratch included', () => {
    const world = createWorld(42, 'phone', undefined, 10);
    world.agents.employer[2] = 5;
    world.agents.suppliers[SUPPLIERS + 3] = 4;
    world.agents.reservationWage[2] = 142_800;
    world.firms.count[0] = 6;
    world.firms.price[5] = 2_500;
    world.firms.idleMonths[5] = 2;
    world.cash.balance[firmAccount(world.cash, 5)] = 99;
    world.economyScratch.order[1] = 8;

    const restored = restoreWorld(42, 'phone', checkpoint(world));

    expect(stateHash(restored)).toBe(stateHash(world));
    expect(restored.agents.employer[2]).toBe(5);
    expect(restored.agents.suppliers[SUPPLIERS + 3]).toBe(4);
    expect(restored.agents.reservationWage[2]).toBe(142_800);
    expect([restored.firms.count[0], restored.firms.price[5], restored.firms.idleMonths[5]]).toEqual([6, 2_500, 2]);
    expect(restored.cash.balance[firmAccount(restored.cash, 5)]).toBe(99);
    expect(restored.economyScratch.order[1]).toBe(8);
  });
});
