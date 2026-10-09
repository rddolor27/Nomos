import { BIOME_NAMES, type WorldMap } from '@nomos/sim-protocol/world-map';
import { createBasePass, type BasePass } from '../src/map/base-pass.ts';
import {
  BAND,
  BORDER,
  COUNTRY_COLOURS,
  DECK,
  LANE,
  LINE_COLOURS,
  RAIL,
  RIVER,
  ROAD,
  buildOverlay,
  tileFrame,
  type AtlasFrame,
  type AtlasPage,
  type MapCamera,
  type MapView,
} from '../src/map.ts';
import { tinyWorld } from '../test/tiny-world.ts';

// A world as plain arrays, so a spec can hand it through evaluate. Cells left out take tinyWorld's grassland of
// country 1, and colour lists each country's colour index.
export interface WorldSpec {
  width: number;
  height: number;
  biome?: number[];
  variant?: number[];
  country?: number[];
  colour?: number[];
  river?: number[];
  receiver?: number[];
  roads?: number[][];
  lanes?: number[][];
  bridges?: number[];
}

export interface MapHarness {
  // False when the browser offers no WebGL2.
  boot(width: number, height: number): boolean;
  world(spec: WorldSpec): void;
  // A test page: every tile frame a block whose texel (u, v) of frame i is rgb(8 (i + 1), 16 u, 16 v).
  atlas(): Promise<void>;
  // Draws, reads the frame back, and lists up to 10 device pixels that differ from the CPU reference.
  check(camera: MapCamera, view: MapView, flat: boolean): string[];
  pixel(x: number, y: number): string;
  readonly colours: { countries: string[]; border: string; water: string };
}

declare global {
  interface Window {
    mapHarness: MapHarness;
  }
}

const VIEWS: MapView[] = ['country', 'region'];

let gl: WebGL2RenderingContext | null = null;
let pass: BasePass | null = null;
let world: WorldMap | null = null;
let names: string[] = [];
let frame = new Uint8Array(0);

function hex(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}

function paths(list: number[][] = []): WorldMap['roads'] {
  const offsets = [0];
  for (const path of list) offsets.push(offsets[offsets.length - 1] + path.length);
  return { offsets: Int32Array.from(offsets), cells: Int32Array.from(list.flat()) };
}

function worldOf(spec: WorldSpec): WorldMap {
  const cells = spec.width * spec.height;
  const colour = spec.colour ?? [0];
  return tinyWorld(spec.width, spec.height, {
    biome: Uint8Array.from(spec.biome ?? Array<number>(cells).fill(BIOME_NAMES.indexOf('grassland'))),
    variant: Uint8Array.from(spec.variant ?? Array<number>(cells).fill(0)),
    country: Uint8Array.from(spec.country ?? Array<number>(cells).fill(1)),
    countries: { capital: new Int32Array(colour.length), colour: Uint8Array.from(colour) },
    river: Uint8Array.from(spec.river ?? Array<number>(cells).fill(0)),
    receiver: Int32Array.from(spec.receiver ?? Array<number>(cells).fill(-1)),
    roads: paths(spec.roads),
    lanes: paths(spec.lanes),
    bridges: Int32Array.from(spec.bridges ?? []),
  });
}

function tileNames(): string[] {
  const out = new Set<string>();
  for (const view of VIEWS) {
    for (let biome = 0; biome < BIOME_NAMES.length; biome++) {
      for (let variant = 0; variant < 4; variant++) out.add(tileFrame(biome, variant, view));
    }
  }
  return [...out];
}

function paintBlock(data: Uint8ClampedArray, rowWidth: number, index: number, px: number): void {
  for (let v = 0; v < px; v++) {
    for (let u = 0; u < px; u++) {
      const at = 4 * (v * rowWidth + 17 * index + u);
      data.set([8 * (index + 1), 16 * u, 16 * v, 255], at);
    }
  }
}

function lineColour(mark: number): number {
  const colours: Record<number, number> = {
    [RIVER]: LINE_COLOURS.river,
    [LANE]: LINE_COLOURS.lane,
    [ROAD]: LINE_COLOURS.road,
    [DECK]: LINE_COLOURS.deck,
    [RAIL]: LINE_COLOURS.rail,
    [BORDER]: LINE_COLOURS.border,
  };
  return mark >= BAND ? COUNTRY_COLOURS[mark - BAND] : colours[mark];
}

function flatColour(map: WorldMap, cell: number): number {
  const k = map.country[cell];
  return k === 0 ? LINE_COLOURS.water : COUNTRY_COLOURS[map.countries.colour[k - 1]];
}

