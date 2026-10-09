// The map's walkability in tiles, row-major from the top-left; a cell is walkable when its walk value is nonzero. A
// MapV1 is a Ground, so sim-core never imports sim-protocol. It is an input, not state: it stays out of the arena and
// the hash, and a restore takes it again.
export interface Ground {
  readonly width: number;
  readonly height: number;
  readonly walk: Uint8Array;
}

const STAND_IN_TILES = 256;
// TILE_PX * SUBPIXELS = 2^12, so a shift turns a Q8 coordinate into its tile.
const TILE_SHIFT = 12;
const IN_TILE_MASK = (1 << TILE_SHIFT) - 1;

// The all-open square that runs when no map is given, such as in the CLI.
export function standInGround(): Ground {
  return {
    width: STAND_IN_TILES,
    height: STAND_IN_TILES,
    walk: new Uint8Array(STAND_IN_TILES * STAND_IN_TILES).fill(1),
  };
}

export function tileOf(q8: number): number {
  return q8 >> TILE_SHIFT;
}

// A point in the tile, its Q8 offset taken from 12 bits of a keyed draw, so blobs sharing a tile don't stack.
export function pointInTileQ8(tile: number, bits: number): number {
  return (tile << TILE_SHIFT) + (bits & IN_TILE_MASK);
}

export function walkableAt(ground: Ground, xQ8: number, yQ8: number): boolean {
  const tx = tileOf(xQ8);
  const ty = tileOf(yQ8);
  return tx >= 0 && ty >= 0 && tx < ground.width && ty < ground.height && ground.walk[ty * ground.width + tx] !== 0;
}

export function walkableTiles(ground: Ground): number {
  const walk = ground.walk;
  let open = 0;
  for (let cell = 0; cell < walk.length; cell++) if (walk[cell] !== 0) open++;
  return open;
}

export function openCells(ground: Ground): Int32Array {
  const walk = ground.walk;
  const cells = new Int32Array(walkableTiles(ground));
  let n = 0;
  for (let cell = 0; cell < walk.length; cell++) if (walk[cell] !== 0) cells[n++] = cell;
  return cells;
}
