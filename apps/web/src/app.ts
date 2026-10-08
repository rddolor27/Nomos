import { createWorldRenderer, fitCamera, observeDeviceSize, type Camera, type WorldRenderer } from '@nomos/render-gl';
import { TICK_MS, parseMap, type AppMessage, type MapV1, type Tier, type WorkerMessage } from '@nomos/sim-protocol';
import type { Boot } from './boot.ts';

// The HUD's frame row is the median of this many frames.
const FRAME_SAMPLES = 60;

export type StatsListener = (tick: number, systemMs: Record<string, number>) => void;

export interface Start {
  seed: number;
  tier: Tier;
  backend: 'auto' | 'canvas2d';
}

export interface App {
  renderer: WorldRenderer;
  worker: Worker;
  tier: Tier;
  seed: number;
  agents: number;
  tick: number;
  camera: Camera;
  paused: boolean;
  userPaused: boolean;
  // Push-and-draw milliseconds of the last FRAME_SAMPLES frames, in no order.
  frameMs: number[];
  // Resolves as frame:first is marked, so whatever loads after the first frame knows when to start.
  firstFrame: Promise<void>;
  setPaused(paused: boolean, byUser: boolean): void;
  onStats(listener: StatsListener): void;
  // Asks for a draw on the next frame, for a change the camera does not show, such as the skin.
  redraw(): void;
}

declare global {
  interface Window {
    __app?: App;
  }
}

type SnapshotMessage = Extract<WorkerMessage, { type: 'snapshot' }>;

// What the frame loop knows beyond the App: what has arrived, and what the last draw showed.
interface Scene {
  map: MapV1 | null;
  size: [number, number] | null;
  fitted: boolean;
  // 0 until the first snapshot arrives.
  snapshotAtMs: number;
  pushMs: number;
  dirty: boolean;
  drawnAlpha: number;
  drawnCamera: Camera | null;
  nextSample: number;
  firstFrameDrawn: (() => void) | null;
}

export function element<T extends Element>(doc: Document, selector: string): T {
  const found = doc.querySelector<T>(selector);
  if (!found) throw new Error(`the page has no ${selector}`);
  return found;
}

function fail(status: HTMLElement, what: string, error: unknown): never {
  status.textContent = `${what}: ${error instanceof Error ? error.message : String(error)}`;
  throw error;
}

async function loadMap(boot: Boot, status: HTMLElement): Promise<{ bytes: ArrayBuffer; map: MapV1 }> {
  const bytes = await boot.map.catch((error: unknown) => fail(status, 'The town map did not load', error));
  performance.mark('map:fetched');
  try {
    return { bytes, map: parseMap(bytes) };
  } catch (error) {
    return fail(status, 'The town map could not be read', error);
  }
}

// A map that arrived before the view had a size would fit a 0 × 0 view, so this waits for whichever comes second.
function fit(app: App, scene: Scene): void {
  const { map, size } = scene;
  if (scene.fitted || !map || !size) return;
  app.camera = fitCamera(map.width, map.height, size[0], size[1]);
  scene.fitted = true;
  scene.dirty = true;
}

function recordFrame(app: App, scene: Scene, ms: number): void {
  if (app.frameMs.length < FRAME_SAMPLES) app.frameMs.push(ms);
  else app.frameMs[scene.nextSample] = ms;
  scene.nextSample = (scene.nextSample + 1) % FRAME_SAMPLES;
}

function markFirstFrame(scene: Scene): void {
  if (!scene.firstFrameDrawn || scene.snapshotAtMs === 0) return;
  performance.mark('frame:first');
  scene.firstFrameDrawn();
  scene.firstFrameDrawn = null;
}

// Draws only on a change: a snapshot still easing in, a new camera, a resize or the map. A paused run that has
// reached its snapshot draws nothing, and the canvas keeps its last frame, which spares phones' batteries.
function drawFrame(app: App, scene: Scene, nowMs: number): void {
  if (!scene.size) return;
  const alpha = Math.max(0, Math.min(1, (nowMs - scene.snapshotAtMs) / TICK_MS));
  if (!scene.dirty && alpha === scene.drawnAlpha && app.camera === scene.drawnCamera) return;
  const startMs = performance.now();
  app.renderer.draw(app.camera, alpha);
  recordFrame(app, scene, scene.pushMs + performance.now() - startMs);
  scene.pushMs = 0;
  scene.dirty = false;
  scene.drawnAlpha = alpha;
  scene.drawnCamera = app.camera;
  markFirstFrame(scene);
}

