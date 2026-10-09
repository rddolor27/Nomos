import { expect, test } from 'vitest';
import type { App } from '../src/app/app.ts';
import { zoomView } from '../src/panels/controls.ts';

function appAt(zoom: number): App {
  return { camera: { x: 10, y: 20, zoom }, renderer: { canvas: { width: 800, height: 600 } } } as unknown as App;
}

test('reads the zoom the camera has now', () => {
  const app = appAt(2);
  const view = zoomView(app);
  expect(view.zoom).toBe(2);

  app.camera = { ...app.camera, zoom: 5 };

  expect(view.zoom).toBe(5);
});

test('zooms about the centre of the view in device pixels', () => {
  const app = appAt(2);
  zoomView(app).zoom = 4;

  // The world point at the centre, x + 400 / zoom, was 210 and stays 210; y + 300 / zoom stays 170.
  expect(app.camera).toEqual({ x: 110, y: 95, zoom: 4 });
});
