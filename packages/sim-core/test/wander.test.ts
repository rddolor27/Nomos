import cos from '@stdlib/math-base-special-cos';
import sin from '@stdlib/math-base-special-sin';
import { describe, expect, it } from 'vitest';
import { ACTION_IDLE, ACTION_WALK, FACING_DOWN, FACING_LEFT, FACING_RIGHT, FACING_UP } from '../src/actions.ts';
import { draw2 } from '../src/draw.ts';
import { walkableAt, type Ground } from '../src/ground.ts';
import { step } from '../src/step.ts';
import { WANDER } from '../src/streams.ts';
import { WALK_X_Q8, WALK_Y_Q8, facingFor } from '../src/walk.ts';
import { TICK, layoutWorld, populate, type World } from '../src/world.ts';

const TILE_Q8 = 4_096;
const SIDE = 8;
const MIDDLE_Q8 = (SIDE / 2) * TILE_Q8 + TILE_Q8 / 2;

// An 8 x 8 ground, open but for the listed tiles.
function groundWith(blocked: readonly (readonly [number, number])[]): Ground {
  const walk = new Uint8Array(SIDE * SIDE).fill(1);
  for (const [tx, ty] of blocked) walk[ty * SIDE + tx] = 0;
  return { width: SIDE, height: SIDE, walk };
}

const row = (ty: number): [number, number][] => Array.from({ length: SIDE }, (_, tx) => [tx, ty]);
const column = (tx: number): [number, number][] => Array.from({ length: SIDE }, (_, ty) => [tx, ty]);

function setWalker(world: World, i: number, xQ8: number, yQ8: number, heading: number): void {
  const agents = world.agents;
  agents.x[i] = xQ8;
  agents.y[i] = yQ8;
  agents.action[i] = ACTION_WALK;
  agents.heading[i] = heading;
  agents.vx[i] = WALK_X_Q8[heading];
  agents.vy[i] = WALK_Y_Q8[heading];
  agents.facing[i] = facingFor(heading);
}

// One blob walking on the heading from the point; blob 0 redraws only on ticks divisible by 16.
function walkerAt(ground: Ground, xQ8: number, yQ8: number, heading: number, tick = 1): World {
  const world = layoutWorld(42, 'phone', 1, 1_048_576, ground);
  populate(world);
  setWalker(world, 0, xQ8, yQ8, heading);
  world.globals[TICK] = tick;
  return world;
}

function motion(world: World, i = 0): number[] {
  const { x, y, heading, vx, vy, facing, action } = world.agents;
  return [x[i], y[i], heading[i], vx[i], vy[i], facing[i], action[i]];
}

function walking(xQ8: number, yQ8: number, heading: number): number[] {
  const vx = WALK_X_Q8[heading];
  const vy = WALK_Y_Q8[heading];
  return [xQ8 + vx, yQ8 + vy, heading, vx, vy, facingFor(heading), ACTION_WALK];
}

function signedTurn(from: number, to: number): number {
  return ((to - from + 128) & 255) - 128;
}

function stepOf(heading: number): [number, number] {
  const h = heading & 255;
  return [WALK_X_Q8[h], WALK_Y_Q8[h]];
}

// Walks a blob into a wall on every heading whose step has a positive part across it, from one sub-pixel off the wall
// (across is that part's table, and the wall runs along headings alongA and alongB). Each must leave at half its
// angle to the wall, rounded up, pointing away, and not straight back.
function badWallExits(
  ground: Ground,
  xQ8: number,
  yQ8: number,
  across: Int16Array,
  alongA: number,
  alongB: number,
): string[] {
  const bad: string[] = [];
  for (let h = 0; h < 256; h++) {
    if (across[h] <= 0) continue;
    const world = walkerAt(ground, xQ8, yQ8, h);
    step(world);
    const turned = world.agents.heading[0];
    const intoWall = Math.min(Math.abs(signedTurn(alongA, h)), Math.abs(signedTurn(alongB, h)));
    const offWall = Math.min(Math.abs(signedTurn(alongA, turned)), Math.abs(signedTurn(alongB, turned)));
    if (across[turned] >= 0 || offWall !== Math.ceil(intoWall / 2) || turned === ((h + 128) & 255)) {
      bad.push(`heading ${h} turned to ${turned}`);
    }
  }
  return bad;
}

