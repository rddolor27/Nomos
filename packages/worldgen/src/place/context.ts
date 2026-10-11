// The street plan a capital, city or town is dealt (M3.1 Part 4).
export type Style = 'rings' | 'winding' | 'grid';

// tools/worldgen/model.py's PlaceContext, field for field and in its order: what a zoomed-in place knows about its
// country cell. Sides are letters from 'nesw'. seed is the place's own, draw(world seed, PLACE, ...), so a place
// rebuilds identically on every visit. style is the port's own: only Highcourt sets it, to pin its street plan.
export interface PlaceContext {
  seed: number;
  name: string;
  biome: string;
  temperature: number;
  moisture: number;
  tier: string | null;
  population: number;
  sea: string;
  coast: string;
  river: string;
  roads: string;
  farmland: string;
  landmarks: string[];
  wonder: string | null;
  style?: Style;
}
