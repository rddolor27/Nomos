import { CROWD_HUES } from '@nomos/sim-protocol/world-map';
import { describe, expect, it } from 'vitest';
import { DOT_OUTLINE, crowdDotPx, dotCorner, dotPixel } from '../src/map/crowd.ts';
import table from '../src/map/map-colours.json';
import { COUNTRY_COLOURS, CROWD_COLOURS, CROWD_OUTLINE, LINE_COLOURS, MAP_CELL_PX, mapViewFor } from '../src/map.ts';

// A dot row by row: '.' clear, '#' its hue, 'O' its outline.
function picture(size: number): string[] {
  return Array.from({ length: size }, (_, j) => Array.from({ length: size }, (_, i) => '.#O'[dotPixel(size, i, j)]).join(''));
}

describe('the crowd dots', () => {
  it('fills dots under 4 px whole, with no outline to hide their hue', () => {
    expect(picture(2)).toEqual(['##', '##']);
    expect(picture(3)).toEqual(['###', '###', '###']);
  });

  it('rounds dots from 4 px, with a 1-px outline on every pixel beside a clear one', () => {
    expect(picture(4)).toEqual(['.OO.', 'O##O', 'O##O', '.OO.']);
    expect(picture(5)).toEqual(['.OOO.', 'O###O', 'O###O', 'O###O', '.OOO.']);
    expect(picture(7)).toEqual(['..OOO..', '.O###O.', 'O#####O', 'O#####O', 'O#####O', '.O###O.', '..OOO..']);
  });

  it('keeps every size symmetric about both axes and the diagonal', () => {
    for (let size = 2; size <= 16; size++) {
      const rows = picture(size);
      expect(rows.map((row) => [...row].reverse().join('')), `${size} px`).toEqual(rows);
      expect([...rows].reverse(), `${size} px`).toEqual(rows);
      expect(rows.map((_, i) => rows.map((row) => row[i]).join('')), `${size} px`).toEqual(rows);
    }
  });

  it('grows with zoom from 2 px to a tenth of a cell, at every step the Region view can show', () => {
    const steps = MAP_CELL_PX.filter((cellPx) => mapViewFor('region', cellPx, 1) === 'region');
    expect(steps).toEqual([16, 32, 48, 64, 96, 128]);
    expect(steps.map(crowdDotPx)).toEqual([2, 4, 5, 7, 10, 13]);
  });

  it('outlines the dots from the step where the Region view opens, at every device pixel ratio', () => {
    for (const dpr of [1, 1.5, 2, 3]) {
      const opens = MAP_CELL_PX.find((cellPx) => mapViewFor('country', cellPx, dpr) === 'region') ?? 0;
      const size = crowdDotPx(opens);
      expect(dotPixel(size, 0, size >> 1), `dpr ${dpr} opens at ${opens} px a cell`).toBe(DOT_OUTLINE);
    }
  });

  it('snaps a dot to whole device pixels around its place', () => {
    expect(dotCorner(3.5, 32, 3)).toBe(111);
    expect(dotCorner(3.5, 32, 4)).toBe(110);
    expect(dotCorner(-0.25, 64, 6)).toBe(-19);
  });
});

describe('the crowd colours', () => {
  it("holds spritekit's six body hues in CROWD_HUES order", () => {
    expect(Object.keys(table.crowd)).toEqual([...CROWD_HUES]);
    expect(CROWD_COLOURS).toHaveLength(CROWD_HUES.length);
    expect(new Set(CROWD_COLOURS).size).toBe(CROWD_HUES.length);
  });

  it('never puts a country or line colour on a person, and outlines them dark', () => {
    for (const colour of CROWD_COLOURS) {
      expect(COUNTRY_COLOURS).not.toContain(colour);
      expect(Object.values(LINE_COLOURS)).not.toContain(colour);
    }
    expect([16, 8, 0].map((shift) => (CROWD_OUTLINE >> shift) & 255).every((channel) => channel < 32)).toBe(true);
  });
});
