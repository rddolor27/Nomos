import type { PlaceLayout } from '@nomos/sim-protocol/place';
import type { AtlasPage } from '../map/frames.ts';
import type { PlaceCamera } from './camera.ts';
import { createCanvas2dPainter } from './canvas2d.ts';
import { createPlacePass } from './pass.ts';
import { personFrames, type PersonFrames } from './people.ts';
import { PlaceSprites } from './sprites.ts';

export type PlaceBackend = 'webgl2' | 'canvas2d';

export interface PlaceRendererOptions {
  // 'canvas2d' skips WebGL2, as the town's ?canvas asks; 'auto' is the default.
  backend?: 'auto' | 'canvas2d';
  // How long a lost WebGL2 context may stay lost before Canvas2D takes over; 3,000 ms by default.
  restoreTimeoutMs?: number;
}

export interface PlaceRenderer {
  // The requested backend until init settles it.
  readonly backend: PlaceBackend;
  // The canvas drawn on, which the Canvas2D fallback replaces.
  readonly canvas: HTMLCanvasElement;
  init(): PlaceBackend;
  // Fixes the canvas's CSS size at device / dpr, so callers observe its container, never the canvas.
  resize(deviceWidth: number, deviceHeight: number, dpr: number): void;
  // Until both a page and a place are in, a draw shows only the background.
  setAtlas(page: AtlasPage): void;
  // Every draw reads the people's columns again, so the caller moves people by rewriting x, y, pose, facing and step
  // in place before it draws.
  setPlace(layout: PlaceLayout): void;
  draw(camera: PlaceCamera): void;
  dispose(): void;
}

interface PlacePainter {
  setAtlas(page: AtlasPage): void;
  draw(sprites: PlaceSprites | null, camera: PlaceCamera): void;
  dispose(): void;
}

interface PlaceState {
  readonly options: PlaceRendererOptions;
  canvas: HTMLCanvasElement;
  painter: PlacePainter | null;
  backend: PlaceBackend;
  lost: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  // The last camera draw received, which a painter made after a lost context draws at once: the app draws on demand.
  camera: PlaceCamera | null;
  page: AtlasPage | null;
  people: PersonFrames | null;
  layout: PlaceLayout | null;
  sprites: PlaceSprites | null;
}

const CONTEXT: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
};
const RESTORE_TIMEOUT_MS = 3000;

function createGlPainter(canvas: HTMLCanvasElement): PlacePainter | null {
  const gl = canvas.getContext('webgl2', CONTEXT);
  if (!gl) return null;
  const pass = createPlacePass(gl);
  return {
    setAtlas(page) {
      pass.setAtlas(page);
    },
    draw(sprites, camera) {
      pass.draw(sprites, camera);
    },
    dispose() {
      pass.dispose();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

function canvas2d(canvas: HTMLCanvasElement): PlacePainter {
  const painter = createCanvas2dPainter(canvas);
  if (!painter) throw new Error('this browser offers neither WebGL2 nor Canvas2D for the place');
  return painter;
}

// A canvas that held a WebGL context never gives a 2D one, so the fallback draws on a shallow clone.
function replaceCanvas(old: HTMLCanvasElement): HTMLCanvasElement {
  const next = old.cloneNode(false) as HTMLCanvasElement;
  old.replaceWith(next);
  return next;
}

// A new painter starts from what the renderer kept, at init and after a lost context.
function adopt(state: PlaceState, painter: PlacePainter): PlacePainter {
  if (state.page) painter.setAtlas(state.page);
  return painter;
}

function openGl(state: PlaceState): PlacePainter | null {
  try {
    const painter = createGlPainter(state.canvas);
    return painter ? adopt(state, painter) : null;
  } catch {
    // A shader that failed to link: the canvas now holds a WebGL context, so swap it.
    state.canvas = replaceCanvas(state.canvas);
    return null;
  }
}

function spritesOf(state: PlaceState): PlaceSprites | null {
  const { page, people, layout } = state;
  return page && people && layout ? new PlaceSprites(layout, page.frames, people) : null;
}

// Drawn and read at whole device pixels, so a fractional scale would part the backends' pictures.
function checkScale(camera: PlaceCamera): void {
  if (Number.isInteger(camera.scale) && camera.scale >= 1) return;
  throw new Error(`a place draws at a whole scale of 1 or more, not ${camera.scale}`);
}

export function createPlaceRenderer(canvas: HTMLCanvasElement, options: PlaceRendererOptions = {}): PlaceRenderer {
  const state: PlaceState = {
    options,
    canvas,
    painter: null,
    backend: options.backend === 'canvas2d' ? 'canvas2d' : 'webgl2',
    lost: false,
    timer: undefined,
    camera: null,
    page: null,
    people: null,
    layout: null,
    sprites: null,
  };

  function redraw(): void {
    const { painter, camera, canvas, sprites } = state;
    if (!painter || !camera || state.lost || canvas.width === 0 || canvas.height === 0) return;
    sprites?.pack();
    painter.draw(sprites, camera);
  }

  function fallBack(): void {
    unwatch();
    state.canvas = replaceCanvas(state.canvas);
    state.painter = adopt(state, canvas2d(state.canvas));
    state.backend = 'canvas2d';
    state.lost = false;
    redraw();
  }

  // Without preventDefault the browser never restores the context.
  function onLost(event: Event): void {
    event.preventDefault();
    state.lost = true;
    state.timer = setTimeout(fallBack, options.restoreTimeoutMs ?? RESTORE_TIMEOUT_MS);
  }

  function onRestored(): void {
    clearTimeout(state.timer);
    const painter = openGl(state);
    if (!painter) {
      fallBack();
      return;
    }
    state.painter = painter;
    state.lost = false;
    redraw();
  }

  function watch(): void {
    state.canvas.addEventListener('webglcontextlost', onLost);
    state.canvas.addEventListener('webglcontextrestored', onRestored);
  }

  function unwatch(): void {
    state.canvas.removeEventListener('webglcontextlost', onLost);
    state.canvas.removeEventListener('webglcontextrestored', onRestored);
  }

  return {
    get backend() {
      return state.backend;
    },
    get canvas() {
      return state.canvas;
    },
    init() {
      if (options.backend !== 'canvas2d') state.painter = openGl(state);
      if (state.painter) {
        watch();
        return 'webgl2';
      }
      state.painter = adopt(state, canvas2d(state.canvas));
      state.backend = 'canvas2d';
      return 'canvas2d';
    },
    resize(deviceWidth, deviceHeight, dpr) {
      state.canvas.width = deviceWidth;
      state.canvas.height = deviceHeight;
      state.canvas.style.width = `${deviceWidth / dpr}px`;
      state.canvas.style.height = `${deviceHeight / dpr}px`;
    },
    setAtlas(page) {
      state.page = page;
      state.people = personFrames(page.frames);
      state.sprites = spritesOf(state);
      if (!state.lost) state.painter?.setAtlas(page);
    },
    setPlace(layout) {
      state.layout = layout;
      state.sprites = spritesOf(state);
    },
    draw(camera) {
      checkScale(camera);
      state.camera = camera;
      redraw();
    },
    // The listeners go first: losing the context fires webglcontextlost, which would start the fallback timer.
    dispose() {
      unwatch();
      clearTimeout(state.timer);
      state.painter?.dispose();
      state.painter = null;
    },
  };
}
