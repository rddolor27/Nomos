import { layoutBuffers, placeBuffers, type PlaceReply, type TownReply } from '@nomos/sim-protocol/place';
import { buildPlace, crowdedPlace, type PlaceContext } from '@nomos/worldgen';
import { TOWN } from './town.ts';

// The place builder, its own chunk: the map worker imports it on its first place request, so opening the map never
// pays for it. Place p laid out with its walk loops and street crowd, timed, every buffer listed.
export function buildPlaceAnswer(
  place: number,
  ctx: PlaceContext,
  now: () => number,
): { reply: PlaceReply; transfer: ArrayBuffer[] } {
  const start = now();
  const { layout, walks, crowd } = crowdedPlace(ctx);
  const ms = now() - start;
  return { reply: { type: 'place', place, layout, walks, crowd, ms }, transfer: placeBuffers(layout, walks, crowd) };
}

// Highcourt for the first screen's Town skin, which draws the sim's agents as its people, so it needs no walk loops or
// street crowd.
export function buildTownAnswer(now: () => number): { reply: TownReply; transfer: ArrayBuffer[] } {
  const start = now();
  const { layout } = buildPlace(TOWN);
  const ms = now() - start;
  return { reply: { type: 'town', layout, ms }, transfer: layoutBuffers(layout) };
}
