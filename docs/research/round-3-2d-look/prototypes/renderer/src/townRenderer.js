// townRenderer.js - prototype WebGL2 pixel-art town renderer, written for size/complexity measurement.
// Passes per frame: (1) tilemap ground+detail as one full-screen triangle sampling a tile-index texture,
// (2) characters as instanced quads, y-sorted by the depth test (alpha-tested pixel art => no CPU sort),
// (3) "above" tile layer (roofs, tree tops), (4) emote bubbles. LOD: tiles -> per-tile average colour,
// characters -> dots. Day/night = ambient multiply. Positions are interpolated on the GPU between the
// previous and the current sim snapshot; facing and walk frame are derived in the vertex shader from velocity.
const TILE = 16;

const FULLSCREEN_VS = `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID & 1) << 2) - 1.0, float((gl_VertexID & 2) << 1) - 1.0); gl_Position = vec4(p, 0.0, 1.0); }`;

const MAP_FS = `#version 300 es
precision highp float; precision highp int; precision highp usampler2D;
uniform usampler2D uMap;      // RGBA16UI per tile: r = ground id, g = detail id, b = above id (0 = empty)
uniform sampler2D uAtlas;     // RGBA8 atlas, NEAREST; tile ids index 16x16 cells row-major
uniform sampler2D uTileAvg;   // RGBA8, one texel per map tile (average colour) for zoomed-out LOD
uniform vec2 uCam; uniform float uZoom; uniform float uViewH; uniform int uCols; uniform int uMask;
uniform int uLod; uniform float uTime; uniform vec3 uAmbient;
out vec4 o;
vec4 tex(uint id, ivec2 inTile) {
  int i = int(id);
  if (i >= 4096) i = (i - 4096) + (int(uTime * 4.0) & 3);              // animated tiles: 4 consecutive frames
  return texelFetch(uAtlas, ivec2(i % uCols, i / uCols) * ${TILE} + inTile, 0);
}
void main() {
  vec2 world = uCam + vec2(gl_FragCoord.x, uViewH - gl_FragCoord.y) / uZoom;
  ivec2 sz = textureSize(uMap, 0);
  ivec2 w = ivec2(floor(world)); ivec2 t = w >> 4;
  if (any(lessThan(t, ivec2(0))) || any(greaterThanEqual(t, sz))) { if (uMask == 3) { o = vec4(0, 0, 0, 1); return; } discard; }
  if (uLod == 1) { if (uMask != 3) discard; o = vec4(texture(uTileAvg, (world / float(${TILE})) / vec2(sz)).rgb * uAmbient, 1.0); return; }
  uvec4 id = texelFetch(uMap, t, 0); ivec2 it = w & ${TILE - 1};
  vec4 c = vec4(0.0);
  if (uMask == 3) {
    if (id.r != 0u) c = tex(id.r, it);
    if (id.g != 0u) { vec4 d = tex(id.g, it); if (d.a > 0.5) c = d; }
  } else if (id.b != 0u) c = tex(id.b, it);
  if (c.a < 0.5) { if (uMask == 3) { o = vec4(0, 0, 0, 1); return; } discard; }
  o = vec4(c.rgb * uAmbient, 1.0);
}`;

