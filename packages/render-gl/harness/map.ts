import { BIOME_NAMES, LANDMARK_SLOTS, NO_LANDMARK, type WorldMap } from '@nomos/sim-protocol/world-map';
import landmarkSheet from '../../../assets/sprites/landmarks.json';
import mapSheet from '../../../assets/sprites/map.json';
import wonderSheet from '../../../assets/sprites/wonders.json';
import { createBasePass, type BasePass } from '../src/map/base-pass.ts';
import { DOT_CLEAR, DOT_HUE, crowdDotPx, dotCorner, dotPixel } from '../src/map/crowd.ts';
import { SPRITE_SHORTS, createIconsPass, iconSprites, type IconsPass } from '../src/map/icons.ts';
import {
  BAND,
  BORDER,
  COUNTRY_COLOURS,
  CROWD_COLOURS,
  CROWD_OUTLINE,
  DECK,
  HIGHWAY,
  LANE,
  LINE_COLOURS,
  RAIL,
  RIVER,
  ROAD,
  buildOverlay,
  createMapRenderer,
  tileFrame,
  type AtlasFrame,
  type AtlasPage,
  type MapBackend,
  type MapCamera,
  type MapRenderer,
  type MapRendererOptions,
  type MapView,
} from '../src/map.ts';
import { tinyWorld } from '../test/tiny-world.ts';

// A world as plain arrays, so a spec can hand it through evaluate. Cells left out take tinyWorld's grassland of
// country 1, and colour lists each country's colour index. Roads are minor unless roadClass says otherwise. Landmarks
// go in settlements' slots; sites are landmarks on cells of their own.
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
  roadClass?: number[];
  lanes?: number[][];
  bridges?: number[];
  settlements?: { cell: number; tier: number; landmarks?: number[] }[];
  wonders?: [kind: number, cell: number][];
  sites?: [kind: number, cell: number][];
}

// hues counts the pixels of each crowd hue in the frame.
export interface RenderedFrame {
  backend: MapBackend;
  view: MapView;
  swapped: boolean;
  wrong: string[];
  hues: number[];
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
  readonly colours: { countries: string[]; border: string; water: string; crowd: string[] };
  // A MapRenderer instead of the bare passes; world, atlas and crowd then feed it.
  bootRenderer(width: number, height: number, options?: MapRendererOptions): MapBackend;
  // Draws through the renderer and checks the frame against the reference for the backend it drew on.
  render(camera: MapCamera, flat: boolean): RenderedFrame;
  // Checks the frame the renderer shows, as render does, without drawing. The map's WebGL2 context doesn't preserve its
  // drawing buffer, so a WebGL2 frame reads back only in the task that drew it.
  shown(camera: MapCamera, flat: boolean): RenderedFrame;
  // Each dot's CROWD_HUES index, and its x and y in fractional cells.
  crowd(hue: number[], xy: number[]): void;
  // Rewrites the crowd's places in the array the renderer holds, as the map view's motion will.
  moveCrowd(xy: number[]): void;
  // The canvas pixel at a dot's middle under this camera.
  dotCentre(dot: number, camera: MapCamera): [number, number];
  // False when the browser has no WEBGL_lose_context to lose with.
  loseContext(): Promise<boolean>;
  restoreContext(): Promise<void>;
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
let renderer: MapRenderer | null = null;
let bootCanvas: HTMLCanvasElement | null = null;
let world: WorldMap | null = null;
let page: AtlasPage | null = null;
// Frame names by their x on the test page, which lays every frame out in one row.
let namesAt = new Map<number, string>();
let names: string[] = [];
let solid = new Set<string>();
let frame = new Uint8Array(0);
let frameWidth = 0;
let crowdHue = new Uint8Array(0);
let crowdXy = new Float32Array(0);
let loser: WEBGL_lose_context | null = null;

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
    roadClass: Uint8Array.from(filled(spec.roadClass, spec.roads?.length ?? 0, 0)),
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
    [HIGHWAY]: LINE_COLOURS.highway,
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

const NO_DOT = -1;

function dotColour(dot: number, kind: number): number {
  if (kind === DOT_CLEAR) return NO_DOT;
  return kind === DOT_HUE ? CROWD_COLOURS[crowdHue[dot]] : CROWD_OUTLINE;
}

function paintDot(layer: Int32Array, width: number, dot: number, size: number, corner: [number, number]): void {
  const height = layer.length / width;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = corner[0] + i;
      const y = corner[1] + j;
      const colour = dotColour(dot, dotPixel(size, i, j));
      if (colour !== NO_DOT && x >= 0 && y >= 0 && x < width && y < height) layer[y * width + x] = colour;
    }
  }
}

