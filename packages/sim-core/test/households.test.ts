import { describe, expect, it } from 'vitest';
import { LENGNICK } from '../src/economy/params.ts';
import { startEconomy } from '../src/economy/start.ts';
import { MAX_HOUSEHOLD, NO_HOME } from '../src/households/store.ts';
import { PHONE_MEMORY_BYTES } from '../src/memory/arena.ts';
import { checkpoint, restoreWorld, stateHash } from '../src/world/checkpoint.ts';
import { RECORD_DAY, STAND_IN_CULTURES, committed, createWorld, layoutWorld } from '../src/world/world.ts';

describe('the household rows', () => {
  it('number up to six people and take a home or none', () => {
    expect([MAX_HOUSEHOLD, NO_HOME]).toEqual([6, -1]);
  });

  it('give a phone world 10,000 empty rows, in the hashed regions', () => {
    const { households, arena } = createWorld(42, 'phone');
    expect([households.capacity, households.size.length, households.home.length]).toEqual([10_000, 10_000, 10_000]);
    expect(households.size).toBeInstanceOf(Uint8Array);
    expect(households.home).toBeInstanceOf(Int32Array);
    expect(households.count[0]).toBe(0);
    const hashed = arena.canonical.filter((_, i) => i % 2 === 0);
    for (const [name, column] of Object.entries({ count: households.count, size: households.size, home: households.home })) {
      expect(hashed, name).toContain(column.byteOffset);
    }
  });

  it('change the state hash with any field, first row or last', () => {
    const world = createWorld(42, 'phone');
    const { count, size, home, capacity } = world.households;
    const clean = stateHash(world);
    for (const [name, column, row] of [
      ['count', count, 0],
      ['size', size, 0],
      ['size', size, capacity - 1],
      ['home', home, 0],
      ['home', home, capacity - 1],
    ] as const) {
      column[row] += 1;
      expect(stateHash(world), `${name}[${row}]`).not.toBe(clean);
      column[row] -= 1;
    }
    expect(stateHash(world)).toBe(clean);
  });

  it('go through a checkpoint', () => {
    const world = createWorld(42, 'phone');
    const { count, size, home } = world.households;
    count[0] = 3;
    size.set([1, 2, MAX_HOUSEHOLD]);
    home.set([NO_HOME, 4, 9]);

    const restored = restoreWorld(42, 'phone', checkpoint(world));

    expect(stateHash(restored)).toBe(stateHash(world));
    expect(restored.households.count[0]).toBe(3);
    expect(Array.from(restored.households.size.subarray(0, 4))).toEqual([1, 2, MAX_HOUSEHOLD, 0]);
    expect(Array.from(restored.households.home.subarray(0, 4))).toEqual([NO_HOME, 4, 9, 0]);
  });

  it('start the economy as a household of one for every blob, with no home', () => {
    const world = createWorld(1, 'phone', undefined, LENGNICK.households);
    expect(world.households.count[0]).toBe(0);
    startEconomy(world, LENGNICK);
    const { count, size, home } = world.households;
    expect(count[0]).toBe(LENGNICK.households);
    expect(size.subarray(0, LENGNICK.households).every((people) => people === 1)).toBe(true);
    expect(home.subarray(0, LENGNICK.households).every((place) => place === NO_HOME)).toBe(true);
    expect([size[LENGNICK.households], home[LENGNICK.households]]).toEqual([0, 0]);
  });
});

describe('the layout of a world', () => {
  it('seats the four stand-in cultures and leaves the day uncommitted, with no blob placed', () => {
    const world = layoutWorld(42, 'phone', 1_024, PHONE_MEMORY_BYTES);
    expect(STAND_IN_CULTURES).toBe(4);
    expect(Array.from(world.cultureUid)).toEqual([1, 2, 3, 4, 0, 0, 0, 0]);
    expect(committed(world, RECORD_DAY)).toBe(-1);
    expect([world.agents.count[0], world.households.count[0]]).toEqual([0, 0]);
    expect(world.households.capacity).toBe(1_024);
  });
});
