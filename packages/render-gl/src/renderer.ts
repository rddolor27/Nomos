import { SNAPSHOT_BYTES } from '@nomos/sim-protocol';
import { createCanvas2dPainter } from './canvas2d.ts';
import { minimapPixels } from './minimap.ts';
import type { Painter, RendererOptions, Retained, WorldRenderer } from './types.ts';
import { createGlPainter } from './webgl.ts';

const RESTORE_TIMEOUT_MS = 3000;

interface RendererState {
  readonly options: RendererOptions;
  readonly retained: Retained;
  canvas: HTMLCanvasElement;
  painter: Painter | null;
  // While a context is lost, nothing reaches the GPU; the retained data still updates.
  lost: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  drawn: number;
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
  if (bytes > retained.copies[0].length) grow(retained, frame.count);
  retained.slot ^= 1;
  // One small view per snapshot, made outside any frame, as the worker's pool makes one per return.
  retained.copies[retained.slot].set(new Uint8Array(frame.buffer, 0, bytes));
  retained.count = frame.count;
}

function canvas2d(canvas: HTMLCanvasElement, retained: Retained): Painter {
  const painter = createCanvas2dPainter(canvas, retained);
  if (!painter) throw new Error('this browser offers neither WebGL2 nor Canvas2D');
  return painter;
}

// A canvas that held a WebGL context never gives a 2D one, so the fallback draws on a copy with every attribute,
// id, class, ARIA and size included.
function replaceCanvas(old: HTMLCanvasElement): HTMLCanvasElement {
  const next = document.createElement('canvas');
  for (const { name, value } of Array.from(old.attributes)) next.setAttribute(name, value);
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
    lost: false,
    timer: undefined,
    drawn: 0,
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
    state.lost = false;
  }

  return {
    get backend() {
      return state.painter ? state.painter.backend : 'webgl2';
    },
    get canvas() {
      return state.canvas;
    },
    get drawnAgents() {
      return state.drawn;
    },
    init() {
      if (options.backend !== 'canvas2d') {
        state.painter = createGlPainter(state.canvas, state.retained);
        if (state.painter) {
          watch();
          return 'webgl2';
        }
      }
      // A failed WebGL2 request leaves the canvas free for a 2D context.
      state.painter = canvas2d(state.canvas, state.retained);
      return 'canvas2d';
    },
    // The CSS size is the device size over dpr, so a canvas never shows rescaled.
    resize(deviceWidth, deviceHeight, dpr) {
      state.canvas.width = deviceWidth;
      state.canvas.height = deviceHeight;
      state.canvas.style.width = `${deviceWidth / dpr}px`;
      state.canvas.style.height = `${deviceHeight / dpr}px`;
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
      state.drawn = painter.draw(camera, alpha);
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