describe('the walking steps', () => {
  it('walks every heading at 4 px a tick, clockwise from down', () => {
    expect([WALK_X_Q8, WALK_Y_Q8].map((walk) => [walk.constructor, walk.length])).toEqual([
      [Int16Array, 256],
      [Int16Array, 256],
    ]);
    expect([0, 64, 128, 192].map(stepOf)).toEqual([
      [0, 1_024],
      [-1_024, 0],
      [0, -1_024],
      [1_024, 0],
    ]);
    const offSpeed: string[] = [];
    for (let h = 0; h < 256; h++) {
      const [x, y] = stepOf(h);
      if (Math.abs(Math.sqrt(x * x + y * y) - 1_024) > 0.58) offSpeed.push(`heading ${h}: ${x}, ${y}`);
    }
    expect(offSpeed).toEqual([]);
    expect(new Set(Array.from(WALK_X_Q8, (x, h) => `${x},${WALK_Y_Q8[h]}`)).size).toBe(256);
  });

  it("matches stdlib's sin and cos on every heading", () => {
    const wrong: number[] = [];
    for (let h = 0; h < 256; h++) {
      const angle = (2 * Math.PI * h) / 256;
      const want = [Math.round(-1_024 * sin(angle)) + 0, Math.round(1_024 * cos(angle)) + 0];
      if (stepOf(h).join() !== want.join()) wrong.push(h);
    }
    expect(wrong).toEqual([]);
  });

  it('mirrors and turns steps exactly with their headings', () => {
    const broken: string[] = [];
    for (let h = 0; h < 256; h++) {
      const [x, y] = stepOf(h);
      if (stepOf(-h).join() !== [-x, y].join()) broken.push(`mirror x ${h}`);
      if (stepOf(128 - h).join() !== [x, -y].join()) broken.push(`mirror y ${h}`);
      if (stepOf(h + 64).join() !== [-y, x].join()) broken.push(`quarter turn ${h}`);
    }
    expect(broken).toEqual([]);
  });
});

