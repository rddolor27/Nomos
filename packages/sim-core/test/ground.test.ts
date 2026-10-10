import { describe, expect, it } from 'vitest';
import { SUPPLIERS } from '../src/agents/store.ts';
import { draw2 } from '../src/random/draw.ts';
import { standInGround, walkableTiles, type Ground } from '../src/world/ground.ts';
import { PHONE_MEMORY_BYTES } from '../src/memory/arena.ts';
import { OK, checkInvariants } from '../src/money/invariants.ts';
import { MINT } from '../src/money/ledger.ts';
import { step } from '../src/step/step.ts';
import { SPAWN } from '../src/random/streams.ts';
import { checkpoint, restoreWorld, stateHash } from '../src/world/checkpoint.ts';
import { OPENING_CENTS, createWorld, layoutWorld, populate, townAgents, type World } from '../src/world/world.ts';
import { run } from './run.ts';

const TILE_Q8 = 16 * 256;
const ROOM = { x: 4, y: 10, width: 12, height: 6 };

// A 32 × 32 ground, open only in the room's 12 × 6 cells.
function roomGround(): Ground {
  const width = 32;
  const walk = new Uint8Array(width * 32);
  for (let ty = ROOM.y; ty < ROOM.y + ROOM.height; ty++) walk.fill(1, ty * width + ROOM.x, ty * width + ROOM.x + ROOM.width);
  return { width, height: 32, walk };
}

function agentsOutsideRoom(world: World): number {
  const { count, x, y } = world.agents;
  let outside = 0;
  for (let i = 0; i < count[0]; i++) {
    const tx = Math.floor(x[i] / TILE_Q8) - ROOM.x;
    const ty = Math.floor(y[i] / TILE_Q8) - ROOM.y;
    if (tx < 0 || tx >= ROOM.width || ty < 0 || ty >= ROOM.height) outside++;
  }
  return outside;
}

function agentsSharingASpot(world: World): number {
  const { count, x, y } = world.agents;
  const spots = new Set<string>();
  for (let i = 0; i < count[0]; i++) spots.add(`${x[i]},${y[i]}`);
  return count[0] - spots.size;
}

describe('the ground', () => {
  it('keeps agents on walkable cells', () => {
    const world = createWorld(42, 'phone', roomGround());
    const { count, x, y } = world.agents;
    expect(count[0]).toBe(10_000);
    expect(agentsOutsideRoom(world)).toBe(0);
    // For seed 42, 139 agents a tile still spawn at keyed points of their own, so none stack.
    expect(agentsSharingASpot(world)).toBe(0);
    const spawnX = x.slice();
    const spawnY = y.slice();

    let mostOutside = 0;
    for (let tick = 0; tick < 1_000; tick++) {
      step(world);
      mostOutside = Math.max(mostOutside, agentsOutsideRoom(world));
    }
    expect(mostOutside).toBe(0);
    const moved = spawnX.filter((spawn, i) => spawn !== x[i] || spawnY[i] !== y[i]).length;
    expect(moved).toBeGreaterThan(5_000);
  });

  it('spawns agents at keyed points spread over their tiles', () => {
    const { x, y } = createWorld(42, 'phone').agents;
    const d = draw2(42, SPAWN, 0, 1);
    expect([x[0] % TILE_Q8, y[0] % TILE_Q8]).toEqual([d & 4_095, (d >>> 12) & 4_095]);
    // 10,000 agents on 100 open tiles, ten times as crowded as the phone tier on the town's 958, never share a point
    // for seed 42.
    const walk = new Uint8Array(32 * 32);
    walk.fill(1, 0, 100);
    const crowded = layoutWorld(42, 'phone', 10_000, PHONE_MEMORY_BYTES, { width: 32, height: 32, walk });
    populate(crowded);
    const offsets = new Set(Array.from(crowded.agents.x, (q8) => q8 % TILE_Q8));
    expect(agentsSharingASpot(crowded)).toBe(0);
    expect(offsets.size).toBeGreaterThan(3_500);
  });

  it('keeps the stand-in world', () => {
    for (const world of [createWorld(42, 'phone'), layoutWorld(42, 'phone', 1, 1_048_576)]) {
      expect([world.ground.width, world.ground.height]).toEqual([256, 256]);
      expect(world.ground.walk).toHaveLength(65_536);
      expect(world.ground.walk.every((walk) => walk !== 0)).toBe(true);
    }
  });

  it('restores onto the same ground', () => {
    const ground = roomGround();
    const original = run(createWorld(42, 'phone', ground), 500);
    const state = checkpoint(original);
    const restored = restoreWorld(42, 'phone', state, ground);
    expect(restored.ground).toBe(ground);
    const hash = stateHash(run(original, 1_000));
    expect(stateHash(run(restored, 1_000))).toBe(hash);
    expect(stateHash(run(restoreWorld(42, 'phone', state), 1_000))).not.toBe(hash);
  });

  it('refuses a ground with no open cell or a walk of the wrong size', () => {
    expect(() => createWorld(42, 'phone', { width: 4, height: 4, walk: new Uint8Array(16) })).toThrow(RangeError);
    expect(() => createWorld(42, 'phone', { width: 4, height: 4, walk: new Uint8Array(15).fill(1) })).toThrow(RangeError);
  });
});

