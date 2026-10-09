import { describe, expect, it } from 'vitest';
import { lanes } from '../src/routes/lanes.ts';
import { TOWN, type Settlement } from '../src/settle/settle.ts';

// Choices the 200 golden worlds barely or never see: flipping any one of them leaves nearly every golden fingerprint
// unchanged. Every expected lane is what tools/worldgen/roads.py's lanes returns for the same map.

// A glyph for each biome code up to grassland: sea, lake and land.
const GLYPHS = '~L.';

function lanesOf(rows: readonly string[], spots: readonly (readonly [number, number])[]): number[][] {
  const width = rows[0].length;
  const biome = Uint8Array.from(rows.join(''), (glyph) => GLYPHS.indexOf(glyph));
  const settlements: Settlement[] = spots.map(([x, y], id) => ({
    id,
    x,
    y,
    tier: TOWN,
    population: 1_000,
    uid: y * width + x,
    landmarks: [],
  }));
  return lanes(width, rows.length, biome, settlements);
}

describe('the sea-lane choices the goldens barely see', () => {
  it('sails straight between two landmasses that touch at a corner', () => {
    // (1, 1) and (2, 2) stand on landmasses of their own, since land joins only by its sides, and each is the other's
    // neighbour. The sail meets the goal on its first step. A search that looked for the goal only from a sea cell
    // would reach it a step later, or never. No sail in the 200 golden worlds is this short.
    const rows = ['...~', '..~.', '.~..', '~...'];
    expect(lanesOf(rows, [[1, 1], [2, 2]])).toEqual([[5, 10]]);
  });

  it('does not count a lake shore as a port', () => {
    // The same corner with lake between the landmasses and sea only beside (2, 2): one port, so no pair. Counting a
    // lake as sea would make (1, 1) a port too, and the corner a lane.
    const rows = ['...L', '..L.', '.L..', 'L..~'];
    expect(lanesOf(rows, [[1, 1], [2, 2]])).toEqual([]);
  });

  it('passes over a pair with no sea between and joins the landmasses by a farther one', () => {
    // (2, 2) is a port on a pocket of sea shut in by land. It is 49 from (9, 2), the nearest pair, but its sail has
    // nowhere to go. (5, 8) is 52 away and sails the channel; the lane runs from (9, 2), cell 37, the lower of the two.
    // Joining the landmasses on the failed pair would skip the farther one and leave no lane at all. Only one golden
    // world sees this.
    const rows = [
      '......~~~.....',
      '......~~~.....',
      '...~..~~~.....',
      '......~~~.....',
      '......~~~.....',
      '......~~~.....',
      '......~~~.....',
      '......~~~.....',
      '......~~~.....',
    ];
    expect(lanesOf(rows, [[2, 2], [5, 8], [9, 2]])).toEqual([[37, 50, 64, 78, 91, 104, 117]]);
  });

  it('sails pairs of equal distance by their lower cell first, then their higher', () => {
    // (2, 1) to (2, 6) and (8, 3) to (13, 3) are both 25 apart and nearer than any other pair. The first pair's lower
    // cell, 20, is below the second's, 62, so it is sailed first; its higher cell, 110, is above the second's, 67, so
    // ordering by the higher cell would sail the second first. The settlements list the second pair first, which
    // ordering by the list would follow too. Either swaps the first two lanes.
    const rows = [
      '~~~~~~~~~~~~~~~~~~',
      '~~.~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~.~~~~~.~~~',
      '~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~',
      '~~.~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~',
    ];
    expect(lanesOf(rows, [[8, 3], [13, 3], [2, 1], [2, 6]])).toEqual([
      [20, 38, 56, 74, 92, 110],
      [62, 63, 64, 65, 66, 67],
      [20, 21, 22, 23, 24, 43, 62],
    ]);
  });
});
