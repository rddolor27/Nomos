import { BIOME_NAMES, LANDMARK_NAMES, LANDMARK_SLOTS, NO_LANDMARK, type WorldMap } from '@nomos/sim-protocol/world-map';
import type { MapCamera, MapView } from './camera.ts';
import { landmarkFrame, peakFrame, settlementFrame, wonderFrame, type AtlasPage } from './frames.ts';
import { link, nearestTexture } from './gl.ts';

// mapdraw.py's layers: on one row, peaks draw first, then wonders and landmarks, then settlements.
const PEAKS = 0;
const ICONS = 1;
const TOWNS = 2;
const LIGHTHOUSE = LANDMARK_NAMES.indexOf('lighthouse');
const OCEAN = BIOME_NAMES.indexOf('ocean');
const LAKE = BIOME_NAMES.indexOf('lake');

// Eight shorts a sprite: its art-pixel corner, its atlas rectangle, whether it is a peak, and padding.
export const SPRITE_SHORTS = 8;

interface Placed {
  gy: number;
  layer: number;
  gx: number;
  name: string;
}

function artPx(view: MapView): number {
  return view === 'region' ? 16 : 8;
}

// mapdraw.py's _overlays, over the whole map.
function overlays(map: WorldMap, view: MapView): Placed[] {
  const { width } = map;
  const out: Placed[] = [];
  for (let cell = 0; cell < map.biome.length; cell++) {
    const peak = peakFrame(map.biome[cell], map.variant[cell], view);
    if (peak) out.push({ gy: Math.floor(cell / width), layer: PEAKS, gx: cell % width, name: peak });
  }
  map.wonders.cell.forEach((cell, k) => {
    out.push({ gy: Math.floor(cell / width), layer: ICONS, gx: cell % width, name: wonderFrame(map.wonders.kind[k], view) });
  });
  map.landmarks.cell.forEach((cell, k) => {
    const name = landmarkFrame(map.landmarks.kind[k], view);
    out.push({ gy: Math.floor(cell / width), layer: ICONS, gx: cell % width, name });
  });
  map.settlements.cell.forEach((cell, id) => {
    out.push({ gy: Math.floor(cell / width), layer: TOWNS, gx: cell % width, name: settlementFrame(map.settlements.tier[id]) });
  });
  return out;
}

function landmarksOf(map: WorldMap, id: number): number[] {
  const kinds: number[] = [];
  for (let slot = 0; slot < LANDMARK_SLOTS; slot++) {
    const kind = map.settlements.landmarks[id * LANDMARK_SLOTS + slot];
    if (kind !== NO_LANDMARK && kind !== LIGHTHOUSE) kinds.push(kind);
  }
  return kinds;
}

function freeLand(map: WorldMap, taken: Set<number>, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height || taken.has(y * map.width + x)) return false;
  const biome = map.biome[y * map.width + x];
  return biome !== OCEAN && biome !== LAKE;
}

// mapdraw.py's _beside, for the Region view: each settlement's in-place landmarks, lighthouses aside, in free land
// cells either side of it, just past the half-width of its icon.
function beside(map: WorldMap, page: AtlasPage, placed: readonly Placed[]): Placed[] {
  const taken = new Set(placed.filter((p) => p.layer !== PEAKS).map((p) => p.gy * map.width + p.gx));
  const out: Placed[] = [];
  map.settlements.cell.forEach((cell, id) => {
    const kinds = landmarksOf(map, id);
    if (kinds.length === 0) return;
    const x = cell % map.width;
    const y = Math.floor(cell / map.width);
    const reach = Math.floor((Math.floor(page.frames[settlementFrame(map.settlements.tier[id])].w / 2) + 8) / 16) + 1;
    const spots = [
      [x + reach, y],
      [x - reach, y],
      [x + reach, y + 1],
      [x - reach, y + 1],
    ].filter(([sx, sy]) => freeLand(map, taken, sx, sy));
    for (let k = 0; k < Math.min(kinds.length, spots.length); k++) {
      const [sx, sy] = spots[k];
      taken.add(sy * map.width + sx);
      out.push({ gy: sy, layer: ICONS, gx: sx, name: landmarkFrame(kinds[k], 'region') });
    }
  });
  return out;
}

