import { SNAPSHOT_BYTES } from '@nomos/sim-protocol';
import { cssPxPerTile, mapShareInView } from './camera.ts';
import { createCanvas2dPainter } from './canvas2d.ts';
import { minimapPixels } from './minimap.ts';
import { autoSkin, builtSkin, type Skin } from './skin.ts';
import type { Backend, Camera, Painter, RendererOptions, Retained, WorldRenderer } from './types.ts';
import { createGlPainter } from './webgl.ts';

const RESTORE_TIMEOUT_MS = 3000;

interface RendererState {
  readonly options: RendererOptions;
  readonly retained: Retained;
  canvas: HTMLCanvasElement;
  painter: Painter | null;
  backend: Backend;
  // While a context is lost, nothing reaches the GPU; the retained data still updates.
  lost: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  drawn: number;
  dpr: number;
  skin: Skin;
  lod: 'auto' | 'fixed';
  // autoSkin's own last answer. While town is unbuilt the drawn skin stays dots, so feeding that back instead would
  // lose the hysteresis.
  level: 'dots' | 'town';
  drawnSkin: Skin;
}

// Room doubles, so births regrow the copies and buffers only now and then.
function grow(retained: Retained, agents: number): void {
  const bytes = Math.max(agents, (retained.copies[0].length / SNAPSHOT_BYTES) * 2) * SNAPSHOT_BYTES;
  retained.copies = retained.copies.map((old) => {
    const copy = new Uint8Array(bytes);
    copy.set(old);
    return copy;
  });
  retained.floats = retained.copies.map((copy) => new Float32Array(copy.buffer));
  retained.words = retained.copies.map((copy) => new Uint32Array(copy.buffer));
}

function retain(retained: Retained, frame: { count: number; buffer: ArrayBuffer }): void {
  const bytes = frame.count * SNAPSHOT_BYTES;
  // Until a snapshot arrives the copies are empty. The first is its own previous one too, or a frame drawn before the
  // second, as a paused spawn's is, would slide agents in from (0, 0).
  const first = retained.copies[0].length === 0;
  if (bytes > retained.copies[0].length) grow(retained, frame.count);
  retained.slot ^= 1;
  // One small view per snapshot, made outside any frame, as the worker's pool makes one per return.
  const snapshot = new Uint8Array(frame.buffer, 0, bytes);
  retained.copies[retained.slot].set(snapshot);
  if (first) retained.copies[retained.slot ^ 1].set(snapshot);
  retained.count = frame.count;
}

function canvas2d(canvas: HTMLCanvasElement, retained: Retained): Painter {
  const painter = createCanvas2dPainter(canvas, retained);
  if (!painter) throw new Error('this browser offers neither WebGL2 nor Canvas2D');
  return painter;
}

// The agent count times the share of the map in view: an estimate that needs no pass over the agents.
function agentsInView(state: RendererState, camera: Camera): number {
  const { map, count } = state.retained;
  if (!map) return count;
  return count * mapShareInView(camera, state.canvas.width, state.canvas.height, map.width, map.height);
}

function skinToDraw(state: RendererState, camera: Camera): Skin {
  if (state.lod === 'fixed') return builtSkin(state.skin);
  state.level = autoSkin(state.level, cssPxPerTile(camera.zoom, state.dpr), agentsInView(state, camera));
  return builtSkin(state.level);
}

// A canvas that held a WebGL context never gives a 2D one, so the fallback draws on a shallow clone: every attribute,
// id, class, ARIA and size included, but no context.
function replaceCanvas(old: HTMLCanvasElement): HTMLCanvasElement {
  const next = old.cloneNode(false) as HTMLCanvasElement;
  old.replaceWith(next);
  return next;
}

export function createWorldRenderer(canvas: HTMLCanvasElement, options: RendererOptions): WorldRenderer {
  const empty = new Uint8Array(0);
  const state: RendererState = {
    options,
    retained: {
      map: null,
      minimap: null,
      copies: [empty, empty],
      floats: [new Float32Array(0), new Float32Array(0)],
      words: [new Uint32Array(0), new Uint32Array(0)],
      slot: 0,
      count: 0,
    },
    canvas,
    painter: null,
    backend: options.backend === 'canvas2d' ? 'canvas2d' : 'webgl2',
    lost: false,
    timer: undefined,
    drawn: 0,
    dpr: 1,
    skin: 'dots',
    lod: 'auto',
    level: 'dots',
    drawnSkin: 'dots',
  };

  function watch(): void {
    state.canvas.addEventListener('webglcontextlost', onLost);
    state.canvas.addEventListener('webglcontextrestored', onRestored);
  }

  function unwatch(): void {
    state.canvas.removeEventListener('webglcontextlost', onLost);
    state.canvas.removeEventListener('webglcontextrestored', onRestored);
  }

  // Without preventDefault the browser never restores the context.
  function onLost(event: Event): void {
    event.preventDefault();
    state.lost = true;
    state.timer = setTimeout(fallBack, options.restoreTimeoutMs ?? RESTORE_TIMEOUT_MS);
  }

  // The same build as init, from the retained map and snapshots.
  function onRestored(): void {
    clearTimeout(state.timer);
    state.painter = createGlPainter(state.canvas, state.retained);
    if (state.painter) state.lost = false;
    else fallBack();
  }

  function fallBack(): void {
    unwatch();
    state.canvas = replaceCanvas(state.canvas);
    state.painter = canvas2d(state.canvas, state.retained);
    state.backend = 'canvas2d';
    state.lost = false;
  }

  return {
    get backend() {
      return state.backend;
    },
    get canvas() {
      return state.canvas;
    },
    get drawnAgents() {
      return state.drawn;
    },
    get drawnSkin() {
      return state.drawnSkin;
    },
    init() {
      if (options.backend !== 'canvas2d') {
        try {
          state.painter = createGlPainter(state.canvas, state.retained);
        } catch {
          // The shaders did not link, and the canvas now holds a WebGL context, which never gives a 2D one.
          state.canvas = replaceCanvas(state.canvas);
        }
        if (state.painter) {
          watch();
          return 'webgl2';
        }
      }
      // A WebGL2 request that came back empty leaves the canvas free for a 2D context.
      state.painter = canvas2d(state.canvas, state.retained);
      state.backend = 'canvas2d';
      return 'canvas2d';
    },
    // The CSS size is the device size over dpr, so a canvas never shows rescaled.
    resize(deviceWidth, deviceHeight, dpr) {
      state.canvas.width = deviceWidth;
      state.canvas.height = deviceHeight;
      state.canvas.style.width = `${deviceWidth / dpr}px`;
      state.canvas.style.height = `${deviceHeight / dpr}px`;
      state.dpr = dpr;
    },
    setMap(map) {
      state.retained.map = map;
      state.retained.minimap = minimapPixels(map);
      if (!state.lost) state.painter?.mapChanged();
    },
    // A hidden tab draws nothing, so the buffer goes back now, not on draw, or the worker's pool runs dry.
    pushSnapshot(frame) {
      retain(state.retained, frame);
      if (!state.lost) state.painter?.snapshotPushed();
      options.release(frame.buffer);
    },
    draw(camera, alpha) {
      const painter = state.painter;
      if (!painter || state.lost || state.canvas.width === 0 || state.canvas.height === 0) return;
      state.drawnSkin = skinToDraw(state, camera);
      state.drawn = painter.draw(camera, alpha);
    },
    setSkin(skin) {
      state.skin = skin;
      return builtSkin(skin);
    },
    setLod(policy) {
      state.lod = policy;
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
