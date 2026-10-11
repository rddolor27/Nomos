// Free of Node imports, like checks.ts, which replays this town in Node and the browser.
import { BREAD, CLOTH, FISH, FUEL, MILK, TOOLS, VEGETABLES } from '../../src/goods/goods.ts';
import type { Tier } from '../../src/memory/tiers.ts';
import { createStandInTownHomes } from '../../src/spawn/homes.ts';
import { createTown } from '../../src/spawn/town.ts';
import { SITE_GREEN, SITE_PLAZA, createShops, type Shops } from '../../src/street/shops.ts';
import type { Ground } from '../../src/world/ground.ts';
import type { World } from '../../src/world/world.ts';

// The streets golden stands on a ground made here and never on a map, so no worldgen change can move its hash. Blocks of building
// 4 tiles square lie 8 tiles apart with streets 4 wide between them, so most ways need several runs. It is well inside the 176 x
// 112 tiles a layout's fields hold.
const WIDTH = 72;
const HEIGHT = 48;
const BLOCK_PERIOD = 8;
const BLOCK_FIRST = 2;
const BLOCK_LAST = 5;

function inBlock(x: number, y: number): boolean {
  const inX = x % BLOCK_PERIOD;
  const inY = y % BLOCK_PERIOD;
  return inX >= BLOCK_FIRST && inX <= BLOCK_LAST && inY >= BLOCK_FIRST && inY <= BLOCK_LAST;
}

export function streetGround(): Ground {
  const walk = new Uint8Array(WIDTH * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) walk[y * WIDTH + x] = inBlock(x, y) ? 0 : 1;
  }
  return { width: WIDTH, height: HEIGHT, walk };
}

function goodsOf(...goods: number[]): number {
  let mask = 0;
  for (const good of goods) mask |= 1 << good;
  return mask;
}

// A general shop that sells all seven goods, a shop of bread, cloth, tools and fuel, and a stall of vegetables, fish and milk. A
// door lies on the street just below a block, as a map's does, and the stall's keeper stands in the block above it, at the counter.
// Then a plaza on the crossing of two streets, 4 tiles square, and a green on a stretch of street 4 by 2, where blobs spend their
// free time (M3.2).
export function streetShops(): Shops {
  return createShops([
    { doorX: 35, doorY: 22, goods: goodsOf(BREAD, VEGETABLES, FISH, MILK, CLOTH, TOOLS, FUEL), stall: false },
    { doorX: 11, doorY: 38, goods: goodsOf(BREAD, CLOTH, TOOLS, FUEL), stall: false },
    { doorX: 59, doorY: 38, goods: goodsOf(VEGETABLES, FISH, MILK), stall: true },
    { doorX: 31, doorY: 31, goods: 0, stall: false, kind: SITE_PLAZA, x: 30, y: 30, w: 4, h: 4 },
    { doorX: 7, doorY: 14, goods: 0, stall: false, kind: SITE_GREEN, x: 6, y: 14, w: 4, h: 2 },
  ]);
}

// A town of `people` in stand-in homes along the streets, whose blobs walk to the three shops.
export function streetTown(seed: number, tier: Tier, people: number): World {
  const ground = streetGround();
  return createTown(seed, tier, ground, createStandInTownHomes(ground, people), streetShops());
}
