import type { WorldMap } from '@nomos/sim-protocol/world-map';
import { createBasePass } from './base-pass.ts';
import { mapViewFor, type MapCamera, type MapView } from './camera.ts';
import { createCanvas2dPainter } from './canvas2d.ts';
import { createCrowdPass } from './crowd.ts';
import type { AtlasPage } from './frames.ts';
import { createIconsPass } from './icons.ts';

export type MapBackend = 'webgl2' | 'canvas2d';

export interface MapRendererOptions {
  // 'canvas2d' skips WebGL2, as the town's ?canvas asks; 'auto' is the default.
  backend?: 'auto' | 'canvas2d';
  // How long a lost WebGL2 context may stay lost before Canvas2D takes over; 3,000 ms by default.
  restoreTimeoutMs?: number;
}

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
  // Each dot's CROWD_HUES index, and its x then y in fractional cells, which the caller rewrites in place before each
  // draw. The Region view draws them; the Country view never does (owner, 9 October 2026).
  setCrowd(hue: Uint8Array, xy: Float32Array): void;
  draw(camera: MapCamera): void;
  dispose(): void;
}

interface MapPainter {
  setWorld(map: WorldMap): void;
  setAtlas(page: AtlasPage): void;
  setCrowd(hue: Uint8Array, xy: Float32Array): void;
  draw(camera: MapCamera, view: MapView, flat: boolean): void;
  dispose(): void;
}

interface Crowd {
  readonly hue: Uint8Array;
  readonly xy: Float32Array;
}

interface MapState {
  readonly options: MapRendererOptions;
  canvas: HTMLCanvasElement;
  painter: MapPainter | null;
  backend: MapBackend;
  lost: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  dpr: number;
  view: MapView;
  flat: boolean;
  // The last camera draw received, which a painter made after a lost context draws at once: the app draws on demand.
  camera: MapCamera | null;
  world: WorldMap | null;
  page: AtlasPage | null;
  crowd: Crowd | null;
}

const CONTEXT: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
};
const RESTORE_TIMEOUT_MS = 3000;
// A large world's Region overlay is 192 cells of 16 px across (Ruling 3).
const MIN_TEXTURE_PX = 3072;

function createGlPainter(canvas: HTMLCanvasElement): MapPainter | null {
  const gl = canvas.getContext('webgl2', CONTEXT);
  if (!gl) return null;
  if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < MIN_TEXTURE_PX) throw new Error('WebGL2 textures here stop below 3,072 px');
  const base = createBasePass(gl);
  const crowd = createCrowdPass(gl);
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
    setCrowd(hue, xy) {
      crowd.setCrowd(hue, xy);
    },
    // The crowd goes under the icons, so every settlement stays in sight.
    draw(camera, view, flat) {
      base.draw(camera, view, flat);
      if (view === 'region') crowd.draw(camera);
      icons.draw(camera, view, flat);
    },
    dispose() {
      base.dispose();
      crowd.dispose();
      icons.dispose();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

// The fallback always draws flat, whatever setFlat asks, so its draw takes no flag.
function canvas2d(canvas: HTMLCanvasElement): MapPainter {
  const painter = createCanvas2dPainter(canvas);
  if (!painter) throw new Error('this browser offers neither WebGL2 nor Canvas2D for the map');
  return painter;
}

// A canvas that held a WebGL context never gives a 2D one, so the fallback draws on a shallow clone.
function replaceCanvas(old: HTMLCanvasElement): HTMLCanvasElement {
  const next = old.cloneNode(false) as HTMLCanvasElement;
  old.replaceWith(next);
  return next;
}

// A new painter starts from what the renderer kept, at init and after a lost context.
function adopt(state: MapState, painter: MapPainter): MapPainter {
  if (state.world) painter.setWorld(state.world);
  if (state.page) painter.setAtlas(state.page);
  if (state.crowd) painter.setCrowd(state.crowd.hue, state.crowd.xy);
  return painter;
}

function openGl(state: MapState): MapPainter | null {
  try {
    const painter = createGlPainter(state.canvas);
    return painter ? adopt(state, painter) : null;
  } catch {
    // A shader that failed to link, or textures too small: the canvas now holds a WebGL context, so swap it.
    state.canvas = replaceCanvas(state.canvas);
    return null;
  }
}

export function createMapRenderer(canvas: HTMLCanvasElement, options: MapRendererOptions = {}): MapRenderer {
  const state: MapState = {
    options,
    canvas,
    painter: null,
    backend: options.backend === 'canvas2d' ? 'canvas2d' : 'webgl2',
    lost: false,
    timer: undefined,
    dpr: 1,
    view: 'country',
    flat: false,
    camera: null,
    world: null,
    page: null,
    crowd: null,
  };

  function redraw(): void {
    const { painter, camera, canvas } = state;
    if (!painter || !camera || state.lost || canvas.width === 0 || canvas.height === 0) return;
    state.view = mapViewFor(state.view, camera.cellPx, state.dpr);
    painter.draw(camera, state.view, state.flat);
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
    get view() {
      return state.view;
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
      state.dpr = dpr;
    },
    setWorld(map) {
      state.world = map;
      if (!state.lost) state.painter?.setWorld(map);
    },
    setAtlas(page) {
      state.page = page;
      if (!state.lost) state.painter?.setAtlas(page);
    },
    setFlat(flat) {
      state.flat = flat;
    },
    setCrowd(hue, xy) {
      if (xy.length !== 2 * hue.length) throw new Error('setCrowd takes an x and a y for each hue');
      state.crowd = { hue, xy };
      if (!state.lost) state.painter?.setCrowd(hue, xy);
    },
    draw(camera) {
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
