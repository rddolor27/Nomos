import { PLACE_FACINGS, PLACE_POSES, PLACE_TILE_PX, type PlaceLayout } from '@nomos/sim-protocol/place';
import { loadAtlasPage, type AtlasPage } from '../src/map.ts';
import {
  createPlaceRenderer,
  type PlaceBackend,
  type PlaceCamera,
  type PlaceRenderer,
  type PlaceRendererOptions,
} from '../src/place.ts';
import { placeLayout } from '../test/place-fixtures.ts';

export interface ShownPlace {
  backend: PlaceBackend;
  // True once the Canvas2D fallback has replaced the canvas the renderer booted on.
  swapped: boolean;
  width: number;
  height: number;
  // Of the frame's RGBA bytes, top row first, as place_fixtures.py hashes placedraw.draw's.
  sha256: string;
}

export interface PlaceHarness {
  // A fresh renderer on a canvas of the fixture place's size times scale, given the town atlas and the place.
  boot(name: string, scale: number, options?: PlaceRendererOptions): Promise<PlaceBackend>;
  // Draws, then reads the frame back in the same task, since WebGL2 keeps no drawing buffer, and hashes it.
  render(camera: PlaceCamera): Promise<ShownPlace>;
  // Reads and hashes what the renderer shows, without drawing.
  shown(): Promise<ShownPlace>;
  // Moves person j in the layout's own columns, as a walker's motion will.
  move(j: number, dx: number, dy: number): void;
  // Paces every walker out along its facing and back, drawing once an animation frame, until stop.
  walk(camera: PlaceCamera): void;
  stop(): void;
  // Draws this many animation frames with the walkers pacing, and gives each draw's main-thread ms.
  time(frames: number, camera: PlaceCamera): Promise<number[]>;
  // False when the browser has no WEBGL_lose_context to lose with.
  loseContext(): Promise<boolean>;
  restoreContext(): Promise<void>;
}

declare global {
  interface Window {
    placeHarness: PlaceHarness;
  }
}

type Facing = (typeof PLACE_FACINGS)[number];

const WALK = PLACE_POSES.indexOf('walk');
const STEP: Record<Facing, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
const BACK: Record<Facing, Facing> = { down: 'up', up: 'down', left: 'right', right: 'left' };
// A walker paces PACE art px out and back, changing its step every STEP_FRAMES frames.
const PACE = 24;
const STEP_FRAMES = 6;

let atlas: Promise<AtlasPage> | null = null;
let renderer: PlaceRenderer | null = null;
let bootCanvas: HTMLCanvasElement | null = null;
let layout: PlaceLayout | null = null;
let start: PlaceLayout['people'] | null = null;
let frame = 0;
let walking = 0;
let loser: WEBGL_lose_context | null = null;

function booted(): PlaceRenderer {
  if (!renderer) throw new Error('boot the place harness first');
  return renderer;
}

function pace(): void {
  if (!layout || !start) return;
  const { people } = layout;
  const t = frame % (2 * PACE);
  const along = t < PACE ? t : 2 * PACE - t;
  for (let j = 0; j < people.pose.length; j++) {
    if (people.pose[j] !== WALK) continue;
    const facing = PLACE_FACINGS[start.facing[j]];
    const [dx, dy] = STEP[facing];
    people.x[j] = start.x[j] + dx * along;
    people.y[j] = start.y[j] + dy * along;
    people.facing[j] = PLACE_FACINGS.indexOf(t < PACE ? facing : BACK[facing]);
    people.step[j] = Math.floor(frame / STEP_FRAMES) % 2;
  }
  frame++;
}

// readPixels gives rows from the bottom; keep them from the top, as the fixture's bytes run.
function readGl(gl: WebGL2RenderingContext): Uint8Array<ArrayBuffer> {
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  const bottomUp = new Uint8Array(4 * width * height);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bottomUp);
  const rows = new Uint8Array(bottomUp.length);
  for (let y = 0; y < height; y++) rows.set(bottomUp.subarray((height - 1 - y) * 4 * width, (height - y) * 4 * width), 4 * y * width);
  return rows;
}

function readFrame(drawn: PlaceRenderer): Uint8Array<ArrayBuffer> {
  const { canvas } = drawn;
  const gl = drawn.backend === 'webgl2' ? canvas.getContext('webgl2') : null;
  if (gl) return readGl(gl);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no frame to read');
  return new Uint8Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
}

async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// The bytes are read before the first await, in the task that called.
function shownFrame(): Promise<ShownPlace> {
  const drawn = booted();
  const bytes = readFrame(drawn);
  const { backend, canvas } = drawn;
  return sha256(bytes).then((hash) => ({ backend, swapped: canvas !== bootCanvas, width: canvas.width, height: canvas.height, sha256: hash }));
}

function copyPeople(people: PlaceLayout['people']): PlaceLayout['people'] {
  return { ...people, x: people.x.slice(), y: people.y.slice(), facing: people.facing.slice() };
}

window.placeHarness = {
  async boot(name, scale, options) {
    this.stop();
    renderer?.dispose();
    layout = placeLayout(name);
    start = copyPeople(layout.people);
    frame = 0;
    bootCanvas = document.createElement('canvas');
    document.body.replaceChildren(bootCanvas);
    renderer = createPlaceRenderer(bootCanvas, options);
    const backend = renderer.init();
    renderer.resize(layout.width * PLACE_TILE_PX * scale, layout.height * PLACE_TILE_PX * scale, devicePixelRatio);
    atlas ??= loadAtlasPage('/atlas/atlas.json', '/atlas/atlas.webp');
    renderer.setAtlas(await atlas);
    renderer.setPlace(layout);
    return backend;
  },
  render(camera) {
    booted().draw(camera);
    return shownFrame();
  },
  shown: shownFrame,
  move(j, dx, dy) {
    if (!layout) throw new Error('boot the place harness first');
    layout.people.x[j] += dx;
    layout.people.y[j] += dy;
  },
  walk(camera) {
    this.stop();
    const tick = (): void => {
      pace();
      renderer?.draw(camera);
      walking = requestAnimationFrame(tick);
    };
    walking = requestAnimationFrame(tick);
  },
  stop() {
    cancelAnimationFrame(walking);
    walking = 0;
  },
  time(frames, camera) {
    this.stop();
    const drawn = booted();
    const spent: number[] = [];
    return new Promise((resolve) => {
      const tick = (): void => {
        pace();
        const begin = performance.now();
        drawn.draw(camera);
        spent.push(performance.now() - begin);
        if (spent.length < frames) requestAnimationFrame(tick);
        else resolve(spent);
      };
      requestAnimationFrame(tick);
    });
  },
  // Chromium and WebKit mark a context restorable only after the lost event's listeners return, so wait a task.
  async loseContext() {
    const canvas = renderer?.canvas;
    loser = canvas?.getContext('webgl2')?.getExtension('WEBGL_lose_context') ?? null;
    if (!canvas || !loser) return false;
    const lost = new Promise((resolve) => {
      canvas.addEventListener('webglcontextlost', () => setTimeout(resolve, 0), { once: true });
    });
    loser.loseContext();
    await lost;
    return true;
  },
  // A lost context hands out no extensions, so the restore takes the one the loss used.
  async restoreContext() {
    const canvas = renderer?.canvas;
    if (!canvas || !loser) return;
    const restored = new Promise((resolve) => canvas.addEventListener('webglcontextrestored', resolve, { once: true }));
    loser.restoreContext();
    await restored;
  },
};
