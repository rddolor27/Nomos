import { BIOME_NAMES, LANDMARK_SLOTS, NO_LANDMARK, type WorldMap } from '@nomos/sim-protocol/world-map';
import landmarkSheet from '../../../assets/sprites/landmarks.json';
import mapSheet from '../../../assets/sprites/map.json';
import wonderSheet from '../../../assets/sprites/wonders.json';
import { createBasePass, type BasePass } from '../src/map/base-pass.ts';
import { SPRITE_SHORTS, createIconsPass, iconSprites, type IconsPass } from '../src/map/icons.ts';
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
// country 1, and colour lists each country's colour index. Landmarks go in settlements' slots; sites are landmarks on
// cells of their own.
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
  settlements?: { cell: number; tier: number; landmarks?: number[] }[];
  wonders?: [kind: number, cell: number][];
  sites?: [kind: number, cell: number][];
}

export interface MapHarness {
  // False when the browser offers no WebGL2.
  boot(width: number, height: number): boolean;
  world(spec: WorldSpec): void;
  // A test page of every map-scale frame at its real size: frame i's texel (u, v) is rgb(i + 1, 8 u, 8 v). Tiles are
  // solid; every other frame is clear wherever (u + 2 v) % 5 is 0, to prove the icons pass discards clear texels.
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
const SHEETS: [string, { frames: Record<string, { w: number; h: number; anchor: number[] }> }][] = [
  ['map', mapSheet],
  ['wonders', wonderSheet],
  ['landmarks', landmarkSheet],
];

let gl: WebGL2RenderingContext | null = null;
let base: BasePass | null = null;
let icons: IconsPass | null = null;
let world: WorldMap | null = null;
let page: AtlasPage | null = null;
// Frame names by their x on the test page, which lays every frame out in one row.
let namesAt = new Map<number, string>();
let names: string[] = [];
let solid = new Set<string>();
let frame = new Uint8Array(0);

function hex(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}

function paths(list: number[][] = []): WorldMap['roads'] {
  const offsets = [0];
  for (const path of list) offsets.push(offsets[offsets.length - 1] + path.length);
  return { offsets: Int32Array.from(offsets), cells: Int32Array.from(list.flat()) };
}

function settlementsOf(list: NonNullable<WorldSpec['settlements']> = []): WorldMap['settlements'] {
  const landmarks = new Uint8Array(LANDMARK_SLOTS * list.length).fill(NO_LANDMARK);
  list.forEach((s, id) => landmarks.set(s.landmarks ?? [], LANDMARK_SLOTS * id));
  return {
    cell: Int32Array.from(list, (s) => s.cell),
    tier: Uint8Array.from(list, (s) => s.tier),
    population: Int32Array.from(list, () => 10_000),
    country: Uint8Array.from(list, () => 1),
    region: Uint16Array.from(list, () => 1),
    landmarks,
  };
}

function spots(list: [number, number][] = []): { kind: Uint8Array; cell: Int32Array } {
  return { kind: Uint8Array.from(list, ([kind]) => kind), cell: Int32Array.from(list, ([, cell]) => cell) };
}

function filled(values: number[] | undefined, cells: number, value: number): number[] {
  return values ?? Array<number>(cells).fill(value);
}

function worldOf(spec: WorldSpec): WorldMap {
  const cells = spec.width * spec.height;
  const colour = spec.colour ?? [0];
  return tinyWorld(spec.width, spec.height, {
    biome: Uint8Array.from(filled(spec.biome, cells, BIOME_NAMES.indexOf('grassland'))),
    variant: Uint8Array.from(filled(spec.variant, cells, 0)),
    country: Uint8Array.from(filled(spec.country, cells, 1)),
    countries: { capital: new Int32Array(colour.length), colour: Uint8Array.from(colour) },
    river: Uint8Array.from(filled(spec.river, cells, 0)),
    receiver: Int32Array.from(filled(spec.receiver, cells, -1)),
    roads: paths(spec.roads),
    lanes: paths(spec.lanes),
    bridges: Int32Array.from(spec.bridges ?? []),
    settlements: settlementsOf(spec.settlements),
    wonders: spots(spec.wonders),
    landmarks: spots(spec.sites),
  });
}

function tileNames(): Set<string> {
  const out = new Set<string>();
  for (const view of VIEWS) {
    for (let biome = 0; biome < BIOME_NAMES.length; biome++) {
      for (let variant = 0; variant < 4; variant++) out.add(tileFrame(biome, variant, view));
    }
  }
  return out;
}

function onPage(name: string): boolean {
  return /^(map|wonders|landmarks)\/map(8|16)_/.test(name) || name.startsWith('map/settlement_');
}

function clear(name: string, u: number, v: number): boolean {
  return !solid.has(name) && (u + 2 * v) % 5 === 0;
}

function texel(index: number, u: number, v: number): number {
  return ((index + 1) << 16) | ((8 * u) << 8) | (8 * v);
}

function paintFrame(data: Uint8ClampedArray, rowWidth: number, index: number, placed: AtlasFrame): void {
  for (let v = 0; v < placed.h; v++) {
    for (let u = 0; u < placed.w; u++) {
      const colour = texel(index, u, v);
      const alpha = clear(names[index], u, v) ? 0 : 255;
      data.set([colour >> 16, (colour >> 8) & 255, colour & 255, alpha], 4 * (v * rowWidth + placed.x + u));
    }
  }
}

function testFrames(): Record<string, AtlasFrame> {
  const frames: Record<string, AtlasFrame> = {};
  let x = 0;
  for (const [sheet, manifest] of SHEETS) {
    for (const [name, made] of Object.entries(manifest.frames)) {
      const key = `${sheet}/${name}`;
      if (!onPage(key)) continue;
      frames[key] = { x, y: 0, w: made.w, h: made.h, anchor: [made.anchor[0], made.anchor[1]] };
      x += made.w + 1;
    }
  }
  return frames;
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

type Overlay = ReturnType<typeof buildOverlay>;

// The overlay's mark at an art pixel, or 0 where the flat view hides water and routes.
function shownMark(overlay: Overlay, ax: number, ay: number, flat: boolean): number {
  const mark = overlay.pixels[ay * overlay.width + ax];
  return flat && mark >= RIVER && mark <= RAIL ? 0 : mark;
}

// The base pass's rule in plain TypeScript: what one art pixel shows under the icons.
function under(map: WorldMap, overlay: Overlay, view: MapView, flat: boolean, ax: number, ay: number): number {
  const tilePx = view === 'region' ? 16 : 8;
  if (ax < 0 || ay < 0 || ax >= overlay.width || ay >= overlay.height) return LINE_COLOURS.water;
  const mark = shownMark(overlay, ax, ay, flat);
  if (mark !== 0) return lineColour(mark);
  const cell = Math.floor(ay / tilePx) * map.width + Math.floor(ax / tilePx);
  if (flat) return flatColour(map, cell);
  return texel(names.indexOf(tileFrame(map.biome[cell], map.variant[cell], view)), ax % tilePx, ay % tilePx);
}

// The icons pass's rule: the last sprite over the art pixel whose texel is not clear, peaks aside in the flat view.
function over(sprites: Int16Array, flat: boolean, ax: number, ay: number, colour: number): number {
  let shown = colour;
  for (let at = 0; at < sprites.length; at += SPRITE_SHORTS) {
    const [x, y, srcX, , w, h, peak] = sprites.subarray(at, at + SPRITE_SHORTS);
    if ((flat && peak) || ax < x || ay < y || ax >= x + w || ay >= y + h) continue;
    const name = namesAt.get(srcX) ?? '';
    if (!clear(name, ax - x, ay - y)) shown = texel(names.indexOf(name), ax - x, ay - y);
  }
  return shown;
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

function booted(): { context: WebGL2RenderingContext; map: WorldMap } {
  if (!gl || !world) throw new Error('boot the map harness and give it a world first');
  return { context: gl, map: world };
}

function compare(context: WebGL2RenderingContext, map: WorldMap, camera: MapCamera, view: MapView, flat: boolean): string[] {
  const overlay = buildOverlay(map, view);
  const sprites = page ? iconSprites(map, page, view) : new Int16Array(0);
  const drawnFlat = flat || !page;
  const scale = camera.cellPx / (view === 'region' ? 16 : 8);
  const camX = Math.round(camera.x * camera.cellPx);
  const camY = Math.round(camera.y * camera.cellPx);
  const width = context.drawingBufferWidth;
  const wrong: string[] = [];
  for (let at = 0; at < frame.length && wrong.length < 10; at += 4) {
    const px = (at >> 2) % width;
    const py = Math.floor((at >> 2) / width);
    const ax = Math.floor((px + camX) / scale);
    const ay = Math.floor((py + camY) / scale);
    const want = over(sprites, drawnFlat, ax, ay, under(map, overlay, view, drawnFlat, ax, ay));
    const got = (frame[at] << 16) | (frame[at + 1] << 8) | frame[at + 2];
    if (got !== want) wrong.push(`${px},${py}: got ${hex(got)}, want ${hex(want)}`);
  }
  return wrong;
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
    base = gl ? createBasePass(gl) : null;
    icons = gl ? createIconsPass(gl) : null;
    page = null;
    return gl !== null;
  },
  world(spec) {
    world = worldOf(spec);
    base?.setWorld(world);
    icons?.setWorld(world);
  },
  async atlas() {
    solid = tileNames();
    const frames = testFrames();
    names = Object.keys(frames);
    namesAt = new Map(names.map((name) => [frames[name].x, name]));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(...names.map((name) => frames[name].x + frames[name].w));
    canvas.height = Math.max(...names.map((name) => frames[name].h));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no Canvas2D for the test page');
    const image = context.createImageData(canvas.width, canvas.height);
    names.forEach((name, index) => paintFrame(image.data, canvas.width, index, frames[name]));
    context.putImageData(image, 0, 0);
    page = { image: await createImageBitmap(canvas), frames };
    base?.setAtlas(page);
    icons?.setAtlas(page);
  },
  check(camera, view, flat) {
    const { context, map } = booted();
    base?.draw(camera, view, flat);
    icons?.draw(camera, view, flat);
    readBack(context);
    return compare(context, map, camera, view, flat);
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
