import { ACTION_WALK } from '../agents/actions.ts';
import { Blob } from '../agents/blob.ts';
import { createClaims, type Claims } from '../money/claims.ts';
import { below, draw2 } from '../random/draw.ts';
import { openCells, pointInTileQ8, standInGround, walkableTiles, type Ground } from './ground.ts';
import { createInputLog, type InputLog } from './inputs.ts';
import { createLedger, issue, walletAccount, type Ledger } from '../money/ledger.ts';
import { reserveArena, take, type Arena } from '../memory/arena.ts';
import { MAX_CULTURES, SUPPLIERS, addAgent, createAgentStore, type AgentStore } from '../agents/store.ts';
import { createFirmStore, type FirmStore } from '../firms/store.ts';
import { createGoodsStore, type GoodsStore } from '../goods/store.ts';
import { createHouseholdStore, type HouseholdStore } from '../households/store.ts';
import { createEconomyScratch, type EconomyScratch } from '../economy/scratch.ts';
import { SPAWN, STRIDE } from '../random/streams.ts';
import { STRIDE_DAYS, createStride, type Stride } from '../day/stride.ts';
import { TIER_AGENTS, TIER_FIRMS, TIER_MEMORY_BYTES, TIER_TILES_PER_AGENT, type Tier } from '../memory/tiers.ts';
import { setHeading } from '../movement/walk.ts';

export const TICK = 0;
export const RECORD_FRONT = 1;
export const DAY_AGENTS = 2;
export const DAY_HOUSEHOLDS = 3;
// 1 for a town, whose step runs CITY's economy, and 0 for any other world (M2.2b).
export const TOWN = 4;
// The people the day's economy lays off on its first tick: the layoffs logged since the last boundary, added up when the
// boundary applies them, so only the boundary writes it (M2.2b).
export const DAY_LAYOFFS = 5;
// 1 for a world that runs the seven goods and food (EconomyParams.goods, which startEconomy and spawnFromLedger copy here),
// and 0 for one with the generic good. The state hash mixes the goods store in only while it is 1 (M2.4).
export const GOODS = 6;
const GLOBAL_SLOTS = 8;

// The settlement record is double-buffered: day slices fold into the back half, and the last slice flips
// globals[RECORD_FRONT], so a reader only ever sees a whole day.
export const RECORD_DAY = 0;
export const RECORD_POPULATION = 1;
export const RECORD_WALKING = 2;
export const RECORD_FIELDS = 3;

// Stand-ins until later milestones supply settlements, cultures, loans and money.
const SETTLEMENTS = 8;
export const STAND_IN_CULTURES = 4;
const LOAN_CAPACITY = 4_096;
export const OPENING_CENTS = 100_000;
const NO_FOCUS = -1;
// Three in four blobs spawn walking, the share that walking settles at (wander.ts), so the first seconds look like
// the rest.
export const WALK_START_MASK = 3;

export interface World {
  readonly seed: number;
  readonly tier: Tier;
  readonly arena: Arena;
  readonly globals: Int32Array;
  readonly agents: AgentStore;
  readonly firms: FirmStore;
  readonly households: HouseholdStore;
  readonly goods: GoodsStore;
  readonly economyScratch: EconomyScratch;
  readonly cash: Ledger;
  readonly blob: Blob;
  readonly claims: Claims;
  readonly record: Int32Array;
  readonly stride: Stride;
  readonly inputs: InputLog;
  // c + 1 per culture and 0 when unused. Culture-level draws key on these stable uids, never on the index (R8).
  readonly cultureUid: Uint8Array;
  // The watched settlement, or -1. Watching never writes canonical state (R4's shadow-canonical history).
  readonly focus: Int32Array;
  readonly ground: Ground;
  checks: boolean;
}

// The layout always holds the tier's whole count, so a smaller town moves no offset and a checkpoint restores at any size.
export function createWorld(seed: number, tier: Tier, ground?: Ground, agents: number = TIER_AGENTS[tier]): World {
  const world = layoutWorld(seed, tier, TIER_AGENTS[tier], TIER_MEMORY_BYTES[tier], ground);
  populate(world, agents);
  return world;
}