function pushSnapshot(app: App, scene: Scene, frame: SnapshotMessage): void {
  const startMs = performance.now();
  app.renderer.pushSnapshot(frame);
  scene.snapshotAtMs = performance.now();
  scene.pushMs += scene.snapshotAtMs - startMs;
  scene.dirty = true;
  app.tick = frame.tick;
}

function createScene(): Scene {
  return {
    map: null,
    size: null,
    fitted: false,
    snapshotAtMs: 0,
    pushMs: 0,
    dirty: true,
    drawnAlpha: -1,
    drawnCamera: null,
    nextSample: 0,
    firstFrameDrawn: null,
  };
}

export async function startApp(boot: Boot, doc: Document, start: Start): Promise<App> {
  const status = element<HTMLElement>(doc, '#status');
  const { worker } = boot;
  const post = (msg: AppMessage, transfer: Transferable[] = []): void => worker.postMessage(msg, transfer);
  const renderer = createWorldRenderer(element<HTMLCanvasElement>(doc, '#world'), {
    backend: start.backend,
    release: (buffer) => post({ type: 'return', buffer }, [buffer]),
  });
  try {
    renderer.init();
  } catch (error) {
    fail(status, 'This browser cannot draw the town', error);
  }

  const scene = createScene();
  const listeners: StatsListener[] = [];
  const app: App = {
    renderer,
    worker,
    tier: start.tier,
    seed: start.seed,
    agents: 0,
    tick: 0,
    camera: { x: 0, y: 0, zoom: 1 },
    paused: false,
    userPaused: false,
    frameMs: [],
    firstFrame: new Promise((resolve) => {
      scene.firstFrameDrawn = resolve;
    }),
    setPaused(paused, byUser) {
      app.paused = paused;
      if (byUser) app.userPaused = paused;
      post({ type: paused ? 'pause' : 'resume' });
    },
    onStats(listener) {
      listeners.push(listener);
    },
    redraw() {
      scene.dirty = true;
    },
  };

  // A hidden tab stays paused; the page lifecycle resumes it once it shows.
  const onReady = (agents: number): void => {
    app.agents = agents;
    performance.mark('sim:ready');
    if (!app.paused && doc.visibilityState === 'visible') post({ type: 'resume' });
  };
  // A checkpoint, the answer to pagehide's request, waits for M6's saves.
  worker.addEventListener('message', ({ data }: MessageEvent<WorkerMessage>) => {
    if (data.type === 'snapshot') pushSnapshot(app, scene, data);
    else if (data.type === 'stats') listeners.forEach((listener) => listener(data.tick, data.systemMs));
    else if (data.type === 'ready') onReady(data.agents);
  });
  worker.addEventListener('error', (event) => {
    event.preventDefault();
    status.textContent = `The simulation stopped: ${event.message || 'its worker did not start'}`;
  });

  // Drawn at once, inside the observer, so a resized canvas never shows a blank frame before the next one.
  observeDeviceSize(element<HTMLElement>(doc, '#view'), (width, height, dpr) => {
    renderer.resize(width, height, dpr);
    scene.size = width > 0 && height > 0 ? [width, height] : null;
    scene.dirty = true;
    fit(app, scene);
    drawFrame(app, scene, performance.now());
  });
  const onAnimationFrame = (nowMs: number): void => {
    drawFrame(app, scene, nowMs);
    requestAnimationFrame(onAnimationFrame);
  };
  requestAnimationFrame(onAnimationFrame);

  // parseMap copies what it keeps, so the bytes can go to the worker.
  const { bytes, map } = await loadMap(boot, status);
  renderer.setMap(map);
  scene.map = map;
  scene.dirty = true;
  fit(app, scene);
  post({ type: 'init', seed: start.seed, tier: start.tier, map: bytes }, [bytes]);
  window.__app = app;
  return app;
}
