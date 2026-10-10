import { HALF_TURN_MASK, HEADING_MASK, QUARTER_TURN } from './walk.ts';

// The wander rule every walking blob steers by: the sim's agents in move, and the town view's look-only walkers, which
// take it through sim-protocol, so both walk the same way (owner request, 10 October 2026).

// Each blob redraws every 16 ticks, staggered by index, so only a 16th of them draw in any tick.
export const REDRAW_TICKS = 16;
const REDRAW_MASK = REDRAW_TICKS - 1;
// A walker stops on 1 roll in 16 and an idler starts on 3, so a quarter idle, in pauses of 85 ticks against walks of
// 256 on average, as when agents idled on a quarter of their 64-tick redraws.
const ROLL_MASK = 15;
const STOP_ROLLS = 1;
const START_ROLLS = 3;
const START_SHIFT = 24;
// A wall met through a row edge runs along x, so along heading 64, and one met through a column edge along y.
const ALONG_X = 64;
const ALONG_Y = 0;
// wanderTo's answer for a blob that stands, since every heading is 0 or more.
export const STAND = -1;

// Blob i is due when (tick + i) & REDRAW_MASK is 0, so the first due blob is -tick modulo REDRAW_TICKS.
export function firstRedraw(tick: number): number {
  return (REDRAW_TICKS - (tick & REDRAW_MASK)) & REDRAW_MASK;
}

// The heading a blob walks on after a redraw with draw word w, or STAND: a walker stops or turns a little, and an idler
// may start on any heading.
export function wanderTo(heading: number, walking: boolean, w: number): number {
  const roll = w & ROLL_MASK;
  if (walking) return roll < STOP_ROLLS ? STAND : (heading + smallTurn(w)) & HEADING_MASK;
  return roll < START_ROLLS ? w >>> START_SHIFT : STAND;
}

// -15 to +15 headings, the difference of two 4-bit draws, so small turns are likelier than big ones.
function smallTurn(w: number): number {
  return ((w >>> 4) & 15) - ((w >>> 8) & 15);
}

// The heading a blob leaves a wall on, where wallAlongX says its blocked step crossed a row edge. It mirrors the heading
// across the wall, then halves its angle to the wall, rounded up so it still points away. A blob so leaves a wall at
// half the angle it met it, and never zigzags down a narrow lane.
export function offWall(heading: number, wallAlongX: boolean): number {
  const along = wallAlongX ? ALONG_X : ALONG_Y;
  const mirrored = 2 * along - heading;
  const fromWall = ((mirrored - along + QUARTER_TURN) & HALF_TURN_MASK) - QUARTER_TURN;
  return (mirrored - ((fromWall / 2) | 0)) & HEADING_MASK;
}
