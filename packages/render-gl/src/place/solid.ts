import { OUTLINE } from '../map/colours.ts';

// A solid quad is a sprite instance whose atlas x is SOLID_X. Where a sprite would sample the atlas, both painters fill the quad with
// the colour its atlas y names in SOLID_COLOURS, so a mark of the UI needs no art and keeps the one instanced draw and the sprites' order.
export const SOLID_X = -1;
export const SOLID_DARK = 0;
export const SOLID_LIGHT = 1;
// The sprite palette's OUTLINE, which the place's background is, and its CREAM.
export const SOLID_COLOURS: readonly number[] = [OUTLINE, 0xf6f0de];
