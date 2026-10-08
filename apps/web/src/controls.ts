import { MAX_ZOOM, MIN_ZOOM, zoomAt } from '@nomos/render-gl';
import GUI from 'lil-gui';
import type { App } from './app.ts';

// What lil-gui binds to. The getter reads the camera as it is now, so listen() follows the wheel and the keys too.
export function zoomView(app: App): { zoom: number } {
  return {
    get zoom() {
      return app.camera.zoom;
    },
    set zoom(zoom: number) {
      const { width, height } = app.renderer.canvas;
      app.camera = zoomAt(app.camera, zoom, width / 2, height / 2);
    },
  };
}

export function mountControls(app: App): GUI {
  const gui = new GUI();
  gui.add(zoomView(app), 'zoom', MIN_ZOOM, MAX_ZOOM, 1).name('Zoom').listen();
  return gui;
}
