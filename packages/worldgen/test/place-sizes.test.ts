import { describe, expect, it } from 'vitest';
import { buildSite } from '../src/place/build.ts';
import type { PlaceContext } from '../src/place/context.ts';

// M3.1 part 2, steps 1 and 2: places four times and more the size of the first ones, and crowds that follow population.
const TIERS: readonly (readonly [tier: string, size: readonly [number, number], crowd: readonly [number, number]])[] = [
  ['capital', [128, 80], [150, 300]],
  ['city', [128, 80], [150, 300]],
  ['town', [112, 64], [60, 120]],
  ['village', [80, 48], [25, 50]],
  ['hamlet', [56, 32], [10, 20]],
];
// A tier's smallest and largest settlement, as settle.py's tiers divide them: each tier spans a decade.
const POPULATIONS: Readonly<Record<string, readonly [number, number]>> = {
  capital: [50_000, 500_000],
  city: [50_000, 500_000],
  town: [5_000, 50_000],
  village: [500, 5_000],
  hamlet: [50, 500],
};

function context(tier: string, population: number): PlaceContext {
  return {
    seed: 0x5eed,
    name: tier,
    biome: 'grassland',
    temperature: 140,
    moisture: 140,
    tier,
    population,
    sea: '',
    coast: '',
    river: '',
    roads: 'ew',
    farmland: '',
    landmarks: [],
    wonder: null,
  };
}

describe('the size of a place and of its crowd', { timeout: 60_000 }, () => {
  it.each(TIERS)('lays %s out on %j tiles', (tier, size) => {
    const site = buildSite(context(tier, POPULATIONS[tier][0]));
    expect([site.w, site.h]).toEqual(size);
  });

  // Three parts the population, one part a keyed wobble that stays the same for one seed: the smallest settlement of a
  // tier draws from the first quarter of its band and the largest from the last.
  it.each(TIERS)('draws the crowd of %s from the low quarter of its band at its smallest, the high at its largest', (tier, _size, crowd) => {
    const [lo, hi] = crowd;
    const [smallest, largest] = POPULATIONS[tier];
    const small = buildSite(context(tier, smallest)).people.length;
    const large = buildSite(context(tier, largest)).people.length;
    expect(small).toBeGreaterThanOrEqual(lo);
    expect(small).toBeLessThanOrEqual(lo + Math.floor(((hi - lo) * 999) / 4000));
    expect(large).toBeGreaterThanOrEqual(lo + Math.floor(((hi - lo) * 3000) / 4000));
    expect(large).toBeLessThanOrEqual(hi);
  });

  it('keeps a crowd between its band and no smaller as the population grows, for one seed', () => {
    const counts = [50_000, 90_000, 150_000, 250_000, 400_000, 500_000, 900_000].map(
      (population) => buildSite(context('capital', population)).people.length,
    );
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(150);
    expect(Math.max(...counts)).toBeLessThanOrEqual(300);
  });
});
