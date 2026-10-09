import type { PlaceLayout } from '@nomos/sim-protocol/place';
import fixtures from './fixtures/places-v1.json';

export interface PlacePixels {
  width: number;
  height: number;
  // Of placedraw.draw's RGBA bytes at 1x, top row first.
  sha256: string;
}

export const PLACE_NAMES: readonly string[] = fixtures.places.map((place) => place.name);

function fixture(name: string): (typeof fixtures.places)[number] {
  const place = fixtures.places.find((p) => p.name === name);
  if (!place) throw new Error(`no fixture place ${name}`);
  return place;
}

// A fresh layout each call, its own columns as the map worker transfers them, so a caller may move its people freely.
export function placeLayout(name: string): PlaceLayout {
  const place = fixture(name);
  const { people } = place;
  return {
    width: place.width,
    height: place.height,
    frames: [...place.frames],
    tiles: Uint16Array.from(place.tiles),
    ground: Int32Array.from(place.ground),
    standing: Int32Array.from(place.standing),
    people: {
      look: Uint8Array.from(people.look),
      pose: Uint8Array.from(people.pose),
      facing: Uint8Array.from(people.facing),
      step: Uint8Array.from(people.step),
      expression: Uint8Array.from(people.expression),
      job: Uint8Array.from(people.job),
      emote: Uint8Array.from(people.emote),
      x: Int32Array.from(people.x),
      y: Int32Array.from(people.y),
      lift: Uint8Array.from(people.lift),
    },
  };
}
