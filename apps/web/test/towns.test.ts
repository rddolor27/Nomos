import {
  LEDGER_FIELDS,
  LEDGER_FIRM_CASH,
  LEDGER_HOUSEHOLD_CASH,
  MAX_TOWNS,
  MINT,
  OK,
  SPAWN_DRAW,
  TIER_AGENTS,
  bedCount,
  checkInvariants,
  createHomes,
  createTown,
  dayBoundary,
  draw2,
  fitHouseholds,
  foldToLedger,
  largestHome,
  requestTown,
  townRecord,
  type Homes,
  type World,
} from '@nomos/sim-core';
import { ENTITY_HOME, type MapV1 } from '@nomos/sim-protocol/map';
import { buildPlace, generateWorld, placeContexts } from '@nomos/worldgen';
import { describe, expect, it } from 'vitest';

const WORLDS = 2;
const FIRST_SEED = 0x5eed0001;
const SEED = 42;

function homesOf(map: MapV1): Homes {
  return createHomes(map.entities.filter((entity) => entity.kind === ENTITY_HOME));
}

// What a town in these homes spawns as at place p on day 0: its first record, with the households that seat under that key.
function spawnedRecord(homes: Homes, place: number): number[] {
  const record = new Float64Array(LEDGER_FIELDS);
  townRecord(Math.min(bedCount(homes), TIER_AGENTS.phone), largestHome(homes), record);
  fitHouseholds(record, homes, SEED, draw2(SEED, SPAWN_DRAW, place, 0));
  return Array.from(record);
}

function foldedRecord(world: World): number[] {
  const record = new Float64Array(LEDGER_FIELDS);
  foldToLedger(world, record);
  return Array.from(record);
}

function problemsWith(world: World, label: string, want: number[]): string[] {
  const got = foldedRecord(world);
  const wrongFields = got.flatMap((value, field) => (value === want[field] ? [] : [field]));
  const problems = wrongFields.length > 0 ? [`${label}: the fold differs from the record in fields ${wrongFields.join()}`] : [];
  const cents = got[LEDGER_HOUSEHOLD_CASH] + got[LEDGER_FIRM_CASH];
  if (world.cash.balance[MINT] !== -cents) problems.push(`${label}: MINT holds ${world.cash.balance[MINT]}, not minus ${cents}`);
  if (checkInvariants(world.cash, world.claims) !== OK) problems.push(`${label}: the ledger invariants fail`);
  return problems;
}

describe('every town runs the sim', { timeout: 300_000 }, () => {
  // One sim world per generated world visits each of its settlements by a switch at day 0, as the worker would after the
  // map's Enter, and every spawn must fold back to the record it was made from, people and cents.
  it(`spawns and folds back exactly every settlement of the first ${WORLDS} standard worlds`, () => {
    const problems: string[] = [];
    let places = 0;
    for (let w = 0; w < WORLDS; w++) {
      const contexts = placeContexts(generateWorld(FIRST_SEED + w, 'standard'));
      let world: World | null = null;
      for (let place = 0; place < contexts.length; place++) {
        if (contexts[place].wonder !== null) continue;
        const { map } = buildPlace(contexts[place]);
        if (map === null) throw new Error(`settlement ${place} has no ground`);
        const homes = homesOf(map);
        const label = `world ${w} place ${place}`;
        if (world === null) {
          world = createTown(SEED, 'phone', map, homes);
        } else if (requestTown(world, place, map, homes)) {
          dayBoundary(world);
        } else {
          problems.push(`${label}: the request was refused`);
          continue;
        }
        places++;
        expect(place, label).toBeLessThan(MAX_TOWNS);
        problems.push(...problemsWith(world, label, spawnedRecord(homes, place)));
      }
    }

    expect(problems.slice(0, 20)).toEqual([]);
    expect(places).toBeGreaterThan(80);
  });
});
