import { BACKGROUND } from './colour.ts';
import type { Camera } from './types.ts';

const CONTEXT: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
};

// One triangle that covers the viewport: (-1, -1), (3, -1) and (-1, 3).
const MAP_VERTEX = `#version 300 es
void main() {
  gl_Position = vec4(float((gl_VertexID & 1) << 2) - 1.0, float((gl_VertexID & 2) << 1) - 1.0, 0.0, 1.0);
}`;

// Each device pixel, counted from the top-left, shows world pixel floor((pixel + camDev) / zoom), and its tile
// (world >> 4) is one texelFetch, so no colour is interpolated (R3 rendering notes §4). Off the map the clear shows.
const MAP_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D u_minimap;
uniform ivec2 u_camDev;
uniform int u_zoom;
uniform int u_rows;
out vec4 colour;

// GLSL integer division never rounds a negative quotient down, so only non-negative numbers are divided.
int floorDiv(int a, int b) {
  return a >= 0 ? a / b : -((b - 1 - a) / b);
}

void main() {
  ivec2 pixel = ivec2(int(gl_FragCoord.x), u_rows - 1 - int(gl_FragCoord.y));
  ivec2 world = ivec2(floorDiv(pixel.x + u_camDev.x, u_zoom), floorDiv(pixel.y + u_camDev.y, u_zoom));
  if (any(lessThan(world, ivec2(0))) || any(greaterThanEqual(world >> 4, textureSize(u_minimap, 0)))) discard;
  colour = vec4(texelFetch(u_minimap, world >> 4, 0).rgb, 1.0);
}`;

export interface Gl {
  readonly gl: WebGL2RenderingContext;
  readonly mapProgram: WebGLProgram;
  readonly camDev: WebGLUniformLocation | null;
  readonly zoom: WebGLUniformLocation | null;
  readonly rows: WebGLUniformLocation | null;
  readonly noAttributes: WebGLVertexArrayObject;
  readonly minimap: WebGLTexture;
  hasMap: boolean;
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

function createMinimapTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // The default minifying filter wants mipmaps, and an incomplete texture reads black even through texelFetch.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return texture;
}

export function openGl(canvas: HTMLCanvasElement): Gl | null {
  const gl = canvas.getContext('webgl2', CONTEXT);
  if (!gl) return null;
  const mapProgram = link(gl, MAP_VERTEX, MAP_FRAGMENT);
  gl.useProgram(mapProgram);
  gl.uniform1i(gl.getUniformLocation(mapProgram, 'u_minimap'), 0);
  gl.clearColor(((BACKGROUND >> 16) & 255) / 255, ((BACKGROUND >> 8) & 255) / 255, (BACKGROUND & 255) / 255, 1);
  return {
    gl,
    mapProgram,
    camDev: gl.getUniformLocation(mapProgram, 'u_camDev'),
    zoom: gl.getUniformLocation(mapProgram, 'u_zoom'),
    rows: gl.getUniformLocation(mapProgram, 'u_rows'),
    noAttributes: gl.createVertexArray(),
    minimap: createMinimapTexture(gl),
    hasMap: false,
  };
}

export function uploadMinimap(g: Gl, width: number, height: number, pixels: Uint8Array): void {
  const gl = g.gl;
  gl.bindTexture(gl.TEXTURE_2D, g.minimap);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  g.hasMap = true;
}

export function drawGl(g: Gl, camera: Camera, width: number, height: number): void {
  const gl = g.gl;
  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (!g.hasMap) return;
  gl.useProgram(g.mapProgram);
  gl.bindVertexArray(g.noAttributes);
  gl.bindTexture(gl.TEXTURE_2D, g.minimap);
  gl.uniform2i(g.camDev, Math.round(camera.x * camera.zoom), Math.round(camera.y * camera.zoom));
  gl.uniform1i(g.zoom, camera.zoom);
  gl.uniform1i(g.rows, height);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

export function closeGl(g: Gl): void {
  const gl = g.gl;
  gl.deleteProgram(g.mapProgram);
  gl.deleteVertexArray(g.noAttributes);
  gl.deleteTexture(g.minimap);
  gl.getExtension('WEBGL_lose_context')?.loseContext();
}
