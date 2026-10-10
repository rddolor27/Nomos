import { CITY } from '../economy/city.ts';
import { CITY_RECORD } from '../economy/city-record.ts';
import { floorDiv } from '../maths/int.ts';
import { TIER_AGENTS, TIER_MEMORY_BYTES, type Tier } from '../memory/tiers.ts';
import type { Ground } from '../world/ground.ts';
import { TOWN, layoutWorld, type World } from '../world/world.ts';
import { createStandInHomes } from './homes.ts';
import { LEDGER_FIELDS, scaleRecord } from './record.ts';
import { spawnFromLedger } from './spawn.ts';

// A stand-in home sleeps 6, so a home to every 3 people holds the town twice over, as in M2.2.
const PEOPLE_PER_HOME = 3;

// The layout always holds the tier's whole count, so a smaller town moves no offset (interfaces.md, The world step).
export function createTown(seed: number, tier: Tier, ground: Ground, people: number): World {
  const world = layoutWorld(seed, tier, TIER_AGENTS[tier], TIER_MEMORY_BYTES[tier], ground);
  spawnTown(world, people);
  return world;
}

// Fills an empty world with CITY's settled record scaled to people, at settlement 0 on day 0, and marks it to run CITY.
export function spawnTown(world: World, people: number): void {
  const homes = createStandInHomes(world.ground, floorDiv(people + PEOPLE_PER_HOME - 1, PEOPLE_PER_HOME));
  spawnFromLedger(world, createTownRecord(people), homes, CITY, 0, 0);
  world.globals[TOWN] = 1;
}

function createTownRecord(people: number): Float64Array {
  const record = new Float64Array(LEDGER_FIELDS);
  scaleRecord(CITY_RECORD, people, record);
  return record;
}
