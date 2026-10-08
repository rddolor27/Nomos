import { createClaims, type Claims } from './claims.ts';
import { below, draw2, mix } from './draw.ts';
import { openCells, pointInTileQ8, standInGround, type Ground } from './ground.ts';
import { createInputLog, type InputLog } from './inputs.ts';
import { HOUSEHOLDS, createLedger, issue, sectorAccount, type Ledger } from './ledger.ts';
import { reserveArena, take, type Arena } from './memory.ts';
import { MAX_CULTURES, addAgent, createAgentStore, type AgentStore } from './store.ts';
import { SPAWN, STRIDE } from './streams.ts';
import { STRIDE_DAYS, createStride, type Stride } from './stride.ts';
import { TIER_AGENTS, TIER_MEMORY_BYTES, type Tier } from './tiers.ts';

export const TICK = 0;
export const RECORD_FRONT = 1;
export const DAY_AGENTS = 2;
export const DAY_HOUSEHOLDS = 3;
const GLOBAL_SLOTS = 8;

// The settlement record is double-buffered: day slices fold into the back half, and the last slice flips
// globals[RECORD_FRONT], so a reader only ever sees a whole day.
export const RECORD_DAY = 0;
export const RECORD_POPULATION = 1;
export const RECORD_WALKING = 2;
export const RECORD_FIELDS = 3;

// Stand-ins until later milestones supply settlements, cultures, loans and money.
const SETTLEMENTS = 8;
const CULTURES = 4;
const LOAN_CAPACITY = 4_096;
const STARTING_CENTS = 100_000;
const NO_FOCUS = -1;

export interface World {
  readonly seed: number;
  readonly tier: Tier;
  readonly arena: Arena;
  readonly globals: Int32Array;
  readonly agents: AgentStore;
  readonly cash: Ledger;
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

export function createWorld(seed: number, tier: Tier, ground?: Ground): World {
  const world = layoutWorld(seed, tier, TIER_AGENTS[tier], TIER_MEMORY_BYTES[tier], ground);
  populate(world);
  return world;
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
  const cash = createLedger(arena, SETTLEMENTS);
  const claims = createClaims(arena, cash, LOAN_CAPACITY);
  const record = take(arena, Int32Array, 2 * RECORD_FIELDS, true);
  const stride = createStride(arena, agents, STRIDE_DAYS, STRIDE);
  const inputs = createInputLog(arena);
  const cultureUid = take(arena, Uint8Array, MAX_CULTURES, true);
  const focus = take(arena, Int32Array, 1, false);
  focus[0] = NO_FOCUS;
  return {
    seed,
    tier,
    arena,
    globals,
    agents: store,
    cash,
    claims,
    record,
    stride,
    inputs,
    cultureUid,
    focus,
    ground,
    checks: true,
  };
}

export function populate(world: World): void {
  const seed = world.seed;
  const agents = world.agents;
  const people = agents.capacity;
  const width = world.ground.width;
  const open = openCells(world.ground);
  if (open.length === 0) throw new RangeError('the ground has no walkable cell to spawn on');
  for (let c = 0; c < CULTURES; c++) world.cultureUid[c] = c + 1;
  for (let id = 0; id < people; id++) {
    const slot = addAgent(agents, seed, id, CULTURES, 0);
    const cell = open[below(open.length, seed, SPAWN, id, 0)];
    const spot = draw2(seed, SPAWN, id, 1);
    agents.x[slot] = pointInTileQ8(cell % width, spot);
    agents.y[slot] = pointInTileQ8(Math.floor(cell / width), spot >>> 12);
  }
  issue(world.cash, sectorAccount(0, HOUSEHOLDS), STARTING_CENTS * people);
  // Nothing is committed before the first day's last slice.
  world.record[frontRecord(world) + RECORD_DAY] = -1;
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

const NO_SKIP: readonly ArrayBufferView[] = [];

export function stateHash(world: World): number {
  return stateHashExcept(world, NO_SKIP);
}

// Skips each canonical region that starts where a given view does; the relabel test skips the culture regions (R8).
// The one view this makes is fine here: the hash runs between ticks, never inside step.
export function stateHashExcept(world: World, skip: readonly ArrayBufferView[]): number {
  const words = new Uint32Array(world.arena.memory.buffer);
  const regions = world.arena.canonical;
  let h = 0;
  for (let r = 0; r < regions.length; r += 2) {
    if (startsAView(regions[r], skip)) continue;
    const end = (regions[r] + regions[r + 1]) / 4;
    for (let word = regions[r] / 4; word < end; word++) h = mix(h ^ words[word]);
  }
  return h;
}

function startsAView(byteOffset: number, views: readonly ArrayBufferView[]): boolean {
  for (let v = 0; v < views.length; v++) if (views[v].byteOffset === byteOffset) return true;
  return false;
}

export function checkpoint(world: World): ArrayBuffer {
  return world.arena.memory.buffer.slice(0, world.arena.top);
}

export function restoreWorld(seed: number, tier: Tier, state: ArrayBuffer, ground?: Ground): World {
  const world = layoutWorld(seed, tier, TIER_AGENTS[tier], TIER_MEMORY_BYTES[tier], ground);
  if (state.byteLength !== world.arena.top) {
    throw new RangeError(`a ${tier} checkpoint holds ${world.arena.top} bytes, not ${state.byteLength}`);
  }
  new Uint8Array(world.arena.memory.buffer).set(new Uint8Array(state));
  return world;
}
