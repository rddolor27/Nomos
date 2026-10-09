// One WebGL2 context's life, for the lazy scenes, the map and the place: it opens WebGL2 or falls back to Canvas2D, and
// when the context is lost it waits for it to come back, then falls back if it stays lost. The town's first-load
// WorldRenderer keeps its own copy, as its chunk's bytes must not change (M3.1 review, Task 5).
export type Backend = 'webgl2' | 'canvas2d';

export interface LifecycleOptions {
  // 'canvas2d' skips WebGL2, as the town's ?canvas asks; 'auto' is the default.
  backend?: 'auto' | 'canvas2d';
  // How long a lost WebGL2 context may stay lost before Canvas2D takes over; 3,000 ms by default.
  restoreTimeoutMs?: number;
}

// What a scene lends its lifecycle: its two painters, how a new painter takes what the scene kept, and how to draw the
// last frame again, since the app draws on demand.
export interface Scene<P extends { dispose(): void }> {
  // Null without WebGL2; may throw, such as for a shader that failed to link.
  openGl(canvas: HTMLCanvasElement): P | null;
  // Null without Canvas2D.
  open2d(canvas: HTMLCanvasElement): P | null;
  adopt(painter: P): void;
  redraw(): void;
}

export interface Lifecycle<P> {
  // The requested backend until init settles it.
  readonly backend: Backend;
  // The canvas drawn on, which the Canvas2D fallback replaces.
  readonly canvas: HTMLCanvasElement;
  // The painter to draw with: none before init, while the context is lost, or after dispose.
  readonly painter: P | null;
  init(): Backend;
  // Fixes the canvas's CSS size at device / dpr, so callers observe its container, never the canvas.
  resize(deviceWidth: number, deviceHeight: number, dpr: number): void;
  dispose(): void;
}

const RESTORE_TIMEOUT_MS = 3000;

// A canvas that held a WebGL context never gives a 2D one, so the fallback draws on a shallow clone.
function replaceCanvas(old: HTMLCanvasElement): HTMLCanvasElement {
  const next = old.cloneNode(false) as HTMLCanvasElement;
  old.replaceWith(next);
  return next;
}

export function createLifecycle<P extends { dispose(): void }>(
  canvas: HTMLCanvasElement,
  options: LifecycleOptions,
  scene: Scene<P>,
): Lifecycle<P> {
  let current = canvas;
  let painter: P | null = null;
  let backend: Backend = options.backend === 'canvas2d' ? 'canvas2d' : 'webgl2';
  let lost = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function adopted(made: P): P {
    scene.adopt(made);
    return made;
  }

  function open2d(): P {
    const made = scene.open2d(current);
    if (!made) throw new Error('this browser offers neither WebGL2 nor Canvas2D');
    return adopted(made);
  }

  // A painter that failed to start leaves a WebGL context on its canvas, so the canvas is swapped.
  function openGl(): P | null {
    try {
      const made = scene.openGl(current);
      return made ? adopted(made) : null;
    } catch {
      current = replaceCanvas(current);
      return null;
    }
  }

  function fallBack(): void {
    unwatch();
    current = replaceCanvas(current);
    painter = open2d();
    backend = 'canvas2d';
    lost = false;
    scene.redraw();
  }

  // Without preventDefault the browser never restores the context.
  function onLost(event: Event): void {
    event.preventDefault();
    lost = true;
    timer = setTimeout(fallBack, options.restoreTimeoutMs ?? RESTORE_TIMEOUT_MS);
  }

  function onRestored(): void {
    clearTimeout(timer);
    const made = openGl();
    if (!made) {
      fallBack();
      return;
    }
    painter = made;
    lost = false;
    scene.redraw();
  }

  function watch(): void {
    current.addEventListener('webglcontextlost', onLost);
    current.addEventListener('webglcontextrestored', onRestored);
  }

  function unwatch(): void {
    current.removeEventListener('webglcontextlost', onLost);
    current.removeEventListener('webglcontextrestored', onRestored);
  }

  return {
    get backend() {
      return backend;
    },
    get canvas() {
      return current;
    },
    get painter() {
      return lost ? null : painter;
    },
    init() {
      if (options.backend !== 'canvas2d') painter = openGl();
      if (painter) {
        watch();
        return 'webgl2';
      }
      painter = open2d();
      backend = 'canvas2d';
      return 'canvas2d';
    },
    resize(deviceWidth, deviceHeight, dpr) {
      current.width = deviceWidth;
      current.height = deviceHeight;
      current.style.width = `${deviceWidth / dpr}px`;
      current.style.height = `${deviceHeight / dpr}px`;
    },
    // The listeners go first: losing the context fires webglcontextlost, which would start the fallback timer.
    dispose() {
      unwatch();
      clearTimeout(timer);
      painter?.dispose();
      painter = null;
    },
  };
}
