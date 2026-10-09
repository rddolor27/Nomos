import { CROWD_OUTLINE } from '../map/colours.ts';
import type { AtlasPage } from '../map/frames.ts';
import { link, nearestTexture } from '../map/gl.ts';
import { snapToDevice, type PlaceCamera } from './camera.ts';
import { INSTANCE_SHORTS, type PlaceSprites } from './sprites.ts';

const DST = 0;
const SRC = 1;
const ATLAS_UNIT = 0;

// One instance a sprite, a quad over exactly its art pixels, drawn in instance order, so later sprites cover earlier.
const VERTEX = `#version 300 es
precision highp float;
precision highp int;
layout(location = ${DST}) in ivec2 a_dst;
layout(location = ${SRC}) in ivec4 a_src;
uniform ivec2 u_camDev;
uniform int u_scale;
uniform ivec2 u_viewport;
flat out ivec2 v_dst;
flat out ivec2 v_src;

void main() {
  v_dst = a_dst;
  v_src = a_src.xy;
  ivec2 corner = (a_dst + ivec2(gl_VertexID & 1, gl_VertexID >> 1) * a_src.zw) * u_scale - u_camDev;
  gl_Position = vec4(vec2(corner) / vec2(u_viewport) * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
}`;

// Each device pixel fetches the texel of its own art pixel. The sheets' alpha is 0 or 255, so discarding clear texels
// matches alpha_composite exactly.
const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D u_atlas;
uniform ivec2 u_camDev;
uniform int u_scale;
uniform ivec2 u_viewport;
flat in ivec2 v_dst;
flat in ivec2 v_src;
out vec4 colour;

int floorDiv(int a, int b) {
  return a >= 0 ? a / b : -((b - 1 - a) / b);
}

void main() {
  ivec2 pixel = ivec2(int(gl_FragCoord.x), u_viewport.y - 1 - int(gl_FragCoord.y));
  ivec2 art = ivec2(floorDiv(pixel.x + u_camDev.x, u_scale), floorDiv(pixel.y + u_camDev.y, u_scale));
  vec4 texel = texelFetch(u_atlas, v_src + art - v_dst, 0);
  if (texel.a < 0.5) discard;
  colour = vec4(texel.rgb, 1.0);
}`;

// placedraw.py fills the place with the palette's OUTLINE, which map-colours.json keeps as the outline.
const BACKGROUND = [CROWD_OUTLINE >> 16, (CROWD_OUTLINE >> 8) & 255, CROWD_OUTLINE & 255].map((channel) => channel / 255);

export interface PlacePass {
  setAtlas(page: AtlasPage): void;
  // Clears to the background, then draws every sprite packed; without sprites or a page, only the background.
  draw(sprites: PlaceSprites | null, camera: PlaceCamera): void;
  dispose(): void;
}

function instanceVao(gl: WebGL2RenderingContext, buffer: WebGLBuffer): WebGLVertexArrayObject {
  const stride = 2 * INSTANCE_SHORTS;
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(DST);
  gl.vertexAttribIPointer(DST, 2, gl.SHORT, stride, 0);
  gl.vertexAttribDivisor(DST, 1);
  gl.enableVertexAttribArray(SRC);
  gl.vertexAttribIPointer(SRC, 4, gl.SHORT, stride, 4);
  gl.vertexAttribDivisor(SRC, 1);
  gl.bindVertexArray(null);
  return vao;
}

export function createPlacePass(gl: WebGL2RenderingContext): PlacePass {
  const program = link(gl, VERTEX, FRAGMENT);
  const camDev = gl.getUniformLocation(program, 'u_camDev');
  const scale = gl.getUniformLocation(program, 'u_scale');
  const viewport = gl.getUniformLocation(program, 'u_viewport');
  gl.useProgram(program);
  gl.uniform1i(gl.getUniformLocation(program, 'u_atlas'), ATLAS_UNIT);
  gl.activeTexture(gl.TEXTURE0 + ATLAS_UNIT);
  const atlas = nearestTexture(gl);
  const buffer = gl.createBuffer();
  const vao = instanceVao(gl, buffer);
  // Set once on the place's own context: passing the floats on every draw boxed each into a heap number, 37 bytes a
  // frame in Chromium's sampling heap profiler.
  gl.clearColor(BACKGROUND[0], BACKGROUND[1], BACKGROUND[2], 1);
  let paged = false;
  // The sprites whose whole list the buffer holds; after them, a draw sends only the part that moves.
  let uploaded: PlaceSprites | null = null;

  function upload(sprites: PlaceSprites): void {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    if (sprites !== uploaded) {
      gl.bufferData(gl.ARRAY_BUFFER, sprites.data, gl.DYNAMIC_DRAW);
      uploaded = sprites;
      return;
    }
    const from = INSTANCE_SHORTS * sprites.fixed;
    gl.bufferSubData(gl.ARRAY_BUFFER, 2 * from, sprites.data, from, INSTANCE_SHORTS * sprites.count - from);
  }

  return {
    setAtlas(page) {
      gl.activeTexture(gl.TEXTURE0 + ATLAS_UNIT);
      gl.bindTexture(gl.TEXTURE_2D, atlas);
      // Pixel art keeps its exact colours, and its fully clear texels stay clear.
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, page.image);
      paged = true;
    },
    draw(sprites, camera) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!sprites || !paged) return;
      upload(sprites);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0 + ATLAS_UNIT);
      gl.bindTexture(gl.TEXTURE_2D, atlas);
      gl.uniform2i(camDev, snapToDevice(camera.x, camera.scale), snapToDevice(camera.y, camera.scale));
      gl.uniform1i(scale, camera.scale);
      gl.uniform2i(viewport, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, sprites.count);
      gl.bindVertexArray(null);
    },
    dispose() {
      gl.deleteVertexArray(vao);
      gl.deleteBuffer(buffer);
      gl.deleteTexture(atlas);
      gl.deleteProgram(program);
    },
  };
}
