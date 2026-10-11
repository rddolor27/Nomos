// What a site is. A blob goes to a premises to buy and to a leisure site for its own sake (M3.2), and every site has a flow field
// of its own, so a way to any of them is one pathRuns. 0 marks an empty slot in the errand store.
export const NO_SITE = 0;
export const SITE_SHOP = 1;
export const SITE_PLAZA = 2;
export const SITE_GREEN = 3;
export const SITE_WATER = 4;

// A site of a town's map as sim-core sees it, so that sim-core never imports sim-protocol (M2.7): the worker hands over what
// premisesOf and leisureOf find, the premises first. Doors are in tiles, and a leisure site's is the tile its field floods from.
export interface ShopSite {
  readonly doorX: number;
  readonly doorY: number;
  // Bit g is set when the premises sells good g, from BREAD (1) to FUEL (7). A leisure site sells nothing.
  readonly goods: number;
  // A market stall, whose keeper stands at its counter instead of going indoors.
  readonly stall: boolean;
  // SITE_SHOP when left out.
  readonly kind?: number;
}

// Like the ground and the homes, the shops are an input: they stay out of the arena and the hash, and a town that makes streets
// copies what it needs into the arena (street/open.ts). The first `premises` of the `count` sites are premises.
export interface Shops {
  readonly count: number;
  readonly premises: number;
  readonly doorX: Int32Array;
  readonly doorY: Int32Array;
  readonly goods: Uint8Array;
  readonly stall: Uint8Array;
  readonly kind: Uint8Array;
}

// The premises of `sites`, which must come first: a premises keeps its index whatever leisure sites follow, and a firm row's
// premises is that index.
function premisesIn(sites: readonly ShopSite[]): number {
  let premises = 0;
  for (let p = 0; p < sites.length; p++) {
    if ((sites[p].kind ?? SITE_SHOP) !== SITE_SHOP) continue;
    if (premises < p) throw new RangeError(`site ${p} is a premises that follows a leisure site: the premises come first`);
    premises++;
  }
  return premises;
}

export function createShops(sites: readonly ShopSite[]): Shops {
  const shops: Shops = {
    count: sites.length,
    premises: premisesIn(sites),
    doorX: new Int32Array(sites.length),
    doorY: new Int32Array(sites.length),
    goods: new Uint8Array(sites.length),
    stall: new Uint8Array(sites.length),
    kind: new Uint8Array(sites.length),
  };
  for (let p = 0; p < sites.length; p++) {
    shops.doorX[p] = sites[p].doorX;
    shops.doorY[p] = sites[p].doorY;
    shops.goods[p] = sites[p].goods;
    shops.stall[p] = sites[p].stall ? 1 : 0;
    shops.kind[p] = sites[p].kind ?? SITE_SHOP;
  }
  return shops;
}

// A town with no premises, such as a hamlet or a stand-in: it keeps wandering.
export const NO_SHOPS: Shops = createShops([]);