function tileColour(map: WorldMap, cell: number, view: MapView, u: number, v: number): number {
  const index = names.indexOf(tileFrame(map.biome[cell], map.variant[cell], view));
  return ((8 * (index + 1)) << 16) | ((16 * u) << 8) | (16 * v);
}

type Overlay = ReturnType<typeof buildOverlay>;

// The overlay's mark at an art pixel, or 0 where the flat view hides water and routes.
function shownMark(overlay: Overlay, ax: number, ay: number, flat: boolean): number {
  const mark = overlay.pixels[ay * overlay.width + ax];
  return flat && mark >= RIVER && mark <= RAIL ? 0 : mark;
}

// The base pass's rule in plain TypeScript: what one device pixel must show.
function reference(map: WorldMap, overlay: Overlay, camera: MapCamera, view: MapView, flat: boolean, px: number, py: number): number {
  const tilePx = view === 'region' ? 16 : 8;
  const scale = camera.cellPx / tilePx;
  const ax = Math.floor((px + Math.round(camera.x * camera.cellPx)) / scale);
  const ay = Math.floor((py + Math.round(camera.y * camera.cellPx)) / scale);
  if (ax < 0 || ay < 0 || ax >= overlay.width || ay >= overlay.height) return LINE_COLOURS.water;
  const mark = shownMark(overlay, ax, ay, flat);
  if (mark !== 0) return lineColour(mark);
  const cell = Math.floor(ay / tilePx) * map.width + Math.floor(ax / tilePx);
  return flat ? flatColour(map, cell) : tileColour(map, cell, view, ax % tilePx, ay % tilePx);
}

// readPixels gives rows from the bottom; keep them from the top, as the camera counts.
function readBack(context: WebGL2RenderingContext): void {
  const width = context.drawingBufferWidth;
  const height = context.drawingBufferHeight;
  const bottomUp = new Uint8Array(width * height * 4);
  context.readPixels(0, 0, width, height, context.RGBA, context.UNSIGNED_BYTE, bottomUp);
  frame = new Uint8Array(bottomUp.length);
  for (let y = 0; y < height; y++) frame.set(bottomUp.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
}

function booted(): { context: WebGL2RenderingContext; base: BasePass; map: WorldMap } {
  if (!gl || !pass || !world) throw new Error('boot the map harness and give it a world first');
  return { context: gl, base: pass, map: world };
}

window.mapHarness = {
  boot(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width / devicePixelRatio}px`;
    canvas.style.height = `${height / devicePixelRatio}px`;
    document.body.replaceChildren(canvas);
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
    pass = gl ? createBasePass(gl) : null;
    return gl !== null;
  },
  world(spec) {
    world = worldOf(spec);
    pass?.setWorld(world);
  },
  async atlas() {
    names = tileNames();
    const canvas = document.createElement('canvas');
    canvas.width = 17 * names.length;
    canvas.height = 16;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no Canvas2D for the test page');
    const image = context.createImageData(canvas.width, canvas.height);
    const frames: Record<string, AtlasFrame> = {};
    names.forEach((name, index) => {
      const px = name.startsWith('map/map16_') ? 16 : 8;
      frames[name] = { x: 17 * index, y: 0, w: px, h: px, anchor: [px >> 1, px - 1] };
      paintBlock(image.data, canvas.width, index, px);
    });
    context.putImageData(image, 0, 0);
    const page: AtlasPage = { image: await createImageBitmap(canvas), frames };
    pass?.setAtlas(page);
  },
  check(camera, view, flat) {
    const { context, base, map } = booted();
    base.draw(camera, view, flat);
    readBack(context);
    const overlay = buildOverlay(map, view);
    const drawnFlat = flat || names.length === 0;
    const width = context.drawingBufferWidth;
    const wrong: string[] = [];
    for (let at = 0; at < frame.length && wrong.length < 10; at += 4) {
      const px = (at >> 2) % width;
      const py = Math.floor((at >> 2) / width);
      const got = (frame[at] << 16) | (frame[at + 1] << 8) | frame[at + 2];
      const want = reference(map, overlay, camera, view, drawnFlat, px, py);
      if (got !== want) wrong.push(`${px},${py}: got ${hex(got)}, want ${hex(want)}`);
    }
    return wrong;
  },
  pixel(x, y) {
    const width = gl?.drawingBufferWidth ?? 0;
    const at = 4 * (y * width + x);
    return hex((frame[at] << 16) | (frame[at + 1] << 8) | frame[at + 2]);
  },
  get colours() {
    return { countries: COUNTRY_COLOURS.map(hex), border: hex(LINE_COLOURS.border), water: hex(LINE_COLOURS.water) };
  },
};
