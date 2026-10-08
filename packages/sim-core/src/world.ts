import { createClaims, type Claims } from './claims.ts';
import { draw2, mix } from './draw.ts';
import { HOUSEHOLDS, createLedger, issue, sectorAccount, type Ledger } from './ledger.ts';
import { reserveArena, take, type Arena } from './memory.ts';
import { SUBPIXELS, TILE_PX } from './space.ts';
import { addAgent, createAgentStore, type AgentStore } from './store.ts';
import { SPAWN } from './streams.ts';
import { TIER_AGENTS, TIER_MEMORY_BYTES, type Tier } from './tiers.ts';

export const TICK = 0;
const GLOBAL_SLOTS = 8;

// The stand-in world until M0.4's map.
const MAP_TILES = 256;
const EXTENT_Q8 = MAP_TILES * TILE_PX * SUBPIXELS;
const SETTLEMENTS = 8;
const CULTURES = 4;
const LOAN_CAPACITY = 4_096;
const STARTING_CENTS = 100_000;

export interface World {
  readonly seed: number;
  readonly tier: Tier;
  readonly arena: Arena;
  readonly globals: Int32Array;
  readonly agents: AgentStore;
  readonly cash: Ledger;
  readonly claims: Claims;
  readonly extent: number;
  checks: boolean;
}

export function createWorld(seed: number, tier: Tier): World {
  const world = layoutWorld(seed, tier, TIER_AGENTS[tier], TIER_MEMORY_BYTES[tier]);
  populate(world);
  return world;
}

// No take is caught: create* is not atomic across its takes, so a world that does not fit is dropped whole.
export function layoutWorld(seed: number, tier: Tier, agents: number, memoryBytes: number): World {
  const arena = reserveArena(memoryBytes);
  const globals = take(arena, Int32Array, GLOBAL_SLOTS, true);
  const store = createAgentStore(arena, agents);
  const cash = createLedger(arena, SETTLEMENTS);
  const claims = createClaims(arena, cash, LOAN_CAPACITY);
  return { seed, tier, arena, globals, agents: store, cash, claims, extent: EXTENT_Q8, checks: true };
}

export function populate(world: World): void {
  const seed = world.seed;
  const agents = world.agents;
  const people = agents.capacity;
  // extent is a power of two, so the mask keeps every draw on the map.
  const mask = world.extent - 1;
  for (let id = 0; id < people; id++) {
    const slot = addAgent(agents, seed, id, CULTURES, 0);
    agents.x[slot] = draw2(seed, SPAWN, id, 0) & mask;
    agents.y[slot] = draw2(seed, SPAWN, id, 1) & mask;
  }
  issue(world.cash, sectorAccount(0, HOUSEHOLDS), STARTING_CENTS * people);
}

export function currentTick(world: World): number {
  return world.globals[TICK];
}

// The one view this makes is fine here: the hash runs between ticks, never inside step.
export function stateHash(world: World): number {
  const words = new Uint32Array(world.arena.memory.buffer);
  const regions = world.arena.canonical;
  let h = 0;
  for (let r = 0; r < regions.length; r += 2) {
    const end = (regions[r] + regions[r + 1]) / 4;
    for (let word = regions[r] / 4; word < end; word++) h = mix(h ^ words[word]);
  }
  return h;
}

export function checkpoint(world: World): ArrayBuffer {
  return world.arena.memory.buffer.slice(0, world.arena.top);
}

export function restoreWorld(seed: number, tier: Tier, state: ArrayBuffer): World {
  const world = layoutWorld(seed, tier, TIER_AGENTS[tier], TIER_MEMORY_BYTES[tier]);
  if (state.byteLength !== world.arena.top) {
    throw new RangeError(`a ${tier} checkpoint holds ${world.arena.top} bytes, not ${state.byteLength}`);
  }
  new Uint8Array(world.arena.memory.buffer).set(new Uint8Array(state));
  return world;
}
