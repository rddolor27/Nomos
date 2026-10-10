import { ACTION_IDLE, ACTION_WALK } from '../agents/actions.ts';
import { draw2 } from '../random/draw.ts';
import { tileOf, walkableAt } from '../world/ground.ts';
import type { AgentStore } from '../agents/store.ts';
import { WANDER } from '../random/streams.ts';
import { REDRAW_TICKS, STAND, firstRedraw, offWall, wanderTo } from './steer.ts';
import { setHeading } from './walk.ts';
import { TICK, type World } from '../world/world.ts';

// The walking loop only lists a chunk's blocked agents, and meetWall turns them once the chunk has walked. Any wall
// work inside the loop, even a call-free mirror, took move at 100k from 0.41 to 0.6-1.1 ms. As built, move measured
// 0.53 ms at 100k (Node 24.18.0), against the 0.8 ms budget.
const WALK_CHUNK = 1_024;
const blocked = new Int32Array(WALK_CHUNK);

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
  for (let i = firstRedraw(tick); i < count; i += REDRAW_TICKS) redraw(agents, seed, i, tick);
  for (let first = 0; first < count; first += WALK_CHUNK) {
    const end = Math.min(count, first + WALK_CHUNK);
    let stuck = 0;
    for (let i = first; i < end; i++) {
      const nextX = x[i] + vx[i];
      const nextY = y[i] + vy[i];
      if (walkableAt(ground, nextX, nextY)) {
        x[i] = nextX;
        y[i] = nextY;
      } else {
        blocked[stuck++] = i;
      }
    }
    for (let k = 0; k < stuck; k++) meetWall(agents, blocked[k]);
  }
}

// The blocked step left the agent's own tile, which is open, so the agent slides within it along the wall it met, or
// stays put at a corner.
function meetWall(agents: AgentStore, i: number): void {
  const x = agents.x;
  const y = agents.y;
  const nextX = x[i] + agents.vx[i];
  const nextY = y[i] + agents.vy[i];
  const wallAlongX = tileOf(nextX) === tileOf(x[i]);
  if (wallAlongX) x[i] = nextX;
  else if (tileOf(nextY) === tileOf(y[i])) y[i] = nextY;
  setHeading(agents, i, offWall(agents.heading[i], wallAlongX));
}

function redraw(agents: AgentStore, seed: number, i: number, tick: number): void {
  const walking = agents.action[i] === ACTION_WALK;
  const next = wanderTo(agents.heading[i], walking, draw2(seed, WANDER, i, tick));
  if (next !== STAND) {
    agents.action[i] = ACTION_WALK;
    setHeading(agents, i, next);
  } else if (walking) {
    agents.action[i] = ACTION_IDLE;
    agents.vx[i] = 0;
    agents.vy[i] = 0;
  }
}
