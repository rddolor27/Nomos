import { WALK_BLOCKED, type MapV1 } from '@nomos/sim-protocol/map';
import { beforeAll, describe, expect, it } from 'vitest';
import { generateWorld, placeContexts, TOWN } from '../src/index.ts';
import { buildSite, siteFor } from '../src/place/build.ts';
import { connect } from '../src/place/connect.ts';
import type { PlaceContext } from '../src/place/context.ts';
import { groundOf } from '../src/place/ground.ts';
import { layRoad } from '../src/place/roads.ts';
import { layVillage } from '../src/place/settlement.ts';
import type { Cell, Site } from '../src/place/site.ts';

// M3.1's Part 4, Task 23 (Ruling 6): every road of a place reaches its plaza or green on foot, so every door does. The places
// are those of the first two standard worlds and Highcourt, and a bare village for what a river and a cliff do.
const WORLDS = 2;
const FIRST_SEED = 0x5eed0001;
const STEPS: readonly Cell[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

const BARE: PlaceContext = {
  seed: 0x5eed,
  name: 'Bare',
  biome: 'grassland',
  temperature: 140,
  moisture: 140,
  tier: 'village',
  population: 600,
  sea: '',
  coast: '',
  river: '',
  roads: '',
  farmland: '',
  landmarks: [],
  wonder: null,
};

// The tiles a walk starts from: a town's plaza, or the green of a village or hamlet with the path round it.
function middleOf(site: Site): Cell[] {
  const tiles: Cell[] = [];
  if (site.plaza !== null) {
    const [px, py, pw, ph] = site.plaza;
    for (let y = py; y < py + ph; y++) {
      for (let x = px; x < px + pw; x++) tiles.push([x, y]);
    }
    return tiles;
  }
  for (const [gx, gy] of site.green) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) tiles.push([gx + dx, gy + dy]);
    }
  }
  return tiles;
}

// Queues tile (x, y) of the map if a blob can stand there and none has been counted there.
function take(map: MapV1, seen: Uint8Array, queue: number[], x: number, y: number): void {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return;
  const c = y * map.width + x;
  if (seen[c] || map.walk[c] === WALK_BLOCKED) return;
  seen[c] = 1;
  queue.push(c);
}

// A 4-way flood of the map's walk grid from the middle of the place.
function floodOf(map: MapV1, site: Site): Uint8Array {
  const seen = new Uint8Array(map.width * map.height);
  const queue: number[] = [];
  for (const [x, y] of middleOf(site)) take(map, seen, queue, x, y);
  for (let head = 0; head < queue.length; head++) {
    const x = queue[head] % map.width;
    const y = (queue[head] - x) / map.width;
    for (const [dx, dy] of STEPS) take(map, seen, queue, x + dx, y + dy);
  }
  return seen;
}

// A dock's door lies in the water it stands at (ground.ts), where no one walks.
function isDock(map: MapV1, frame: number): boolean {
  return map.frames[frame].endsWith('work_dock');
}

describe('the doors of the places of the first 2 standard worlds and Highcourt', { timeout: 600_000 }, () => {
  let doors = 0;
  let places = 0;
  const cutOff: string[] = [];

  beforeAll(() => {
    const survey = (label: string, ctx: PlaceContext): void => {
      const site = buildSite(ctx);
      const map = groundOf(site);
      const seen = floodOf(map, site);
      places++;
      for (const entity of map.entities) {
        if (isDock(map, entity.frame)) continue;
        doors++;
        if (!seen[entity.doorY * map.width + entity.doorX]) {
          cutOff.push(`${label} (${ctx.tier}): ${map.frames[entity.frame]} at ${entity.doorX},${entity.doorY}`);
        }
      }
    };
    survey('Highcourt', TOWN);
    for (let k = 0; k < WORLDS; k++) {
      const seed = FIRST_SEED + k;
      placeContexts(generateWorld(seed, 'standard')).forEach((ctx, i) => {
        if (!ctx.wonder) survey(`${seed.toString(16)} place ${i}`, ctx);
      });
    }
  }, 900_000);

  it('can all be walked to from the plaza or green, whatever rivers cross the place', () => {
    expect(places).toBeGreaterThan(25 * WORLDS);
    expect(doors).toBeGreaterThan(5_000 * WORLDS);
    expect(cutOff.slice(0, 20)).toEqual([]);
  });
});

// A bare village: its green in the middle, a street running west from the green, a river 2 tiles wide across its east, and a
// second street on the river's far bank, which only a crossing joins to the green.
function riverVillage(): { site: Site; far: Cell } {
  const site = siteFor(BARE);
  layVillage(site);
  const { cx, cy } = site;
  for (let x = cx - 25; x <= cx - 4; x++) layRoad(site, x, cy, 'cobble');
  for (let y = 0; y < site.h; y++) {
    for (const x of [cx + 10, cx + 11]) site.kind[site.at(x, y)] = 'water';
  }
  for (let x = cx + 16; x <= cx + 28; x++) layRoad(site, x, cy, 'cobble');
  return { site, far: [cx + 16, cy] };
}

describe('connect', () => {
  it('gives a street a river cuts off a crossing on footbridges', () => {
    const { site, far } = riverVillage();
    const at = far[1] * site.w + far[0];
    expect(floodOf(groundOf(site), site)[at]).toBe(0);

    connect(site);

    expect(floodOf(groundOf(site), site)[at]).toBe(1);
    expect([site.cx + 10, site.cx + 11].map((x) => site.road[site.at(x, site.cy)])).toEqual([1, 1]);
    expect(site.ground.filter((sprite) => sprite.name === 'prop_footbridge')).toHaveLength(2);
  });

  it('turns a road that no route reaches back to grass', () => {
    const site = siteFor(BARE);
    layVillage(site);
    const { cx, cy } = site;
    for (let x = cx - 25; x <= cx - 4; x++) layRoad(site, x, cy, 'cobble');
    // One cobbled tile with cliff on all 8 sides, so no one can walk in and no route can reach out.
    layRoad(site, cx + 15, cy, 'cobble');
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx !== 0 || dy !== 0) site.kind[site.at(cx + 15 + dx, cy + dy)] = 'cliff_face';
      }
    }

    connect(site);

    expect([site.road[site.at(cx + 15, cy)], site.kind[site.at(cx + 15, cy)]]).toEqual([0, 'grass']);
    expect([site.road[site.at(cx - 10, cy)], site.kind[site.at(cx - 10, cy)]]).toEqual([1, 'cobble']);
  });
});
