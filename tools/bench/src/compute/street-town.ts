import {
  TIER_AGENTS,
  createShops,
  createStandInTownHomes,
  createTown,
  type Ground,
  type ShopSite,
  type Tier,
  type World,
} from '@nomos/sim-core';
import { EVERY_GOOD } from '@nomos/sim-protocol';

// A capital's district, the largest ground a layout's fields hold. It is all open, since the gate wants blobs on the street and
// not a map to read, and Highcourt's own would move the gate whenever worldgen did.
const WIDTH = 176;
const HEIGHT = 112;

// Three shops that sell every good, one of them a stall, so the firm rows trade from all three and a keeper stands at the stall.
const SITES: readonly ShopSite[] = [
  { doorX: 44, doorY: 28, goods: EVERY_GOOD, stall: false },
  { doorX: 88, doorY: 56, goods: EVERY_GOOD, stall: false },
  { doorX: 132, doorY: 84, goods: EVERY_GOOD, stall: true },
];

// A town of the tier's whole crowd in stand-in homes, whose blobs walk to work and to those shops (M2.7).
export function createStreetTown(seed: number, tier: Tier): World {
  const ground: Ground = { width: WIDTH, height: HEIGHT, walk: new Uint8Array(WIDTH * HEIGHT).fill(1) };
  return createTown(seed, tier, ground, createStandInTownHomes(ground, TIER_AGENTS[tier]), createShops(SITES));
}
