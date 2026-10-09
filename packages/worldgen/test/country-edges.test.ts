import { BIOME_NAMES, TIER_NAMES } from '@nomos/sim-protocol/world-map';
import { describe, expect, it } from 'vitest';
import { capitals, found } from '../src/countries/countries.ts';
import { WATER } from '../src/countries/grow.ts';
import type { Settlement } from '../src/settle/settle.ts';

// Choices the 200 golden worlds barely or never see: flipping any one of them leaves nearly every golden fingerprint
// unchanged. Every expected value is what tools/worldgen/countries.py returns for the same input: found and capitals.
// found runs on a strip of grassland one cell high with no rivers, and seed 4 draws three countries on it. Places are
// listed most populous first, as settle hands them over, since the candidates keep that order.
const WIDTH = 31;
const SEED = 4;

type TierName = (typeof TIER_NAMES)[number];
type Place = readonly [x: number, tier: TierName];
type Point = readonly [x: number, y: number, tier: TierName];

function settlementsAt(points: readonly Point[]): Settlement[] {
  return points.map(([x, y, tier], id) => ({
    id,
    x,
    y,
    tier: TIER_NAMES.indexOf(tier),
    population: 1_000_000 - id,
    uid: y * WIDTH + x,
    landmarks: [],
  }));
}

// Who the capitals are, which country each cell ends up in, and every place's tier afterwards.
function stripOf(places: readonly Place[]) {
  const settlements = settlementsAt(places.map(([x, tier]) => [x, 0, tier] as const));
  const grassland = new Uint8Array(WIDTH).fill(BIOME_NAMES.indexOf('grassland'));
  const { country, countries } = found(
    SEED,
    WIDTH,
    1,
    grassland,
    new Uint8Array(WIDTH),
    new Int32Array(WIDTH).fill(-1),
    settlements,
    WIDTH,
  );
  return {
    capitals: countries.map((c) => c.capital),
    country: Array.from(country).join(''),
    tiers: settlements.map((s) => TIER_NAMES[s.tier]),
  };
}

describe('the country rules the goldens barely see', () => {
  it('passes over the last of two small countries, not the first', () => {
    // Capitals go to the places at 0, 9 and 20. The city's country holds one place and the town's two, so both are
    // small. The town, the least populous, goes first, and the two countries left hold three places each. Passing over
    // the city first instead leaves the town's country at two places, which goes next, and a single country.
    const places: Place[] = [
      [0, 'capital'], [9, 'city'], [20, 'town'],
      [1, 'village'], [2, 'village'], [25, 'village'],
    ];
    expect(stripOf(places)).toEqual({
      capitals: [0, 1],
      country: '1111122222222222222222222222222',
      tiers: ['capital', 'capital', 'town', 'village', 'village', 'village'],
    });
  });

  it('never passes over the first country, however few places it holds', () => {
    // The capital's country, cells 0 to 7, holds only the capital, and the other two hold four places each. Without the
    // guard the capital itself is passed over and two countries are left.
    const places: Place[] = [
      [0, 'capital'], [15, 'city'], [30, 'town'],
      [13, 'village'], [14, 'village'], [16, 'village'], [27, 'village'], [28, 'village'], [29, 'village'],
    ];
    expect(stripOf(places)).toEqual({
      capitals: [0, 1, 2],
      country: '1111111122222222222222233333333',
      tiers: ['capital', 'capital', 'capital', 'village', 'village', 'village', 'village', 'village', 'village'],
    });
  });

  it('leaves a country of exactly three places alone', () => {
    // All three countries hold three places. Counting three as small would pass over the town.
    const places: Place[] = [
      [0, 'capital'], [15, 'city'], [30, 'town'],
      [1, 'village'], [2, 'village'], [14, 'village'], [16, 'village'], [28, 'village'], [29, 'village'],
    ];
    expect(stripOf(places)).toEqual({
      capitals: [0, 1, 2],
      country: '1111111122222222222222233333333',
      tiers: ['capital', 'capital', 'capital', 'village', 'village', 'village', 'village', 'village', 'village'],
    });
  });

  it('passes over a country of two places', () => {
    // The same, with the village at 28 gone: the town's country holds two places, so the town is passed over and the
    // city's country takes its cells. Needing only two places would keep the town.
    const places: Place[] = [
      [0, 'capital'], [15, 'city'], [30, 'town'],
      [1, 'village'], [2, 'village'], [14, 'village'], [16, 'village'], [29, 'village'],
    ];
    expect(stripOf(places)).toEqual({
      capitals: [0, 1],
      country: '1111111122222222222222222222222',
      tiers: ['capital', 'capital', 'town', 'village', 'village', 'village', 'village', 'village'],
    });
  });

  it('takes a place at exactly the spacing from a capital', () => {
    // 50 cells of land and two countries make a spacing of 5, and the town at (3, 4) is exactly 5 from the capital.
    // Rejecting an exact fit would skip it for the town at (4, 4), a little over 5 away.
    expect(capitals(settlementsAt([[0, 0, 'capital'], [3, 4, 'town'], [4, 4, 'town']]), 2, 50)).toEqual([0, 1]);
  });

  it('returns every town or larger, in id order, when fewer than k can be found', () => {
    // Five capitals are wanted but the village is no candidate, so four places is all there are. The spacing runs down
    // from 7, and the city beside the capital only fits at 1. Giving up after the first pass, or with nothing, would
    // leave it out, and carrying the places of one pass into the next would list some twice.
    const points: Point[] = [[0, 0, 'capital'], [1, 0, 'city'], [10, 0, 'town'], [20, 0, 'village'], [0, 10, 'town']];
    expect(capitals(settlementsAt(points), 5, 300)).toEqual([0, 1, 2, 4]);
  });

  it('charges 640 to enter a water cell', () => {
    // A water step costs 10 * WATER / 16 straight and 14 * WATER / 16 across, rounded down, which come to 400 and 560
    // for 640 and for 641 alike, so no map tells the two apart and only the constant pins it.
    expect(WATER).toBe(640);
  });
});
