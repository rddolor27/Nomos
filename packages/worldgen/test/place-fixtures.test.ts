import { readFileSync } from 'node:fs';
import type { PlaceLayout, PlacePeople } from '@nomos/sim-protocol/place';
import { describe, expect, it } from 'vitest';
import { buildPlace, type PlaceContext } from '../src/index.ts';

interface FixturePlace {
  name: string;
  context: PlaceContext;
  width: number;
  height: number;
  frames: string[];
  tiles: number[];
  ground: number[];
  standing: number[];
  people: Record<keyof PlacePeople, number[]>;
}

// tools/worldgen/place_fixtures.py writes these for render-gl's pixel check; the port must lay them out the same.
const FIXTURE = new URL('../../render-gl/test/fixtures/places-v1.json', import.meta.url);
const places: FixturePlace[] = JSON.parse(readFileSync(FIXTURE, 'utf8')).places;

function plain(layout: PlaceLayout): Omit<FixturePlace, 'name' | 'context'> {
  const people = {} as Record<keyof PlacePeople, number[]>;
  for (const field of Object.keys(layout.people) as (keyof PlacePeople)[]) people[field] = Array.from(layout.people[field]);
  return {
    width: layout.width,
    height: layout.height,
    frames: layout.frames,
    tiles: Array.from(layout.tiles),
    ground: Array.from(layout.ground),
    standing: Array.from(layout.standing),
    people,
  };
}

describe("the place port against place.py's fixtures", () => {
  it.each(places.map((place) => [place.name, place] as const))('lays out %s as place.py does', (_, place) => {
    const { width, height, frames, tiles, ground, standing, people } = place;
    expect(plain(buildPlace(place.context))).toEqual({ width, height, frames, tiles, ground, standing, people });
  });
});
