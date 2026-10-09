import type { PlaceLayout } from '@nomos/sim-protocol/place';
import type { AtlasPage } from '../map/frames.ts';
import { createLifecycle, type Backend, type LifecycleOptions } from '../map/lifecycle.ts';
import { snapToDevice, type PlaceCamera } from './camera.ts';
import { createCanvas2dPainter } from './canvas2d.ts';
import { createPlacePass } from './pass.ts';
import { personFrames, type PersonFrames } from './people.ts';
import { PlaceSprites } from './sprites.ts';

export type PlaceBackend = Backend;

export type PlaceRendererOptions = LifecycleOptions;

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
  // A camera is read only when it is not the last one drawn, so each move takes a new camera, as the helpers give.
  draw(camera: PlaceCamera): void;
  dispose(): void;
}

// left and top are the view's top-left in whole device px.
interface PlacePainter {
  setAtlas(page: AtlasPage): void;
  draw(sprites: PlaceSprites | null, scale: number, left: number, top: number): void;
  dispose(): void;
}

// What the place keeps for any painter, made at init or after a lost context.
interface PlaceState {
  // The last camera draw received, which a painter made after a lost context draws at once: the app draws on demand.
  camera: PlaceCamera | null;
  // That camera snapped to whole device px once, not once a frame: a fractional camera's x and y box into heap numbers
  // whenever they are read and passed on.
  scale: number;
  left: number;
  top: number;
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

function createGlPainter(canvas: HTMLCanvasElement): PlacePainter | null {
  const gl = canvas.getContext('webgl2', CONTEXT);
  if (!gl) return null;
  const pass = createPlacePass(gl);
  return {
    setAtlas(page) {
      pass.setAtlas(page);
    },
    draw(sprites, scale, left, top) {
      pass.draw(sprites, scale, left, top);
    },
    dispose() {
      pass.dispose();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
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
  const state: PlaceState = { camera: null, scale: 1, left: 0, top: 0, page: null, people: null, layout: null, sprites: null };
  const life = createLifecycle<PlacePainter>(canvas, options, {
    openGl: createGlPainter,
    open2d: createCanvas2dPainter,
    // A new painter starts from the page the place kept; the sprites it draws come with each draw.
    adopt: (painter) => {
      if (state.page) painter.setAtlas(state.page);
    },
    redraw: () => redraw(),
  });

  function redraw(): void {
    const { painter, canvas } = life;
    if (!painter || !state.camera || canvas.width === 0 || canvas.height === 0) return;
    state.sprites?.pack();
    painter.draw(state.sprites, state.scale, state.left, state.top);
  }

  return {
    get backend() {
      return life.backend;
    },
    get canvas() {
      return life.canvas;
    },
    init() {
      return life.init();
    },
    resize(deviceWidth, deviceHeight, dpr) {
      life.resize(deviceWidth, deviceHeight, dpr);
    },
    setAtlas(page) {
      state.page = page;
      state.people = personFrames(page.frames);
      state.sprites = spritesOf(state);
      life.painter?.setAtlas(page);
    },
    setPlace(layout) {
      state.layout = layout;
      state.sprites = spritesOf(state);
    },
    draw(camera) {
      if (camera !== state.camera) {
        checkScale(camera);
        state.camera = camera;
        state.scale = camera.scale;
        state.left = snapToDevice(camera.x, camera.scale);
        state.top = snapToDevice(camera.y, camera.scale);
      }
      redraw();
    },
    dispose() {
      life.dispose();
    },
  };
}
