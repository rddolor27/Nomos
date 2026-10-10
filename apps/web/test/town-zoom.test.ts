import { fitCamera } from '@nomos/render-gl';
import { describe, expect, it } from 'vitest';
import { townTiles } from '../src/view/camera-input.ts';
import { Pinch } from '../src/view/pinch.ts';

describe('the pinch', () => {
  it('steps the zoom up once the pointers spread by a quarter and down once they close by a fifth', () => {
    const pinch = new Pinch();
    pinch.down(1, 100, 100);
    pinch.down(2, 300, 100);
    expect(pinch.active).toBe(true);

    expect(pinch.move(2, 340, 100)).toBe(0);
    expect(pinch.move(2, 360, 100)).toBe(1);
    expect([pinch.midX, pinch.midY]).toEqual([230, 100]);
    // Each step is measured from the one before: 260 to 200 closes to 77%, and a wobble after it is no step.
    expect(pinch.move(2, 300, 100)).toBe(-1);
    expect(pinch.move(2, 310, 100)).toBe(0);
  });

  it('measures from the first move of two pointers that landed on one spot, and ends when one lifts', () => {
    const pinch = new Pinch();
    pinch.down(1, 50, 50);
    expect(pinch.move(1, 70, 50)).toBe(0);
    expect(pinch.active).toBe(false);
    pinch.down(2, 70, 50);

    expect(pinch.move(2, 80, 50)).toBe(0);
    expect(pinch.move(2, 100, 50)).toBe(1);
    pinch.up(2);
    expect(pinch.active).toBe(false);
    expect(pinch.move(1, 0, 0)).toBe(0);
  });
});

describe("the town's size, read back from the app's fit", () => {
  it('gives the tiles the fit was made for, so fitting again lands on the same camera', () => {
    // 12 x 8 tiles in a 700 x 400 view fit at zoom 3, where 700 / 3 is no whole number.
    const fitted = fitCamera(12, 8, 700, 400);
    expect(fitted.zoom).toBe(3);

    const [wide, high] = townTiles(fitted, 700, 400);

    expect([wide, high]).toEqual([12, 8]);
    expect(fitCamera(wide, high, 700, 400)).toEqual(fitted);
    // Once the view has grown to 1400 x 800, Fit picks the larger zoom that suits it: 800 / 128 is 6.25.
    expect(fitCamera(wide, high, 1400, 800).zoom).toBe(6);
  });

  it('reads a town larger than the view, which the fit centres at the smallest zoom', () => {
    const fitted = fitCamera(200, 120, 640, 360);
    expect(fitted.zoom).toBe(1);

    expect(townTiles(fitted, 640, 360)).toEqual([200, 120]);
  });
});
