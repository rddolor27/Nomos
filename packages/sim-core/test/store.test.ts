import { describe, expect, it } from 'vitest';
import { draw1, draw2 } from '../src/random/draw.ts';
import { DESKTOP_MEMORY_BYTES, PHONE_MEMORY_BYTES, reserveArena } from '../src/memory/arena.ts';
import { PERSON_NAME, layerOf } from '../src/random/streams.ts';
import { CELL_SHIFT, SUBPIXELS, TILE_PX, cellOf } from '../src/world/space.ts';
import { createWorld } from '../src/world/world.ts';
import { AGENT_COLUMNS, createAgentStore } from '../src/agents/store.ts';

describe('the agent store', () => {
  it('fits 25,000 agents in a phone reservation and 100,000 in a desktop one', () => {
    expect(createAgentStore(reserveArena(PHONE_MEMORY_BYTES), 25_000).x).toHaveLength(25_000);
    const store = createAgentStore(reserveArena(DESKTOP_MEMORY_BYTES), 100_000);
    const perAgent = Object.entries(store).filter(([, column]) => column?.length === store.capacity);
    expect(Object.fromEntries(perAgent.map(([name, column]) => [name, column.BYTES_PER_ELEMENT]))).toEqual(
      Object.fromEntries(AGENT_COLUMNS.map(({ name, bytes }) => [name, bytes])),
    );
    expect(AGENT_COLUMNS.reduce((sum, { bytes }) => sum + bytes, 0)).toBeLessThanOrEqual(256);
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
    expect(AGENT_COLUMNS.at(-1)).toEqual({ name: 'nameKey', bytes: 4 });
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
