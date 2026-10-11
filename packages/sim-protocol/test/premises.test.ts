import { BREAD, CLOTH, FISH, FUEL, MILK, TOOLS, VEGETABLES } from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import {
  ENTITY_CIVIC,
  ENTITY_HOME,
  ENTITY_SHOP,
  ENTITY_WORKPLACE,
  EVERY_GOOD,
  premisesOf,
  sellersOf,
  type MapEntity,
  type MapV1,
} from '../src/index.ts';

const FRAMES = [
  'houses/house_brick_detached_roof-green',
  'buildings/shop_bakery',
  'buildings/shop_market-stall_vegetables',
  'buildings/shop_market-stall_fish',
  'buildings/shop_market-stall_milk',
  'buildings/shop_draper_rail',
  'buildings/work_smithy',
  'buildings/shop_general',
  'buildings/work_workshop',
  'buildings/shop_market-stall',
];

function frame(name: string): number {
  return FRAMES.findIndex((key) => key.endsWith(`/${name}`));
}

// An entity one tile wide whose door lies below it, at the column x.
function entity(kind: MapEntity['kind'], name: string, x: number): MapEntity {
  const hours = kind === ENTITY_SHOP ? { opens: 360, closes: 840 } : { opens: 0, closes: 0 };
  return { kind, x, y: 1, w: 1, h: 1, doorX: x, doorY: 2, frame: frame(name), capacity: kind === ENTITY_HOME ? 4 : 0, ...hours };
}

function mapOf(entities: MapEntity[]): MapV1 {
  const cells = new Uint8Array(0);
  return { version: 1, width: 1, height: 1, kinds: [], frames: FRAMES, terrain: cells, walk: cells, tiles: new Uint16Array(0), entities };
}

const bit = (good: number): number => 1 << good;

describe('the premises of a map', () => {
  it('are the shops and the smithy named for a trade, and a general shop sells only the goods no trade does', () => {
    const map = mapOf([
      entity(ENTITY_HOME, 'house_brick_detached_roof-green', 0),
      entity(ENTITY_SHOP, 'shop_bakery', 1),
      entity(ENTITY_SHOP, 'shop_market-stall_vegetables', 2),
      entity(ENTITY_SHOP, 'shop_market-stall_fish', 3),
      entity(ENTITY_SHOP, 'shop_market-stall_milk', 4),
      entity(ENTITY_SHOP, 'shop_draper_rail', 5),
      entity(ENTITY_WORKPLACE, 'work_smithy', 6),
      entity(ENTITY_WORKPLACE, 'work_workshop', 7),
      entity(ENTITY_SHOP, 'shop_general', 8),
      entity(ENTITY_CIVIC, 'shop_general', 9),
    ]);

    const premises = premisesOf(map);

    expect(premises.map((p) => [p.entity, p.goods, p.doorX, p.doorY])).toEqual([
      [1, bit(BREAD), 1, 2],
      [2, bit(VEGETABLES), 2, 2],
      [3, bit(FISH), 3, 2],
      [4, bit(MILK), 4, 2],
      [5, bit(CLOTH), 5, 2],
      [6, bit(TOOLS), 6, 2],
      [8, bit(FUEL), 8, 2],
    ]);
    expect(sellersOf(premises, FUEL)).toEqual([6]);
    expect(sellersOf(premises, BREAD)).toEqual([0]);
  });

  it("make a village's one stall sell all seven goods, and a hamlet with no shop has none", () => {
    const village = premisesOf(mapOf([entity(ENTITY_HOME, 'house_brick_detached_roof-green', 0), entity(ENTITY_SHOP, 'shop_market-stall', 1)]));

    expect(village).toEqual([{ entity: 1, goods: EVERY_GOOD, doorX: 1, doorY: 2 }]);
    for (let good = BREAD; good <= FUEL; good++) expect(sellersOf(village, good)).toEqual([0]);
    expect(premisesOf(mapOf([entity(ENTITY_HOME, 'house_brick_detached_roof-green', 0), entity(ENTITY_WORKPLACE, 'work_workshop', 1)]))).toEqual([]);
  });
});
