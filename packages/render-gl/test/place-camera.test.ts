import { describe, expect, it } from 'vitest';
import {
  PLACE_SCALES,
  clampPlaceCamera,
  fitPlaceCamera,
  openPlaceCamera,
  panPlaceBy,
  zoomPlaceAt,
} from '../src/place/camera.ts';

// The capital's 48 x 28 tiles, in art px.
const CAPITAL: [number, number] = [768, 448];

describe('the place camera', () => {
  it('fits the whole place at the largest scale that shows it, centred', () => {
    expect(fitPlaceCamera(...CAPITAL, 1600, 1000)).toEqual({ x: (768 - 800) / 2, y: (448 - 500) / 2, scale: 2 });
    expect(fitPlaceCamera(...CAPITAL, 2400, 1400)).toMatchObject({ scale: 3 });
    // A phone shows no scale whole, so it takes the smallest.
    expect(fitPlaceCamera(...CAPITAL, 390, 844)).toMatchObject({ scale: 1 });
  });

  it('opens at 2 CSS px per art px or more, centred, even when the place then overflows the view', () => {
    expect(openPlaceCamera(...CAPITAL, 1280, 720, 1)).toEqual({ x: (768 - 640) / 2, y: (448 - 360) / 2, scale: 2 });
    // At DPR 3, 2 CSS px is 6 device px, a step of its own.
    expect(openPlaceCamera(...CAPITAL, 1170, 2532, 3)).toMatchObject({ scale: 6 });
    // At DPR 1.25, 2.5 device px rounds up to the step of 3.
    expect(openPlaceCamera(...CAPITAL, 1600, 900, 1.25)).toMatchObject({ scale: 3 });
    // A village would fit a large view whole at 4; it opens at 6, covering the view rather than sitting small inside it.
    expect(openPlaceCamera(512, 320, 2560, 1440, 1)).toMatchObject({ scale: 6 });
    // A place too small to cover the view at any step opens at the largest.
    expect(openPlaceCamera(16, 16, 2560, 1440, 1)).toMatchObject({ scale: 16 });
  });

  it('zooms along the scales, keeping the art pixel under the point where it was', () => {
    const camera = { x: 10, y: 20, scale: 2 };
    const zoomed = zoomPlaceAt(camera, 1, 100, 50);
    expect(zoomed.scale).toBe(3);
    expect(zoomed.x + 100 / 3).toBeCloseTo(camera.x + 100 / 2, 9);
    expect(zoomed.y + 50 / 3).toBeCloseTo(camera.y + 50 / 2, 9);
    expect(zoomPlaceAt(camera, -5, 0, 0).scale).toBe(PLACE_SCALES[0]);
    expect(zoomPlaceAt({ x: 0, y: 0, scale: 16 }, 1, 0, 0).scale).toBe(16);
  });

  it('pans right and down for a positive delta, in device px', () => {
    expect(panPlaceBy({ x: 10, y: 20, scale: 4 }, 8, -12)).toEqual({ x: 12, y: 17, scale: 4 });
  });

  it("keeps the view's centre over the place", () => {
    const inside = { x: 100, y: 100, scale: 2 };
    expect(clampPlaceCamera(inside, ...CAPITAL, 400, 300)).toBe(inside);
    // The view is 200 x 150 art px, so its centre stops at the place's edges, 100 and 75 art px from its corner.
    expect(clampPlaceCamera({ x: -500, y: 900, scale: 2 }, ...CAPITAL, 400, 300)).toEqual({ x: -100, y: 448 - 75, scale: 2 });
  });
});
