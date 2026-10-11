import { ACTION_WALK } from '../agents/actions.ts';
import { CITY } from '../economy/city.ts';
import { TIER_AGENTS, TIER_MEMORY_BYTES, type Tier } from '../memory/tiers.ts';
import { setHeading } from '../movement/walk.ts';
import { draw2, draw3 } from '../random/draw.ts';
import { SPAWN_DRAW } from '../random/streams.ts';
import type { Ground } from '../world/ground.ts';
import { TOWN, WALK_START_MASK, currentTick, layoutWorld, type World } from '../world/world.ts';
import { bedCount, createStandInTownHomes, fitHouseholds, largestHome, type Homes } from './homes.ts';
import { LEDGER_FIELDS, townRecord } from './record.ts';
import { spawnFromLedger } from './spawn.ts';

const SETTLEMENT = 0;
const DAY = 0;
// Purpose 13 on SPAWN_DRAW, after spawn.ts's 1 to 12.
const WALK_START = 13;

// The layout always holds the tier's whole count, so a smaller town moves no offset (interfaces.md, The world step).
export function createTown(seed: number, tier: Tier, ground: Ground, homes: Homes): World {
  const world = layoutWorld(seed, tier, TIER_AGENTS[tier], TIER_MEMORY_BYTES[tier], ground);
  spawnTown(world, homes);
  return world;
}

// A town of exactly `people` in stand-in homes, for the tier's whole crowd under ?tier=, the bench and tests, where no map
// draws any houses.
export function createStandInTown(seed: number, tier: Tier, ground: Ground, people: number): World {
  return createTown(seed, tier, ground, createStandInTownHomes(ground, people));
}

// Fills an empty world with one blob to every bed of the homes, or to the layout's agent rows if the beds outnumber them. It
// spawns CITY's settled record scaled to them, in HOUSEHOLD_MIX's households as far as the homes seat them, at settlement 0 on
// day 0, and marks the world to run CITY. The world must be at tick 0: the spawn leaves the consumption plans empty, and only
// a month's first day, as day 0 is, makes them.
export function spawnTown(world: World, homes: Homes): void {
  const tick = currentTick(world);
  if (tick !== 0) throw new RangeError(`a town spawns at tick 0, and this world is at tick ${tick}`);
  const people = Math.min(bedCount(homes), world.agents.capacity);
  const key = draw2(world.seed, SPAWN_DRAW, SETTLEMENT, DAY);
  const record = createTownRecord(people, largestHome(homes));
  fitHouseholds(record, homes, world.seed, key);
  spawnFromLedger(world, record, homes, CITY, SETTLEMENT, DAY);
  startWalking(world, key);
  world.globals[TOWN] = 1;
}

function createTownRecord(people: number, largest: number): Float64Array {
  const record = new Float64Array(LEDGER_FIELDS);
  townRecord(people, largest, record);
  return record;
}

// Three in four blobs set off on a keyed heading as populate's do, so the first frame already shows a crowd on the move. key
// is the one spawnFromLedger keys on.
function startWalking(world: World, key: number): void {
  const { agents, seed } = world;
  for (let p = 0; p < agents.count[0]; p++) {
    const start = draw3(seed, SPAWN_DRAW, key, p, WALK_START);
    if ((start & WALK_START_MASK) === 0) continue;
    agents.action[p] = ACTION_WALK;
    setHeading(agents, p, start >>> 24);
  }
}
