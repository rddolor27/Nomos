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

function townLabel(name: string): string {
  return `${name}, with every agent as a blob`;
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
  canvas.setAttribute('aria-label', townLabel('Highcourt'));
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

// The Town skin as the page lends it, and the town it draws: Highcourt until the sim opens another (M2.2c). The app tells
// it of each town opened, and of the last one if it was opened before the skin was lent, so the skin always draws the town
// the sim runs.
class TownSkinMount {
  private readonly app: App;
  private readonly canvas: HTMLCanvasElement;
  private skin: TownSkin | null;
  private shown: { layout: PlaceLayout; name: string } | null;

  constructor(app: App, canvas: HTMLCanvasElement) {
    this.app = app;
    this.canvas = canvas;
    this.skin = null;
    this.shown = null;
    app.onTown(this.show.bind(this));
  }

  async lend(): Promise<void> {
    const [home, page] = await Promise.all([requestTown(), townAtlas()]);
    // The town follows the dots' backend, so ?canvas draws both in Canvas2D.
    const backend = this.app.renderer.backend === 'canvas2d' ? 'canvas2d' : 'auto';
    const { shown } = this;
    const skin = new TownSkin(this.canvas, shown?.layout ?? home, page, { backend });
    // The Canvas2D fallback draws on a clone of the canvas, so the name goes on the skin's own.
    if (shown) skin.canvas.setAttribute('aria-label', townLabel(shown.name));
    this.skin = skin;
    this.app.renderer.setTown(skin);
    this.app.redraw();
  }

  // A frame the atlas lacks throws here, and the skin keeps the town it had. The app redraws.
  private show(layout: PlaceLayout, name: string): void {
    this.shown = { layout, name };
    if (this.skin === null) return;
    this.skin.setLayout(layout);
    this.skin.canvas.setAttribute('aria-label', townLabel(name));
  }
}

// The Town skin (interfaces.md, The Town skin): Highcourt from the map worker and the town atlas, both fetched in idle
// time after the page is interactive, then lent to the world renderer, which draws it whenever the skin chosen is the
// town. Until then, and if either fails to load, the town stays dots.
export function mountTownSkin(app: App): void {
  const canvas = townCanvas();
  element(document, '#view').append(canvas);
  const mount = new TownSkinMount(app, canvas);
  whenIdle(() => {
    mount.lend().catch((error: unknown) => {
      console.error('The Town skin did not load, so the town stays dots:', error);
    });
  });
}
