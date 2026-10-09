import { PLACE_TILE_PX } from '@nomos/sim-protocol/place';
import { describe, expect, it } from 'vitest';
import { buildPlace, crowdedPlace, generateWorld, placeContexts } from '../src/index.ts';
import { lookFor } from '../src/place/looks.ts';

function adjacent(a: number, b: number, width: number): boolean {
  return Math.abs((a % width) - (b % width)) + Math.abs(Math.floor(a / width) - Math.floor(b / width)) === 1;
}

describe('the street crowd', () => {
  const map = generateWorld(42, 'standard');
  const contexts = placeContexts(map);

  it('walks loops of its own over the place, one walker per two loop cells at most, with keyed looks', () => {
    const ctx = contexts[0];
    const { layout, walks, crowd } = crowdedPlace(ctx);
    expect({ layout, walks }).toEqual(buildPlace(ctx));
    const loops = crowd.offsets.length - 1;
    const wanted = Math.min(3000, Math.floor(ctx.population / 150));
    expect(loops).toBeGreaterThan(0);
    expect(loops).toBeLessThanOrEqual(Math.min(300, Math.ceil(wanted / 10)));
    expect(crowd.look.length).toBeGreaterThan(0);
    expect(crowd.look.length).toBeLessThanOrEqual(Math.min(wanted, crowd.cells.length / 2));
    for (let r = 0; r < loops; r++) {
      const cells = crowd.cells.subarray(crowd.offsets[r], crowd.offsets[r + 1]);
      cells.forEach((c, i) => expect(adjacent(c, cells[(i + 1) % cells.length], layout.width)).toBe(true));
      const on = Array.from(crowd.loop).filter((loop) => loop === r).length;
      expect(on).toBeLessThanOrEqual(cells.length / 2);
    }
    crowd.loop.forEach((loop, k) => {
      expect(crowd.phase[k]).toBeLessThan((crowd.offsets[loop + 1] - crowd.offsets[loop]) * PLACE_TILE_PX);
      expect(crowd.look[k]).toBe(lookFor(ctx.seed, layout.people.look.length + k));
    });
    expect(crowdedPlace(ctx).crowd).toEqual(crowd);
  });

  it('gives a wonder no crowd', () => {
    expect(crowdedPlace(contexts[map.settlements.cell.length]).crowd.look.length).toBe(0);
  });
});
