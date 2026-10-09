import { placeBuffers, type PlaceReply } from '@nomos/sim-protocol/place';
import { crowdedPlace, type PlaceContext } from '@nomos/worldgen';

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
