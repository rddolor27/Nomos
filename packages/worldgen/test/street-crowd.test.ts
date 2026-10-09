import { PLACE_TILE_PX } from '@nomos/sim-protocol/place';
import { describe, expect, it } from 'vitest';
import { buildPlace, generateWorld, placeContexts, streetCrowd } from '../src/index.ts';
import { lookFor } from '../src/place/looks.ts';

describe('the street crowd', () => {
  const map = generateWorld(42, 'standard');
  const contexts = placeContexts(map);

  it('walks one per 150 residents along the loops, at phases on them, with keyed looks', () => {
    const ctx = contexts[0];
    const { layout, walks } = buildPlace(ctx);
    const crowd = streetCrowd(ctx, layout, walks);
    expect(crowd.look.length).toBe(Math.min(3000, Math.floor(ctx.population / 150)));
    expect(crowd.look.length).toBeGreaterThan(0);
    const first = layout.people.look.length;
    crowd.loop.forEach((loop, k) => {
      expect(loop).toBeLessThan(walks.person.length);
      expect(crowd.phase[k]).toBeLessThan((walks.offsets[loop + 1] - walks.offsets[loop]) * PLACE_TILE_PX);
      expect(crowd.look[k]).toBe(lookFor(ctx.seed, first + k));
    });
    expect(streetCrowd(ctx, layout, walks)).toEqual(crowd);
  });

  it('gives a wonder no crowd', () => {
    const ctx = contexts[map.settlements.cell.length];
    const { layout, walks } = buildPlace(ctx);
    expect(streetCrowd(ctx, layout, walks).look.length).toBe(0);
  });
});
