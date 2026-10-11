import { draw1 } from '../random/draw.ts';
import { TRAIT_DRAW } from '../random/streams.ts';
import type { Life } from './store.ts';

// A blob's personality is three bytes, 0 to 255 each, from one keyed draw on its id, the id its look and name key on, so the same
// seed gives the same people (M3.2 Ruling 1). Traits shape only what a blob picks for its free time: none comes from a look, a
// culture or a wallet, and none changes after birth.
//   - sociable: the pull of company, and of the plaza where it is found;
//   - homebody: the pull of home, and the push against a long way out;
//   - restless: the pull of anywhere new, and against sitting still.
export const TRAIT_MEAN = 128;

export function drawTraits(life: Life, blob: number, seed: number, id: number): void {
  const word = draw1(seed, TRAIT_DRAW, id);
  life.sociable[blob] = word & 0xff;
  life.homebody[blob] = (word >>> 8) & 0xff;
  life.restless[blob] = (word >>> 16) & 0xff;
}
