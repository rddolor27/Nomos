import { readFileSync } from 'node:fs';
import { BREAD, CLOTH, FISH, FUEL, MILK, TOOLS, VEGETABLES } from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import {
  ENTITY_CIVIC,
  ENTITY_HOME,
  ENTITY_SHOP,
  ENTITY_WORKPLACE,
  EVERY_GOOD,
  STALL_RISE_ROWS,
  premisesOf,
  sellersOf,
  type MapEntity,
  type MapV1,
} from '../src/index.ts';

const buildingsFile = new URL('../../../assets/sprites/buildings.json', import.meta.url);

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
    expect(premises.map((p) => p.stall)).toEqual([false, true, true, true, false, false, false]);
    expect(sellersOf(premises, FUEL)).toEqual([6]);
    expect(sellersOf(premises, BREAD)).toEqual([0]);
  });

  it("make a village's one stall sell all seven goods, and a hamlet with no shop has none", () => {
    const village = premisesOf(mapOf([entity(ENTITY_HOME, 'house_brick_detached_roof-green', 0), entity(ENTITY_SHOP, 'shop_market-stall', 1)]));

    expect(village).toEqual([{ entity: 1, goods: EVERY_GOOD, doorX: 1, doorY: 2, stall: true, hiddenX: 1, hiddenY: 0, hiddenW: 1, hiddenH: 1 }]);
    for (let good = BREAD; good <= FUEL; good++) expect(sellersOf(village, good)).toEqual([0]);
    expect(premisesOf(mapOf([entity(ENTITY_HOME, 'house_brick_detached_roof-green', 0), entity(ENTITY_WORKPLACE, 'work_workshop', 1)]))).toEqual([]);
  });

  it("hide the row north of a stall's footprint, and no other premises hides ground", () => {
    const premises = premisesOf(mapOf([entity(ENTITY_SHOP, 'shop_bakery', 1), entity(ENTITY_SHOP, 'shop_market-stall_fish', 4)]));
    const [bakery, stall] = premises;

    expect(bakery.hiddenW).toBeUndefined();
    expect([stall.hiddenX, stall.hiddenY, stall.hiddenW, stall.hiddenH]).toEqual([4, 1 - STALL_RISE_ROWS, 1, STALL_RISE_ROWS]);
  });

  it("take the rise from the stall sprites: each is as many rows taller than its footprint as the hidden rows", () => {
    const { tile, frames } = JSON.parse(readFileSync(buildingsFile, 'utf8')) as {
      tile: number;
      frames: Record<string, { h: number; footprint: [number, number] }>;
    };
    const stalls = Object.entries(frames).filter(([name]) => name.startsWith('shop_market-stall'));

    expect(stalls.length).toBeGreaterThanOrEqual(5);
    expect(stalls.map(([, frame]) => frame.h / tile - frame.footprint[1])).toEqual(stalls.map(() => STALL_RISE_ROWS));
  });
});
