import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACTION_IDLE, ACTION_WALK, FACING_RIGHT, FACING_UP } from '../src/agents/actions.ts';
import { draw2 } from '../src/random/draw.ts';
import { CASH_NOT_ZERO, OK, checkInvariants } from '../src/money/invariants.ts';
import { HOUSEHOLDS, MINT, sectorAccount, walletAccount } from '../src/money/ledger.ts';
import { SYSTEM_NAMES, step, type SystemTimer } from '../src/step/step.ts';
import { SPAWN } from '../src/random/streams.ts';
import { TICKS_PER_DAY } from '../src/time/calendar.ts';
import { TIER_AGENTS, TIER_MEMORY_BYTES, type Tier } from '../src/memory/tiers.ts';
import { WALK_X_Q8, WALK_Y_Q8, facingFor } from '../src/movement/walk.ts';
import { checkpoint, restoreWorld, stateHash } from '../src/world/checkpoint.ts';
import {
  OPENING_CENTS,
  TICK,
  createWorld,
  currentTick,
  layoutWorld,
  populate,
  type World,
} from '../src/world/world.ts';
import type { Goldens } from './engines/checks.ts';
import { run } from './run.ts';

const goldens: Goldens = JSON.parse(readFileSync(new URL('./fixtures/goldens.json', import.meta.url), 'utf8'));
const TIERS: readonly Tier[] = ['phone', 'phone-plus', 'desktop'];
const TILE_Q8 = 16 * 256;
const WALK_Q8 = 1_024;

function agentsOffMap(world: World): number[] {
  const { count, x, y } = world.agents;
  const widthQ8 = world.ground.width * TILE_Q8;
  const heightQ8 = world.ground.height * TILE_Q8;
  const ids: number[] = [];
  for (let i = 0; i < count[0]; i++) {
    if (x[i] < 0 || x[i] >= widthQ8 || y[i] < 0 || y[i] >= heightQ8) ids.push(i);
  }
  return ids;
}

// An idler stands still, a walker takes its heading's step, and both face the way their heading points.
function agentsMovingWrongly(world: World): number[] {
  const { count, vx, vy, action, facing, heading } = world.agents;
  const ids: number[] = [];
  for (let i = 0; i < count[0]; i++) {
    const walking = action[i] === ACTION_WALK;
    const [wantX, wantY] = walking ? [WALK_X_Q8[heading[i]], WALK_Y_Q8[heading[i]]] : [0, 0];
    const wrongAction = !walking && action[i] !== ACTION_IDLE;
    if (vx[i] !== wantX || vy[i] !== wantY || wrongAction || facing[i] !== facingFor(heading[i])) ids.push(i);
  }
  return ids;
}

function walkingShare(world: World): number {
  const { count, action } = world.agents;
  return action.subarray(0, count[0]).filter((a) => a === ACTION_WALK).length / count[0];
}

function walletsOffOpening(world: World): number[] {
  const slots: number[] = [];
  for (let i = 0; i < world.agents.count[0]; i++) {
    if (world.cash.balance[walletAccount(world.cash, i)] !== OPENING_CENTS) slots.push(i);
  }
  return slots;
}

