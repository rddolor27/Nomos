import { parseMap, type MapV1 } from '@nomos/sim-protocol';
import { createWorldRenderer, type Backend, type Camera, type WorldRenderer } from '../src/index.ts';

export interface FrameStats {
  backend: Backend;
  width: number;
  height: number;
  counts: Record<string, number>;
}

export interface Harness {
  readonly renderer: WorldRenderer | null;
  readonly map: MapV1 | null;
  boot(options?: { css?: [number, number] }): Promise<Backend>;
  view(camera: Camera): void;
  draw(alpha?: number): FrameStats;
  pixel(x: number, y: number): string;
}

declare global {
  interface Window {
    harness: Harness;
  }
}

let renderer: WorldRenderer | null = null;
let canvas: HTMLCanvasElement | null = null;
let map: MapV1 | null = null;
let camera: Camera = { x: 0, y: 0, zoom: 1 };
let frame = { width: 0, height: 0, rgba: new Uint8Array(0) };

async function loadTown(): Promise<MapV1> {
  const response = await fetch('/maps/town.nmap');
  if (!response.ok) throw new Error(`the town map answered ${response.status}`);
  return parseMap(await response.arrayBuffer());
}

function hex(r: number, g: number, b: number): string {
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// With preserveDrawingBuffer false the frame is gone once this task ends, so draw reads it back at once.
function readFrame(): void {
  const gl = canvas?.getContext('webgl2');
  if (!gl) throw new Error('no WebGL2 frame to read');
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  const rgba = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
  frame = { width, height, rgba };
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

window.harness = {
  get renderer() {
    return renderer;
  },
  get map() {
    return map;
  },
  async boot({ css = [320, 180] } = {}) {
    map ??= await loadTown();
    renderer?.dispose();
    canvas?.remove();
    canvas = document.createElement('canvas');
    document.body.append(canvas);
    renderer = createWorldRenderer(canvas, { release() {} });
    const backend = renderer.init();
    renderer.resize(Math.round(css[0] * devicePixelRatio), Math.round(css[1] * devicePixelRatio), devicePixelRatio);
    renderer.setMap(map);
    return backend;
  },
  view(next) {
    camera = next;
  },
  draw(alpha = 1) {
    if (!renderer) throw new Error('boot the harness first');
    renderer.draw(camera, alpha);
    readFrame();
    return { backend: renderer.backend, width: frame.width, height: frame.height, counts: countColours() };
  },
  // Reads the frame the last draw read back, counting rows from the top as the camera does.
  pixel(x, y) {
    const at = ((frame.height - 1 - y) * frame.width + x) * 4;
    return hex(frame.rgba[at], frame.rgba[at + 1], frame.rgba[at + 2]);
  },
};
