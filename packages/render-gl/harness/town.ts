import { PLACE_TILE_PX } from '@nomos/sim-protocol/place';
import { loadAtlasPage, type AtlasPage } from '../src/map.ts';
import type { PlaceBackend, PlaceRendererOptions } from '../src/place.ts';
import type { Camera, Retained } from '../src/renderer/types.ts';
import { TownSkin } from '../src/town.ts';
import { placeLayout } from '../test/place-fixtures.ts';
import { townAgents } from '../test/town-agents.ts';

export interface ShownTown {
  backend: PlaceBackend;
  // What the skin reported drawing: one person for each agent.
  drawn: number | undefined;
  // Of the canvas's RGBA bytes, in the order the backend reads them.
  sha256: string;
}

export interface TownHarness {
  // A fresh Town skin on the fixture place's layout, its agents the place's people.
  boot(name: string, options?: PlaceRendererOptions): Promise<PlaceBackend>;
  // Swaps the same skin to another fixture place, and its agents to that place's people.
  swap(name: string): void;
  // Draws one frame from the place's top-left at 1x, then reads the frame back in the same task, since WebGL2 keeps no
  // drawing buffer, and hashes it.
  render(): Promise<ShownTown>;
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

function readFrame(canvas: HTMLCanvasElement): Uint8Array<ArrayBuffer> {
  const gl = canvas.getContext('webgl2');
  if (gl) {
    const bytes = new Uint8Array(4 * gl.drawingBufferWidth * gl.drawingBufferHeight);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    return bytes;
  }
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no frame to read');
  return new Uint8Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
}

async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
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
    const { skin, agents } = current();
    const drawn = skin.draw(CAMERA, 1, { drawnSkin: 'town', retained: agents, canvas: dots, dpr: 1 });
    const { canvas } = skin;
    const backend = backendOf(canvas);
    const bytes = readFrame(canvas);
    return sha256(bytes).then((hash) => ({ backend, drawn, sha256: hash }));
  },
};
