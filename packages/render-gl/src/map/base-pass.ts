import type { WorldMap } from '@nomos/sim-protocol/world-map';
import type { MapCamera, MapView } from './camera.ts';
import { COUNTRY_COLOURS, LINE_COLOURS } from './colours.ts';
import { flatFills } from './fills.ts';
import { tileFrame, type AtlasPage } from './frames.ts';
import { link, nearestTexture } from './gl.ts';
import { BAND, BORDER, DECK, HIGHWAY, LANE, RAIL, RIVER, ROAD, buildOverlay } from './overlay.ts';

const ATLAS_UNIT = 0;
const CELLS_UNIT = 1;
const FLAT_UNIT = 2;
const OVERLAY_UNIT = 3;
const PALETTE_SIZE = BAND + COUNTRY_COLOURS.length;

// One triangle that covers the viewport: (-1, -1), (3, -1) and (-1, 3).
const VERTEX = `#version 300 es
void main() {
  gl_Position = vec4(float((gl_VertexID & 1) << 2) - 1.0, float((gl_VertexID & 2) << 1) - 1.0, 0.0, 1.0);
}`;

// Each device pixel shows art pixel floor((pixel + camDev) / scale), whole texels on whole pixels (web rules). A mark on
// the overlay wins, except that the flat view hides water and routes, as countries.png does; then the cell's flat fill
// or its tile's texel shows. Off the map shows water.
const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D u_atlas;
uniform highp usampler2D u_cells;
uniform highp sampler2D u_flat;
uniform highp usampler2D u_overlay;
uniform ivec2 u_camDev;
uniform int u_scale;
uniform int u_tilePx;
uniform int u_rows;
uniform bool u_flatMode;
uniform vec3 u_palette[${PALETTE_SIZE}];
uniform vec3 u_water;
out vec4 colour;

// GLSL integer division never rounds a negative quotient down, so only non-negative numbers are divided.
int floorDiv(int a, int b) {
  return a >= 0 ? a / b : -((b - 1 - a) / b);
}

