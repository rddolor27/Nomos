// Q8 beats Q16 because it converts to float32 exactly up to 65,536 px, against 256 px (2^24 / 256 and 2^24 / 65,536).
export const SUBPIXELS = 256;
export const TILE_PX = 16;
// 8-tile cells: 8 * TILE_PX * SUBPIXELS = 2^15.
export const CELL_SHIFT = 15;

export function cellOf(q8: number): number {
  return q8 >> CELL_SHIFT;
}
