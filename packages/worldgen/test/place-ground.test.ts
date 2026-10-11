import { readFileSync } from 'node:fs';
import { parseMap, WALK_DOOR, WALK_OPEN, WALK_ROAD, writeMap, type MapV1 } from '@nomos/sim-protocol/map';
import { describe, expect, it } from 'vitest';
import { buildPlace, generateWorld, placeContexts, TOWN } from '../src/index.ts';

const TOWN_FILE = new URL('../../../assets/maps/town.nmap', import.meta.url);
const WORLDS = 2;
const FIRST_SEED = 0x5eed0001;
// The phone tier's rows (M2.2c Ruling 6): a place with more beds would make the spawn cap its people.
const PHONE_ROWS = 10_000;
const DOCK = 'buildings/work_dock';
const STEPS: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

function firstDifference(got: Uint8Array, want: Uint8Array): number {
  const shared = Math.min(got.length, want.length);
  for (let i = 0; i < shared; i++) {
    if (got[i] !== want[i]) return i;
  }
  return got.length === want.length ? -1 : shared;
}

// A door opens onto a street: some tile beside it is open ground or a road, not only the doors of its neighbours.
function touchesStreet(map: MapV1, x: number, y: number): boolean {
  return STEPS.some(([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) return false;
    const walk = map.walk[ny * map.width + nx];
    return walk === WALK_OPEN || walk === WALK_ROAD;
  });
}

// A dock stands at the water's edge and its door, the tile below, lies in the water, as export_map.py leaves it. Seating a
// firm there is Step 3's, so a dock is the one building whose door need not open onto a street.
function doorProblems(label: string, map: MapV1): string[] {
  const problems: string[] = [];
  map.entities.forEach((entity, i) => {
    if (map.walk[entity.doorY * map.width + entity.doorX] !== WALK_DOOR) problems.push(`${label} entity ${i}: its door tile is no door`);
    if (map.frames[entity.frame] !== DOCK && !touchesStreet(map, entity.doorX, entity.doorY)) {
      problems.push(`${label} entity ${i}: its door touches no open or road tile`);
    }
  });
  return problems;
}

function bedsIn(map: MapV1): number {
  return map.entities.reduce((beds, entity) => beds + entity.capacity, 0);
}

describe('the ground of a place', { timeout: 300_000 }, () => {
  it("writes Highcourt's town.nmap byte for byte", () => {
    const { map } = buildPlace(TOWN);
    if (map === null) throw new Error('Highcourt has no ground');

    expect(firstDifference(new Uint8Array(writeMap(map)), new Uint8Array(readFileSync(TOWN_FILE)))).toBe(-1);
  });

  it(`opens every door but a dock's onto a street in every place of the first ${WORLDS} standard worlds, and gives a wonder no ground`, () => {
    const problems: string[] = [];
    let places = 0;
    let most = { beds: 0, label: '' };
    for (let w = 0; w < WORLDS; w++) {
      const seed = FIRST_SEED + w;
      placeContexts(generateWorld(seed, 'standard')).forEach((ctx, i) => {
        const label = `${seed.toString(16)} place ${i} (${ctx.name})`;
        const { map } = buildPlace(ctx);
        if (ctx.wonder) {
          if (map !== null) problems.push(`${label}: a wonder has a ground`);
          return;
        }
        if (map === null) {
          problems.push(`${label}: a settlement has no ground`);
          return;
        }
        places++;
        problems.push(...doorProblems(label, map));
        expect(parseMap(writeMap(map)), `${label}: its bytes parse to another map`).toEqual(map);
        if (bedsIn(map) > most.beds) most = { beds: bedsIn(map), label };
      });
    }

    console.info(`the most beds in a place of ${WORLDS} worlds: ${most.beds}, in ${most.label}`);
    expect(problems.slice(0, 20)).toEqual([]);
    expect(places).toBeGreaterThan(80);
    expect(most.beds).toBeLessThanOrEqual(PHONE_ROWS);
  });
});