// The crowd pass's rule in plain TypeScript: in the Region view, each dot's disc in dot order, later over earlier, in
// frame pixels; NO_DOT where none lies.
function crowdLayer(width: number, height: number, camera: MapCamera, view: MapView): Int32Array {
  const layer = new Int32Array(width * height).fill(NO_DOT);
  if (view !== 'region') return layer;
  const size = crowdDotPx(camera.cellPx);
  const camX = Math.round(camera.x * camera.cellPx);
  const camY = Math.round(camera.y * camera.cellPx);
  for (let dot = 0; dot < crowdHue.length; dot++) {
    const corner: [number, number] = [
      dotCorner(crowdXy[2 * dot], camera.cellPx, size) - camX,
      dotCorner(crowdXy[2 * dot + 1], camera.cellPx, size) - camY,
    ];
    paintDot(layer, width, dot, size, corner);
  }
  return layer;
}

// A frame pixel's colour once the crowd has drawn over what lay beneath.
type CrowdOver = (colour: number, px: number, py: number) => number;

const NO_CROWD: CrowdOver = (colour) => colour;

function crowdOver(layer: Int32Array, width: number): CrowdOver {
  return (colour, px, py) => (layer[py * width + px] === NO_DOT ? colour : layer[py * width + px]);
}

// readPixels gives rows from the bottom; keep them from the top, as the camera counts.
function readBack(context: WebGL2RenderingContext): void {
  const width = context.drawingBufferWidth;
  const height = context.drawingBufferHeight;
  const bottomUp = new Uint8Array(width * height * 4);
  context.readPixels(0, 0, width, height, context.RGBA, context.UNSIGNED_BYTE, bottomUp);
  frame = new Uint8Array(bottomUp.length);
  frameWidth = width;
  for (let y = 0; y < height; y++) frame.set(bottomUp.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
}

function read2d(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no Canvas2D frame to read');
  frame = new Uint8Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
  frameWidth = canvas.width;
}

function huesShown(): number[] {
  const counts = CROWD_COLOURS.map(() => 0);
  for (let at = 0; at < frame.length; at += 4) {
    const hue = CROWD_COLOURS.indexOf((frame[at] << 16) | (frame[at + 1] << 8) | frame[at + 2]);
    if (hue >= 0) counts[hue]++;
  }
  return counts;
}

function booted(): { context: WebGL2RenderingContext; map: WorldMap } {
  if (!gl || !world) throw new Error('boot the map harness and give it a world first');
  return { context: gl, map: world };
}

// A frame pixel's colour, from its art pixel and its own place on the frame.
type Want = (ax: number, ay: number, px: number, py: number) => number;

// What WebGL2 draws: the base pass, the crowd, then the icons.
function glWant(map: WorldMap, view: MapView, flat: boolean, crowd: CrowdOver): Want {
  const overlay = buildOverlay(map, view);
  const sprites = page ? iconSprites(map, page, view) : new Int16Array(0);
  const drawnFlat = flat || !page;
  return (ax, ay, px, py) => over(sprites, drawnFlat, ax, ay, crowd(under(map, overlay, view, drawnFlat, ax, ay), px, py));
}

// The settlements of iconSprites' list, in its order, which is row order: plain icons, and walled or palisaded ones
// at either view's scale.
function townSprites(sprites: Int16Array): Int16Array {
  const kept: number[] = [];
  for (let at = 0; at < sprites.length; at += SPRITE_SHORTS) {
    const name = namesAt.get(sprites[at + 2]) ?? '';
    if (/^map\/(map(8|16)_)?settlement_/.test(name)) kept.push(...sprites.subarray(at, at + SPRITE_SHORTS));
  }
  return Int16Array.from(kept);
}

// What the Canvas2D fallback draws: flat fills, the crowd, then the settlement icons.
function canvasWant(map: WorldMap, view: MapView, crowd: CrowdOver): Want {
  const tilePx = view === 'region' ? 16 : 8;
  const sprites = page ? townSprites(iconSprites(map, page, view)) : new Int16Array(0);
  return (ax, ay, px, py) => {
    const inside = ax >= 0 && ay >= 0 && ax < map.width * tilePx && ay < map.height * tilePx;
    const fill = inside ? flatColour(map, Math.floor(ay / tilePx) * map.width + Math.floor(ax / tilePx)) : LINE_COLOURS.water;
    return over(sprites, false, ax, ay, crowd(fill, px, py));
  };
}

// A lost context reads back no pixels at all, which would otherwise match any reference.
function mismatches(width: number, height: number, camera: MapCamera, view: MapView, want: Want): string[] {
  if (frame.length !== 4 * width * height) return [`read ${frame.length / 4} pixels of a ${width} x ${height} frame`];
  const scale = camera.cellPx / (view === 'region' ? 16 : 8);
  const camX = Math.round(camera.x * camera.cellPx);
  const camY = Math.round(camera.y * camera.cellPx);
  const wrong: string[] = [];
  for (let at = 0; at < frame.length && wrong.length < 10; at += 4) {
    const px = (at >> 2) % width;
    const py = Math.floor((at >> 2) / width);
    const shown = want(Math.floor((px + camX) / scale), Math.floor((py + camY) / scale), px, py);
    const got = (frame[at] << 16) | (frame[at + 1] << 8) | frame[at + 2];
    if (got !== shown) wrong.push(`${px},${py}: got ${hex(got)}, want ${hex(shown)}`);
  }
  return wrong;
}

function rendered(): { drawn: MapRenderer; map: WorldMap } {
  if (!renderer || !world) throw new Error('boot the renderer and give it a world first');
  return { drawn: renderer, map: world };
}

function readRenderer(drawn: MapRenderer): void {
  const context = drawn.backend === 'webgl2' ? drawn.canvas.getContext('webgl2') : null;
  if (context) readBack(context);
  else read2d(drawn.canvas);
}

function shownFrame(camera: MapCamera, flat: boolean): RenderedFrame {
  const { drawn, map } = rendered();
  readRenderer(drawn);
  const { width, height } = drawn.canvas;
  const crowd = crowdOver(crowdLayer(width, height, camera, drawn.view), width);
  const want = drawn.backend === 'webgl2' ? glWant(map, drawn.view, flat, crowd) : canvasWant(map, drawn.view, crowd);
  const wrong = mismatches(width, height, camera, drawn.view, want);
  return { backend: drawn.backend, view: drawn.view, swapped: drawn.canvas !== bootCanvas, wrong, hues: huesShown() };
}

function webglOf(canvas: HTMLCanvasElement | undefined): WebGL2RenderingContext | null {
  return canvas?.getContext('webgl2') ?? null;
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
    renderer?.setWorld(world);
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
    renderer?.setAtlas(page);
  },
  check(camera, view, flat) {
    const { context, map } = booted();
    base?.draw(camera, view, flat);
    icons?.draw(camera, view, flat);
    readBack(context);
    const { drawingBufferWidth: width, drawingBufferHeight: height } = context;
    return mismatches(width, height, camera, view, glWant(map, view, flat, NO_CROWD));
  },
  bootRenderer(width, height, options) {
    renderer?.dispose();
    gl = null;
    base = null;
    icons = null;
    page = null;
    crowdHue = new Uint8Array(0);
    crowdXy = new Float32Array(0);
    bootCanvas = document.createElement('canvas');
    document.body.replaceChildren(bootCanvas);
    renderer = createMapRenderer(bootCanvas, options);
    const backend = renderer.init();
    renderer.resize(width, height, devicePixelRatio);
    return backend;
  },
  render(camera, flat) {
    const { drawn } = rendered();
    drawn.setFlat(flat);
    drawn.draw(camera);
    return shownFrame(camera, flat);
  },
  shown: shownFrame,
  crowd(hue, xy) {
    crowdHue = Uint8Array.from(hue);
    crowdXy = Float32Array.from(xy);
    renderer?.setCrowd(crowdHue, crowdXy);
  },
  moveCrowd(xy) {
    crowdXy.set(xy);
  },
  dotCentre(dot, camera) {
    const size = crowdDotPx(camera.cellPx);
    const middle = (at: number, cam: number): number =>
      dotCorner(at, camera.cellPx, size) + (size >> 1) - Math.round(cam * camera.cellPx);
    return [middle(crowdXy[2 * dot], camera.x), middle(crowdXy[2 * dot + 1], camera.y)];
  },
  // Chromium and WebKit mark a context restorable only after the lost event's listeners return, so wait a task.
  async loseContext() {
    const canvas = renderer?.canvas;
    loser = webglOf(canvas)?.getExtension('WEBGL_lose_context') ?? null;
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
  pixel(x, y) {
    const at = 4 * (y * frameWidth + x);
    return hex((frame[at] << 16) | (frame[at + 1] << 8) | frame[at + 2]);
  },
  get colours() {
    return {
      countries: COUNTRY_COLOURS.map(hex),
      border: hex(LINE_COLOURS.border),
      water: hex(LINE_COLOURS.water),
      crowd: CROWD_COLOURS.map(hex),
    };
  },
};
