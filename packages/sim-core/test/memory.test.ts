import { describe, expect, it } from 'vitest';
import { PHONE_MEMORY_BYTES, reserveArena, take } from '../src/memory/arena.ts';

describe('the arena', () => {
  it("reserves the tier's memory once and refuses to grow it", () => {
    const arena = reserveArena(PHONE_MEMORY_BYTES);
    const early = take(arena, Int32Array, 4, true);
    early[3] = -123_456;
    expect(arena.memory.buffer.byteLength).toBe(33_554_432);
    expect(() => arena.memory.grow(1)).toThrow(RangeError);
    expect(arena.memory.buffer.byteLength).toBe(33_554_432);
    expect(early[3]).toBe(-123_456);
  });

  it('takes aligned, separate views of the one buffer', () => {
    const arena = reserveArena(65_536);
    const flags = take(arena, Uint8Array, 3, true);
    const cents = take(arena, Float64Array, 5, false);
    const ids = take(arena, Int32Array, 7, true);
    flags.fill(0xff);
    cents.fill(-0.5);
    ids.fill(-7);
    for (const view of [flags, cents, ids]) expect(view.buffer).toBe(arena.memory.buffer);
    expect(cents.byteOffset % 8).toBe(0);
    expect(Array.from(flags)).toEqual([255, 255, 255]);
    expect(Array.from(cents)).toEqual([-0.5, -0.5, -0.5, -0.5, -0.5]);
    expect(Array.from(ids)).toEqual([-7, -7, -7, -7, -7, -7, -7]);
    expect(arena.canonical).toEqual([0, 8, 48, 32]);

    const small = reserveArena(65_536);
    expect(() => take(small, Float64Array, 8_193, true)).toThrow(RangeError);
    expect(small.top).toBe(0);
    expect(small.canonical).toEqual([]);
    expect(take(small, Float64Array, 8_192, true)).toHaveLength(8_192);
  });
});
