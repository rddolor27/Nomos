import { CROWD_HUES } from '@nomos/sim-protocol/world-map';
import type { MapCamera } from './camera.ts';
import { CROWD_COLOURS, CROWD_OUTLINE } from './colours.ts';
import { link } from './gl.ts';

export const DOT_CLEAR = 0;
export const DOT_HUE = 1;
export const DOT_OUTLINE = 2;
// From here a dot wears the 1-px dark outline characters wear by day (web rules); below it the ring would hide the hue.
const OUTLINE_FROM_PX = 4;

// A tenth of a cell, so a crowd covers the same share of the map at every step. Rounding up gives 2 px at 16 px a cell,
// and an outlined 4 px where the Region view opens at 32, since a bare 3-px pastel square vanished on sand and snow
// (seen in the harness on the real atlas page).
export function crowdDotPx(cellPx: number): number {
  return Math.ceil(cellPx / 10);
}

// Twice a pixel centre's offset from the disc's centre, so the test stays in integers, as the shader's does.
function inDisc(size: number, i: number, j: number): boolean {
  const dx = 2 * i + 1 - size;
  const dy = 2 * j + 1 - size;
  return dx * dx + dy * dy <= size * size;
}

// Pixel (i, j) of a dot size px across: clear, its hue, or its outline, the disc's pixels beside a clear one.
export function dotPixel(size: number, i: number, j: number): number {
  if (!inDisc(size, i, j)) return DOT_CLEAR;
  if (size < OUTLINE_FROM_PX) return DOT_HUE;
  const inner = inDisc(size, i - 1, j) && inDisc(size, i + 1, j) && inDisc(size, i, j - 1) && inDisc(size, i, j + 1);
  return inner ? DOT_HUE : DOT_OUTLINE;
}

// A dot's first device pixel on the map, before the camera's snapped offset. fround takes the product as WebGL's
// float32 does, so both painters put a dot on the same pixel.
export function dotCorner(at: number, cellPx: number, size: number): number {
  return Math.floor(Math.fround(at * cellPx)) - (size >> 1);
}

const XY = 0;
const HUE = 1;

// One instance a dot: a quad over its size x size device pixels.
const VERTEX = `#version 300 es
precision highp float;
precision highp int;
layout(location = ${XY}) in vec2 a_xy;
layout(location = ${HUE}) in uint a_hue;
uniform ivec2 u_camDev;
uniform float u_cellPx;
uniform int u_size;
uniform ivec2 u_viewport;
uniform vec3 u_hues[${CROWD_HUES.length}];
flat out ivec2 v_corner;
flat out vec3 v_hue;

void main() {
  v_corner = ivec2(floor(a_xy * u_cellPx)) - u_size / 2 - u_camDev;
  v_hue = u_hues[int(a_hue)];
  ivec2 corner = v_corner + ivec2(gl_VertexID & 1, gl_VertexID >> 1) * u_size;
  gl_Position = vec4(vec2(corner) / vec2(u_viewport) * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
}`;

// dotPixel's rule, pixel for pixel.
const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform int u_size;
uniform int u_rows;
uniform vec3 u_outline;
flat in ivec2 v_corner;
flat in vec3 v_hue;
out vec4 colour;

bool inDisc(ivec2 d) {
  ivec2 twice = 2 * d + 1 - u_size;
  return twice.x * twice.x + twice.y * twice.y <= u_size * u_size;
}

