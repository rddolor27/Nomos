import type { PlaceLayout } from '@nomos/sim-protocol/place';
import type { AtlasPage } from '../map/frames.ts';
import type { LifecycleOptions } from '../map/lifecycle.ts';
import type { PlaceCamera } from '../place/camera.ts';
import { createPlaceRenderer, type PlaceRenderer } from '../place/renderer.ts';
import type { Camera, TownPainter, TownView } from '../renderer/types.ts';
import { TownPeople } from './people.ts';
import { TownPips, withPipFrames, type PipSite } from './pips.ts';

const NO_SITES: readonly PipSite[] = [];

// Skin C's first cut, the Town skin: a town drawn by the place pass with the sim's agents as its people (owner request,
// 10 October 2026), Highcourt first and any other after setLayout (M2.2c). It draws on a canvas of its own over the
// dots' canvas, and hides that one while it shows, so assistive tech meets one picture. A world px is an art px, so the
// dots' camera places the town as it is.
export class TownSkin implements TownPainter {
  private readonly place: PlaceRenderer;
  private readonly frames: AtlasPage['frames'];
  private pips: TownPips;
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

  // `sites` are the town's shops and stalls, which wear stock pips (M2.7, setPips).
  constructor(
    canvas: HTMLCanvasElement,
    layout: PlaceLayout,
    page: AtlasPage,
    options: LifecycleOptions = {},
    sites: readonly PipSite[] = NO_SITES,
  ) {
    this.place = createPlaceRenderer(canvas, options);
    // The place draws with the atlas's frames and the pips' re-anchored copies of the beads.
    this.frames = withPipFrames(page.frames);
    this.pips = new TownPips(layout, sites, this.frames);
    this.people = new TownPeople();
    this.camera = null;
    this.placeCamera = { x: 0, y: 0, scale: 1 };
    this.width = 0;
    this.height = 0;
    this.dpr = 0;
    this.shown = false;
    this.redrawSoon = this.redraw.bind(this);
    this.place.init();
    this.place.setAtlas({ image: page.image, frames: this.frames });
    // Before any agent, so a frame the atlas cannot draw throws here, while the town loads, never in a draw.
    this.setPlace(this.pips);
  }

  // The canvas drawn on, which the Canvas2D fallback replaces.
  get canvas(): HTMLCanvasElement {
    return this.place.canvas;
  }

  // Swaps the town drawn: its ground, buildings and size, from the next draw. The sim's agents stay its people, rewritten
  // by that draw, and the layout's own people are never drawn. The sprite list is made here, so a frame the atlas cannot
  // draw throws here, never in a draw. The new town's pips stay hidden until setPips.
  setLayout(layout: PlaceLayout, sites: readonly PipSite[] = NO_SITES): void {
    const pips = new TownPips(layout, sites, this.frames);
    this.setPlace(pips);
    this.pips = pips;
  }

  // Lights the pip over each of the town's sites to its level, 0 to 3, and closes each stall at 0, from the next draw. A level
  // past 3 hides the pip. Nothing is made, so the page may call it on every economy day.
  setPips(levels: ArrayLike<number>): void {
    this.pips.set(levels);
  }

  draw(camera: Camera, alpha: number, view: TownView): number | undefined {
    if (view.drawnSkin !== 'town') {
      this.show(false, view.canvas);
      return undefined;
    }
    this.show(true, view.canvas);
    const { retained } = view;
    this.fit(view);
    if (this.people.fit(retained.count)) this.setPlace(this.pips);
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

  // The place draws the sim's columns as the layout's people, so it takes them again whenever they are made again. It also
  // takes the pips' layout, whose standing sprites setPips rewrites in place.
  private setPlace(pips: TownPips): void {
    this.place.setPlace({ ...pips.layout, people: this.people.columns });
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
