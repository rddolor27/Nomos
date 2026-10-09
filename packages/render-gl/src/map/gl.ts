// The map scene's own copies of backends/webgl.ts's helpers. Importing those would make the renderer chunk export them,
// and the town's first load has no bytes to spare (M8.3, Ruling 1).

function compile(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('WebGL2 could not create a shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

export function link(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    const logs = [gl.getShaderInfoLog(vertex), gl.getShaderInfoLog(fragment), gl.getProgramInfoLog(program)];
    throw new Error(`the map shaders did not link: ${logs.filter(Boolean).join(' ')}`);
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  return program;
}

// Bound to the active unit. Integer textures need nearest filtering, and the default minifying filter wants mipmaps.
export function nearestTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return texture;
}