void main() {
  ivec2 pixel = ivec2(int(gl_FragCoord.x), u_rows - 1 - int(gl_FragCoord.y));
  ivec2 art = ivec2(floorDiv(pixel.x + u_camDev.x, u_scale), floorDiv(pixel.y + u_camDev.y, u_scale));
  if (any(lessThan(art, ivec2(0))) || any(greaterThanEqual(art, textureSize(u_overlay, 0)))) {
    colour = vec4(u_water, 1.0);
    return;
  }
  int mark = int(texelFetch(u_overlay, art, 0).r);
  bool route = mark >= ${RIVER} && mark <= ${RAIL};
  if (mark != 0 && !(route && u_flatMode)) {
    colour = vec4(u_palette[mark], 1.0);
    return;
  }
  ivec2 cell = art / u_tilePx;
  if (u_flatMode) {
    colour = vec4(texelFetch(u_flat, cell, 0).rgb, 1.0);
    return;
  }
  uvec4 tiles = texelFetch(u_cells, cell, 0);
  ivec2 origin = u_tilePx == 8 ? ivec2(tiles.rg) : ivec2(tiles.ba);
  colour = vec4(texelFetch(u_atlas, origin + art - cell * u_tilePx, 0).rgb, 1.0);
}`;

export interface BasePass {
  // Uploads the flat fills, and drops the tiles and overlays of any earlier world.
  setWorld(map: WorldMap): void;
  // Until a page arrives, every draw is flat.
  setAtlas(page: AtlasPage): void;
  // Builds and uploads the view's overlay on its first draw.
  draw(camera: MapCamera, view: MapView, flat: boolean): void;
  dispose(): void;
}

interface Uniforms {
  readonly camDev: WebGLUniformLocation | null;
  readonly scale: WebGLUniformLocation | null;
  readonly tilePx: WebGLUniformLocation | null;
  readonly rows: WebGLUniformLocation | null;
  readonly flatMode: WebGLUniformLocation | null;
}

interface PassState {
  readonly gl: WebGL2RenderingContext;
  readonly program: WebGLProgram;
  readonly uniforms: Uniforms;
  readonly noAttributes: WebGLVertexArrayObject;
  readonly atlas: WebGLTexture;
  readonly cells: WebGLTexture;
  readonly flat: WebGLTexture;
  readonly overlays: Record<MapView, WebGLTexture | null>;
  world: WorldMap | null;
  page: AtlasPage | null;
}

function rgb(colour: number, out: Float32Array, at: number): void {
  out[at] = ((colour >> 16) & 255) / 255;
  out[at + 1] = ((colour >> 8) & 255) / 255;
  out[at + 2] = (colour & 255) / 255;
}

// Overlay index to colour: the line colours, the border, then one band per country colour.
function palette(): Float32Array {
  const out = new Float32Array(3 * PALETTE_SIZE);
  const lines = [
    [RIVER, LINE_COLOURS.river],
    [LANE, LINE_COLOURS.lane],
    [ROAD, LINE_COLOURS.road],
    [HIGHWAY, LINE_COLOURS.highway],
    [DECK, LINE_COLOURS.deck],
    [RAIL, LINE_COLOURS.rail],
    [BORDER, LINE_COLOURS.border],
  ];
  for (const [index, colour] of lines) rgb(colour, out, 3 * index);
  COUNTRY_COLOURS.forEach((colour, c) => rgb(colour, out, 3 * (BAND + c)));
  return out;
}

function setConstants(gl: WebGL2RenderingContext, program: WebGLProgram): void {
  gl.useProgram(program);
  gl.uniform1i(gl.getUniformLocation(program, 'u_atlas'), ATLAS_UNIT);
  gl.uniform1i(gl.getUniformLocation(program, 'u_cells'), CELLS_UNIT);
  gl.uniform1i(gl.getUniformLocation(program, 'u_flat'), FLAT_UNIT);
  gl.uniform1i(gl.getUniformLocation(program, 'u_overlay'), OVERLAY_UNIT);
  gl.uniform3fv(gl.getUniformLocation(program, 'u_palette'), palette());
  const water = new Float32Array(3);
  rgb(LINE_COLOURS.water, water, 0);
  gl.uniform3fv(gl.getUniformLocation(program, 'u_water'), water);
}

// Every sampler always has a texture of its own type, so a draw before the atlas still validates.
function placeholder(gl: WebGL2RenderingContext, unit: number, integer: boolean): WebGLTexture {
  gl.activeTexture(gl.TEXTURE0 + unit);
  const texture = nearestTexture(gl);
  if (integer) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16UI, 1, 1, 0, gl.RGBA_INTEGER, gl.UNSIGNED_SHORT, new Uint16Array(4));
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  return texture;
}

// Each cell's tile origins on the page: the Country view's 8-px tile in R and G, the Region view's 16-px tile in B and A.
function cellTiles(map: WorldMap, page: AtlasPage): Uint16Array {
  const out = new Uint16Array(4 * map.biome.length);
  for (let cell = 0; cell < map.biome.length; cell++) {
    const small = page.frames[tileFrame(map.biome[cell], map.variant[cell], 'country')];
    const large = page.frames[tileFrame(map.biome[cell], map.variant[cell], 'region')];
    out.set([small.x, small.y, large.x, large.y], 4 * cell);
  }
  return out;
}

function upload(state: PassState, unit: number, texture: WebGLTexture, write: (gl: WebGL2RenderingContext) => void): void {
  const gl = state.gl;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  write(gl);
}

function uploadCells(state: PassState): void {
  const { world, page } = state;
  if (!world || !page) return;
  const tiles = cellTiles(world, page);
  upload(state, CELLS_UNIT, state.cells, (gl) =>
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16UI, world.width, world.height, 0, gl.RGBA_INTEGER, gl.UNSIGNED_SHORT, tiles),
  );
}

function dropOverlays(state: PassState): void {
  for (const view of ['country', 'region'] as const) {
    if (state.overlays[view]) state.gl.deleteTexture(state.overlays[view]);
    state.overlays[view] = null;
  }
}

function overlayFor(state: PassState, world: WorldMap, view: MapView): WebGLTexture {
  const made = state.overlays[view];
  if (made) return made;
  const overlay = buildOverlay(world, view);
  const gl = state.gl;
  gl.activeTexture(gl.TEXTURE0 + OVERLAY_UNIT);
  const texture = nearestTexture(gl);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8UI, overlay.width, overlay.height, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, overlay.pixels);
  state.overlays[view] = texture;
  return texture;
}

function bindUnit(gl: WebGL2RenderingContext, unit: number, texture: WebGLTexture): void {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
}

function bindTextures(state: PassState, overlay: WebGLTexture): void {
  bindUnit(state.gl, ATLAS_UNIT, state.atlas);
  bindUnit(state.gl, CELLS_UNIT, state.cells);
  bindUnit(state.gl, FLAT_UNIT, state.flat);
  bindUnit(state.gl, OVERLAY_UNIT, overlay);
}

function drawPass(state: PassState, world: WorldMap, camera: MapCamera, view: MapView, flat: boolean): void {
  const { gl, uniforms } = state;
  const overlay = overlayFor(state, world, view);
  const tilePx = view === 'region' ? 16 : 8;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.useProgram(state.program);
  gl.bindVertexArray(state.noAttributes);
  bindTextures(state, overlay);
  gl.uniform2i(uniforms.camDev, Math.round(camera.x * camera.cellPx), Math.round(camera.y * camera.cellPx));
  gl.uniform1i(uniforms.scale, camera.cellPx / tilePx);
  gl.uniform1i(uniforms.tilePx, tilePx);
  gl.uniform1i(uniforms.rows, gl.drawingBufferHeight);
  gl.uniform1i(uniforms.flatMode, flat || !state.page ? 1 : 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

export function createBasePass(gl: WebGL2RenderingContext): BasePass {
  const program = link(gl, VERTEX, FRAGMENT);
  setConstants(gl, program);
  const state: PassState = {
    gl,
    program,
    uniforms: {
      camDev: gl.getUniformLocation(program, 'u_camDev'),
      scale: gl.getUniformLocation(program, 'u_scale'),
      tilePx: gl.getUniformLocation(program, 'u_tilePx'),
      rows: gl.getUniformLocation(program, 'u_rows'),
      flatMode: gl.getUniformLocation(program, 'u_flatMode'),
    },
    noAttributes: gl.createVertexArray(),
    atlas: placeholder(gl, ATLAS_UNIT, false),
    cells: placeholder(gl, CELLS_UNIT, true),
    flat: placeholder(gl, FLAT_UNIT, false),
    overlays: { country: null, region: null },
    world: null,
    page: null,
  };
  return {
    setWorld(map) {
      const pixels = flatFills(map);
      upload(state, FLAT_UNIT, state.flat, (context) =>
        context.texImage2D(context.TEXTURE_2D, 0, context.RGBA8, map.width, map.height, 0, context.RGBA, context.UNSIGNED_BYTE, pixels),
      );
      state.world = map;
      dropOverlays(state);
      uploadCells(state);
    },
    setAtlas(page) {
      upload(state, ATLAS_UNIT, state.atlas, (context) => {
        // Pixel art keeps its exact colours: no colour management on upload.
        context.pixelStorei(context.UNPACK_COLORSPACE_CONVERSION_WEBGL, context.NONE);
        context.texImage2D(context.TEXTURE_2D, 0, context.RGBA8, context.RGBA, context.UNSIGNED_BYTE, page.image);
      });
      state.page = page;
      uploadCells(state);
    },
    draw(camera, view, flat) {
      if (state.world) drawPass(state, state.world, camera, view, flat);
    },
    dispose() {
      dropOverlays(state);
      for (const texture of [state.atlas, state.cells, state.flat]) gl.deleteTexture(texture);
      gl.deleteVertexArray(state.noAttributes);
      gl.deleteProgram(program);
    },
  };
}
