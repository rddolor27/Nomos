import { TownSkin } from '@nomos/render-gl/town';
import type { PlaceLayout, TownError, TownReply, TownRequest } from '@nomos/sim-protocol/place';
import { element, type App } from '../app/app.ts';
import { townAtlas } from './atlas.ts';

// Long enough for the HUD's and charts' first work, short enough that a busy page still gets its town.
const IDLE_TIMEOUT_MS = 2000;

// Safari has no requestIdleCallback, so a timeout stands in.
function whenIdle(run: () => void): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
  else setTimeout(run, 0);
}

// Over the dots' canvas, hidden until the town first draws.
function townCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.id = 'town';
  canvas.hidden = true;
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Highcourt, with every agent as a blob');
  return canvas;
}

// A map worker of the town's own, ended once it answers, so the map view's worker and its world stay apart.
function requestTown(): Promise<PlaceLayout> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../map/map-worker.ts', import.meta.url), { type: 'module', name: 'map' });
    worker.addEventListener('message', ({ data }: MessageEvent<TownReply | TownError>) => {
      worker.terminate();
      if (data.type === 'town') resolve(data.layout);
      else reject(new Error(data.message));
    });
    worker.addEventListener('error', (event) => {
      worker.terminate();
      reject(new Error(event.message || 'the map worker did not start'));
    });
    const request: TownRequest = { type: 'town' };
    worker.postMessage(request);
  });
}

async function lendTown(app: App, canvas: HTMLCanvasElement): Promise<void> {
  const [layout, page] = await Promise.all([requestTown(), townAtlas()]);
  // The town follows the dots' backend, so ?canvas draws both in Canvas2D.
  const backend = app.renderer.backend === 'canvas2d' ? 'canvas2d' : 'auto';
  app.renderer.setTown(new TownSkin(canvas, layout, page, { backend }));
  app.redraw();
}

// The Town skin (interfaces.md, The Town skin): Highcourt from the map worker and the town atlas, both fetched in idle
// time after the page is interactive, then lent to the world renderer, which draws it whenever the skin chosen is the
// town. Until then, and if either fails to load, the town stays dots.
export function mountTownSkin(app: App): void {
  const canvas = townCanvas();
  element(document, '#view').append(canvas);
  whenIdle(() => {
    lendTown(app, canvas).catch((error: unknown) => {
      console.error('The Town skin did not load, so the town stays dots:', error);
    });
  });
}
