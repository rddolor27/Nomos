// Country mode: aggregate settlements (SoA) with a simple migration/crime model and instanced squares (lazy chunk).
import { program, type Dots } from '../gl/dots';
const VS = `#version 300 es
layout(location=0) in vec2 pos; layout(location=1) in float pop; layout(location=2) in float crime; uniform vec4 cam; out vec3 col;
void main(){ vec2 n = (pos - cam.xy) / cam.zw; gl_Position = vec4(n.x*2.-1., 1.-n.y*2., 0., 1.); gl_PointSize = 2. + sqrt(pop) * .05; col = mix(vec3(.9,.85,.6), vec3(.9,.2,.2), clamp(crime*10.,0.,1.)); }`;
const FS = `#version 300 es
precision mediump float; in vec3 col; out vec4 o; void main(){ o = vec4(col, 1.); }`;
export function createCountry(dots: Dots, n = 10000) {
  const gl = dots.gl; let s = 3; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const x = new Float32Array(n), y = new Float32Array(n), pop = new Float32Array(n), crime = new Float32Array(n), wealth = new Float32Array(n), food = new Float32Array(n);
  const link = new Uint32Array(n * 3);
  for (let i = 0; i < n; i++) { x[i] = rnd() * 4096; y[i] = rnd() * 4096; pop[i] = 50 + rnd() * rnd() * 20000; crime[i] = rnd() * 0.05; wealth[i] = rnd(); food[i] = rnd(); for (let k = 0; k < 3; k++) link[i * 3 + k] = (rnd() * n) | 0; }
  const prog = program(gl, VS, FS); const vao = gl.createVertexArray()!; gl.bindVertexArray(vao);
  const bufs = [x, y, pop, crime].map(() => gl.createBuffer()!); const inter = new Float32Array(n * 2);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufs[0]); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufs[2]); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufs[3]); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
  return {
    step() { for (let i = 0; i < n; i++) { const j = link[i * 3 + (i & 1)]; const dw = (wealth[j] - wealth[i]) * 0.01; const mig = pop[i] * Math.max(0, dw) * 0.1; pop[i] -= mig; pop[j] += mig;
      crime[i] += ((1 - wealth[i]) * 0.001 - crime[i] * 0.01); food[i] = Math.min(1, food[i] + 0.01 - pop[i] * 1e-6); } },
    draw() { for (let i = 0; i < n; i++) { inter[2 * i] = x[i]; inter[2 * i + 1] = y[i]; } gl.bindBuffer(gl.ARRAY_BUFFER, bufs[0]); gl.bufferData(gl.ARRAY_BUFFER, inter, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufs[2]); gl.bufferData(gl.ARRAY_BUFFER, pop, gl.DYNAMIC_DRAW); gl.bindBuffer(gl.ARRAY_BUFFER, bufs[3]); gl.bufferData(gl.ARRAY_BUFFER, crime, gl.DYNAMIC_DRAW);
      gl.useProgram(prog); gl.uniform4f(gl.getUniformLocation(prog, 'cam'), 0, 0, 4096, 4096); gl.bindVertexArray(vao); gl.drawArrays(gl.POINTS, 0, n); gl.bindVertexArray(null); },
  };
}
