export interface Cam { x: number; y: number; w: number; h: number }
function sh(gl: WebGL2RenderingContext, type: number, src: string) { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; }
export function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!; gl.attachShader(p, sh(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
  return p;
}
const BG_VS = `#version 300 es
out vec2 uv; void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); uv = p; gl_Position = vec4(p*2.0-1.0,0.,1.); }`;
const BG_FS = `#version 300 es
precision highp float; precision highp usampler2D; in vec2 uv; uniform usampler2D grid; uniform vec4 cam; uniform vec2 world; out vec4 o;
const vec3 pal[6] = vec3[6](vec3(0.), vec3(.24,.52,.26), vec3(.55,.55,.52), vec3(.52,.32,.24), vec3(.2,.38,.7), vec3(.7,.62,.4));
void main(){ vec2 w = vec2(uv.x, 1.-uv.y) * cam.zw + cam.xy; ivec2 c = ivec2(floor(w / 16.));
  if (any(lessThan(c, ivec2(0))) || any(greaterThanEqual(c, ivec2(world)))) { o = vec4(0.,0.,0.,1.); return; }
  uint v = texelFetch(grid, c, 0).r; o = vec4(pal[min(v, 5u)], 1.); }`;
const PT_VS = `#version 300 es
layout(location=0) in vec2 pos; layout(location=1) in uint kind; uniform vec4 cam; uniform float psize; flat out uint k;
void main(){ vec2 n = (pos - cam.xy) / cam.zw; gl_Position = vec4(n.x*2.-1., 1.-n.y*2., 0., 1.); gl_PointSize = psize; k = kind; }`;
const PT_FS = `#version 300 es
precision mediump float; flat in uint k; out vec4 o; const vec3 col[4] = vec3[4](vec3(.97), vec3(.91,.71,.14), vec3(.23,.44,.85), vec3(.85,.23,.23));
void main(){ vec2 d = gl_PointCoord - .5; if (dot(d,d) > .25) discard; o = vec4(col[min(k,3u)], 1.); }`;
export function createDots(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' })!;
  const bg = program(gl, BG_VS, BG_FS), pt = program(gl, PT_VS, PT_FS);
  const vao = gl.createVertexArray()!; gl.bindVertexArray(vao);
  const posBuf = gl.createBuffer()!, kindBuf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, kindBuf); gl.enableVertexAttribArray(1); gl.vertexAttribIPointer(1, 1, gl.UNSIGNED_BYTE, 0, 0);
  gl.bindVertexArray(null);
  const gridTex = gl.createTexture()!; let world = [1, 1]; let count = 0;
  const u = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);
  const cam: Cam = { x: 0, y: 0, w: 4096, h: 4096 };
  return {
    gl, cam,
    setGrid(g: Uint8Array, w: number, h: number) {
      world = [w, h]; gl.bindTexture(gl.TEXTURE_2D, gridTex); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8UI, w, h, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, g);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      cam.w = w * 16; cam.h = h * 16;
    },
    upload(p: Float32Array, k: Uint8Array) {
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, p, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, kindBuf); gl.bufferData(gl.ARRAY_BUFFER, k, gl.DYNAMIC_DRAW); count = k.length;
    },
    draw() {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.useProgram(bg); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, gridTex); gl.uniform1i(u(bg, 'grid'), 0);
      gl.uniform4f(u(bg, 'cam'), cam.x, cam.y, cam.w, cam.h); gl.uniform2f(u(bg, 'world'), world[0], world[1]); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.useProgram(pt); gl.uniform4f(u(pt, 'cam'), cam.x, cam.y, cam.w, cam.h); gl.uniform1f(u(pt, 'psize'), Math.max(2, (gl.drawingBufferWidth / cam.w) * 8));
      gl.bindVertexArray(vao); gl.drawArrays(gl.POINTS, 0, count); gl.bindVertexArray(null);
    },
  };
}
export type Dots = ReturnType<typeof createDots>;
