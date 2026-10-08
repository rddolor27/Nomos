import type { MapV1 } from '@nomos/sim-protocol';

export type Backend = 'webgl2' | 'canvas2d';

// x and y are the world pixel at the view's top-left; zoom is whole device pixels per texel.
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface RendererOptions {
  release(buffer: ArrayBuffer): void;
}

export interface WorldRenderer {
  readonly backend: Backend;
  init(): Backend;
  resize(deviceWidth: number, deviceHeight: number, dpr: number): void;
  setMap(map: MapV1): void;
  draw(camera: Camera, alpha: number): void;
  dispose(): void;
}
