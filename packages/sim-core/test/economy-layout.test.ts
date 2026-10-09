import { describe, expect, it } from 'vitest';
import { LENGNICK, checkParams, type EconomyParams } from '../src/economy/params.ts';
import * as stats from '../src/economy/stats.ts';
import { TIER_AGENTS, TIER_FIRMS, type Tier } from '../src/memory/tiers.ts';
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

const TIERS: readonly Tier[] = ['phone', 'phone-plus', 'desktop'];

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
      stockHighPpm: 1_000_000,
      markupLowPpm: 25_000,
      markupHighPpm: 150_000,
      priceStepPpm: 20_000,
      priceChancePpm: 750_000,
      unitsPerWorkerDay: 3,
      bufferPpm: 100_000,
      demandFloor: 63,
      idleMonthsToExit: 3,
      fiatIssuePpm: 0,
      openingCash: 310_000,
      openingWage: 142_800,
      openingPrice: 2_500,
    });
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
    expect(ppm).toHaveLength(15);
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
  });
});

describe('the economy statistics', () => {
  it('number their slots from 0 without a gap or a repeat', () => {
    const slots = Object.entries(stats)
      .filter(([name]) => name.startsWith('STAT_'))
      .map(([, slot]) => slot);
    expect(slots.sort((a, b) => a - b)).toEqual(Array.from({ length: stats.STATS }, (_, slot) => slot));
    expect(stats.STATS).toBe(17);
  });
});
