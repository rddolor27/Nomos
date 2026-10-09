import type { MapV1 } from '@nomos/sim-protocol';
import type { Skin } from '../skins/skin.ts';

export type Backend = 'webgl2' | 'canvas2d';

// x and y are the world pixel at the view's top-left; zoom is whole device pixels per texel.
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface RendererOptions {
  release(buffer: ArrayBuffer): void;
  // 'canvas2d' skips WebGL2, as M0.5's ?canvas asks; 'auto' is the default.
  backend?: 'auto' | 'canvas2d';
  // How long a lost WebGL2 context may stay lost before Canvas2D takes over; 3,000 ms by default.
  restoreTimeoutMs?: number;
}

export interface WorldRenderer {
  // The requested backend until init settles it, and the last one used after dispose.
  readonly backend: Backend;
  // The canvas drawn on, which the Canvas2D fallback replaces.
  readonly canvas: HTMLCanvasElement;
  readonly drawnAgents: number;
  // The skin the last draw showed.
  readonly drawnSkin: Skin;
  init(): Backend;
  // Fixes the canvas's CSS size at device / dpr, so callers observe the size of its container, never the canvas.
  resize(deviceWidth: number, deviceHeight: number, dpr: number): void;
  setMap(map: MapV1): void;
  // Copies the snapshot and hands the buffer to options.release before returning (interfaces.md).
  pushSnapshot(frame: { tick: number; count: number; buffer: ArrayBuffer }): void;
  draw(camera: Camera, alpha: number): void;
  // Returns the skin a fixed policy draws for it: dots until the others are built.
  setSkin(skin: Skin): Skin;
  // 'auto', the default, picks dots or town each draw from the tile's CSS size and the agents in view (R3); 'fixed'
  // draws the set skin.
  setLod(policy: 'auto' | 'fixed'): void;
  // Lends the Town skin, which loads after the first frame; until then a draw that picks the town draws dots. The
  // renderer never disposes it.
  setTown(town: TownPainter): void;
  dispose(): void;
}

// What the renderer lends the town each draw: the skin it picked, the snapshots it keeps, and the view's device size.
export interface TownView {
  readonly drawnSkin: Skin;
  readonly retained: Retained;
  readonly canvas: HTMLCanvasElement;
  readonly dpr: number;
}

// The Town skin, drawn on a canvas of its own over the dots' canvas. For the town it draws and returns the agents
// drawn; for any other skin it hides its canvas and returns undefined, and the dots draw instead. Its code loads after
// the first frame, so the renderer chunk holds only this hook.
export interface TownPainter {
  draw(camera: Camera, alpha: number, view: TownView): number | undefined;
}

// What the renderer keeps beyond any backend: both backends paint it, and a restored context is rebuilt from it.
export interface Retained {
  map: MapV1 | null;
  minimap: Uint8Array | null;
  // The last two snapshots, one per slot, with float and word views of each; slot holds the current one.
  copies: Uint8Array[];
  floats: Float32Array[];
  words: Uint32Array[];
  slot: number;
  count: number;
}

// One backend behind WorldRenderer. draw returns the agents it drew.
export interface Painter {
  mapChanged(): void;
  snapshotPushed(): void;
  draw(camera: Camera, alpha: number): number;
  dispose(): void;
}
