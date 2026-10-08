import { describe, expect, it } from 'vitest';
import { DAYS_PER_YEAR, TICKS_PER_DAY, TICKS_PER_YEAR, dayOfYear, yearOf } from '../src/calendar.ts';
import { dayBoundary } from '../src/day.ts';
import { draw2, mix } from '../src/draw.ts';
import { PHONE_MEMORY_BYTES, reserveArena } from '../src/memory.ts';
import { STRIDE } from '../src/streams.ts';
import {
  STRIDE_DAYS,
  applyChanges,
  createStride,
  firstDue,
  rekeyStride,
  setChange,
  type Stride,
} from '../src/stride.ts';
import { TICK, layoutWorld } from '../src/world.ts';

const ARENA_BYTES = 65_536;
const TOY_AGENTS = 10_000;
const TOY_DAYS = 224;
const TOY_SEED = 42;
const TOY_STREAM = 0x1f0;
const SHUFFLE_STREAM = 0x1f1;

function newStride(agents: number): Stride {
  return createStride(reserveArena(ARENA_BYTES), agents, STRIDE_DAYS, STRIDE);
}

function offsetFor(seed: number, year: number): number {
  const stride = newStride(1_024);
  rekeyStride(stride, seed, year);
  return stride.offset[0];
}

type Visit = (due: number[], day: number) => number[];

const forward: Visit = (due) => due;
const reversed: Visit = (due) => [...due].reverse();
const shuffled: Visit = (due, day) => {
  const order = [...due];
  for (let k = order.length - 1; k > 0; k--) {
    const j = draw2(TOY_SEED, SHUFFLE_STREAM, day, k) % (k + 1);
    const swapped = order[k];
    order[k] = order[j];
    order[j] = swapped;
  }
  return order;
};

function dueAgents(first: number): number[] {
  const due: number[] = [];
  for (let agent = first; agent < TOY_AGENTS; agent += STRIDE_DAYS) due.push(agent);
  return due;
}

// Half the agents start in state 1: from all zeros the count would stay 0 and no visiting order could differ.
function startingState(): Uint8Array {
  return new Uint8Array(TOY_AGENTS).fill(1, 0, TOY_AGENTS / 2);
}

function countOnes(state: Uint8Array): number {
  let ones = 0;
  for (let i = 0; i < state.length; i++) ones += state[i];
  return ones;
}

function hashColumn(column: Uint8Array): number {
  let hash = 0;
  for (let i = 0; i < column.length; i++) hash = mix(hash ^ column[i]);
  return hash;
}

function decide(agent: number, day: number, ones: number): number {
  return draw2(TOY_SEED, TOY_STREAM, agent, day) % TOY_AGENTS < ones ? 1 : 0;
}

// Every visit reads the boundary count and queues its change; applyChanges then writes them in agent order.
function runStrided(visit: Visit): number {
  const stride = newStride(TOY_AGENTS);
  const state = startingState();
  let hash = 0;
  for (let day = 0; day < TOY_DAYS; day++) {
    if (dayOfYear(day) === 0) rekeyStride(stride, TOY_SEED, yearOf(day));
    const ones = countOnes(state);
    const first = firstDue(stride, day);
    for (const agent of visit(dueAgents(first), day)) {
      setChange(stride, (agent - first) / STRIDE_DAYS, decide(agent, day, ones));
    }
    applyChanges(stride, day, TOY_AGENTS, state);
    hash = mix(hash ^ hashColumn(state));
  }
  return hash;
}

// Direct writes into the column. A live count follows every write; the boundary count is read once a day.
function runDirect(visit: Visit, live: boolean): number {
  const stride = newStride(TOY_AGENTS);
  const state = startingState();
  let hash = 0;
  for (let day = 0; day < TOY_DAYS; day++) {
    if (dayOfYear(day) === 0) rekeyStride(stride, TOY_SEED, yearOf(day));
    let ones = countOnes(state);
    for (const agent of visit(dueAgents(firstDue(stride, day)), day)) {
      const next = decide(agent, day, ones);
      if (live) ones += next - state[agent];
      state[agent] = next;
    }
    hash = mix(hash ^ hashColumn(state));
  }
  return hash;
}

