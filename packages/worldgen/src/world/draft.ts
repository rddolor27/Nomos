import type { Settlement } from '../settle/settle.ts';

export interface Spot {
  kind: number;
  x: number;
  y: number;
}

// What features.py reads of world.py's World.
export interface FeatureWorld {
  seed: number;
  width: number;
  height: number;
  elevation: Int32Array;
  biome: Uint8Array;
  temperature: Uint8Array;
  moisture: Uint8Array;
  river: Uint8Array;
  receiver: Int32Array;
  coast: Uint8Array;
  settlements: Settlement[];
  roads: number[][];
  bridges: number[];
}
