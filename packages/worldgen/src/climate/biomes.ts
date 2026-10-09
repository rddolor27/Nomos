import { BIOME_NAMES } from '@nomos/sim-protocol/world-map';

export const OCEAN = BIOME_NAMES.indexOf('ocean');
export const LAKE = BIOME_NAMES.indexOf('lake');
export const GRASSLAND = BIOME_NAMES.indexOf('grassland');
export const FARMLAND = BIOME_NAMES.indexOf('farmland');
export const DECIDUOUS = BIOME_NAMES.indexOf('forest-deciduous');
export const CONIFER = BIOME_NAMES.indexOf('forest-conifer');
export const MARSH = BIOME_NAMES.indexOf('marsh');
export const SAND = BIOME_NAMES.indexOf('sand');
export const HILLS = BIOME_NAMES.indexOf('hills');
export const MOUNTAIN = BIOME_NAMES.indexOf('mountain');
export const PEAK = BIOME_NAMES.indexOf('peak');
export const SNOW = BIOME_NAMES.indexOf('snow');

export const INLAND = 0;
export const BEACH = 1;
export const CLIFFS = 2;

export const HILLS_AT = 380;
export const MOUNTAIN_AT = 500;
export const PEAK_AT = 700;
// Round 9's threshold for cold lowland: high cold ground stays hills, mountain or peak.
export const SNOW_BELOW = 40;
export const CLIFF_AT = 100;
export const BEACH_BELOW = 70;
export const MARSH_BELOW = 140;
