// Town skin: tile layers + agent sprites from one 2048x2048 atlas of 16x16 tiles (lazy chunk).
import { program, type Dots } from '../gl/dots';
const VS = `#version 300 es
layout(location=0) in vec2 corner; layout(location=1) in vec2 pos; layout(location=2) in uint tile; uniform vec4 cam; flat out uint t; out vec2 c;
void main(){ vec2 p = pos + corner * 16.; vec2 n = (p - cam.xy) / cam.zw; gl_Position = vec4(n.x*2.-1., 1.-n.y*2., 0., 1.); t = tile; c = corner; }`;
const FS = `#version 300 es
precision mediump float; uniform sampler2D atlas; flat in uint t; in vec2 c; out vec4 o;
void main(){ uint id = t & 16383u; vec2 cc = c; if ((t & 16384u) != 0u) cc.x = 1. - cc.x; ivec2 tc = ivec2(int(id % 128u) * 16 + int(cc.x * 15.99), int(id / 128u) * 16 + int(cc.y * 15.99));
  vec4 s = texelFetch(atlas, tc, 0); if (s.a < .5) discard; o = s; }`;
export async function loadTown(dots: Dots, atlasUrl: string, mark: (n: string) => void) {
  const gl = dots.gl; const res = await fetch(atlasUrl); const blob = await res.blob(); mark('atlas:fetched');
  const bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }); mark('atlas:decoded');
  const tex = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, tex); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, bmp.width, bmp.height);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, bmp); bmp.close();
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.getError(); mark('atlas:uploaded');
  const prog = program(gl, VS, FS); const vao = gl.createVertexArray()!; gl.bindVertexArray(vao);
  const quad = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const posBuf = gl.createBuffer()!, tileBuf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(1, 1);
  gl.bindBuffer(gl.ARRAY_BUFFER, tileBuf); gl.enableVertexAttribArray(2); gl.vertexAttribIPointer(2, 1, gl.UNSIGNED_SHORT, 0, 0); gl.vertexAttribDivisor(2, 1);
  gl.bindVertexArray(null);
  let mapCount = 0; let mapPos: Float32Array, mapTile: Uint16Array; let total = 0;
  return {
    setMap(layers: Uint16Array[], W: number) {
      const n = layers.reduce((a, l) => a + l.reduce((c, v) => c + (v !== 0xffff ? 1 : 0), 0), 0); mapPos = new Float32Array(n * 2); mapTile = new Uint16Array(n); let j = 0;
      for (const l of layers) for (let c = 0; c < l.length; c++) if (l[c] !== 0xffff) { mapPos[2 * j] = (c % W) * 16; mapPos[2 * j + 1] = ((c / W) | 0) * 16; mapTile[j++] = l[c]; }
      mapCount = n;
    },
    upload(p: Float32Array, k: Uint8Array) {
      const n = k.length; total = mapCount + n; const pos = new Float32Array(total * 2); pos.set(mapPos); const tl = new Uint16Array(total); tl.set(mapTile);
      for (let i = 0; i < n; i++) { pos[2 * (mapCount + i)] = p[2 * i] - 8; pos[2 * (mapCount + i) + 1] = p[2 * i + 1] - 8; tl[mapCount + i] = 1024 + k[i] * 4; }
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW); gl.bindBuffer(gl.ARRAY_BUFFER, tileBuf); gl.bufferData(gl.ARRAY_BUFFER, tl, gl.DYNAMIC_DRAW);
    },
    draw() {
      const c = dots.cam; gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(gl.getUniformLocation(prog, 'atlas'), 0);
      gl.uniform4f(gl.getUniformLocation(prog, 'cam'), c.x, c.y, c.w, c.h); gl.bindVertexArray(vao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, total); gl.bindVertexArray(null);
    },
  };
}
