import type { MapV1 } from '@nomos/sim-protocol';
import { minimapPixels } from './minimap.ts';
import type { RendererOptions, WorldRenderer } from './types.ts';
import { closeGl, drawGl, openGl, uploadMinimap, type Gl } from './webgl.ts';

interface RendererState {
  readonly options: RendererOptions;
  gl: Gl | null;
  // Retained beyond any GL object, so a lost context can be rebuilt from them.
  map: MapV1 | null;
  minimap: Uint8Array | null;
}

export function createWorldRenderer(canvas: HTMLCanvasElement, options: RendererOptions): WorldRenderer {
  const state: RendererState = { options, gl: null, map: null, minimap: null };

  return {
    backend: 'webgl2',
    init() {
      const gl = openGl(canvas);
      if (!gl) throw new Error('WebGL2 is unavailable');
      state.gl = gl;
      if (state.map && state.minimap) uploadMinimap(gl, state.map.width, state.map.height, state.minimap);
      return 'webgl2';
    },
    // The CSS size is the device size over dpr, so a canvas never shows rescaled.
    resize(deviceWidth, deviceHeight, dpr) {
      canvas.width = deviceWidth;
      canvas.height = deviceHeight;
      canvas.style.width = `${deviceWidth / dpr}px`;
      canvas.style.height = `${deviceHeight / dpr}px`;
    },
    setMap(map) {
      state.map = map;
      state.minimap = minimapPixels(map);
      if (state.gl) uploadMinimap(state.gl, map.width, map.height, state.minimap);
    },
    draw(camera) {
      if (!state.gl || canvas.width === 0 || canvas.height === 0) return;
      drawGl(state.gl, camera, canvas.width, canvas.height);
    },
    dispose() {
      if (state.gl) closeGl(state.gl);
      state.gl = null;
    },
  };
}