describe('free-heading movement', () => {
  it('faces the cardinal direction nearest the heading, clockwise at exact diagonals', () => {
    const wrong: number[] = [];
    for (let h = 0; h < 256; h++) {
      const x = WALK_X_Q8[h];
      const y = WALK_Y_Q8[h];
      let dominant = x < 0 ? FACING_LEFT : FACING_RIGHT;
      if (Math.abs(y) > Math.abs(x)) dominant = y > 0 ? FACING_DOWN : FACING_UP;
      if (Math.abs(y) !== Math.abs(x) && facingFor(h) !== dominant) wrong.push(h);
    }
    expect(wrong).toEqual([]);
    expect([0, 32, 96, 160, 224].map((h) => facingFor(h))).toEqual([
      FACING_DOWN,
      FACING_LEFT,
      FACING_UP,
      FACING_RIGHT,
      FACING_DOWN,
    ]);
  });

  it('walks a blob one step on its heading between redraws', () => {
    const world = walkerAt(groundWith([]), MIDDLE_Q8, MIDDLE_Q8, 40);
    step(world);
    step(world);
    expect(motion(world)).toEqual([MIDDLE_Q8 - 2 * 851, MIDDLE_Q8 + 2 * 569, 40, -851, 569, FACING_LEFT, ACTION_WALK]);
  });

  it('turns a walker by a keyed turn of at most 15 headings every 16 ticks, or stops it', () => {
    const turns: number[] = [];
    let stops = 0;
    for (let k = 0; k < 256; k++) {
      const tick = 16 * k;
      const world = walkerAt(groundWith([]), MIDDLE_Q8, MIDDLE_Q8, 100, tick);
      step(world);
      const w = draw2(42, WANDER, 0, tick);
      if ((w & 15) === 0) {
        stops++;
        expect(motion(world)).toEqual([MIDDLE_Q8, MIDDLE_Q8, 100, 0, 0, FACING_UP, ACTION_IDLE]);
        continue;
      }
      const turned = (100 + ((w >>> 4) & 15) - ((w >>> 8) & 15)) & 255;
      expect(motion(world)).toEqual(walking(MIDDLE_Q8, MIDDLE_Q8, turned));
      turns.push(signedTurn(100, turned));
    }
    expect(stops).toBeGreaterThan(8);
    expect(stops).toBeLessThan(24);
    expect(Math.min(...turns)).toBeGreaterThanOrEqual(-15);
    expect(Math.max(...turns)).toBeLessThanOrEqual(15);
    expect(new Set(turns).size).toBeGreaterThan(20);
    expect(turns.filter((turn) => turn !== 0).length).toBeGreaterThan(0.85 * turns.length);
  });

  it('starts an idler on any heading with chance 3/16', () => {
    const headings: number[] = [];
    for (let k = 0; k < 256; k++) {
      const tick = 16 * k;
      const world = walkerAt(groundWith([]), MIDDLE_Q8, MIDDLE_Q8, 100, tick);
      const agents = world.agents;
      agents.action[0] = ACTION_IDLE;
      agents.vx[0] = 0;
      agents.vy[0] = 0;
      step(world);
      const w = draw2(42, WANDER, 0, tick);
      if ((w & 15) >= 3) {
        expect(motion(world)).toEqual([MIDDLE_Q8, MIDDLE_Q8, 100, 0, 0, FACING_UP, ACTION_IDLE]);
        continue;
      }
      expect(motion(world)).toEqual(walking(MIDDLE_Q8, MIDDLE_Q8, w >>> 24));
      headings.push(w >>> 24);
    }
    expect(headings.length).toBeGreaterThan(32);
    expect(headings.length).toBeLessThan(64);
    expect(new Set(headings.map((h) => h >> 6)).size).toBe(4);
  });

  it('redraws blob i only on ticks where tick + i is a multiple of 16', () => {
    const blobs = 32;
    const centreQ8 = 128 * TILE_Q8;
    const world = layoutWorld(42, 'phone', blobs, 1_048_576);
    populate(world);
    const redrawn: number[] = [];
    for (let tick = 0; tick < 16; tick++) {
      for (let i = 0; i < blobs; i++) setWalker(world, i, centreQ8, centreQ8, 100);
      world.globals[TICK] = tick;
      step(world);
      for (let i = 0; i < blobs; i++) {
        if (motion(world, i).join() === walking(centreQ8, centreQ8, 100).join()) continue;
        expect((tick + i) % 16, `blob ${i} on tick ${tick}`).toBe(0);
        redrawn.push(i);
      }
    }
    expect(redrawn.length).toBeGreaterThan(24);
  });

  it('slides along a wall met through a row edge and leaves at half its angle', () => {
    const world = walkerAt(groundWith(row(4)), 3 * TILE_Q8 + 2_048, 4 * TILE_Q8 - 100, 16);
    step(world);
    expect(motion(world)).toEqual([3 * TILE_Q8 + 2_048 - 392, 4 * TILE_Q8 - 100, 88, -851, -569, FACING_LEFT, ACTION_WALK]);
    step(world);
    expect(motion(world).slice(0, 2)).toEqual([3 * TILE_Q8 + 2_048 - 392 - 851, 4 * TILE_Q8 - 100 - 569]);
  });

  it('slides along a wall met through a column edge and leaves at half its angle', () => {
    const world = walkerAt(groundWith(column(2)), 3 * TILE_Q8 + 100, 4 * TILE_Q8 + 2_048, 48);
    step(world);
    expect(motion(world)).toEqual([3 * TILE_Q8 + 100, 4 * TILE_Q8 + 2_048 + 392, 232, 569, 851, FACING_DOWN, ACTION_WALK]);
  });

  it('stays put at a corner and turns off it as off a wall along y', () => {
    const world = walkerAt(groundWith([[4, 4]]), 4 * TILE_Q8 - 100, 4 * TILE_Q8 - 100, 224);
    step(world);
    expect(motion(world)).toEqual([4 * TILE_Q8 - 100, 4 * TILE_Q8 - 100, 16, -392, 946, FACING_DOWN, ACTION_WALK]);
  });

  it('turns off the map edge as off a wall', () => {
    const edgeQ8 = SIDE * TILE_Q8 - 1;
    const world = walkerAt(groundWith([]), edgeQ8, MIDDLE_Q8, 192);
    step(world);
    expect(motion(world)).toEqual([edgeQ8, MIDDLE_Q8, 96, -724, -724, FACING_UP, ACTION_WALK]);
  });

  it('turns a whole crowd off the map edge, across the walking chunks', () => {
    const blobs = 2_048;
    const tick = 1;
    const edgeQ8 = SIDE * TILE_Q8 - 1;
    const world = layoutWorld(42, 'phone', blobs, 1_048_576, groundWith([]));
    populate(world);
    for (let i = 0; i < blobs; i++) setWalker(world, i, edgeQ8, 16 * i, 192);
    world.globals[TICK] = tick;
    step(world);
    const { x, heading } = world.agents;
    // A blob due for a redraw this tick may pick a new heading before it walks.
    const unturned: number[] = [];
    for (let i = 0; i < blobs; i++) if ((tick + i) % 16 !== 0 && heading[i] !== 96) unturned.push(i);
    expect(unturned).toEqual([]);
    expect(x.subarray(0, blobs).every((xQ8) => xQ8 <= edgeQ8)).toBe(true);
  });

  it('leaves every row wall it meets, never straight back and never along it', () => {
    expect(badWallExits(groundWith(row(4)), 3 * TILE_Q8 + 2_048, 4 * TILE_Q8 - 1, WALK_Y_Q8, 64, 192)).toEqual([]);
  });

  it('leaves every column wall it meets, never straight back and never along it', () => {
    expect(badWallExits(groundWith(column(4)), 4 * TILE_Q8 - 1, 3 * TILE_Q8 + 2_048, WALK_X_Q8, 0, 128)).toEqual([]);
  });

  it('keeps every blob on open ground among scattered walls', () => {
    const side = 64;
    const walk = new Uint8Array(side * side);
    for (let cell = 0; cell < walk.length; cell++) walk[cell] = draw2(7, 0x7b, cell, 0) % 10 < 7 ? 1 : 0;
    const world = layoutWorld(42, 'phone', 2_000, 1_048_576, { width: side, height: side, walk });
    populate(world);
    const { count, x, y } = world.agents;
    const stranded = new Set<number>();
    for (let tick = 0; tick < 2_000; tick++) {
      step(world);
      for (let i = 0; i < count[0]; i++) if (!walkableAt(world.ground, x[i], y[i])) stranded.add(i);
    }
    expect([...stranded]).toEqual([]);
  });
});
