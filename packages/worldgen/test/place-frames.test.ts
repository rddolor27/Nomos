import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fieldsOf, HOUSE_FORMS, manifestFrames, placeFramesSource } from '../scripts/place-frames.ts';
import { FRAMES } from '../src/place/frames.ts';
import { MATERIALS, ROOFS } from '../src/place/houses.ts';

describe("the place port's sprite table", () => {
  it('matches assets/sprites, as scripts/place-frames.ts writes it', () => {
    const committed = readFileSync(new URL('../src/place/frames.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(committed).toBe(placeFramesSource());
  });

  it('holds every house of a form, whatever its material and roof', () => {
    const houses = manifestFrames('houses');
    for (const form of HOUSE_FORMS) {
      for (const material of MATERIALS) {
        for (const roof of ROOFS) {
          const name = `house_${material}_${form}_roof-${roof}`;
          expect(houses[name], name).toBeDefined();
          expect(fieldsOf(houses[name]), name).toEqual(FRAMES[`houses/${form}`]);
        }
      }
    }
  });
});
