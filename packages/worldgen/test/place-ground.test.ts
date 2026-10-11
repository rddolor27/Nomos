import { readFileSync } from 'node:fs';
import {
  ENTITY_CIVIC,
  ENTITY_GREEN,
  ENTITY_PLAZA,
  parseMap,
  WALK_DOOR,
  WALK_OPEN,
  WALK_ROAD,
  writeMap,
  type MapEntity,
  type MapV1,
} from '@nomos/sim-protocol/map';
import { premisesOf, sellersOf, TRADES } from '@nomos/sim-protocol/premises';
import { describe, expect, it } from 'vitest';
import { buildPlace, generateWorld, placeContexts, TOWN } from '../src/index.ts';

const TOWN_FILE = new URL('../../../assets/maps/town.nmap', import.meta.url);
const WORLDS = 2;
const FIRST_SEED = 0x5eed0001;
// The phone tier's rows (M2.2c Ruling 6): a place with more beds would make the spawn cap its people.
const PHONE_ROWS = 10_000;
const DOCK = 'buildings/work_dock';
// Premises to each trade, in TRADES' order (M2.7 Part 1, the owner's several buildings to a trade): the market's three
// stalls, then the Bakery, the Draper, the Smithy and the Fuel Store.
const PREMISES_OF_TIER: Readonly<Record<string, readonly number[]>> = {
  capital: [2, 2, 2, 4, 4, 4, 4],
  city: [2, 2, 2, 4, 4, 4, 4],
  town: [2, 2, 2, 3, 3, 3, 3],
};
// The tile of a premises' front that its sprite's door lies in, counted from the left.
const DOOR_COLUMN: Readonly<Record<string, number>> = {
  'buildings/shop_market-stall_vegetables': 1,
  'buildings/shop_market-stall_fish': 1,
  'buildings/shop_market-stall_milk': 1,
  'buildings/shop_bakery': 2,
  'buildings/shop_draper_bolts': 3,
  'buildings/shop_draper_rail': 3,
  'buildings/work_smithy': 2,
  'buildings/shop_fuel-store_shed': 1,
  'buildings/shop_fuel-store_stack': 3,
};
// Greens to a walled tier (M3.1 Part 3, Rule 9), which a crowded town may lay fewer of.
const GREENS_OF_TIER: Readonly<Record<string, number>> = { capital: 3, city: 3, town: 2 };
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
    if (entity.kind > ENTITY_CIVIC) return;
    if (map.walk[entity.doorY * map.width + entity.doorX] !== WALK_DOOR) problems.push(`${label} entity ${i}: its door tile is no door`);
    if (map.frames[entity.frame] !== DOCK && !touchesStreet(map, entity.doorX, entity.doorY)) {
      problems.push(`${label} entity ${i}: its door touches no open or road tile`);
    }
  });
  return problems;
}

function leisureOf(map: MapV1, kind: MapEntity['kind']): MapEntity[] {
  return map.entities.filter((entity) => entity.kind === kind);
}

// A leisure place's door lies inside it, or for a village's green on the ring path round it, on ground to stand on.
function standsOn(map: MapV1, entity: MapEntity, margin: number): boolean {
  const { doorX, doorY } = entity;
  const inside =
    entity.x - margin <= doorX && doorX < entity.x + entity.w + margin && entity.y - margin <= doorY && doorY < entity.y + entity.h + margin;
  const walk = map.walk[doorY * map.width + doorX];
  return inside && (walk === WALK_OPEN || walk === WALK_ROAD);
}

// Each place has one plaza and, if it is walled, up to its tier's greens, all with doors on open ground, and it lists them after
// every building, so a premises keeps its index.
function leisureProblems(label: string, tier: string | null, map: MapV1): string[] {
  const problems: string[] = [];
  const plazas = leisureOf(map, ENTITY_PLAZA);
  const greens = leisureOf(map, ENTITY_GREEN);
  if (plazas.length !== 1) problems.push(`${label}: ${plazas.length} plazas`);
  if (greens.length > (GREENS_OF_TIER[tier ?? ''] ?? 0)) problems.push(`${label}: ${greens.length} greens`);
  // A village's or hamlet's plaza is its green, whose door may lie on the path that rings it.
  const margin = (tier ?? '') in GREENS_OF_TIER ? 0 : 1;
  for (const entity of [...plazas, ...greens]) {
    if (!standsOn(map, entity, entity.kind === ENTITY_PLAZA ? margin : 0)) {
      problems.push(`${label}: the door of its ${entity.kind === ENTITY_PLAZA ? 'plaza' : 'green'} is not on open ground in it`);
    }
  }
  const firstLeisure = map.entities.findIndex((entity) => entity.kind > ENTITY_CIVIC);
  if (map.entities.slice(firstLeisure).some((entity) => entity.kind <= ENTITY_CIVIC)) problems.push(`${label}: a building follows a leisure place`);
  return problems;
}

