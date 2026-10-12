import { describe, expect, it } from 'vitest';
import { CELL_HIDDEN } from '../src/life/store.ts';
import { createStandInTownHomes } from '../src/spawn/homes.ts';
import { createTown } from '../src/spawn/town.ts';
import { step } from '../src/step/step.ts';
import { AT_DOOR, MAX_PREMISES, MAX_SITES } from '../src/street/fields.ts';
import { closeStreets, streetsFit } from '../src/street/open.ts';
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
  it('give the premises their indexes, the leisure sites the fields after them, and the blobs somewhere to spend their free time', () => {
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
    // The first two fields are the premises-only town's, and the sites cover only their door's tile when they say nothing more.
    expect(world.fields.subarray(0, 2 * cells)).toEqual(premisesOnly.fields.subarray(0, 2 * cells));
    expect(Array.from(world.life.areaW.subarray(0, 5))).toEqual([1, 1, 1, 1, 1]);
    // They spawn alike, since a site is only a place to go. A day on, blobs have gone to the plaza and the green, so they differ.
    expect(stateHash(world)).toBe(stateHash(premisesOnly));
    while (currentTick(world) < 1_300) {
      step(world);
      step(premisesOnly);
    }
    expect(stateHash(world)).not.toBe(stateHash(premisesOnly));
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

  it("hide the ground their image covers when the streets open, cut off at the ground's edge, and no more", () => {
    const awning: ShopSite = { ...STALL, hiddenX: 58, hiddenY: 36, hiddenW: 3, hiddenH: 1 };
    // Hangs over the ground's top left corner: only the two cells in the ground are marked.
    const corner: ShopSite = { ...BAKERY, hiddenX: -1, hiddenY: -1, hiddenW: 3, hiddenH: 2 };
    const world = townOf([corner, awning, PLAZA]);
    const { holds } = world.life;
    const { width } = world.ground;

    expect(Array.from(holds.keys()).filter((cell) => holds[cell] === CELL_HIDDEN)).toEqual([0, 1, 36 * width + 58, 36 * width + 59, 36 * width + 60]);
    // Sites that hide nothing mark nothing.
    expect(townOf([BAKERY, STALL, PLAZA]).life.holds.every((held) => held === 0)).toBe(true);
  });

  it('go with the town: closing its streets clears every site, home tile and blob life', () => {
    const world = townOf([BAKERY, STALL, PLAZA]);
    const { errands, life } = world;
    expect(errands.homeCell.some((cell) => cell !== 0)).toBe(true);
    expect(errands.siteKind.some((kind) => kind !== NO_SITE)).toBe(true);
    expect(life.bytes.some((byte) => byte !== 0)).toBe(true);

    closeStreets(world);

    expect(errands.homeCell.every((cell) => cell === 0)).toBe(true);
    expect(errands.siteKind.every((kind) => kind === NO_SITE)).toBe(true);
    expect(life.bytes.every((byte) => byte === 0)).toBe(true);
    expect(world.globals[STREETS]).toBe(0);
  });
});
