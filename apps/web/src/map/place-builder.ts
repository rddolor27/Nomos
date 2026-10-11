import { writeMap } from '@nomos/sim-protocol/map';
import { layoutBuffers, placeBuffers, type PlaceReply, type TownReply } from '@nomos/sim-protocol/place';
import { buildPlace, TOWN, type PlaceContext } from '@nomos/worldgen';

// The place builder, its own chunk: the map worker imports it on its first place request, so opening the map never
// pays for it. Place p laid out, with a settlement's ground written as .nmap bytes for the sim worker, timed, every buffer
// listed.
export function buildPlaceAnswer(
  place: number,
  ctx: PlaceContext,
  now: () => number,
): { reply: PlaceReply; transfer: ArrayBuffer[] } {
  const start = now();
  const { layout, map: ground } = buildPlace(ctx);
  const map = ground ? writeMap(ground) : null;
  const ms = now() - start;
  return { reply: { type: 'place', place, layout, map, ms }, transfer: placeBuffers(layout, map) };
}

// Highcourt for the first screen's Town skin, which draws the sim's agents as its people, so it needs no ground.
export function buildTownAnswer(now: () => number): { reply: TownReply; transfer: ArrayBuffer[] } {
  const start = now();
  const { layout } = buildPlace(TOWN);
  const ms = now() - start;
  return { reply: { type: 'town', layout, ms }, transfer: layoutBuffers(layout) };
}
