import { expect, test } from 'vitest';
import { cssPxPerTile, fitCamera, mapShareInView, MAX_ZOOM, MIN_ZOOM, panBy, snapCamera, zoomAt } from '../src/camera/camera.ts';
import type { Camera } from '../src/renderer/types.ts';

function worldAt(camera: Camera, deviceX: number, deviceY: number): [number, number] {
  return [camera.x + deviceX / camera.zoom, camera.y + deviceY / camera.zoom];
}

test('fits the town', () => {
  expect(fitCamera(48, 28, 1280, 720)).toEqual({ x: -256, y: -136, zoom: 1 });
  expect(fitCamera(48, 28, 3072, 1792)).toEqual({ x: 0, y: 0, zoom: 4 });
  expect(fitCamera(48, 28, 3072, 896)).toEqual({ x: -384, y: 0, zoom: 2 });
  expect(fitCamera(48, 28, 1536, 3584)).toEqual({ x: 0, y: -672, zoom: 2 });
});

test('keeps the fit within the zoom range', () => {
  expect(fitCamera(48, 28, 320, 180)).toEqual({ x: 224, y: 134, zoom: MIN_ZOOM });
  expect(fitCamera(3, 2, 1280, 720)).toEqual({ x: -16, y: -6.5, zoom: MAX_ZOOM });
});

test('zooms about the pointer and back', () => {
  const start = { x: 0, y: 0, zoom: 1 };
  const closer = zoomAt(start, 2, 100, 50);

  expect(closer).toEqual({ x: 50, y: 25, zoom: 2 });
  expect(zoomAt(closer, 1, 100, 50)).toEqual(start);

  const camera = { x: 37.5, y: -12, zoom: 3 };
  for (let zoom = MIN_ZOOM; zoom <= MAX_ZOOM; zoom++) {
    const next = zoomAt(camera, zoom, 211, 97);
    const [x, y] = worldAt(next, 211, 97);
    const [wantX, wantY] = worldAt(camera, 211, 97);
    expect(next.zoom).toBe(zoom);
    expect(x).toBeCloseTo(wantX, 9);
    expect(y).toBeCloseTo(wantY, 9);
  }
});

test('clamps zoom', () => {
  const camera = { x: 10, y: 20, zoom: 4 };

  expect(zoomAt(camera, 0, 5, 5).zoom).toBe(1);
  expect(zoomAt(camera, 40, 5, 5).zoom).toBe(16);
  expect(zoomAt(camera, 2.6, 5, 5).zoom).toBe(3);
});

test('snaps to device pixels', () => {
  const snapped = snapCamera({ x: 10.3, y: 0.6, zoom: 3 });

  expect(snapped.zoom).toBe(3);
  expect(snapped.x * 3).toBeCloseTo(31, 9);
  expect(snapped.y * 3).toBeCloseTo(2, 9);
  expect(snapCamera(snapped)).toEqual(snapped);
});

test('pans by device pixels', () => {
  expect(panBy({ x: 10, y: 20, zoom: 4 }, 8, -12)).toEqual({ x: 12, y: 17, zoom: 4 });
});

test('measures the share of the map in view', () => {
  expect(mapShareInView(fitCamera(48, 28, 1280, 720), 1280, 720, 48, 28)).toBe(1);
  expect(mapShareInView({ x: 384, y: 224, zoom: 1 }, 384, 224, 48, 28)).toBe(0.25);
  expect(mapShareInView({ x: 0, y: 0, zoom: 2 }, 768, 448, 48, 28)).toBe(0.25);
  expect(mapShareInView({ x: 64, y: 44, zoom: 1 }, 640, 360, 48, 28)).toBeCloseTo((640 * 360) / (768 * 448), 12);
  expect(mapShareInView({ x: -1000, y: 0, zoom: 1 }, 320, 180, 48, 28)).toBe(0);
  expect(mapShareInView({ x: 0, y: 0, zoom: 1 }, 0, 0, 48, 28)).toBe(0);
});

test('sizes a tile in CSS pixels', () => {
  expect(cssPxPerTile(1, 1)).toBe(16);
  expect(cssPxPerTile(3, 2)).toBe(24);
  expect(cssPxPerTile(2, 1.5)).toBeCloseTo(21.333333, 6);
});
