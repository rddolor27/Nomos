import { describe, expect, it } from 'vitest';
import { createStandInTownHomes } from '../src/spawn/homes.ts';
import { createTown } from '../src/spawn/town.ts';
import { step } from '../src/step/step.ts';
import { AT_DOOR, MAX_PREMISES, MAX_SITES } from '../src/street/fields.ts';
import { streetsFit } from '../src/street/open.ts';
import { NO_SITE, SITE_GREEN, SITE_PLAZA, SITE_SHOP, SITE_WATER, createShops, type ShopSite } from '../src/street/shops.ts';
import { stateHash } from '../src/world/checkpoint.ts';
import { STREETS, createWorld, currentTick } from '../src/world/world.ts';
import { streetGround } from './engines/street-town.ts';

const SEED = 7;
const PEOPLE = 200;
const EVERY_GOOD = 0xfe;

// Doors on the street ground's streets, which lie where a coordinate is 0, 1, 6 or 7 modulo 8.
const BAKERY: ShopSite = { doorX: 35, doorY: 22, goods: EVERY_GOOD, stall: false };
const STALL: ShopSite = { doorX: 59, doorY: 38, goods: EVERY_GOOD, stall: true };
const PLAZA: ShopSite = { doorX: 23, doorY: 31, goods: 0, stall: false, kind: SITE_PLAZA };
const GREEN: ShopSite = { doorX: 7, doorY: 14, goods: 0, stall: false, kind: SITE_GREEN };
const WATER: ShopSite = { doorX: 40, doorY: 1, goods: 0, stall: false, kind: SITE_WATER };

function townOf(sites: readonly ShopSite[]) {
  const ground = streetGround();
  const world = createTown(SEED, 'phone', ground, createStandInTownHomes(ground, PEOPLE), createShops(sites));
  world.checks = false;
  return world;
}

describe('the sites of a town', () => {
  it('give the premises their indexes, the leisure sites the fields after them, and the hash nothing to see', () => {
    const premisesOnly = townOf([BAKERY, STALL]);
    const world = townOf([BAKERY, STALL, PLAZA, GREEN, WATER]);
    const { errands, ground } = world;
    const cells = ground.width * ground.height;

    expect(Array.from(errands.siteKind.subarray(0, 6))).toEqual([SITE_SHOP, SITE_SHOP, SITE_PLAZA, SITE_GREEN, SITE_WATER, NO_SITE]);
    expect(Array.from(errands.siteX.subarray(0, 5))).toEqual([35, 59, 23, 7, 40]);
    expect(Array.from(errands.siteY.subarray(0, 5))).toEqual([22, 38, 31, 14, 1]);
    expect(Array.from(errands.shopStall.subarray(0, 2))).toEqual([0, 1]);
    for (let s = 0; s < 5; s++) {
      expect(world.fields[s * cells + errands.siteY[s] * ground.width + errands.siteX[s]], `site ${s}`).toBe(AT_DOOR);
    }
    // The first two fields are the premises-only town's, and no blob reads a site yet, so both towns hash and step alike.
    expect(world.fields.subarray(0, 2 * cells)).toEqual(premisesOnly.fields.subarray(0, 2 * cells));
    expect(stateHash(world)).toBe(stateHash(premisesOnly));
    while (currentTick(world) < 600) {
      step(world);
      step(premisesOnly);
    }
    expect(stateHash(world)).toBe(stateHash(premisesOnly));
  });

  it('refuse a premises behind a leisure site, a town of 33 sites, and open no streets for leisure sites alone', () => {
    expect(() => createShops([PLAZA, BAKERY])).toThrow(/site 1 is a premises that follows a leisure site/);

    const world = createWorld(SEED, 'phone', streetGround(), 10);
    const premises = (count: number): ShopSite[] => Array.from({ length: count }, (_, i) => ({ ...BAKERY, doorX: 8 * (i % 8) }));
    const water = (count: number, from: number): ShopSite[] => Array.from({ length: count }, (_, i) => ({ ...WATER, doorX: 8 * ((from + i) % 8) }));
    const ground = world.ground;
    expect(streetsFit(world, ground, createShops([...premises(MAX_PREMISES), ...water(MAX_SITES - MAX_PREMISES, 0)]))).toBe(true);
    expect(streetsFit(world, ground, createShops([...premises(MAX_PREMISES), ...water(MAX_SITES - MAX_PREMISES + 1, 0)]))).toBe(false);
    expect(streetsFit(world, ground, createShops(premises(MAX_PREMISES + 1)))).toBe(false);
    expect(streetsFit(world, ground, createShops([PLAZA, GREEN]))).toBe(true);

    const alone = townOf([PLAZA, GREEN, WATER]);
    expect(alone.globals[STREETS]).toBe(0);
    expect(alone.errands.siteKind.every((kind) => kind === NO_SITE)).toBe(true);
  });
});
