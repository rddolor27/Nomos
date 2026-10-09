import { SNAPSHOT_BYTES, TILE_PX, jobId } from '@nomos/sim-protocol';
import { MAX_ZOOM, MIN_ZOOM } from '../camera/camera.ts';
import { BACKGROUND, OUTLINE, RIM, rgbOf } from '../dots/colour.ts';
import { JUMP_PX, MASK_FILL, MASK_GROUND, ROLES, ROLE_SHAPE, dotFill, dotMask } from '../dots/dots.ts';
import skinA from '../dots/skin-a.json';
import type { Camera, Painter, Retained } from '../renderer/types.ts';

const CONTEXT: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
};

const MINIMAP_UNIT = 0;
const MASKS_UNIT = 1;
// Snapshot v1: float32 x and y, then the uint32 word.
const WORD_OFFSET = 8;
const CUR = 0;
const PREV = 1;
const WORD = 2;
// The shaders turn world pixels into tiles with a shift.
const TILE_SHIFT = Math.log2(TILE_PX);

// One triangle that covers the viewport: (-1, -1), (3, -1) and (-1, 3).
const MAP_VERTEX = `#version 300 es
void main() {
  gl_Position = vec4(float((gl_VertexID & 1) << 2) - 1.0, float((gl_VertexID & 2) << 1) - 1.0, 0.0, 1.0);
}`;

// Each device pixel, counted from the top-left, shows world pixel floor((pixel + camDev) / zoom), and its tile is one
// texelFetch, so no colour is interpolated (R3 rendering notes §4). Off the map the clear shows. GLSL integer division
// never rounds a negative quotient down, so floorDiv divides only non-negative numbers. Comments stay out of the shader
// strings, which ship in the first-load renderer chunk.
const MAP_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D u_minimap;
uniform ivec2 u_camDev;
uniform int u_zoom;
uniform int u_rows;
out vec4 colour;

int floorDiv(int a, int b) {
  return a >= 0 ? a / b : -((b - 1 - a) / b);
}

void main() {
  ivec2 pixel = ivec2(int(gl_FragCoord.x), u_rows - 1 - int(gl_FragCoord.y));
  ivec2 world = ivec2(floorDiv(pixel.x + u_camDev.x, u_zoom), floorDiv(pixel.y + u_camDev.y, u_zoom));
  if (any(lessThan(world, ivec2(0))) || any(greaterThanEqual(world >> ${TILE_SHIFT}, textureSize(u_minimap, 0)))) discard;
  colour = vec4(texelFetch(u_minimap, world >> ${TILE_SHIFT}, 0).rgb, 1.0);
}`;

// One instance per agent: a (fill + 2)-pixel square on the texel its interpolated position falls in. In edgeAt, the
// minimap's alpha flags the grounds that take the outline; elsewhere, and off the map, a dot takes the rim.
const DOTS_VERTEX = `#version 300 es
precision highp float;
precision highp int;
layout(location = ${CUR}) in vec2 a_cur;
layout(location = ${PREV}) in vec2 a_prev;
layout(location = ${WORD}) in uint a_word;
uniform highp sampler2D u_minimap;
uniform float u_alpha;
uniform ivec2 u_camDev;
uniform int u_zoom;
uniform int u_half;
uniform ivec2 u_viewport;
uniform int u_merchantJob;
uniform int u_policeJob;
uniform vec3 u_fills[3];
uniform vec3 u_outline;
uniform vec3 u_rim;
flat out ivec2 v_centre;
flat out int v_role;
flat out vec3 v_fill;
flat out vec3 v_edge;

int roleOf(uint word) {
  int job = int((word >> 16u) & 255u);
  if (job == u_merchantJob) return 1;
  return job == u_policeJob ? 2 : 0;
}

vec3 edgeAt(ivec2 texel) {
  ivec2 tile = texel >> ${TILE_SHIFT};
  if (any(lessThan(texel, ivec2(0))) || any(greaterThanEqual(tile, textureSize(u_minimap, 0)))) return u_rim;
  return texelFetch(u_minimap, tile, 0).a < 0.5 ? u_outline : u_rim;
}

