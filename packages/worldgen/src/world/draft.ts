import type { Country } from '../countries/countries.ts';
import type { Regions } from '../regions/regions.ts';
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

// world.py's World, as generateWorld builds it before packing it as a WorldMap.
export interface Draft extends FeatureWorld {
  template: number;
  wind: number;
  cold: number;
  roadClass: Uint8Array;
  lanes: number[][];
  wonders: Spot[];
  landmarks: Spot[];
  country: Uint8Array;
  countries: Country[];
  zones: Regions;
}
