import { describe, expect, it } from 'vitest';
import type { Ground } from '../src/ground.ts';
import { step } from '../src/step.ts';
import { checkpoint, createWorld, layoutWorld, restoreWorld, stateHash, type World } from '../src/world.ts';
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

function agentsOffCentre(world: World): number {
  const { count, x, y } = world.agents;
  let offCentre = 0;
  for (let i = 0; i < count[0]; i++) if (x[i] % TILE_Q8 !== TILE_Q8 / 2 || y[i] % TILE_Q8 !== TILE_Q8 / 2) offCentre++;
  return offCentre;
}

describe('the ground', () => {
  it('keeps agents on walkable cells', () => {
    const world = createWorld(42, 'phone', roomGround());
    const { count, x, y } = world.agents;
    expect(count[0]).toBe(10_000);
    expect(agentsOutsideRoom(world)).toBe(0);
    expect(agentsOffCentre(world)).toBe(0);
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