void main() {
  vec2 at = any(greaterThan(abs(a_cur - a_prev), vec2(${JUMP_PX}.0))) ? a_cur : mix(a_prev, a_cur, u_alpha);
  ivec2 texel = ivec2(floor(at));
  v_centre = texel * u_zoom + (u_zoom >> 1) - u_camDev;
  v_role = roleOf(a_word);
  v_fill = u_fills[v_role];
  v_edge = edgeAt(texel);
  ivec2 corner = v_centre - (u_half + 1) + ivec2(gl_VertexID & 1, gl_VertexID >> 1) * (2 * u_half + 3);
  gl_Position = vec4(vec2(corner) / vec2(u_viewport) * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
}`;

// The quad covers exactly the mask's cells, and each pixel reads its cell from the baked dotMask.
const DOTS_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform highp usampler2D u_masks;
uniform ivec2 u_viewport;
uniform int u_half;
uniform int u_maskRow;
flat in ivec2 v_centre;
flat in int v_role;
flat in vec3 v_fill;
flat in vec3 v_edge;
out vec4 colour;

void main() {
  ivec2 pixel = ivec2(int(gl_FragCoord.x), u_viewport.y - 1 - int(gl_FragCoord.y));
  ivec2 cell = pixel - v_centre + (u_half + 1);
  uint mask = texelFetch(u_masks, ivec2(cell.x, u_maskRow + v_role * (2 * u_half + 3) + cell.y), 0).r;
  if (mask == ${MASK_GROUND}u) discard;
  colour = vec4(mask == ${MASK_FILL}u ? v_fill : v_edge, 1.0);
}`;

interface MapPass {
  readonly program: WebGLProgram;
  readonly camDev: WebGLUniformLocation | null;
  readonly zoom: WebGLUniformLocation | null;
  readonly rows: WebGLUniformLocation | null;
  readonly noAttributes: WebGLVertexArrayObject;
  readonly minimap: WebGLTexture;
  hasMap: boolean;
}

interface DotsPass {
  readonly program: WebGLProgram;
  readonly alpha: WebGLUniformLocation | null;
  readonly camDev: WebGLUniformLocation | null;
  readonly zoom: WebGLUniformLocation | null;
  readonly half: WebGLUniformLocation | null;
  readonly viewport: WebGLUniformLocation | null;
  readonly maskRow: WebGLUniformLocation | null;
  // Snapshot slot k holds one of the two latest snapshots; vaos[k] reads it as current and the other as previous.
  readonly snapshots: readonly WebGLBuffer[];
  readonly vaos: readonly WebGLVertexArrayObject[];
  readonly masks: WebGLTexture;
  readonly maskRowOf: Int32Array;
  capacityBytes: number;
}

interface Gl {
  readonly gl: WebGL2RenderingContext;
  readonly map: MapPass;
  readonly dots: DotsPass;
}

function compile(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('WebGL2 could not create a shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function link(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    const logs = [gl.getShaderInfoLog(vertex), gl.getShaderInfoLog(fragment), gl.getProgramInfoLog(program)];
    throw new Error(`the shaders did not link: ${logs.filter(Boolean).join(' ')}`);
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  return program;
}

// The default minifying filter wants mipmaps, and an incomplete texture reads black even through texelFetch.
function nearestTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return texture;
}

function openMapPass(gl: WebGL2RenderingContext): MapPass {
  const program = link(gl, MAP_VERTEX, MAP_FRAGMENT);
  gl.useProgram(program);
  gl.uniform1i(gl.getUniformLocation(program, 'u_minimap'), MINIMAP_UNIT);
  return {
    program,
    camDev: gl.getUniformLocation(program, 'u_camDev'),
    zoom: gl.getUniformLocation(program, 'u_zoom'),
    rows: gl.getUniformLocation(program, 'u_rows'),
    noAttributes: gl.createVertexArray(),
    minimap: nearestTexture(gl),
    hasMap: false,
  };
}

// Every fill dotFill gives across the camera's zooms.
function maskFills(): number[] {
  const fills: number[] = [];
  for (let zoom = MIN_ZOOM; zoom <= MAX_ZOOM; zoom++) {
    if (!fills.includes(dotFill(zoom))) fills.push(dotFill(zoom));
  }
  return fills;
}

// dotMask baked once per fill and role, so WebGL2 draws exactly the cells the Canvas2D fallback draws. Rows hold a
// side-wide mask for each role in ROLES order, fill after fill; maskRowOf[fill] is a fill's first row. The masks live
// on their own unit: an integer texture left on the minimap's unit would fail every draw.
function uploadMasks(gl: WebGL2RenderingContext): { masks: WebGLTexture; maskRowOf: Int32Array } {
  const fills = maskFills();
  const width = Math.max(...fills) + 2;
  const height = fills.reduce((rows, fill) => rows + ROLES.length * (fill + 2), 0);
  const cells = new Uint8Array(width * height);
  const maskRowOf = new Int32Array(width).fill(-1);
  let row = 0;
  for (const fill of fills) {
    const side = fill + 2;
    maskRowOf[fill] = row;
    for (const role of ROLES) {
      const mask = dotMask(ROLE_SHAPE[role], fill);
      for (let y = 0; y < side; y++) cells.set(mask.subarray(y * side, (y + 1) * side), (row + y) * width);
      row += side;
    }
  }
  gl.activeTexture(gl.TEXTURE0 + MASKS_UNIT);
  const masks = nearestTexture(gl);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8UI, width, height, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, cells);
  gl.activeTexture(gl.TEXTURE0 + MINIMAP_UNIT);
  return { masks, maskRowOf };
}

