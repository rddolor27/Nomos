import { below, floorDiv } from '@nomos/sim-core/kernels';
import { PLACE_TILE_PX as TILE, type PlaceCrowd, type PlaceLayout, type PlaceWalks } from '@nomos/sim-protocol/place';
import { CROWD } from '../random/streams.ts';
import type { PlaceContext } from './context.ts';
import { lookFor } from './looks.ts';

// One look-only walker per this many residents, up to MOST (owner, 10 October 2026: M3.1 part 2, the street crowd).
const RESIDENTS_PER_WALKER = 150;
const MOST = 3000;
// First keys of the crowd's CROWD draws, clear of place.py's 1-6 and the walks' 0x110-0x112.
const LOOP = 0x120;
const PHASE = 0x121;
const FACE = 0x122;
// place.py's faces: seven neutral in ten, two happy and one blinking.
const FACES = [0, 0, 0, 0, 0, 0, 0, 1, 1, 2];

// TypeScript only, beside place.py's people: walkers share the place's loops at keyed phases, and a walker's look is the
// keyed look of the person index it takes after place.py's people.
export function streetCrowd(ctx: PlaceContext, layout: PlaceLayout, walks: PlaceWalks): PlaceCrowd {
  const loops = walks.person.length;
  const count = loops === 0 ? 0 : Math.min(MOST, floorDiv(ctx.population, RESIDENTS_PER_WALKER));
  const first = layout.people.look.length;
  const crowd: PlaceCrowd = {
    look: new Uint8Array(count),
    expression: new Uint8Array(count),
    loop: new Uint16Array(count),
    phase: new Uint16Array(count),
  };
  for (let k = 0; k < count; k++) {
    const loop = below(loops, ctx.seed, CROWD, LOOP, k);
    const cells = walks.offsets[loop + 1] - walks.offsets[loop];
    crowd.look[k] = lookFor(ctx.seed, first + k);
    crowd.expression[k] = FACES[below(FACES.length, ctx.seed, CROWD, FACE, k)];
    crowd.loop[k] = loop;
    crowd.phase[k] = below(cells * TILE, ctx.seed, CROWD, PHASE, k);
  }
  return crowd;
}