function bedsIn(map: MapV1): number {
  return map.entities.reduce((beds, entity) => beds + entity.capacity, 0);
}

function premisesByTrade(map: MapV1): number[] {
  const premises = premisesOf(map);
  return TRADES.map((trade) => sellersOf(premises, trade.good).length);
}

// A town, city or capital has its tier's premises to each trade. A village's one general shop, or its one or two stalls, sells
// every good, so it counts 1 or 2 to each trade; a hamlet has no shop.
function premisesProblems(label: string, tier: string | null, map: MapV1): string[] {
  const counts = premisesByTrade(map);
  const want = PREMISES_OF_TIER[tier ?? ''];
  if (want !== undefined) return counts.every((n, i) => n === want[i]) ? [] : [`${label}: premises by trade ${counts}, want ${want}`];
  const [least, most] = tier === 'village' ? [1, 2] : [0, 0];
  return counts.every((n) => least <= n && n <= most) ? [] : [`${label}: premises by trade ${counts}, want ${least} to ${most} of each`];
}

describe('the ground of a place', { timeout: 300_000 }, () => {
  it("writes Highcourt's town.nmap byte for byte", () => {
    const { map } = buildPlace(TOWN);
    if (map === null) throw new Error('Highcourt has no ground');

    expect(firstDifference(new Uint8Array(writeMap(map)), new Uint8Array(readFileSync(TOWN_FILE)))).toBe(-1);
  });

  it("has Highcourt's premises to each trade, each door in the tile of its sprite's door", () => {
    const { map } = buildPlace(TOWN);
    if (map === null) throw new Error('Highcourt has no ground');

    const wrongDoors = premisesOf(map).filter((p) => {
      const { x, y, h, frame } = map.entities[p.entity];
      return p.doorX - x !== DOOR_COLUMN[map.frames[frame]] || p.doorY !== y + h;
    });
    expect(premisesByTrade(map)).toEqual([2, 2, 2, 4, 4, 4, 4]);
    expect(wrongDoors).toEqual([]);
  });

  it("has Highcourt's plaza in front of its fountain and its three greens at the middle of theirs", () => {
    const { map } = buildPlace(TOWN);
    if (map === null) throw new Error('Highcourt has no ground');

    const where = (entity: MapEntity): number[] => [entity.x, entity.y, entity.w, entity.h, entity.doorX, entity.doorY];
    // The plaza is 28 by 8 from (74, 52), and its fountain stands at (87, 57), 3 wide and 2 high: the door is the tile below its
    // middle. The greens are 6 by 4, the door at (x + 3, y + 2).
    expect(leisureOf(map, ENTITY_PLAZA).map(where)).toEqual([[74, 52, 28, 8, 88, 59]]);
    expect(leisureOf(map, ENTITY_GREEN).map(where)).toEqual([
      [128, 22, 6, 4, 131, 24],
      [38, 22, 6, 4, 41, 24],
      [129, 17, 6, 4, 132, 19],
    ]);
    expect(map.entities.slice(-4).map((entity) => entity.kind)).toEqual([ENTITY_PLAZA, ENTITY_GREEN, ENTITY_GREEN, ENTITY_GREEN]);
  });

  it(`opens every door but a dock's onto a street, gives each trade its premises and each place its plaza and greens, and gives a wonder no ground, in every place of the first ${WORLDS} standard worlds`, () => {
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
        problems.push(...doorProblems(label, map), ...premisesProblems(label, ctx.tier, map), ...leisureProblems(label, ctx.tier, map));
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