const SPRITE_VS = `#version 300 es
precision highp float; precision highp int;
layout(location = 0) in vec2 aPrev; layout(location = 1) in vec2 aCur; layout(location = 2) in uint aWord;
uniform vec2 uCam; uniform float uZoom; uniform vec2 uView; uniform float uAlpha; uniform float uTime;
uniform int uPass; uniform int uCols; uniform vec2 uCharOrigin; uniform vec2 uEmoteOrigin; uniform float uWorldH;
uniform float uDotPx; uniform sampler2D uPalette;
out vec2 vTex; flat out vec4 vCol;
void main() {
  vec2 q = vec2(gl_VertexID & 1, gl_VertexID >> 1);
  vec2 pos = mix(aPrev, aCur, uAlpha); vec2 vel = aCur - aPrev;
  uint outfit = aWord & 255u, facing = (aWord >> 8) & 3u, emote = (aWord >> 11) & 31u;
  bool moving = dot(vel, vel) > 0.0025;
  if (moving) facing = abs(vel.x) > abs(vel.y) ? (vel.x > 0.0 ? 2u : 1u) : (vel.y > 0.0 ? 0u : 3u);
  if (uPass == 2) {                                                  // LOD: coloured dot, fixed device-pixel size
    vec2 s = floor((pos - uCam) * uZoom) + (q - 0.5) * uDotPx;
    vec2 c = s / uView * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
    vCol = texelFetch(uPalette, ivec2(int(outfit), 0), 0); vTex = vec2(0); return;
  }
  vec2 size, cell, anchor;
  if (uPass == 0) {
    int ph = moving ? (int(floor(uTime * 6.0 + float(gl_InstanceID & 7) * 0.37)) & 3) : 0;
    int idx = int(outfit) * 12 + int(facing) * 3 + (ph == 1 ? 1 : ph == 3 ? 2 : 0);   // 3-frame walk: stand, L, stand, R
    size = vec2(16.0, 32.0); anchor = vec2(8.0, 30.0);
    cell = uCharOrigin + vec2(idx % uCols, idx / uCols) * size;
  } else {
    if (emote == 0u) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    size = vec2(16.0); anchor = vec2(8.0, 46.0); cell = uEmoteOrigin + vec2(float(emote - 1u) * 16.0, 0.0);
  }
  vec2 world = floor(pos) - anchor + q * size;                       // snap sprite to whole texels
  vec2 s = floor((world - uCam) * uZoom + 0.5);                      // and to whole device pixels
  vec2 c = s / uView * 2.0 - 1.0;
  float z = uPass == 1 ? 0.0 : 0.999 - 1.998 * clamp(pos.y / uWorldH, 0.0, 1.0);  // lower on screen = nearer
  gl_Position = vec4(c.x, -c.y, z, 1.0); vTex = cell + q * size; vCol = vec4(1);
}`;

const SPRITE_FS = `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uAtlas; uniform vec3 uAmbient; uniform int uPass;
in vec2 vTex; flat in vec4 vCol; out vec4 o;
void main() {
  if (uPass == 2) { o = vec4(vCol.rgb * uAmbient, 1.0); return; }
  vec4 c = texelFetch(uAtlas, ivec2(floor(vTex)), 0);
  if (c.a < 0.5) discard;                                            // 1-bit alpha => depth test can sort
  o = vec4(c.rgb * uAmbient, 1.0);
}`;

/**
 * @param {HTMLCanvasElement|OffscreenCanvas} canvas
 * @param {{atlas: ImageBitmap|ImageData, atlasCols: number, charOrigin: [number,number], charCols: number,
 *   emoteOrigin: [number,number], map: Uint16Array, mapW: number, mapH: number, tileAvg: Uint8Array,
 *   palette: Uint8Array, maxAgents: number}} o
 */
