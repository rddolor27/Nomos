// Minimal WebGL2 instanced-dot renderer (round point sprites via instanced quads), for size comparison.
const VS = `#version 300 es
layout(location=0) in vec2 corner; layout(location=1) in vec2 pos; layout(location=2) in vec4 col;
uniform vec2 uScale; uniform float uSize; out vec2 vUV; out vec4 vCol;
void main(){ vUV = corner; vCol = col; vec2 p = pos + corner * uSize; gl_Position = vec4(p * uScale - 1.0, 0.0, 1.0); gl_Position.y = -gl_Position.y; }`;
const FS = `#version 300 es
precision mediump float; in vec2 vUV; in vec4 vCol; out vec4 o;
void main(){ float d = length(vUV); if (d > 1.0) discard; float a = 1.0 - smoothstep(0.85, 1.0, d); o = vec4(vCol.rgb * a, vCol.a * a); }`;
export function createDots(canvas, maxDots) {
  let gl, prog, posBuf, colBuf, uScale, uSize, vao;
  function sh(t, s){ const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if(!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; }
  function init(){
    gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    uScale = gl.getUniformLocation(prog, 'uScale'); uSize = gl.getUniformLocation(prog, 'uSize');
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const q = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, q); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    posBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, maxDots * 8, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(1, 1);
    colBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, colBuf); gl.bufferData(gl.ARRAY_BUFFER, maxDots * 4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 0, 0); gl.vertexAttribDivisor(2, 1);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  canvas.addEventListener('webglcontextlost', e => e.preventDefault());
  canvas.addEventListener('webglcontextrestored', init);
  init();
  return function draw(xy, rgba, n, worldW, worldH, size){
    if (gl.isContextLost()) return;
    gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0.05,0.06,0.08,1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog); gl.bindVertexArray(vao); gl.uniform2f(uScale, 2/worldW, 2/worldH); gl.uniform1f(uSize, size);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, xy, 0, n*2);
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, rgba, 0, n*4);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
  };
}
