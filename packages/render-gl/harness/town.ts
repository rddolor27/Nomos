import { PLACE_TILE_PX } from '@nomos/sim-protocol/place';
import { loadAtlasPage, type AtlasPage } from '../src/map.ts';
import type { PlaceBackend, PlaceRendererOptions } from '../src/place.ts';
import type { Camera, Retained } from '../src/renderer/types.ts';
import { TownSkin } from '../src/town.ts';
import { placeLayout } from '../test/place-fixtures.ts';
import { streetAgents, townAgents, type StreetAgent } from '../test/town-agents.ts';

export interface ShownTown {
  backend: PlaceBackend;
  // What the skin reported drawing: one person for each agent.
  drawn: number | undefined;
  // Of the canvas's RGBA bytes, top row first, whichever the backend.
  sha256: string;
}

// The box, in device px with right and bottom exclusive, that two frames differ in, and how many pixels differ.
export interface Differing {
  left: number;
  top: number;
  right: number;
  bottom: number;
  pixels: number;
}

export interface TownHarness {
  // A fresh Town skin on the fixture place's layout, its agents the place's people.
  boot(name: string, options?: PlaceRendererOptions): Promise<PlaceBackend>;
  // Swaps the same skin to another fixture place, and its agents to that place's people.
  swap(name: string): void;
  // Draws one frame from the place's top-left at 1x, then reads the frame back in the same task, since WebGL2 keeps no
  // drawing buffer, and hashes it.
  render(): Promise<ShownTown>;
  // The same, of exactly these agents as the snapshot at this tick shows them, a blob's art px being its anchor's on the place.
  renderAgents(agents: StreetAgent[], tick: number): Promise<ShownTown>;
  // Draws each list of agents in turn at 1x, and gives where the two frames differ, or null where they match.
  differ(before: StreetAgent[], after: StreetAgent[], tick: number): Differing | null;
}

declare global {
  interface Window {
    townHarness: TownHarness;
  }
}

interface Booted {
  skin: TownSkin;
  agents: Retained;
}

// The capital's size in device px, which holds every fixture place whole at 1x.
const VIEW_PX = { width: 176 * PLACE_TILE_PX, height: 112 * PLACE_TILE_PX };
const CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

let atlas: Promise<AtlasPage> | null = null;
let booted: Booted | null = null;
// Stands in for the dots' canvas, whose device size the skin takes.
const dots = Object.assign(document.createElement('canvas'), VIEW_PX);

function current(): Booted {
  if (!booted) throw new Error('boot the town harness first');
  return booted;
}

function backendOf(canvas: HTMLCanvasElement): PlaceBackend {
  return canvas.getContext('webgl2') ? 'webgl2' : 'canvas2d';
}

// readPixels gives rows from the bottom; keep them from the top, as Canvas2D gives them, so the backends' bytes compare.
function readGl(gl: WebGL2RenderingContext): Uint8Array<ArrayBuffer> {
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  const bottomUp = new Uint8Array(4 * width * height);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bottomUp);
  const rows = new Uint8Array(bottomUp.length);
  for (let y = 0; y < height; y++) rows.set(bottomUp.subarray((height - 1 - y) * 4 * width, (height - y) * 4 * width), 4 * y * width);
  return rows;
}

function readFrame(canvas: HTMLCanvasElement): Uint8Array<ArrayBuffer> {
  const gl = canvas.getContext('webgl2');
  if (gl) return readGl(gl);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no frame to read');
  return new Uint8Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
}

async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// One frame of these agents, drawn and read back before anything awaits.
function drawFrame(agents: Retained): { backend: PlaceBackend; drawn: number | undefined; bytes: Uint8Array<ArrayBuffer>; width: number } {
  const { skin } = current();
  const drawn = skin.draw(CAMERA, 1, { drawnSkin: 'town', retained: agents, canvas: dots, dpr: 1 });
  const { canvas } = skin;
  return { backend: backendOf(canvas), drawn, bytes: readFrame(canvas), width: canvas.width };
}

function shown(agents: Retained): Promise<ShownTown> {
  const { backend, drawn, bytes } = drawFrame(agents);
  return sha256(bytes).then((hash) => ({ backend, drawn, sha256: hash }));
}

function differing(before: Uint8Array<ArrayBuffer>, after: Uint8Array<ArrayBuffer>, width: number): Differing | null {
  const box: Differing = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity, pixels: 0 };
  for (let i = 0; i < before.length; i += 4) {
    if (before[i] === after[i] && before[i + 1] === after[i + 1] && before[i + 2] === after[i + 2]) continue;
    const x = (i / 4) % width;
    const y = Math.floor(i / 4 / width);
    box.left = Math.min(box.left, x);
    box.top = Math.min(box.top, y);
    box.right = Math.max(box.right, x + 1);
    box.bottom = Math.max(box.bottom, y + 1);
    box.pixels++;
  }
  return box.pixels > 0 ? box : null;
}

window.townHarness = {
  async boot(name, options) {
    booted?.skin.dispose();
    const layout = placeLayout(name);
    const canvas = document.createElement('canvas');
    document.body.replaceChildren(canvas);
    atlas ??= loadAtlasPage('/atlas/atlas.json', '/atlas/atlas.webp');
    const skin = new TownSkin(canvas, layout, await atlas, options);
    booted = { skin, agents: townAgents(layout) };
    return backendOf(skin.canvas);
  },
  swap(name) {
    const layout = placeLayout(name);
    const now = current();
    now.skin.setLayout(layout);
    now.agents = townAgents(layout);
  },
  render() {
    return shown(current().agents);
  },
  renderAgents(agents, tick) {
    return shown(streetAgents(agents, tick));
  },
  differ(before, after, tick) {
    const first = drawFrame(streetAgents(before, tick));
    const second = drawFrame(streetAgents(after, tick));
    return differing(first.bytes, second.bytes, first.width);
  },
};
