import { readFileSync } from 'node:fs';
import { brotliCompressSync, constants } from 'node:zlib';
import { createHomes, createShops, createTown, currentTick, stateHash, step, type Homes } from '@nomos/sim-core';
import { describe, expect, it } from 'vitest';
import {
  ENTITY_CIVIC,
  ENTITY_HOME,
  ENTITY_SHOP,
  ENTITY_WORKPLACE,
  WALK_BLOCKED,
  WALK_DOOR,
  leisureOf,
  parseMap,
  premisesOf,
  type MapEntity,
  type MapV1,
} from '../src/index.ts';

const townFile = new URL('../../../assets/maps/town.nmap', import.meta.url);

const BUILT_KIND: Readonly<Record<number, string>> = {
  [ENTITY_HOME]: 'home',
  [ENTITY_WORKPLACE]: 'workplace',
  [ENTITY_SHOP]: 'shop',
  [ENTITY_CIVIC]: 'civic',
};

function loadTown(): MapV1 {
  return parseMap(new Uint8Array(readFileSync(townFile)).buffer);
}

function homesOf(town: MapV1): Homes {
  return createHomes(town.entities.filter((entity) => entity.kind === ENTITY_HOME));
}

function footprintProblems(town: MapV1, entity: MapEntity, index: number): string[] {
  const problems: string[] = [];
  for (let y = entity.y; y < entity.y + entity.h; y++) {
    for (let x = entity.x; x < entity.x + entity.w; x++) {
      const cell = y * town.width + x;
      const built = town.kinds[town.terrain[cell]].name;
      if (town.walk[cell] !== WALK_BLOCKED || built !== BUILT_KIND[entity.kind]) {
        problems.push(`entity ${index}: cell ${x},${y} is ${built} with walk ${town.walk[cell]}`);
      }
    }
  }
  return problems;
}

function doorProblems(town: MapV1, entity: MapEntity, index: number): string[] {
  const justBelow = entity.doorY === entity.y + entity.h && entity.doorX >= entity.x && entity.doorX < entity.x + entity.w;
  const walk = town.walk[entity.doorY * town.width + entity.doorX];
  return justBelow && walk === WALK_DOOR ? [] : [`entity ${index}: door ${entity.doorX},${entity.doorY} has walk ${walk}`];
}

describe('the town map', () => {
  it('is the 176×112 capital', () => {
    const town = loadTown();

    expect([town.width, town.height]).toEqual([176, 112]);
    expect(town.kinds.map((kind) => kind.name)).toEqual(
      expect.arrayContaining(['grass', 'water', 'path', 'paving', 'home', 'shop', 'civic', 'workplace']),
    );
  });

  it('blocks every footprint and opens every door', () => {
    const town = loadTown();

    // The plaza and the greens that follow the buildings stand on open ground, with no footprint and no door tile.
    const problems = town.entities.flatMap((entity, index) =>
      entity.kind > ENTITY_CIVIC ? [] : [...footprintProblems(town, entity, index), ...doorProblems(town, entity, index)],
    );
    expect(problems).toEqual([]);

    const buildings = town.entities.filter((entity) => entity.kind <= ENTITY_CIVIC);
    const doorCells = new Set(buildings.map((entity) => entity.doorY * town.width + entity.doorX));
    const strayDoors = Array.from(town.walk.keys()).filter((cell) => town.walk[cell] === WALK_DOOR && !doorCells.has(cell));
    expect(strayDoors).toEqual([]);
  });

  it('houses and opens the town', () => {
    const town = loadTown();

    const homes = town.entities.filter((entity) => entity.kind === ENTITY_HOME && entity.capacity >= 2);
    const shops = town.entities.filter((entity) => entity.kind === ENTITY_SHOP && entity.opens < entity.closes);
    const civicFrames = town.entities.filter((entity) => entity.kind === ENTITY_CIVIC).map((entity) => town.frames[entity.frame]);

    expect(homes.length).toBeGreaterThanOrEqual(20);
    expect(shops.length).toBeGreaterThanOrEqual(1);
    expect(civicFrames).toEqual(expect.arrayContaining(['buildings/civic_police-station', 'buildings/civic_town-hall_large']));
  });

  it('replays seed 42 on the first screen to a fixed hash', () => {
    const town = loadTown();
    const hashes: Record<string, string> = {};
    // Built as the worker builds it, with the map's shops and then its plaza, greens and water edges, so blobs walk their errands and
    // spend their free time; with no shops they wandered to 498f12cb and 4bf399fa.
    for (const tier of ['phone', 'desktop'] as const) {
      const world = createTown(42, tier, town, homesOf(town), createShops([...premisesOf(town), ...leisureOf(town)]));
      while (currentTick(world) < 1_000) step(world);
      hashes[tier] = stateHash(world).toString(16).padStart(8, '0');
    }

    expect(hashes).toEqual({ phone: '9467e0f2', desktop: '6c94faa4' });
  });

  it('fits the map budget', () => {
    const packed = brotliCompressSync(readFileSync(townFile), { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } });

    expect(packed.byteLength).toBeLessThanOrEqual(40_000);
  });
});
