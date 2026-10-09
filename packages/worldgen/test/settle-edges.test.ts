import { TIER_NAMES } from '@nomos/sim-protocol/world-map';
import { describe, expect, it } from 'vitest';
import { sites, tierOf } from '../src/settle/settle.ts';

// Choices the 200 golden worlds barely or never see: flipping any one of them leaves nearly every golden fingerprint
// unchanged. Every expected list and name is what tools/worldgen/settle.py returns for the same input: _sites and _tier.
const WIDTH = 40;
const HEIGHT = 24;
// Seed 4 draws 54 cells of land per place, so 500 cells call for 9 places and 324 for 6, and 100 for 1, which the minimum
// of four overrides.
const SEED = 4;

type Cell = readonly [x: number, y: number, score: number];

// Five sites well over 12 apart, scored above every other cell here whatever the jitter, so they are taken first and the
// next site is the first to feel the spacing.
const LEADERS: readonly Cell[] = [
  [2, 4, 180],
  [18, 4, 180],
  [34, 4, 180],
  [10, 18, 180],
  [26, 18, 180],
];

function sitesOf(cells: readonly Cell[], landCells: number): [number, number][] {
  const score = new Int32Array(WIDTH * HEIGHT);
  for (const [x, y, value] of cells) score[y * WIDTH + x] = value;
  return sites(SEED, WIDTH, HEIGHT, score, landCells);
}

describe('the settlement choices the goldens barely see', () => {
  it('runs its last pass at a spacing of 3, so a cell 2 from a taken one joins and a diagonal neighbour does not', () => {
    // 500 cells of land call for 9 places and a first spacing of 35, which shrinks to 26, 19, 14, 10, 7, 5 and 3, where
    // the search gives up. The first pass takes (4, 12) and (35, 15), keeping their neighbours out. The pass at 3 adds
    // (2, 12), 2 from (4, 12), but not (34, 14), which touches (35, 15) at a corner. Giving up at a spacing of 5 or 6
    // would leave (2, 12) out, and going on to a spacing of 2 would take (34, 14) as well.
    expect(sitesOf([...LEADERS, [2, 12, 60], [4, 12, 60], [34, 14, 60], [35, 15, 60]], 500)).toEqual([
      [18, 4], [26, 18], [2, 4], [10, 18], [34, 4], [4, 12], [35, 15], [2, 12],
    ]);
  });

  it('shrinks the spacing to three quarters of itself, rounded down', () => {
    // 324 cells of land call for 6 places and a first spacing of 34. Rounded down, the next is 25, and (5, 8), exactly 25
    // from the leader at (2, 4), completes the six. Rounded up or to the nearest, the next is 26, which shuts (5, 8)
    // out, and the one after is 20, where (6, 6), 20 from the same leader and ranked higher, takes the sixth place.
    expect(sitesOf([...LEADERS, [5, 8, 50], [6, 6, 100]], 324)).toEqual([
      [18, 4], [26, 18], [2, 4], [10, 18], [34, 4], [5, 8],
    ]);
  });

  it('plans at least four places, however little land there is', () => {
    // 100 cells of land call for a single place. All five leaders would fit, so the minimum alone drops the last, (34, 4).
    expect(sitesOf(LEADERS, 100)).toEqual([[18, 4], [26, 18], [2, 4], [10, 18]]);
  });

  it('counts a cell scoring exactly 30 and leaves out one scoring 29', () => {
    // Four places are planned, but only the three cells at 30 are candidates, so the spacing runs down to its floor with
    // three.
    const cells: Cell[] = [[2, 4, 30], [18, 4, 30], [34, 4, 30], [10, 18, 29], [26, 18, 29]];
    expect(sitesOf(cells, 100)).toEqual([[18, 4], [2, 4], [34, 4]]);
  });

  it('moves a place up a tier at exactly 500, 5,000 and 50,000 people, and keeps id 0 the capital at any size', () => {
    const tierAt = (id: number) => (population: number) => TIER_NAMES[tierOf(id, population)];
    expect([499, 500, 4999, 5000, 49_999, 50_000].map(tierAt(1))).toEqual([
      'hamlet', 'village', 'village', 'town', 'town', 'city',
    ]);
    expect([1, 1_000_000].map(tierAt(0))).toEqual(['capital', 'capital']);
  });
});
