import type { WorldMap } from '@nomos/sim-protocol/world-map';
import { createBasePass } from './base-pass.ts';
import { mapViewFor, type MapCamera, type MapView } from './camera.ts';
import { createCanvas2dPainter } from './canvas2d.ts';
import type { AtlasPage } from './frames.ts';
import { createIconsPass } from './icons.ts';
import { createLifecycle, type Backend, type LifecycleOptions } from './lifecycle.ts';

export type MapBackend = Backend;

export type MapRendererOptions = LifecycleOptions;

export interface MapRenderer {
  // The requested backend until init settles it.
  readonly backend: MapBackend;
  // The canvas drawn on, which the Canvas2D fallback replaces.
  readonly canvas: HTMLCanvasElement;
  // The view the last draw showed.
  readonly view: MapView;
  init(): MapBackend;
  // Fixes the canvas's CSS size at device / dpr, so callers observe its container, never the canvas.
  resize(deviceWidth: number, deviceHeight: number, dpr: number): void;
  setWorld(map: WorldMap): void;
  // Until a page arrives, WebGL2 draws the flat view.
  setAtlas(page: AtlasPage): void;
  setFlat(flat: boolean): void;
  draw(camera: MapCamera): void;
  dispose(): void;
}

interface MapPainter {
  setWorld(map: WorldMap): void;
  setAtlas(page: AtlasPage): void;
  draw(camera: MapCamera, view: MapView, flat: boolean): void;
  dispose(): void;
}

// What the map keeps for any painter, made at init or after a lost context.
interface MapState {
  dpr: number;
  view: MapView;
  flat: boolean;
  // The last camera draw received, which a painter made after a lost context draws at once: the app draws on demand.
  camera: MapCamera | null;
  world: WorldMap | null;
  page: AtlasPage | null;
}

const CONTEXT: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
};
// A large world's Region overlay is 192 cells of 16 px across (Ruling 3).
const MIN_TEXTURE_PX = 3072;

function createGlPainter(canvas: HTMLCanvasElement): MapPainter | null {
  const gl = canvas.getContext('webgl2', CONTEXT);
  if (!gl) return null;
  if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < MIN_TEXTURE_PX) throw new Error('WebGL2 textures here stop below 3,072 px');
  const base = createBasePass(gl);
  const icons = createIconsPass(gl);
  return {
    setWorld(map) {
      base.setWorld(map);
      icons.setWorld(map);
    },
    setAtlas(page) {
      base.setAtlas(page);
      icons.setAtlas(page);
    },
    draw(camera, view, flat) {
      base.draw(camera, view, flat);
      icons.draw(camera, view, flat);
    },
    dispose() {
      base.dispose();
      icons.dispose();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

// A new painter starts from what the map kept.
function adopt(state: MapState, painter: MapPainter): void {
  if (state.world) painter.setWorld(state.world);
  if (state.page) painter.setAtlas(state.page);
}

export function createMapRenderer(canvas: HTMLCanvasElement, options: MapRendererOptions = {}): MapRenderer {
  const state: MapState = { dpr: 1, view: 'country', flat: false, camera: null, world: null, page: null };
  const life = createLifecycle<MapPainter>(canvas, options, {
    openGl: createGlPainter,
    // The fallback always draws flat, whatever setFlat asks, so its draw takes no flag.
    open2d: createCanvas2dPainter,
    adopt: (painter) => adopt(state, painter),
    redraw: () => redraw(),
  });

  function redraw(): void {
    const { painter, canvas } = life;
    const { camera } = state;
    if (!painter || !camera || canvas.width === 0 || canvas.height === 0) return;
    state.view = mapViewFor(state.view, camera.cellPx, state.dpr);
    painter.draw(camera, state.view, state.flat);
  }

  return {
    get backend() {
      return life.backend;
    },
    get canvas() {
      return life.canvas;
    },
    get view() {
      return state.view;
    },
    init() {
      return life.init();
    },
    resize(deviceWidth, deviceHeight, dpr) {
      life.resize(deviceWidth, deviceHeight, dpr);
      state.dpr = dpr;
    },
    setWorld(map) {
      state.world = map;
      life.painter?.setWorld(map);
    },
    setAtlas(page) {
      state.page = page;
      life.painter?.setAtlas(page);
    },
    setFlat(flat) {
      state.flat = flat;
    },
    draw(camera) {
      state.camera = camera;
      redraw();
    },
    dispose() {
      life.dispose();
    },
  };
}
