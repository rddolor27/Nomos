import { below } from '@nomos/sim-core/kernels';
import { LOOK_EYES, LOOK_HUES, LOOK_PATTERNS } from '@nomos/sim-protocol/place';
import { LOOK } from '../random/streams.ts';

const LOOKS = LOOK_HUES.length * LOOK_EYES.length * LOOK_PATTERNS.length;

// tools/worldgen/looks.py's look_for: a look depends only on (seed, person), never on place, job or wealth, so no
// look can mark a family or a group, and no rule reads it (content rules 1 and 8).
export function lookFor(seed: number, personId: number): number {
  return below(LOOKS, seed, LOOK, personId);
}
