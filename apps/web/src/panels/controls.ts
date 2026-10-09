import { MAX_ZOOM, MIN_ZOOM, zoomAt } from '@nomos/render-gl';
import GUI, { type FunctionController } from 'lil-gui';
import type { App } from '../app/app.ts';

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

// The map and its scene load only when asked for, in a chunk of their own (interfaces.md, In web).
function showMap(app: App, button: HTMLElement): void {
  import('../map/map-view.ts')
    .then(({ openMap }) => openMap(app, button))
    .catch((error: unknown) => console.error(error));
}

export function mountControls(app: App): GUI {
  const gui = new GUI();
  gui.add(zoomView(app), 'zoom', MIN_ZOOM, MAX_ZOOM, 1).name('Zoom').listen();
  const map = gui.add({ open: () => showMap(app, map.$button) }, 'open').name('Map') as FunctionController;
  return gui;
}