// A town's blobs: one to every TIER_TILES_PER_AGENT walkable tiles, never past the tier's own count, and never under the
// SUPPLIERS firms a town keeps, since its firms cannot outnumber its people (checkRecord).
export function townAgents(tier: Tier, ground: Ground): number {
  const fitting = Math.floor(walkableTiles(ground) / TIER_TILES_PER_AGENT[tier]);
  return Math.max(SUPPLIERS, Math.min(TIER_AGENTS[tier], fitting));
}

// No take is caught: create* is not atomic across its takes, so a world that does not fit is dropped whole.
export function layoutWorld(
  seed: number,
  tier: Tier,
  agents: number,
  memoryBytes: number,
  ground: Ground = standInGround(),
): World {
  // A short walk would read as open past its end.
  if (ground.walk.length !== ground.width * ground.height) {
    throw new RangeError(`a ${ground.width} x ${ground.height} ground needs ${ground.width * ground.height} walk cells`);
  }
  const arena = reserveArena(memoryBytes);
  const globals = take(arena, Int32Array, GLOBAL_SLOTS, true);
  const store = createAgentStore(arena, agents);
  const cash = createLedger(arena, SETTLEMENTS, agents, TIER_FIRMS[tier]);
  const blob = new Blob(store, cash);
  const claims = createClaims(arena, cash, LOAN_CAPACITY);
  const record = take(arena, Int32Array, 2 * RECORD_FIELDS, true);
  const stride = createStride(arena, agents, STRIDE_DAYS, STRIDE);
  const inputs = createInputLog(arena);
  const cultureUid = take(arena, Uint8Array, MAX_CULTURES, true);
  const focus = take(arena, Int32Array, 1, false);
  focus[0] = NO_FOCUS;
  const firms = createFirmStore(arena, TIER_FIRMS[tier]);
  const economyScratch = createEconomyScratch(arena, agents, TIER_FIRMS[tier]);
  const households = createHouseholdStore(arena, agents);
  const goods = createGoodsStore(arena, TIER_FIRMS[tier]);
  const world: World = {
    seed,
    tier,
    arena,
    globals,
    agents: store,
    firms,
    households,
    goods,
    economyScratch,
    cash,
    blob,
    claims,
    record,
    stride,
    inputs,
    cultureUid,
    focus,
    ground,
    checks: true,
  };
  for (let c = 0; c < STAND_IN_CULTURES; c++) cultureUid[c] = c + 1;
  // Nothing is committed before the first day's last slice.
  record[frontRecord(world) + RECORD_DAY] = -1;
  return world;
}

export function populate(world: World, people: number = world.agents.capacity): void {
  const seed = world.seed;
  const agents = world.agents;
  if (!Number.isInteger(people) || people < 1 || people > agents.capacity) {
    throw new RangeError(`a ${world.tier} world holds 1 to ${agents.capacity} agents, not ${people}`);
  }
  const width = world.ground.width;
  const open = openCells(world.ground);
  if (open.length === 0) throw new RangeError('the ground has no walkable cell to spawn on');
  for (let id = 0; id < people; id++) {
    const slot = addAgent(agents, seed, id, STAND_IN_CULTURES, 0);
    issue(world.cash, walletAccount(world.cash, slot), OPENING_CENTS);
    const cell = open[below(open.length, seed, SPAWN, id, 0)];
    const spot = draw2(seed, SPAWN, id, 1);
    agents.x[slot] = pointInTileQ8(cell % width, spot);
    agents.y[slot] = pointInTileQ8(Math.floor(cell / width), spot >>> 12);
    const start = draw2(seed, SPAWN, id, 2);
    if ((start & WALK_START_MASK) !== 0) {
      agents.action[slot] = ACTION_WALK;
      setHeading(agents, slot, start >>> 24);
    }
  }
}

export function currentTick(world: World): number {
  return world.globals[TICK];
}

export function committed(world: World, field: number): number {
  return world.record[frontRecord(world) + field];
}

function frontRecord(world: World): number {
  return world.globals[RECORD_FRONT] * RECORD_FIELDS;
}