describe('the world step', () => {
  it('gives seed 42 the same state hash at tick 1,000 across runs', () => {
    const hash = stateHash(run(createWorld(42, 'phone'), 1_000));
    // Pinned in goldens.json, because CI's two-run diff can't see a change in behaviour.
    expect(hash).toBe(Number.parseInt(goldens.hashes['42/phone'], 16));
    expect(stateHash(run(createWorld(42, 'phone'), 1_000))).toBe(hash);
    expect(stateHash(run(createWorld(43, 'phone'), 1_000))).not.toBe(hash);
  });

  it('walks agents on the map in whole sub-pixels', () => {
    const world = run(createWorld(42, 'phone'), 1_000);
    const { count, x, y, action } = world.agents;
    expect(world.ground.width * TILE_Q8).toBe(2 ** 20);
    expect(x).toBeInstanceOf(Int32Array);
    expect(y).toBeInstanceOf(Int32Array);
    expect(agentsOffMap(world)).toEqual([]);
    expect(agentsMovingWrongly(world)).toEqual([]);
    const walkerShare = action.subarray(0, count[0]).filter((a) => a === ACTION_WALK).length / count[0];
    expect(walkerShare).toBeGreaterThanOrEqual(0.65);
    expect(walkerShare).toBeLessThanOrEqual(0.85);
  });

  it('spawns three in four blobs walking, each on its keyed heading, and the rest idle facing down', () => {
    const world = createWorld(42, 'phone');
    const { count, action, heading } = world.agents;
    expect(agentsMovingWrongly(world)).toEqual([]);
    const wrong: number[] = [];
    const walkingHeadings: number[] = [];
    for (let i = 0; i < count[0]; i++) {
      const roll = draw2(42, SPAWN, i, 2);
      const walks = (roll & 3) !== 0;
      if (walks) walkingHeadings.push(roll >>> 24);
      if (action[i] !== (walks ? ACTION_WALK : ACTION_IDLE) || heading[i] !== (walks ? roll >>> 24 : 0)) wrong.push(i);
    }
    expect(wrong).toEqual([]);
    expect(walkingShare(world)).toBeGreaterThan(0.73);
    expect(walkingShare(world)).toBeLessThan(0.77);
    expect(new Set(walkingHeadings.map((h) => h >> 6)).size).toBe(4);
  });

  it('keeps about three in four blobs walking from the first tick, not ramping up to it', () => {
    const world = createWorld(42, 'phone');
    const shares: Record<number, number> = {};
    for (let tick = 0; tick <= 64; tick++) {
      if (tick === 0 || tick === 16 || tick === 64) shares[tick] = walkingShare(world);
      step(world);
    }
    for (const tick of [0, 16, 64]) {
      expect(shares[tick], `tick ${tick}`).toBeGreaterThan(0.73);
      expect(shares[tick], `tick ${tick}`).toBeLessThan(0.77);
    }
  });

  it('turns a walker off the map edge instead of stepping off it or straight back', () => {
    const world = layoutWorld(42, 'phone', 1, 1_048_576);
    populate(world);
    const { x, y, vx, vy, action, facing, heading } = world.agents;
    const edgeQ8 = world.ground.width * TILE_Q8 - 1;
    action[0] = ACTION_WALK;
    heading[0] = 192;
    facing[0] = FACING_RIGHT;
    vx[0] = WALK_Q8;
    vy[0] = 0;
    x[0] = edgeQ8;
    const y0 = y[0];
    world.globals[TICK] = 1; // agent 0 redraws only on ticks divisible by 16

    step(world);
    expect([x[0], y[0], heading[0], facing[0], vx[0], vy[0]]).toEqual([edgeQ8, y0, 96, FACING_UP, -724, -724]);
    step(world);
    expect([x[0], y[0]]).toEqual([edgeQ8 - 724, y0 - 724]);
  });

  it('checks the money invariants every tick in development', () => {
    const world = createWorld(42, 'phone');
    expect(world.checks).toBe(true);
    step(world);
    world.cash.balance[MINT] += 1;
    expect(() => step(world)).toThrow(`code ${CASH_NOT_ZERO}`);
    world.checks = false;
    expect(() => step(world)).not.toThrow();
  });

  it('restores a checkpoint into the same future', () => {
    const original = run(createWorld(42, 'phone'), 500);
    const restored = restoreWorld(42, 'phone', checkpoint(original));
    expect([currentTick(restored), stateHash(restored)]).toEqual([500, stateHash(original)]);
    expect(stateHash(run(restored, 1_000))).toBe(stateHash(run(original, 1_000)));
    expect(() => restoreWorld(42, 'phone', checkpoint(createWorld(42, 'phone-plus')))).toThrow(RangeError);
  });

  it('hashes every canonical region, the globals and the record included', () => {
    const world = createWorld(42, 'phone');
    const regions = world.arena.canonical;
    const bytes = new Uint8Array(world.arena.memory.buffer);
    const hash = stateHash(world);
    const offsets = regions.filter((_, i) => i % 2 === 0);
    expect(offsets).toContain(world.globals.byteOffset);
    expect(offsets).toContain(world.record.byteOffset);
    for (let r = 0; r < regions.length; r += 2) {
      for (const at of [regions[r], regions[r] + regions[r + 1] - 1]) {
        bytes[at] ^= 1;
        expect(stateHash(world), `byte ${at}`).not.toBe(hash);
        bytes[at] ^= 1;
      }
    }
    expect(stateHash(world)).toBe(hash);
  });

  it('fits every tier and opens every wallet from MINT', () => {
    expect(OPENING_CENTS).toBe(100_000);
    for (const tier of TIERS) {
      const world = createWorld(42, tier);
      const agents = TIER_AGENTS[tier];
      const balance = world.cash.balance;
      expect(world.agents.count[0], tier).toBe(agents);
      expect(world.arena.top, tier).toBeLessThanOrEqual(TIER_MEMORY_BYTES[tier]);
      expect(balance[MINT], tier).toBe(-OPENING_CENTS * agents);
      expect(walletsOffOpening(world), tier).toEqual([]);
      expect(balance[sectorAccount(0, HOUSEHOLDS)], tier).toBe(0);
      expect(balance.filter((cents) => cents !== 0), tier).toHaveLength(agents + 1);
      expect(checkInvariants(world.cash, world.claims), tier).toBe(OK);
    }
    expect(() => layoutWorld(42, 'phone', 10_000, 65_536)).toThrow(RangeError);
  });

  it('leaves every wallet as it opened after two days', () => {
    const world = run(createWorld(42, 'phone'), 2 * TICKS_PER_DAY);
    expect(walletsOffOpening(world)).toEqual([]);
  });

  it('laps the timer once per system per tick', () => {
    const laps: number[] = [];
    const timer: SystemTimer = { lap: (system) => laps.push(system) };
    const world = createWorld(42, 'phone');
    for (let tick = 0; tick < 3; tick++) step(world, timer);
    expect(SYSTEM_NAMES).toEqual(['day', 'move']);
    expect(laps).toEqual([0, 1, 0, 1, 0, 1]);
  });
});
