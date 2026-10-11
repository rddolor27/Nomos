import { ACTION_WALK } from '../agents/actions.ts';
import { CITY } from '../economy/city.ts';
import { TIER_AGENTS, TIER_MEMORY_BYTES, type Tier } from '../memory/tiers.ts';
import { setHeading } from '../movement/walk.ts';
import { draw2, draw3 } from '../random/draw.ts';
import { SPAWN_DRAW } from '../random/streams.ts';
import { createStreets } from '../street/open.ts';
import { NO_SHOPS, type Shops } from '../street/shops.ts';
import type { Ground } from '../world/ground.ts';
import { TOWN, WALK_START_MASK, currentTick, layoutWorld, type World } from '../world/world.ts';
import { bedCount, createStandInTownHomes, fitHouseholds, largestHome, type Homes } from './homes.ts';
import { townRecord } from './record.ts';
import { spawnFromLedger } from './spawn.ts';

const SETTLEMENT = 0;
const DAY = 0;
// Purpose 13 on SPAWN_DRAW, after spawn.ts's 1 to 12.
const WALK_START = 13;

// The layout always holds the tier's whole count, so a smaller town moves no offset (interfaces.md, The world step). A town
// with shops makes streets, and one without wanders.
export function createTown(seed: number, tier: Tier, ground: Ground, homes: Homes, shops: Shops = NO_SHOPS): World {
  const world = layoutWorld(seed, tier, TIER_AGENTS[tier], TIER_MEMORY_BYTES[tier], ground);
  spawnTown(world, homes, shops);
  return world;
}

// A town of exactly `people` in stand-in homes, for the tier's whole crowd under ?tier=, the bench and tests, where no map
// draws any houses.
export function createStandInTown(seed: number, tier: Tier, ground: Ground, people: number): World {
  return createTown(seed, tier, ground, createStandInTownHomes(ground, people));
}

// Fills an empty world with one blob to every bed of the homes, or to the layout's agent rows if the beds outnumber them. It
// spawns CITY's settled record scaled to them, in HOUSEHOLD_MIX's households as far as the homes seat them, at settlement 0 on
// day 0, and marks the world to run CITY, with settlement 0 the live town. The world must be at tick 0: the spawn leaves the
// consumption plans empty, and only a month's first day, as day 0 is, makes them.
export function spawnTown(world: World, homes: Homes, shops: Shops = NO_SHOPS): void {
  const tick = currentTick(world);
  if (tick !== 0) throw new RangeError(`a town spawns at tick 0, and this world is at tick ${tick}`);
  firstRecord(world, homes, world.recordRow);
  seatTown(world, world.recordRow, homes, SETTLEMENT, DAY, shops);
  world.globals[TOWN] = 1;
  world.focus[0] = SETTLEMENT;
}

// A town's first record: CITY's settled record scaled to the homes' beds, or to the layout's agent rows if the beds outnumber
// them. out takes all 14 fields.
export function firstRecord(world: World, homes: Homes, out: Float64Array): void {
  townRecord(Math.min(bedCount(homes), world.agents.capacity), largestHome(homes), out);
}

// Spawns a record into an empty world at `place` on `day`, through CITY's days: the households it seats in the homes, as far
// as they fit under this place's and day's key, and then the streets of its shops, whose blobs wake indoors, or a walking
// start for three in four blobs if it has none. The record's households are trimmed to that fit, so a record folded under
// another key seats too.
export function seatTown(
  world: World,
  record: Float64Array,
  homes: Homes,
  place: number,
  day: number,
  shops: Shops = NO_SHOPS,
): void {
  const key = draw2(world.seed, SPAWN_DRAW, place, day);
  fitHouseholds(record, homes, world.seed, key);
  spawnFromLedger(world, record, homes, CITY, place, day);
  if (shops.count > 0) createStreets(world, shops);
  else startWalking(world, key);
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
