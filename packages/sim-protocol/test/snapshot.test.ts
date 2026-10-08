import { describe, expect, it } from 'vitest';
import { SUBPIXELS, createWorld, step } from '@nomos/sim-core';
import {
  ACTION_WALK,
  TIER_AGENTS,
  createSnapshotPool,
  giveBack,
  packVisual,
  takeView,
  writeSnapshot,
  type SnapshotPool,
} from '../src/index.ts';

function mustTake(pool: SnapshotPool): Uint32Array<ArrayBuffer> {
  const view = takeView(pool);
  if (view === null) throw new Error('the pool has no free view');
  return view;
}

describe('the snapshot pool', () => {
  it('circulates three buffers', () => {
    const pool = createSnapshotPool(10_000);
    const views = [mustTake(pool), mustTake(pool), mustTake(pool)];
    expect(views.map((view) => view.byteLength)).toEqual([120_000, 120_000, 120_000]);
    expect(takeView(pool)).toBeNull();

    // The app's side of the trip: transferring detaches the worker's copy, and a fresh buffer comes back.
    const returned = structuredClone(views[0].buffer, { transfer: [views[0].buffer] });
    expect(views[0].byteLength).toBe(0);
    giveBack(pool, returned);
    expect(mustTake(pool).buffer).toBe(returned);
    expect(takeView(pool)).toBeNull();

    expect(() => giveBack(pool, new ArrayBuffer(8))).toThrow(RangeError);
  });

  it('refuses a buffer when every slot is already home', () => {
    const pool = createSnapshotPool(10_000);
    expect(() => giveBack(pool, new ArrayBuffer(120_000))).toThrow(RangeError);
  });
});

describe('writeSnapshot', () => {
  it('writes 12 little-endian bytes per agent', () => {
    const world = createWorld(42, 'phone');
    for (let tick = 0; tick < 100; tick++) step(world);
    const view = mustTake(createSnapshotPool(TIER_AGENTS.phone));

    const count = writeSnapshot(world, view);

    const bytes = new DataView(view.buffer);
    const { x, y, look, action, facing } = world.agents;
    const broken: number[] = [];
    for (let i = 0; i < count; i++) {
      const at = 12 * i;
      const word = packVisual(look[i], action[i], 0, 0, facing[i], 0);
      const same =
        bytes.getFloat32(at, true) === x[i] / SUBPIXELS &&
        bytes.getFloat32(at + 4, true) === y[i] / SUBPIXELS &&
        bytes.getUint32(at + 8, true) === word;
      if (!same) broken.push(i);
    }
    expect(count).toBe(10_000);
    expect(broken).toEqual([]);
    expect(action.some((code) => code === ACTION_WALK)).toBe(true);
  });
});
