import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkPlaces, type PlaceGoldens } from './engines/places.ts';

const goldens: PlaceGoldens = JSON.parse(
  readFileSync(new URL('./fixtures/place-goldens-v1.json', import.meta.url), 'utf8'),
);

describe('the place port against the Python goldens', { timeout: 300_000 }, () => {
  it('builds every place of the first 20 standard worlds stage for stage as place.py does', () => {
    const report = checkPlaces(goldens, 20);
    expect(report.failures.slice(0, 20)).toEqual([]);
    expect(report.places).toBe(goldens.worlds.reduce((total, world) => total + world.places.length, 0));
  });
});
