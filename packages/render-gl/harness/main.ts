import {
  SNAPSHOT_BYTES,
  actionOf,
  emoteOf,
  facingOf,
  jobOf,
  lookOf,
  packVisual,
  parseMap,
  type MapV1,
} from '@nomos/sim-protocol';
import { createWorldRenderer, type Backend, type Camera, type RendererOptions, type WorldRenderer } from '../src/index.ts';
import { fillReplayFrame } from '../test/replay.ts';

export interface FrameStats {
  backend: Backend;
  width: number;
  height: number;
  counts: Record<string, number>;
}

export interface PlacedAgent {
  x: number;
  y: number;
  job: number;
}

export interface BootOptions extends Pick<RendererOptions, 'backend' | 'restoreTimeoutMs'> {
  css?: [number, number];
  agents?: number;
}

export interface Harness {
  readonly renderer: WorldRenderer | null;
  readonly map: MapV1 | null;
  // Every buffer the renderer handed back, in order.
  readonly released: ArrayBuffer[];
  boot(options?: BootOptions): Promise<Backend>;
  view(camera: Camera): void;
  // Pushes replay frame `frame` of the booted agent count, or of options.agents of them.
  push(frame: number, options?: { agents?: number; trueOnly?: boolean }): ArrayBuffer;
  place(agents: PlacedAgent[]): ArrayBuffer;
  draw(alpha?: number): FrameStats;
  pixel(x: number, y: number): string;
  // The last frame drawn, as RGBA rows from the top.
  rgba(): Uint8Array;
}

declare global {
  interface Window {
    harness: Harness;
  }
}

let renderer: WorldRenderer | null = null;
let map: MapV1 | null = null;
let camera: Camera = { x: 0, y: 0, zoom: 1 };
let frame = { width: 0, height: 0, rgba: new Uint8Array(0) };
let agents = 0;
let pool: ArrayBuffer[] = [];
let released: ArrayBuffer[] = [];

async function loadTown(): Promise<MapV1> {
  const response = await fetch('/maps/town.nmap');
  if (!response.ok) throw new Error(`the town map answered ${response.status}`);
  return parseMap(await response.arrayBuffer());
}

function hex(r: number, g: number, b: number): string {
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// readPixels returns rows from the bottom; frames are kept from the top, as Canvas2D gives them.
function readGl(target: HTMLCanvasElement): void {
  const gl = target.getContext('webgl2');
  if (!gl) throw new Error('no WebGL2 frame to read');
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  const bottomUp = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bottomUp);
  const rgba = new Uint8Array(bottomUp.length);
  const row = width * 4;
  for (let y = 0; y < height; y++) rgba.set(bottomUp.subarray((height - 1 - y) * row, (height - y) * row), y * row);
  frame = { width, height, rgba };
}

function read2d(target: HTMLCanvasElement): void {
  const ctx = target.getContext('2d');
  if (!ctx) throw new Error('no Canvas2D frame to read');
  const image = ctx.getImageData(0, 0, target.width, target.height);
  frame = { width: image.width, height: image.height, rgba: new Uint8Array(image.data.buffer) };
}

// With preserveDrawingBuffer false a WebGL2 frame is gone once this task ends, so draw reads it back at once.
function readFrame(drawn: WorldRenderer): void {
  if (drawn.backend === 'canvas2d') read2d(drawn.canvas);
  else readGl(drawn.canvas);
}

function countColours(): Record<string, number> {
  const counts: Record<string, number> = {};
  const { rgba } = frame;
  for (let i = 0; i < rgba.length; i += 4) {
    const key = hex(rgba[i], rgba[i + 1], rgba[i + 2]);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

// Like the app, keep each returned buffer for the next snapshot.
function release(buffer: ArrayBuffer): void {
  released.push(buffer);
  if (buffer.byteLength === agents * SNAPSHOT_BYTES) pool.push(buffer);
}

function markTrueOnly(buffer: ArrayBuffer, count: number): void {
  const view = new DataView(buffer);
  for (let i = 0; i < count; i++) {
    const at = i * SNAPSHOT_BYTES + 8;
    const word = view.getUint32(at, true);
    view.setUint32(at, packVisual(lookOf(word), actionOf(word), emoteOf(word), jobOf(word), facingOf(word), 1), true);
  }
}

function booted(): { renderer: WorldRenderer; map: MapV1 } {
  if (!renderer || !map) throw new Error('boot the harness first');
  return { renderer, map };
}

window.harness = {
  get renderer() {
    return renderer;
  },
  get map() {
    return map;
  },
  get released() {
    return released;
  },
  async boot({ css = [320, 180], agents: count = 0, backend: choice, restoreTimeoutMs } = {}) {
    map ??= await loadTown();
    renderer?.dispose();
    renderer?.canvas.remove();
    const canvas = document.createElement('canvas');
    canvas.id = 'world';
    canvas.className = 'view';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Town map with every agent as a dot');
    document.body.append(canvas);
    agents = count;
    pool = [];
    released = [];
    renderer = createWorldRenderer(canvas, { release, backend: choice, restoreTimeoutMs });
    const backend = renderer.init();
    renderer.resize(Math.round(css[0] * devicePixelRatio), Math.round(css[1] * devicePixelRatio), devicePixelRatio);
    renderer.setMap(map);
    return backend;
  },
  view(next) {
    camera = next;
  },
  push(replayFrame, { agents: count = agents, trueOnly = false } = {}) {
    const run = booted();
    const buffer = pool.pop() ?? new ArrayBuffer(agents * SNAPSHOT_BYTES);
    fillReplayFrame(run.map, replayFrame, count, buffer);
    if (trueOnly) markTrueOnly(buffer, count);
    run.renderer.pushSnapshot({ tick: replayFrame, count, buffer });
    return buffer;
  },
  place(placed) {
    const buffer = new ArrayBuffer(placed.length * SNAPSHOT_BYTES);
    const view = new DataView(buffer);
    placed.forEach(({ x, y, job }, i) => {
      view.setFloat32(i * SNAPSHOT_BYTES, x, true);
      view.setFloat32(i * SNAPSHOT_BYTES + 4, y, true);
      view.setUint32(i * SNAPSHOT_BYTES + 8, packVisual(0, 0, 0, job, 0, 0), true);
    });
    booted().renderer.pushSnapshot({ tick: 0, count: placed.length, buffer });
    return buffer;
  },
  draw(alpha = 1) {
    const run = booted();
    run.renderer.draw(camera, alpha);
    readFrame(run.renderer);
    return { backend: run.renderer.backend, width: frame.width, height: frame.height, counts: countColours() };
  },
  // Reads the frame the last draw read back, counting rows from the top as the camera does.
  pixel(x, y) {
    const at = (y * frame.width + x) * 4;
    return hex(frame.rgba[at], frame.rgba[at + 1], frame.rgba[at + 2]);
  },
  rgba() {
    return frame.rgba;
  },
};
