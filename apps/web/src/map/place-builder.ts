import { placeBuffers, type PlaceReply } from '@nomos/sim-protocol/place';
import { buildPlace, type PlaceContext } from '@nomos/worldgen';

// The place builder, its own chunk: the map worker imports it on its first place request, so opening the map never
// pays for it. Place p laid out with its walk loops, timed, every buffer listed.
export function buildPlaceAnswer(
  place: number,
  ctx: PlaceContext,
  now: () => number,
): { reply: PlaceReply; transfer: ArrayBuffer[] } {
  const start = now();
  const { layout, walks } = buildPlace(ctx);
  const ms = now() - start;
  return { reply: { type: 'place', place, layout, walks, ms }, transfer: placeBuffers(layout, walks) };
}
