import { SNAPSHOT_BYTES, type MapV1 } from '@nomos/sim-protocol';
import { minimapPixels } from './minimap.ts';
import type { RendererOptions, WorldRenderer } from './types.ts';
import { closeGl, drawGl, openGl, uploadMinimap, uploadSnapshot, type Gl } from './webgl.ts';

interface RendererState {
  readonly options: RendererOptions;
  gl: Gl | null;
  // Retained beyond any GL object, so a lost context can be rebuilt from them.
  map: MapV1 | null;
  minimap: Uint8Array | null;
  // The last two snapshots, one per slot: slot holds the current one, with count agents.
  copies: Uint8Array[];
  slot: number;
  count: number;
  drawn: number;
}

// Room doubles, so births regrow the copies and buffers only now and then.
function grow(state: RendererState, agents: number): void {
  const bytes = Math.max(agents, (state.copies[0].length / SNAPSHOT_BYTES) * 2) * SNAPSHOT_BYTES;
  state.copies = state.copies.map((old) => {
    const copy = new Uint8Array(bytes);
    copy.set(old);
    return copy;
  });
}

function upload(state: RendererState): void {
  if (state.gl) uploadSnapshot(state.gl, state.slot, state.copies[state.slot], state.copies[state.slot ^ 1], state.count);
}

export function createWorldRenderer(canvas: HTMLCanvasElement, options: RendererOptions): WorldRenderer {
  const state: RendererState = {
    options,
    gl: null,
    map: null,
    minimap: null,
    copies: [new Uint8Array(0), new Uint8Array(0)],
    slot: 0,
    count: 0,
    drawn: 0,
  };

  return {
    backend: 'webgl2',
    get drawnAgents() {
      return state.drawn;
    },
    init() {
      const gl = openGl(canvas);
      if (!gl) throw new Error('WebGL2 is unavailable');
      state.gl = gl;
      if (state.map && state.minimap) uploadMinimap(gl, state.map.width, state.map.height, state.minimap);
      upload(state);
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
    // A hidden tab draws nothing, so the buffer goes back now, not on draw, or the worker's pool runs dry.
    pushSnapshot(frame) {
      const bytes = frame.count * SNAPSHOT_BYTES;
      if (bytes > state.copies[0].length) grow(state, frame.count);
      state.slot ^= 1;
      // One small view per snapshot, made outside any frame, as the worker's pool makes one per return.
      state.copies[state.slot].set(new Uint8Array(frame.buffer, 0, bytes));
      state.count = frame.count;
      upload(state);
      state.options.release(frame.buffer);
    },
    draw(camera, alpha) {
      if (!state.gl || canvas.width === 0 || canvas.height === 0) return;
      state.drawn = drawGl(state.gl, camera, alpha, state.slot, state.count);
    },
    dispose() {
      if (state.gl) closeGl(state.gl);
      state.gl = null;
    },
  };
}