describe('the stride scheduler', () => {
  it('makes each agent due 3 or 4 times a year', () => {
    const agents = 1_000;
    const stride = newStride(agents);
    for (let year = 1; year <= 5; year++) {
      rekeyStride(stride, 42, year);
      const due = new Uint8Array(agents);
      for (let day = (year - 1) * DAYS_PER_YEAR; day < year * DAYS_PER_YEAR; day++) {
        for (let agent = firstDue(stride, day); agent < agents; agent += STRIDE_DAYS) due[agent]++;
      }
      expect(due.filter((times) => times !== 3 && times !== 4), `year ${year}`).toHaveLength(0);
    }

    rekeyStride(stride, 43, 1);
    expect(stride.offset[0]).toBe(17);
    expect(firstDue(stride, 0)).toBe(13);
  });

  // Expected offsets come from tools/worldgen/rng.py: draw(seed, 0x104, year, 30) % 30.
  it('re-keys the offset yearly from the seed', () => {
    const offsets = Array.from({ length: 20 }, (_, i) => offsetFor(42, i + 1));
    expect(offsets).toEqual([19, 14, 7, 2, 8, 15, 14, 2, 12, 9, 11, 27, 27, 18, 26, 0, 1, 7, 24, 18]);
    expect(new Set(offsets).size).toBeGreaterThanOrEqual(10);
    expect(Array.from({ length: 5 }, (_, i) => offsetFor(43, i + 1))).toEqual([17, 27, 12, 16, 24]);
  });

  it('re-keys at the first day boundary of each year', () => {
    const world = layoutWorld(42, 'phone', 1_024, PHONE_MEMORY_BYTES);
    dayBoundary(world);
    expect(world.stride.offset[0]).toBe(offsetFor(42, 1));

    world.globals[TICK] = TICKS_PER_YEAR;
    dayBoundary(world);
    expect(world.stride.offset[0]).toBe(offsetFor(42, 2));
    expect(offsetFor(42, 2)).not.toBe(offsetFor(42, 1));

    world.stride.offset[0] = -1;
    world.globals[TICK] = TICKS_PER_YEAR + TICKS_PER_DAY;
    dayBoundary(world);
    expect(world.stride.offset[0]).toBe(-1);
  });

  it('gives identical hashes in reversed visiting order', () => {
    const forwardHash = runStrided(forward);
    expect(runStrided(reversed)).toBe(forwardHash);
    expect(runStrided(shuffled)).toBe(forwardHash);
    expect(runDirect(forward, false)).toBe(forwardHash);
    expect(runDirect(reversed, true)).not.toBe(runDirect(forward, true));
  });

  it('writes only the flagged changes, once', () => {
    const stride = newStride(100);
    rekeyStride(stride, 43, 1);
    const column = new Int32Array(100).fill(-1);
    setChange(stride, 0, 5);
    setChange(stride, 2, 9);

    applyChanges(stride, 0, 100, column);
    expect(Array.from(column.entries()).filter(([, value]) => value !== -1)).toEqual([
      [13, 5],
      [73, 9],
    ]);

    column.fill(-1);
    applyChanges(stride, 0, 100, column);
    expect(column.every((value) => value === -1)).toBe(true);
  });

  it('puts the offset in the hash and leaves the change list out', () => {
    const arena = reserveArena(ARENA_BYTES);
    const stride = createStride(arena, 1_000, STRIDE_DAYS, STRIDE);
    const hashedOffsets = arena.canonical.filter((_, i) => i % 2 === 0);
    expect(hashedOffsets).toEqual([stride.offset.byteOffset]);
  });
});
