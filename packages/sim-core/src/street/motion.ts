import { ACTION_IDLE, ACTION_WALK } from '../agents/actions.ts';
import { HEADING_MASK, WALK_X_Q8, WALK_Y_Q8, setHeading } from '../movement/walk.ts';
import { pointInTileQ8, tileOf } from '../world/ground.ts';
import type { World } from '../world/world.ts';
import { DIRECTIONS } from './fields.ts';
import { MAX_RUNS, RUN_BYTES } from './runs.ts';

// The motion every trip is made of: a blob walks one straight run after another at the pace move gives it, a heading's step a
// tick, and stands still between them. It needs no wall check, since pathRuns' ways lie over open cells and a diagonal never cuts a
// corner (M2.7 Ruling 4).
const HEADING_SHIFT = 5;
const HALF_TURN = 128;
const TILE_Q8 = 4_096;
const TILE_CENTRE_Q8 = TILE_Q8 / 2;

// Ticks to cross a cell along heading 32k, in Q8: a tile is 4,096 sub-pixels and a blob covers 1,024 a tick along an axis and 724
// on each axis of a diagonal, so a cell takes 4 ticks, or 5.66 on a diagonal. Rounded up, so a run never ends short of its cell.
const CELL_TICKS_Q8 = new Uint16Array(DIRECTIONS);
for (let k = 0; k < DIRECTIONS; k++) {
  const speed = Math.max(Math.abs(WALK_X_Q8[k << HEADING_SHIFT]), Math.abs(WALK_Y_Q8[k << HEADING_SHIFT]));
  CELL_TICKS_Q8[k] = Math.floor((TILE_Q8 * 256 + speed - 1) / speed);
}

// The ticks a run of `length` cells takes along heading 32k. A diagonal's last tick can end up to 723 sub-pixels past the cell's
// centre, which is still inside the cell, and the walker snaps back to the centre.
export function runTicks(k: number, length: number): number {
  return (length * CELL_TICKS_Q8[k] + 255) >> 8;
}

// The ticks of the first `count` runs in a blob's row, which is how long a way takes in one direction.
export function pathTicks(runs: Uint8Array, base: number, count: number): number {
  let ticks = 0;
  for (let r = 0; r < count; r++) ticks += runTicks(runs[base + 2 * r] >> HEADING_SHIFT, runs[base + 2 * r + 1]);
  return ticks;
}

// How many runs a blob's row holds: the list ends at the first run of no length.
export function runCount(runs: Uint8Array, base: number): number {
  let count = MAX_RUNS;
  while (count > 0 && runs[base + 2 * count - 1] === 0) count--;
  return count;
}

export function clearRuns(runs: Uint8Array, i: number): void {
  runs.fill(0, i * RUN_BYTES, (i + 1) * RUN_BYTES);
}

// Sets the blob off on run `index` of its row, from the tick `tick`, forward or backward. Walked backward a run turns half a
// turn, and the caller counts the index down.
export function startRun(world: World, i: number, tick: number, index: number, backward: boolean): void {
  const { agents, errands } = world;
  const at = i * RUN_BYTES + 2 * index;
  const heading = backward ? (errands.runs[at] + HALF_TURN) & HEADING_MASK : errands.runs[at];
  setHeading(agents, i, heading);
  agents.action[i] = ACTION_WALK;
  errands.run[i] = index;
  errands.endTick[i] = tick + runTicks(heading >> HEADING_SHIFT, errands.runs[at + 1]);
}

// Stands the blob where it is, facing `facing`.
export function halt(world: World, i: number, facing: number): void {
  const agents = world.agents;
  agents.vx[i] = 0;
  agents.vy[i] = 0;
  agents.action[i] = ACTION_IDLE;
  agents.facing[i] = facing;
}

// The centre of the tile the blob is in, so that the next run starts from a cell's centre, as pathRuns counts them.
export function snapToTile(world: World, i: number): void {
  const agents = world.agents;
  agents.x[i] = pointInTileQ8(tileOf(agents.x[i]), TILE_CENTRE_Q8);
  agents.y[i] = pointInTileQ8(tileOf(agents.y[i]), TILE_CENTRE_Q8);
}

// The centre of tile (tileX, tileY).
export function placeAtCentre(world: World, i: number, tileX: number, tileY: number): void {
  world.agents.x[i] = pointInTileQ8(tileX, TILE_CENTRE_Q8);
  world.agents.y[i] = pointInTileQ8(tileY, TILE_CENTRE_Q8);
}

// A point of tile (tileX, tileY) from a keyed draw word, as populate scatters spawns, so those who stand there do not stack.
export function placeAtSpot(world: World, i: number, tileX: number, tileY: number, bits: number): void {
  world.agents.x[i] = pointInTileQ8(tileX, bits);
  world.agents.y[i] = pointInTileQ8(tileY, bits >>> 12);
}