void main() {
  ivec2 d = ivec2(int(gl_FragCoord.x), u_rows - 1 - int(gl_FragCoord.y)) - v_corner;
  if (!inDisc(d)) discard;
  bool inner = inDisc(d - ivec2(1, 0)) && inDisc(d + ivec2(1, 0)) && inDisc(d - ivec2(0, 1)) && inDisc(d + ivec2(0, 1));
  colour = vec4(inner || u_size < ${OUTLINE_FROM_PX} ? v_hue : u_outline, 1.0);
}`;

export interface CrowdPass {
  // Sizes the position buffer for this crowd and uploads its hues.
  setCrowd(hue: Uint8Array, xy: Float32Array): void;
  // Uploads the positions, which the caller rewrites before each draw, then draws every dot.
  draw(camera: MapCamera): void;
  dispose(): void;
}

interface Uniforms {
  readonly camDev: WebGLUniformLocation | null;
  readonly cellPx: WebGLUniformLocation | null;
  readonly size: WebGLUniformLocation | null;
  readonly viewport: WebGLUniformLocation | null;
  readonly rows: WebGLUniformLocation | null;
}

function rgb(colour: number, out: Float32Array, at: number): void {
  out[at] = ((colour >> 16) & 255) / 255;
  out[at + 1] = ((colour >> 8) & 255) / 255;
  out[at + 2] = (colour & 255) / 255;
}

function setConstants(gl: WebGL2RenderingContext, program: WebGLProgram): void {
  gl.useProgram(program);
  const hues = new Float32Array(3 * CROWD_COLOURS.length);
  CROWD_COLOURS.forEach((colour, k) => rgb(colour, hues, 3 * k));
  gl.uniform3fv(gl.getUniformLocation(program, 'u_hues'), hues);
  const outline = new Float32Array(3);
  rgb(CROWD_OUTLINE, outline, 0);
  gl.uniform3fv(gl.getUniformLocation(program, 'u_outline'), outline);
}

function dotsVao(gl: WebGL2RenderingContext, xyBuffer: WebGLBuffer, hueBuffer: WebGLBuffer): WebGLVertexArrayObject {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, xyBuffer);
  gl.enableVertexAttribArray(XY);
  gl.vertexAttribPointer(XY, 2, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(XY, 1);
  gl.bindBuffer(gl.ARRAY_BUFFER, hueBuffer);
  gl.enableVertexAttribArray(HUE);
  gl.vertexAttribIPointer(HUE, 1, gl.UNSIGNED_BYTE, 0, 0);
  gl.vertexAttribDivisor(HUE, 1);
  gl.bindVertexArray(null);
  return vao;
}

export function createCrowdPass(gl: WebGL2RenderingContext): CrowdPass {
  const program = link(gl, VERTEX, FRAGMENT);
  setConstants(gl, program);
  const uniforms: Uniforms = {
    camDev: gl.getUniformLocation(program, 'u_camDev'),
    cellPx: gl.getUniformLocation(program, 'u_cellPx'),
    size: gl.getUniformLocation(program, 'u_size'),
    viewport: gl.getUniformLocation(program, 'u_viewport'),
    rows: gl.getUniformLocation(program, 'u_rows'),
  };
  const xyBuffer = gl.createBuffer();
  const hueBuffer = gl.createBuffer();
  const vao = dotsVao(gl, xyBuffer, hueBuffer);
  let xy: Float32Array = new Float32Array(0);
  let count = 0;
  return {
    setCrowd(hue, positions) {
      gl.bindBuffer(gl.ARRAY_BUFFER, hueBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, hue, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, xyBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions.byteLength, gl.DYNAMIC_DRAW);
      xy = positions;
      count = hue.length;
    },
    draw(camera) {
      if (count === 0) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, xyBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, xy);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform2i(uniforms.camDev, Math.round(camera.x * camera.cellPx), Math.round(camera.y * camera.cellPx));
      gl.uniform1f(uniforms.cellPx, camera.cellPx);
      gl.uniform1i(uniforms.size, crowdDotPx(camera.cellPx));
      gl.uniform2i(uniforms.viewport, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform1i(uniforms.rows, gl.drawingBufferHeight);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
      gl.bindVertexArray(null);
    },
    dispose() {
      gl.deleteVertexArray(vao);
      gl.deleteBuffer(xyBuffer);
      gl.deleteBuffer(hueBuffer);
      gl.deleteProgram(program);
    },
  };
}
