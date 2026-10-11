import type { PlaceContext } from './context.ts';

// Highcourt, the starting town and every world's place 0, pinned field for field as tools/worldgen/export_map.py pinned
// it to export town.nmap, so the ground the sim walks on and the art the Town skin draws stay the same town.
export const TOWN: PlaceContext = {
  seed: 0xc0ffee42,
  name: 'Highcourt',
  biome: 'grassland',
  temperature: 140,
  moisture: 140,
  tier: 'capital',
  population: 52000,
  sea: '',
  coast: '',
  river: 'ns',
  roads: 'new',
  farmland: '',
  landmarks: ['clock-tower', 'library', 'fountain'],
  wonder: null,
};