function snapshotVao(gl: WebGL2RenderingContext, current: WebGLBuffer, previous: WebGLBuffer): WebGLVertexArrayObject {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, current);
  gl.enableVertexAttribArray(CUR);
  gl.vertexAttribPointer(CUR, 2, gl.FLOAT, false, SNAPSHOT_BYTES, 0);
  gl.vertexAttribDivisor(CUR, 1);
  gl.enableVertexAttribArray(WORD);
  gl.vertexAttribIPointer(WORD, 1, gl.UNSIGNED_INT, SNAPSHOT_BYTES, WORD_OFFSET);
  gl.vertexAttribDivisor(WORD, 1);
  gl.bindBuffer(gl.ARRAY_BUFFER, previous);
  gl.enableVertexAttribArray(PREV);
  gl.vertexAttribPointer(PREV, 2, gl.FLOAT, false, SNAPSHOT_BYTES, 0);
  gl.vertexAttribDivisor(PREV, 1);
  gl.bindVertexArray(null);
  return vao;
}

function setColour(gl: WebGL2RenderingContext, location: WebGLUniformLocation | null, rgb: number): void {
  gl.uniform3f(location, ((rgb >> 16) & 255) / 255, ((rgb >> 8) & 255) / 255, (rgb & 255) / 255);
}

function setConstants(gl: WebGL2RenderingContext, program: WebGLProgram): void {
  gl.useProgram(program);
  gl.uniform1i(gl.getUniformLocation(program, 'u_minimap'), MINIMAP_UNIT);
  gl.uniform1i(gl.getUniformLocation(program, 'u_masks'), MASKS_UNIT);
  gl.uniform1i(gl.getUniformLocation(program, 'u_merchantJob'), jobId('merchant'));
  gl.uniform1i(gl.getUniformLocation(program, 'u_policeJob'), jobId('police'));
  ROLES.forEach((role, i) => setColour(gl, gl.getUniformLocation(program, `u_fills[${i}]`), rgbOf(skinA[role].rgb)));
  setColour(gl, gl.getUniformLocation(program, 'u_outline'), OUTLINE);
  setColour(gl, gl.getUniformLocation(program, 'u_rim'), RIM);
}

function openDotsPass(gl: WebGL2RenderingContext): DotsPass {
  const program = link(gl, DOTS_VERTEX, DOTS_FRAGMENT);
  setConstants(gl, program);
  const snapshots = [gl.createBuffer(), gl.createBuffer()];
  const { masks, maskRowOf } = uploadMasks(gl);
  return {
    program,
    alpha: gl.getUniformLocation(program, 'u_alpha'),
    camDev: gl.getUniformLocation(program, 'u_camDev'),
    zoom: gl.getUniformLocation(program, 'u_zoom'),
    half: gl.getUniformLocation(program, 'u_half'),
    viewport: gl.getUniformLocation(program, 'u_viewport'),
    maskRow: gl.getUniformLocation(program, 'u_maskRow'),
    snapshots,
    vaos: [snapshotVao(gl, snapshots[0], snapshots[1]), snapshotVao(gl, snapshots[1], snapshots[0])],
    masks,
    maskRowOf,
    capacityBytes: 0,
  };
}

function openGl(canvas: HTMLCanvasElement): Gl | null {
  const gl = canvas.getContext('webgl2', CONTEXT);
  if (!gl) return null;
  gl.clearColor(((BACKGROUND >> 16) & 255) / 255, ((BACKGROUND >> 8) & 255) / 255, (BACKGROUND & 255) / 255, 1);
  return { gl, map: openMapPass(gl), dots: openDotsPass(gl) };
}

