import { ACTION_IDLE, ACTION_WALK } from './actions.ts';
import { draw2 } from './draw.ts';
import { tileOf, walkableAt } from './ground.ts';
import type { AgentStore } from './store.ts';
import { WANDER } from './streams.ts';
import { HALF_TURN_MASK, HEADING_MASK, QUARTER_TURN, setHeading } from './walk.ts';
import { TICK, type World } from './world.ts';

// Each agent redraws every 16 ticks, staggered by index, so only a 16th of them draw in any tick.
const REDRAW_TICKS = 16;
const REDRAW_MASK = REDRAW_TICKS - 1;
// A walker stops on 1 roll in 16 and an idler starts on 3, so a quarter idle, in pauses of 85 ticks against walks of
// 256 on average, as when agents idled on a quarter of their 64-tick redraws.
const ROLL_MASK = 15;
const STOP_ROLLS = 1;
const START_ROLLS = 3;
// A wall met through a row edge runs along x, so along heading 64, and one met through a column edge along y.
const ALONG_X = 64;
const ALONG_Y = 0;
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
  let turned: number;
  if (tileOf(nextX) === tileOf(x[i])) {
    x[i] = nextX;
    turned = offWall(agents.heading[i], ALONG_X);
  } else {
    if (tileOf(nextY) === tileOf(y[i])) y[i] = nextY;
    turned = offWall(agents.heading[i], ALONG_Y);
  }
  setHeading(agents, i, turned);
}

// Agent i is due when (tick + i) & REDRAW_MASK is 0, so the first due agent is -tick modulo REDRAW_TICKS.
function firstRedraw(tick: number): number {
  return (REDRAW_TICKS - (tick & REDRAW_MASK)) & REDRAW_MASK;
}

function redraw(agents: AgentStore, seed: number, i: number, tick: number): void {
  const w = draw2(seed, WANDER, i, tick);
  const roll = w & ROLL_MASK;
  let turned: number;
  if (agents.action[i] === ACTION_WALK) {
    if (roll < STOP_ROLLS) {
      agents.action[i] = ACTION_IDLE;
      agents.vx[i] = 0;
      agents.vy[i] = 0;
      return;
    }
    turned = (agents.heading[i] + smallTurn(w)) & HEADING_MASK;
  } else {
    if (roll >= START_ROLLS) return;
    agents.action[i] = ACTION_WALK;
    turned = w >>> 24;
  }
  setHeading(agents, i, turned);
}

// -15 to +15 headings, the difference of two 4-bit draws, so small turns are likelier than big ones.
function smallTurn(w: number): number {
  return ((w >>> 4) & 15) - ((w >>> 8) & 15);
}

// Mirrors a heading across a wall that runs along the heading `along`, then halves its angle to the wall, rounded up
// so it still points away. A blob so leaves a wall at half the angle it met it, and never zigzags down a narrow lane.
function offWall(heading: number, along: number): number {
  const mirrored = 2 * along - heading;
  const fromWall = ((mirrored - along + QUARTER_TURN) & HALF_TURN_MASK) - QUARTER_TURN;
  return (mirrored - ((fromWall / 2) | 0)) & HEADING_MASK;
}
