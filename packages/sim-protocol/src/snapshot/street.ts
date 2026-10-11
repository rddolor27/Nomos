import { PHASE_BUYING, PHASE_EATING, carriedIn, indoorsIn, type World } from '@nomos/sim-core';
import { EMOTE_COIN } from './visual.ts';

// What a blob shows of its errand (M2.7), read from the errand store. A town without streets never writes the store, whose
// zeroes read as asleep and so as indoors, so writeSnapshot asks only a town with streets.
export function indoorsAt(world: World, blob: number): number {
  return indoorsIn(world.errands.phase[blob]) ? 1 : 0;
}

// The coin bubble of a blob buying at a counter: an act at a shop, whatever the buyer holds.
export function emoteAt(world: World, blob: number): number {
  return world.errands.phase[blob] === PHASE_BUYING ? EMOTE_COIN : 0;
}

// 0 for nothing carried, else the good's id (BREAD 1 to FUEL 7).
export function itemAt(world: World, blob: number): number {
  const errands = world.errands;
  return carriedIn(errands.phase[blob], errands.good[blob]);
}

export function eatingAt(world: World, blob: number): number {
  return world.errands.phase[blob] === PHASE_EATING ? 1 : 0;
}