describe('a town of blobs', () => {
  it('counts the walkable tiles', () => {
    expect(walkableTiles(roomGround())).toBe(ROOM.width * ROOM.height);
    expect(walkableTiles(standInGround())).toBe(65_536);
  });

  it("fills a town at its tier's density, never past its tier and never under its 7 firms", () => {
    const hundred = new Uint8Array(32 * 32);
    hundred.fill(1, 0, 100);
    const small: Ground = { width: 32, height: 32, walk: hundred };
    const tiers = ['desktop', 'phone-plus', 'phone'] as const;
    expect(tiers.map((tier) => townAgents(tier, small))).toEqual([50, 33, 25]);
    expect(tiers.map((tier) => townAgents(tier, standInGround()))).toEqual([32_768, 21_845, 10_000]);
    const lone: Ground = { width: 2, height: 2, walk: new Uint8Array([0, 0, 0, 1]) };
    expect(tiers.map((tier) => townAgents(tier, lone))).toEqual([SUPPLIERS, SUPPLIERS, SUPPLIERS]);
  });

  it('spawns a town smaller than its tier in the places the full tier would use', () => {
    const ground = roomGround();
    const full = createWorld(42, 'phone', ground);
    const town = createWorld(42, 'phone', ground, 300);
    const { count, capacity, x, y, look } = town.agents;
    expect([count[0], capacity]).toEqual([300, 10_000]);
    expect(town.arena.top).toBe(full.arena.top);
    for (const column of ['x', 'y', 'look'] as const) {
      expect(town.agents[column].slice(0, 300), column).toEqual(full.agents[column].slice(0, 300));
    }
    expect([x[300], y[300], look[300]]).toEqual([0, 0, 0]);
    expect(town.cash.balance[MINT]).toBe(-OPENING_CENTS * 300);
    expect(agentsOutsideRoom(town)).toBe(0);
    expect(checkInvariants(town.cash, town.claims)).toBe(OK);
  });

  it('refuses a count the tier cannot hold', () => {
    for (const agents of [0, -1, 1.5, 10_001]) {
      expect(() => createWorld(42, 'phone', roomGround(), agents), String(agents)).toThrow(RangeError);
    }
  });

  it('replays a smaller town from its seed and restores it from a checkpoint', () => {
    const ground = roomGround();
    const original = run(createWorld(42, 'phone', ground, 300), 500);
    const restored = restoreWorld(42, 'phone', checkpoint(original), ground);
    expect(restored.agents.count[0]).toBe(300);
    const hash = stateHash(run(original, 1_000));
    expect(stateHash(run(restored, 1_000))).toBe(hash);
    expect(stateHash(run(createWorld(42, 'phone', ground, 300), 1_000))).toBe(hash);
  });
});
