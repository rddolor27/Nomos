import { ACTION_IDLE, ACTION_WALK } from './actions.ts';
import { draw2 } from './draw.ts';
import { walkableAt } from './ground.ts';
import { SUBPIXELS } from './space.ts';
import type { AgentStore } from './store.ts';
import { WANDER } from './streams.ts';
import { TICK, type World } from './world.ts';

const WALK_Q8_PER_TICK = 4 * SUBPIXELS;
// Each agent re-draws every 64 ticks, staggered by id, so only a 64th of them draw in any tick.
const REDRAW_TICKS = 64;
const REDRAW_MASK = REDRAW_TICKS - 1;
// Unit steps for FACING_DOWN, LEFT, UP and RIGHT, with y growing down from the top-left origin.
const STEP_X: readonly number[] = [0, -1, 0, 1];
const STEP_Y: readonly number[] = [1, 0, -1, 0];

export function move(world: World): void {
  const seed = world.seed;
  const ground = world.ground;
  const tick = world.globals[TICK];
  const agents = world.agents;
  const count = agents.count[0];
  const x = agents.x;
  const y = agents.y;
  const vx = agents.vx;
  const vy = agents.vy;
  const facing = agents.facing;
  // The walking loop keeps no call but walkableAt, its hottest: the draw has its own strided pass, and the turn is
  // written out because V8 often left a turnAround call uninlined. That took move from 0.795 to 0.405 ms at 100k
  // (budget 0.8 ms). Each agent still redraws before its own step, so no replay changes.
  for (let i = firstRedraw(tick); i < count; i += REDRAW_TICKS) redraw(agents, seed, i, tick);
  for (let i = 0; i < count; i++) {
    const nextX = x[i] + vx[i];
    const nextY = y[i] + vy[i];
    // A step off the map or onto a blocked cell turns the agent back, so agents stay on the open ground they spawn on.
    if (walkableAt(ground, nextX, nextY)) {
      x[i] = nextX;
      y[i] = nextY;
    } else {
      facing[i] ^= 2;
      vx[i] = -vx[i];
      vy[i] = -vy[i];
    }
  }
}

// Agent i is due when (tick + i) & REDRAW_MASK is 0, so the first due agent is -tick modulo REDRAW_TICKS.
function firstRedraw(tick: number): number {
  return (REDRAW_TICKS - (tick & REDRAW_MASK)) & REDRAW_MASK;
}

// A quarter of the draws idle, and the next two bits pick the facing.
function redraw(agents: AgentStore, seed: number, i: number, tick: number): void {
  const w = draw2(seed, WANDER, i, tick);
  if ((w & 3) === 0) {
    agents.action[i] = ACTION_IDLE;
    agents.vx[i] = 0;
    agents.vy[i] = 0;
    return;
  }
  const facing = (w >>> 2) & 3;
  agents.action[i] = ACTION_WALK;
  agents.facing[i] = facing;
  agents.vx[i] = STEP_X[facing] * WALK_Q8_PER_TICK;
  agents.vy[i] = STEP_Y[facing] * WALK_Q8_PER_TICK;
}
