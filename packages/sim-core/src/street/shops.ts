// A premises of a town's map as sim-core sees it, so that sim-core never imports sim-protocol (M2.7): the worker hands over what
// premisesOf finds. Doors are in tiles.
export interface ShopSite {
  readonly doorX: number;
  readonly doorY: number;
  // Bit g is set when the premises sells good g, from BREAD (1) to FUEL (7).
  readonly goods: number;
  // A market stall, whose keeper stands at its counter instead of going indoors.
  readonly stall: boolean;
}

// Like the ground and the homes, the shops are an input: they stay out of the arena and the hash, and a town that makes streets
// copies what it needs into the arena (street/open.ts).
export interface Shops {
  readonly count: number;
  readonly doorX: Int32Array;
  readonly doorY: Int32Array;
  readonly goods: Uint8Array;
  readonly stall: Uint8Array;
}

export function createShops(sites: readonly ShopSite[]): Shops {
  const shops: Shops = {
    count: sites.length,
    doorX: new Int32Array(sites.length),
    doorY: new Int32Array(sites.length),
    goods: new Uint8Array(sites.length),
    stall: new Uint8Array(sites.length),
  };
  for (let p = 0; p < sites.length; p++) {
    shops.doorX[p] = sites[p].doorX;
    shops.doorY[p] = sites[p].doorY;
    shops.goods[p] = sites[p].goods;
    shops.stall[p] = sites[p].stall ? 1 : 0;
  }
  return shops;
}

// A town with no premises, such as a hamlet or a stand-in: it keeps wandering.
export const NO_SHOPS: Shops = createShops([]);
