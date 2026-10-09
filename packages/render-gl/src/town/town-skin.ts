import type { PlaceLayout } from '@nomos/sim-protocol/place';
import type { AtlasPage } from '../map/frames.ts';
import type { LifecycleOptions } from '../map/lifecycle.ts';
import type { PlaceCamera } from '../place/camera.ts';
import { createPlaceRenderer, type PlaceRenderer } from '../place/renderer.ts';
import type { Camera, TownPainter, TownView } from '../renderer/types.ts';
import { TownPeople } from './people.ts';

// Skin C's first cut, the Town skin: Highcourt drawn by the place pass with the sim's agents as its people (owner
// request, 10 October 2026). It draws on a canvas of its own over the dots' canvas, and hides that one while it shows,
// so assistive tech meets one picture. A world px is an art px, so the dots' camera places the town as it is.
export class TownSkin implements TownPainter {
  private readonly place: PlaceRenderer;
  private readonly layout: PlaceLayout;
  private readonly people: TownPeople;
  // The last camera drawn, and the place's camera made from it once, as the place renderer re-reads only a new one.
  private camera: Camera | null;
  private placeCamera: PlaceCamera;
  // The device size and dpr the canvas was last given.
  private width: number;
  private height: number;
  private dpr: number;
  private shown: boolean;
  // redraw, bound once for requestAnimationFrame.
  private readonly redrawSoon: FrameRequestCallback;

  constructor(canvas: HTMLCanvasElement, layout: PlaceLayout, page: AtlasPage, options: LifecycleOptions = {}) {
    this.place = createPlaceRenderer(canvas, options);
    this.layout = layout;
    this.people = new TownPeople();
    this.camera = null;
    this.placeCamera = { x: 0, y: 0, scale: 1 };
    this.width = 0;
    this.height = 0;
    this.dpr = 0;
    this.shown = false;
    this.redrawSoon = this.redraw.bind(this);
    this.place.init();
    this.place.setAtlas(page);
    // Before any agent, so a frame the atlas cannot draw throws here, while the town loads, never in a draw.
    this.setPeople();
  }

  // The canvas drawn on, which the Canvas2D fallback replaces.
  get canvas(): HTMLCanvasElement {
    return this.place.canvas;
  }

  draw(camera: Camera, alpha: number, view: TownView): number | undefined {
    if (view.drawnSkin !== 'town') {
      this.show(false, view.canvas);
      return undefined;
    }
    this.show(true, view.canvas);
    const { retained } = view;
    this.fit(view);
    if (this.people.fit(retained.count)) this.setPeople();
    this.people.write(retained, alpha);
    if (camera !== this.camera) {
      this.camera = camera;
      this.placeCamera = { x: camera.x, y: camera.y, scale: camera.zoom };
    }
    this.place.draw(this.placeCamera);
    return retained.count;
  }

  dispose(): void {
    this.place.dispose();
  }

  private setPeople(): void {
    this.place.setPlace({ ...this.layout, people: this.people.columns });
  }

  private redraw(): void {
    this.place.draw(this.placeCamera);
  }

  // The dots' canvas's device size and dpr, taken on the draw that first sees them, which then draws at once, so a
  // resize never shows a cleared canvas. WebKit shows black for a WebGL frame drawn just after its canvas resized, until
  // the next draw, and a paused town makes none, so the town draws once more on the next frame. Playwright's WebKit
  // does so on Windows, for the dots too (10 October 2026).
  private fit(view: TownView): void {
    const { width, height } = view.canvas;
    if (width === this.width && height === this.height && view.dpr === this.dpr) return;
    this.width = width;
    this.height = height;
    this.dpr = view.dpr;
    this.place.resize(width, height, view.dpr);
    requestAnimationFrame(this.redrawSoon);
  }

  private show(shown: boolean, dots: HTMLCanvasElement): void {
    if (shown === this.shown) return;
    this.shown = shown;
    this.place.canvas.hidden = !shown;
    dots.style.visibility = shown ? 'hidden' : '';
  }
}