// Python compares strings by code point; localeCompare would follow the browser's collation instead.
function byCodePoint(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

// Every sprite of one view, in mapdraw.py's _place order: by row, layer, column and frame. Each sprite's anchor sits
// on its cell's bottom-centre.
export function iconSprites(map: WorldMap, page: AtlasPage, view: MapView): Int16Array {
  const placed = overlays(map, view);
  if (view === 'region') placed.push(...beside(map, page, placed));
  placed.sort((a, b) => a.gy - b.gy || a.layer - b.layer || a.gx - b.gx || byCodePoint(a.name, b.name));
  const tilePx = artPx(view);
  const out = new Int16Array(SPRITE_SHORTS * placed.length);
  placed.forEach((p, i) => {
    const frame = page.frames[p.name];
    const x = p.gx * tilePx + (tilePx >> 1) - frame.anchor[0];
    const y = p.gy * tilePx + tilePx - 1 - frame.anchor[1];
    out.set([x, y, frame.x, frame.y, frame.w, frame.h, p.layer === PEAKS ? 1 : 0, 0], SPRITE_SHORTS * i);
  });
  return out;
}

const DST = 0;
const SRC = 1;
const PEAK = 2;
const ATLAS_UNIT = 0;

// One instance a sprite, a quad over exactly its art pixels. The flat view hides peaks, as countries.png does, by
// sending them off the clip space.
const VERTEX = `#version 300 es
precision highp float;
precision highp int;
layout(location = ${DST}) in ivec2 a_dst;
layout(location = ${SRC}) in ivec4 a_src;
layout(location = ${PEAK}) in int a_peak;
uniform ivec2 u_camDev;
uniform int u_scale;
uniform ivec2 u_viewport;
uniform bool u_hidePeaks;
flat out ivec2 v_dst;
flat out ivec2 v_src;

void main() {
  v_dst = a_dst;
  v_src = a_src.xy;
  if (a_peak != 0 && u_hidePeaks) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  ivec2 corner = (a_dst + ivec2(gl_VertexID & 1, gl_VertexID >> 1) * a_src.zw) * u_scale - u_camDev;
  gl_Position = vec4(vec2(corner) / vec2(u_viewport) * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
}`;

// The same device-to-art rule as the base pass, so a sprite's texels land on the same whole pixels as its tile's.
const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D u_atlas;
uniform ivec2 u_camDev;
uniform int u_scale;
uniform int u_rows;
flat in ivec2 v_dst;
flat in ivec2 v_src;
out vec4 colour;

int floorDiv(int a, int b) {
  return a >= 0 ? a / b : -((b - 1 - a) / b);
}

void main() {
  ivec2 pixel = ivec2(int(gl_FragCoord.x), u_rows - 1 - int(gl_FragCoord.y));
  ivec2 art = ivec2(floorDiv(pixel.x + u_camDev.x, u_scale), floorDiv(pixel.y + u_camDev.y, u_scale));
  vec4 texel = texelFetch(u_atlas, v_src + art - v_dst, 0);
  if (texel.a < 0.5) discard;
  colour = vec4(texel.rgb, 1.0);
}`;

export interface IconsPass {
  // Drops the sprites of any earlier world.
  setWorld(map: WorldMap): void;
  setAtlas(page: AtlasPage): void;
  // Draws nothing until both a world and a page are in; builds each view's sprites on its first draw.
  draw(camera: MapCamera, view: MapView, flat: boolean): void;
  dispose(): void;
}

interface Sprites {
  readonly buffer: WebGLBuffer;
  readonly vao: WebGLVertexArrayObject;
  readonly count: number;
}

interface IconsState {
  readonly gl: WebGL2RenderingContext;
  readonly program: WebGLProgram;
  readonly atlas: WebGLTexture;
  readonly locations: Record<'camDev' | 'scale' | 'viewport' | 'rows' | 'hidePeaks', WebGLUniformLocation | null>;
  readonly sprites: Record<MapView, Sprites | null>;
  world: WorldMap | null;
  page: AtlasPage | null;
}

function dropSprites(state: IconsState): void {
  for (const view of ['country', 'region'] as const) {
    const made = state.sprites[view];
    if (made) {
      state.gl.deleteBuffer(made.buffer);
      state.gl.deleteVertexArray(made.vao);
    }
    state.sprites[view] = null;
  }
}

function spriteVao(gl: WebGL2RenderingContext, data: Int16Array): Sprites {
  const stride = 2 * SPRITE_SHORTS;
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const attributes: [number, number, number][] = [
    [DST, 2, 0],
    [SRC, 4, 4],
    [PEAK, 1, 12],
  ];
  for (const [location, size, offset] of attributes) {
    gl.enableVertexAttribArray(location);
    gl.vertexAttribIPointer(location, size, gl.SHORT, stride, offset);
    gl.vertexAttribDivisor(location, 1);
  }
  gl.bindVertexArray(null);
  return { buffer, vao, count: data.length / SPRITE_SHORTS };
}

function spritesFor(state: IconsState, world: WorldMap, page: AtlasPage, view: MapView): Sprites {
  const made = state.sprites[view];
  if (made) return made;
  const sprites = spriteVao(state.gl, iconSprites(world, page, view));
  state.sprites[view] = sprites;
  return sprites;
}

function drawSprites(state: IconsState, sprites: Sprites, camera: MapCamera, view: MapView, flat: boolean): void {
  const { gl, locations } = state;
  gl.useProgram(state.program);
  gl.bindVertexArray(sprites.vao);
  gl.activeTexture(gl.TEXTURE0 + ATLAS_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, state.atlas);
  gl.uniform2i(locations.camDev, Math.round(camera.x * camera.cellPx), Math.round(camera.y * camera.cellPx));
  gl.uniform1i(locations.scale, camera.cellPx / artPx(view));
  gl.uniform2i(locations.viewport, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.uniform1i(locations.rows, gl.drawingBufferHeight);
  gl.uniform1i(locations.hidePeaks, flat ? 1 : 0);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, sprites.count);
  gl.bindVertexArray(null);
}

export function createIconsPass(gl: WebGL2RenderingContext): IconsPass {
  const program = link(gl, VERTEX, FRAGMENT);
  gl.useProgram(program);
  gl.uniform1i(gl.getUniformLocation(program, 'u_atlas'), ATLAS_UNIT);
  gl.activeTexture(gl.TEXTURE0 + ATLAS_UNIT);
  const state: IconsState = {
    gl,
    program,
    atlas: nearestTexture(gl),
    locations: {
      camDev: gl.getUniformLocation(program, 'u_camDev'),
      scale: gl.getUniformLocation(program, 'u_scale'),
      viewport: gl.getUniformLocation(program, 'u_viewport'),
      rows: gl.getUniformLocation(program, 'u_rows'),
      hidePeaks: gl.getUniformLocation(program, 'u_hidePeaks'),
    },
    sprites: { country: null, region: null },
    world: null,
    page: null,
  };
  return {
    setWorld(map) {
      state.world = map;
      dropSprites(state);
    },
    setAtlas(page) {
      gl.activeTexture(gl.TEXTURE0 + ATLAS_UNIT);
      gl.bindTexture(gl.TEXTURE_2D, state.atlas);
      // Pixel art keeps its exact colours, and its fully clear texels stay clear.
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, page.image);
      state.page = page;
      dropSprites(state);
    },
    draw(camera, view, flat) {
      const { world, page } = state;
      if (!world || !page) return;
      drawSprites(state, spritesFor(state, world, page, view), camera, view, flat);
    },
    dispose() {
      dropSprites(state);
      gl.deleteTexture(state.atlas);
      gl.deleteProgram(program);
    },
  };
}
