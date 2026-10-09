import { placeBuffers, type PlaceReply } from '@nomos/sim-protocol/place';
import { buildSite, layoutOf, placeWalks, type PlaceContext } from '@nomos/worldgen';

export interface PlaceAnswer {
  reply: PlaceReply;
  transfer: ArrayBuffer[];
}

// The place builder, its own chunk: the map worker imports it on its first place request, so opening the map never
// pays for it. Place p laid out with its walk loops, timed, every buffer listed.
export function buildPlaceAnswer(place: number, ctx: PlaceContext, now: () => number): PlaceAnswer {
  const start = now();
  const site = buildSite(ctx);
  const layout = layoutOf(site);
  const walks = placeWalks(site);
  const ms = now() - start;
  return { reply: { type: 'place', place, layout, walks, ms }, transfer: placeBuffers(layout, walks) };
}