function uploadMinimap(g: Gl, width: number, height: number, pixels: Uint8Array): void {
  const gl = g.gl;
  gl.bindTexture(gl.TEXTURE_2D, g.map.minimap);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  g.map.hasMap = true;
}

// Both snapshot buffers grow together to the size of the retained copies, refilled with the previous snapshot.
function ensureCapacity(g: Gl, bytes: number, previousSlot: number, previous: Uint8Array): void {
  const gl = g.gl;
  const dots = g.dots;
  if (bytes <= dots.capacityBytes) return;
  for (const buffer of dots.snapshots) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, bytes, gl.DYNAMIC_DRAW);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, dots.snapshots[previousSlot]);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, previous);
  dots.capacityBytes = bytes;
}

// current and previous are the retained copies, equal in size; count agents of current go to its slot.
function uploadSnapshot(g: Gl, slot: number, current: Uint8Array, previous: Uint8Array, count: number): void {
  ensureCapacity(g, current.byteLength, slot ^ 1, previous);
  if (count === 0) return;
  const gl = g.gl;
  gl.bindBuffer(gl.ARRAY_BUFFER, g.dots.snapshots[slot]);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, current, 0, count * SNAPSHOT_BYTES);
}

function drawMap(g: Gl, camX: number, camY: number, zoom: number, height: number): void {
  const gl = g.gl;
  const map = g.map;
  gl.useProgram(map.program);
  gl.bindVertexArray(map.noAttributes);
  gl.bindTexture(gl.TEXTURE_2D, map.minimap);
  gl.uniform2i(map.camDev, camX, camY);
  gl.uniform1i(map.zoom, zoom);
  gl.uniform1i(map.rows, height);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function drawDots(g: Gl, camX: number, camY: number, zoom: number, alpha: number, slot: number, count: number): void {
  const gl = g.gl;
  const dots = g.dots;
  const fill = dotFill(zoom);
  gl.useProgram(dots.program);
  gl.bindVertexArray(dots.vaos[slot]);
  gl.uniform1f(dots.alpha, alpha);
  gl.uniform2i(dots.camDev, camX, camY);
  gl.uniform1i(dots.zoom, zoom);
  gl.uniform1i(dots.half, (fill - 1) >> 1);
  gl.uniform2i(dots.viewport, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.uniform1i(dots.maskRow, dots.maskRowOf[fill]);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
}

// Returns the agents drawn: the map pass covers the frame, then one instanced draw puts every agent on it.
function drawGl(g: Gl, camera: Camera, alpha: number, slot: number, count: number): number {
  const gl = g.gl;
  const camX = Math.round(camera.x * camera.zoom);
  const camY = Math.round(camera.y * camera.zoom);
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (g.map.hasMap) drawMap(g, camX, camY, camera.zoom, gl.drawingBufferHeight);
  if (count === 0) return 0;
  drawDots(g, camX, camY, camera.zoom, alpha, slot, count);
  return count;
}

function closeGl(g: Gl): void {
  const gl = g.gl;
  gl.deleteProgram(g.map.program);
  gl.deleteVertexArray(g.map.noAttributes);
  gl.deleteTexture(g.map.minimap);
  gl.deleteProgram(g.dots.program);
  for (const vao of g.dots.vaos) gl.deleteVertexArray(vao);
  for (const buffer of g.dots.snapshots) gl.deleteBuffer(buffer);
  gl.deleteTexture(g.dots.masks);
  gl.getExtension('WEBGL_lose_context')?.loseContext();
}

// Builds every GL object from the retained data, at init and again when a lost context comes back.
export function createGlPainter(canvas: HTMLCanvasElement, retained: Retained): Painter | null {
  const g = openGl(canvas);
  if (!g) return null;
  const painter: Painter = {
    mapChanged() {
      if (retained.map && retained.minimap) uploadMinimap(g, retained.map.width, retained.map.height, retained.minimap);
    },
    snapshotPushed() {
      const { copies, slot, count } = retained;
      uploadSnapshot(g, slot, copies[slot], copies[slot ^ 1], count);
    },
    draw(camera, alpha) {
      return drawGl(g, camera, alpha, retained.slot, retained.count);
    },
    dispose() {
      closeGl(g);
    },
  };
  painter.mapChanged();
  painter.snapshotPushed();
  return painter;
}
