import { describe, expect, it } from 'vitest';
import { draw1, draw2 } from '../src/random/draw.ts';
import { DESKTOP_MEMORY_BYTES, PHONE_MEMORY_BYTES, reserveArena } from '../src/memory/arena.ts';
import { PERSON_NAME, layerOf } from '../src/random/streams.ts';
import { CELL_SHIFT, SUBPIXELS, TILE_PX, cellOf } from '../src/world/space.ts';
import { createWorld } from '../src/world/world.ts';
import { AGENT_COLUMNS, SUPPLIERS, addAgent, createAgentStore } from '../src/agents/store.ts';

describe('the agent store', () => {
  it('fits 25,000 agents in a phone reservation and 100,000 in a desktop one', () => {
    expect(createAgentStore(reserveArena(PHONE_MEMORY_BYTES), 25_000).x).toHaveLength(25_000);
    const store = createAgentStore(reserveArena(DESKTOP_MEMORY_BYTES), 100_000);
    // A column of whole bytes to an agent, such as suppliers at SUPPLIERS to each; the count is one cell, not a column.
    const perAgent = Object.entries(store).filter(
      ([, column]) => ArrayBuffer.isView(column) && column.byteLength % store.capacity === 0,
    );
    expect(Object.fromEntries(perAgent.map(([name, column]) => [name, column.byteLength / store.capacity]))).toEqual(
      Object.fromEntries(AGENT_COLUMNS.map(({ name, bytes }) => [name, bytes])),
    );
    expect(AGENT_COLUMNS.reduce((sum, { bytes }) => sum + bytes, 0)).toBeLessThanOrEqual(256);
  });

  it('counts the five economy columns, suppliers as 28 bytes', () => {
    expect(SUPPLIERS).toBe(7);
    expect(AGENT_COLUMNS.slice(-5)).toEqual([
      { name: 'employer', bytes: 4 },
      { name: 'reservationWage', bytes: 8 },
      { name: 'suppliers', bytes: 28 },
      { name: 'stockedOut', bytes: 1 },
      { name: 'plannedUnits', bytes: 4 },
    ]);
    const store = createAgentStore(reserveArena(65_536), 10);
    expect(store.employer).toBeInstanceOf(Int32Array);
    expect(store.reservationWage).toBeInstanceOf(Float64Array);
    expect(store.suppliers).toBeInstanceOf(Int32Array);
    expect(store.suppliers).toHaveLength(10 * SUPPLIERS);
    expect(store.stockedOut).toBeInstanceOf(Uint8Array);
    expect(store.plannedUnits).toBeInstanceOf(Int32Array);
  });

  it('adds an agent unemployed and without a supplier, writing over whatever the slot held', () => {
    const store = createAgentStore(reserveArena(65_536), 3);
    store.employer.fill(9);
    store.suppliers.fill(9);
    addAgent(store, 42, 0, 1, 0);
    addAgent(store, 42, 1, 1, 0);
    expect(Array.from(store.employer)).toEqual([-1, -1, 9]);
    expect(Array.from(store.suppliers)).toEqual([...Array(2 * SUPPLIERS).fill(-1), ...Array(SUPPLIERS).fill(9)]);
    expect(Array.from(store.reservationWage)).toEqual([0, 0, 0]);
    expect(Array.from(store.stockedOut)).toEqual([0, 0, 0]);
    expect(Array.from(store.plannedUnits)).toEqual([0, 0, 0]);
  });

  it('lists every column, the count included, as canonical', () => {
    const arena = reserveArena(PHONE_MEMORY_BYTES);
    const store = createAgentStore(arena, 10_000);
    const canonicalOffsets = arena.canonical.filter((_, i) => i % 2 === 0);
    for (const [name, column] of Object.entries(store)) {
      if (ArrayBuffer.isView(column)) expect(canonicalOffsets, name).toContain(column.byteOffset);
    }
    expect(store.count[0]).toBe(0);
  });

  it('draws a name key per id on its own stream', () => {
    expect(PERSON_NAME).toBe(0x106);
    expect(layerOf(PERSON_NAME)).toBe('agent');
    expect(AGENT_COLUMNS.find(({ name }) => name === 'nameKey')).toEqual({ name: 'nameKey', bytes: 4 });
    const { agents } = createWorld(42, 'phone');
    for (let i = 0; i < agents.count[0]; i++) expect(agents.nameKey[i]).toBe(draw1(42, PERSON_NAME, i));
  });

  it('bins Q8 positions into cells by shift', () => {
    expect(1 << CELL_SHIFT).toBe(8 * TILE_PX * SUBPIXELS);
    for (let id = 0; id < 10_000; id++) {
      const x = draw2(42, 7, id, 0) >>> 10;
      expect(cellOf(x)).toBe(Math.floor(x / 32_768));
      expect(Math.fround(x / 256)).toBe(x / 256);
    }
  });
});