export function createTownRenderer(canvas, o) {
  let gl, mapProg, sprProg, mapU, sprU, tAtlas, tMap, tAvg, tPal, bufPos = [], bufWord, vaos = [], cur = 0, n = 0;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (vs, fs, names) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; for (const k of names) u[k] = gl.getUniformLocation(p, k); return [p, u]; };
  const tex = (unit, internal, w, h, format, type, data, filter) => { const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (w === 0) gl.texImage2D(gl.TEXTURE_2D, 0, internal, format, type, data);
    else gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data);
    return t; };

  function init() {
    gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: true, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 unavailable');
    [mapProg, mapU] = prog(FULLSCREEN_VS, MAP_FS, ['uMap', 'uAtlas', 'uTileAvg', 'uCam', 'uZoom', 'uViewH', 'uCols', 'uMask', 'uLod', 'uTime', 'uAmbient']);
    [sprProg, sprU] = prog(SPRITE_VS, SPRITE_FS, ['uCam', 'uZoom', 'uView', 'uAlpha', 'uTime', 'uPass', 'uCols', 'uCharOrigin', 'uEmoteOrigin', 'uWorldH', 'uDotPx', 'uPalette', 'uAtlas', 'uAmbient']);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    tAtlas = tex(0, gl.RGBA8, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, o.atlas, gl.NEAREST);
    tMap = tex(1, gl.RGBA16UI, o.mapW, o.mapH, gl.RGBA_INTEGER, gl.UNSIGNED_SHORT, o.map, gl.NEAREST);
    tAvg = tex(2, gl.RGBA8, o.mapW, o.mapH, gl.RGBA, gl.UNSIGNED_BYTE, o.tileAvg, gl.LINEAR);
    tPal = tex(3, gl.RGBA8, o.palette.length / 4, 1, gl.RGBA, gl.UNSIGNED_BYTE, o.palette, gl.NEAREST);
    bufPos = [0, 1].map(() => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, o.maxAgents * 8, gl.DYNAMIC_DRAW); return b; });
    bufWord = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bufWord); gl.bufferData(gl.ARRAY_BUFFER, o.maxAgents * 4, gl.DYNAMIC_DRAW);
    vaos = [0, 1].map(k => { const v = gl.createVertexArray(); gl.bindVertexArray(v);     // vao k: prev = buf[k^1], cur = buf[k]
      gl.bindBuffer(gl.ARRAY_BUFFER, bufPos[k ^ 1]); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(0, 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufPos[k]); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(1, 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufWord); gl.enableVertexAttribArray(2); gl.vertexAttribIPointer(2, 1, gl.UNSIGNED_INT, 0, 0); gl.vertexAttribDivisor(2, 1);
      return v; });
    gl.bindVertexArray(null);
  }
  canvas.addEventListener('webglcontextlost', e => e.preventDefault());
  canvas.addEventListener('webglcontextrestored', () => { init(); n = 0; });
  init();

  return {
    /** Call once per sim tick: xy = interleaved world-pixel feet positions, words = packed outfit|facing<<8|emote<<11. */
    pushSnapshot(xy, words, count) {
      if (gl.isContextLost()) return;
      cur ^= 1; n = count;
      gl.bindBuffer(gl.ARRAY_BUFFER, bufPos[cur]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, xy, 0, count * 2);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufWord); gl.bufferSubData(gl.ARRAY_BUFFER, 0, words, 0, count);
    },
    /** Call every animation frame. cam = world px at the top-left; zoom = device px per texel; alpha in [0,1]. */
    draw(camX, camY, zoom, alpha, time, ambient) {
      if (gl.isContextLost()) return;
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, lod = zoom < 0.5 ? 1 : 0;
      gl.viewport(0, 0, W, H); gl.disable(gl.BLEND); gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(mapProg);
      gl.uniform1i(mapU.uAtlas, 0); gl.uniform1i(mapU.uMap, 1); gl.uniform1i(mapU.uTileAvg, 2);
      gl.uniform2f(mapU.uCam, camX, camY); gl.uniform1f(mapU.uZoom, zoom); gl.uniform1f(mapU.uViewH, H);
      gl.uniform1i(mapU.uCols, o.atlasCols); gl.uniform1i(mapU.uLod, lod); gl.uniform1f(mapU.uTime, time); gl.uniform3fv(mapU.uAmbient, ambient);
      gl.disable(gl.DEPTH_TEST); gl.uniform1i(mapU.uMask, 3); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.useProgram(sprProg); gl.bindVertexArray(vaos[cur]);
      gl.uniform2f(sprU.uCam, camX, camY); gl.uniform1f(sprU.uZoom, zoom); gl.uniform2f(sprU.uView, W, H);
      gl.uniform1f(sprU.uAlpha, alpha); gl.uniform1f(sprU.uTime, time); gl.uniform1i(sprU.uCols, o.charCols);
      gl.uniform2fv(sprU.uCharOrigin, o.charOrigin); gl.uniform2fv(sprU.uEmoteOrigin, o.emoteOrigin);
      gl.uniform1f(sprU.uWorldH, o.mapH * TILE); gl.uniform1f(sprU.uDotPx, 3); gl.uniform1i(sprU.uPalette, 3);
      gl.uniform1i(sprU.uAtlas, 0); gl.uniform3fv(sprU.uAmbient, ambient);
      if (zoom < 1) { gl.uniform1i(sprU.uPass, 2); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n); }
      else {
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true);
        gl.uniform1i(sprU.uPass, 0); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(mapProg); gl.uniform1i(mapU.uMask, 4); gl.drawArrays(gl.TRIANGLES, 0, 3);   // roofs/tree tops over people
        gl.useProgram(sprProg); gl.uniform1i(sprU.uPass, 1); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
      }
      gl.bindVertexArray(null);
    },
    resize(cssW, cssH, dpr) { canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr); },
    dispose() { gl.getExtension('WEBGL_lose_context')?.loseContext(); },
  };
}

/** Render-side helper run once per tick: keeps last facing for idle agents (hysteresis-free minimal version). */
export function packWords(prevXY, curXY, outfit, emote, lastFacing, out, count) {
  for (let i = 0; i < count; i++) {
    const dx = curXY[2 * i] - prevXY[2 * i], dy = curXY[2 * i + 1] - prevXY[2 * i + 1];
    if (dx * dx + dy * dy > 0.0025) lastFacing[i] = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : (dy > 0 ? 0 : 3);
    out[i] = outfit[i] | (lastFacing[i] << 8) | (emote[i] << 11);
  }
}
