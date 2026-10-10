import { createWorldRenderer, fitCamera, observeDeviceSize, type Camera, type WorldRenderer } from '@nomos/render-gl';
import {
  TICK_MS,
  parseMap,
  type AppMessage,
  type EconomyMessage,
  type MapV1,
  type Tier,
  type WorkerMessage,
} from '@nomos/sim-protocol';
import type { Boot } from './boot.ts';
import { startAgents } from './tiers.ts';

// The HUD's frame row is the median of this many frames.
const FRAME_SAMPLES = 60;

export type StatsListener = (tick: number, systemMs: Record<string, number>) => void;
export type EconomyListener = (message: EconomyMessage) => void;

export interface Start {
  seed: number;
  tier: Tier;
  // The URL named the tier, so it runs its whole count instead of filling the town.
  tierNamed: boolean;
  backend: 'auto' | 'canvas2d';
  // Starts as if the user had paused: no tick runs until Play, and the first frame shows the tick-0 snapshot.
  paused: boolean;
}

export interface App {
  renderer: WorldRenderer;
  worker: Worker;
  tier: Tier;
  seed: number;
  agents: number;
  tick: number;
  camera: Camera;
  // The user's choice, or the reduced-motion start. A hidden tab pauses the worker without changing it.
  paused: boolean;
  // Push-and-draw milliseconds of the last FRAME_SAMPLES frames, in no order.
  frameMs: number[];
  // Resolves as frame:first is marked, so whatever loads after the first frame knows when to start.
  firstFrame: Promise<void>;
  setPaused(paused: boolean): void;
  onStats(listener: StatsListener): void;
  // The listener gets the latest economy message at once, if one has come, so a panel that mounts late draws what it
  // missed, and every message after it.
  onEconomy(listener: EconomyListener): void;
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
  map: MapV1;
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

// A hidden view measures 0 × 0, so the camera fits on the view's first real size.
function fit(app: App, scene: Scene): void {
  const { map, size } = scene;
  if (scene.fitted || !size) return;
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

// Draws only on a change: a snapshot still easing in, a new camera or a resize. A paused run that has reached its
// snapshot draws nothing, and the canvas keeps its last frame, which spares phones' batteries.
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

function createScene(map: MapV1): Scene {
  return {
    map,
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
  // The worker builds the world while this thread sets up WebGL, so it gets the map first. parseMap copies what it
  // keeps, so the bytes can go to the worker. Nothing may await between the post and the listeners below, or a fast
  // worker's ready and spawn would arrive to find none.
  const { bytes, map } = await loadMap(boot, status);
  const agents = startAgents(start.tier, map, start.tierNamed);
  post({ type: 'init', seed: start.seed, tier: start.tier, map: bytes, checks: import.meta.env.DEV, agents }, [bytes]);
  const renderer = createWorldRenderer(element<HTMLCanvasElement>(doc, '#world'), {
    backend: start.backend,
    release: (buffer) => post({ type: 'return', buffer }, [buffer]),
  });
  try {
    renderer.init();
  } catch (error) {
    fail(status, 'This browser cannot draw the town', error);
  }
  renderer.setMap(map);

  const scene = createScene(map);
  const listeners: StatsListener[] = [];
  const economyListeners: EconomyListener[] = [];
  let economy: EconomyMessage | null = null;
  const app: App = {
    renderer,
    worker,
    tier: start.tier,
    seed: start.seed,
    agents: 0,
    tick: 0,
    camera: { x: 0, y: 0, zoom: 1 },
    paused: start.paused,
    frameMs: [],
    firstFrame: new Promise((resolve) => {
      scene.firstFrameDrawn = resolve;
    }),
    setPaused(paused) {
      app.paused = paused;
      post({ type: paused ? 'pause' : 'resume' });
    },
    onStats(listener) {
      listeners.push(listener);
    },
    onEconomy(listener) {
      economyListeners.push(listener);
      if (economy) listener(economy);
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
  const pushEconomy = (message: EconomyMessage): void => {
    economy = message;
    economyListeners.forEach((listener) => listener(message));
  };
  // A checkpoint, the answer to pagehide's request, waits for M6's saves.
  worker.addEventListener('message', ({ data }: MessageEvent<WorkerMessage>) => {
    if (data.type === 'snapshot') pushSnapshot(app, scene, data);
    else if (data.type === 'stats') listeners.forEach((listener) => listener(data.tick, data.systemMs));
    else if (data.type === 'ready') onReady(data.agents);
    else if (data.type === 'economy') pushEconomy(data);
  });
  const workerStopped = (detail?: string): void => {
    status.textContent = `The simulation stopped: ${detail || 'its worker did not start'}`;
  };
  worker.addEventListener('error', (event) => {
    event.preventDefault();
    workerStopped(event.message);
  });
  // The boot script keeps an error that fired before this listener existed, as one can while the entry chunk or the
  // map loads.
  if (boot.failed) workerStopped();

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
  window.__app = app;
  return app;
}
