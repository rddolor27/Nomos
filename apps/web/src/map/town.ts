import type { PlaceContext } from '@nomos/worldgen';

// The starting town, Highcourt, pinned field for field as tools/worldgen/export_map.py pins it to export town.nmap, so
// the Town skin draws the ground the sim walks on. test/town.test.ts holds both to that.
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
