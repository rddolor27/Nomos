import type { AgentStore } from './store.ts';
import { WALK_SINE_Q8 } from './tables.ts';

// Headings run clockwise on screen from down, as the facings do: 0 down, 64 left, 128 up and 192 right.
const HEADINGS = 256;
export const HEADING_MASK = 255;
const HALF_TURN = 128;
export const HALF_TURN_MASK = 127;
export const QUARTER_TURN = 64;
const QUARTER_TURN_SHIFT = 6;
const EIGHTH_TURN = 32;
const FACING_MASK = 3;

// The step per tick on each heading, in Q8: -1,024 sin and 1,024 cos of 2πh / 256, so 4 px whichever way a blob walks.
export const WALK_X_Q8 = new Int16Array(HEADINGS);
export const WALK_Y_Q8 = new Int16Array(HEADINGS);
for (let h = 0; h < HEADINGS; h++) {
  WALK_X_Q8[h] = -sineQ8(h);
  WALK_Y_Q8[h] = sineQ8(h + QUARTER_TURN);
}

// 1,024 sin(2πh / 256) from the generated quarter wave: read forwards, then backwards, then both again negated.
function sineQ8(heading: number): number {
  const k = heading & HALF_TURN_MASK;
  const sine = WALK_SINE_Q8[k <= QUARTER_TURN ? k : HALF_TURN - k];
  return (heading & HALF_TURN) === 0 ? sine : -sine;
}

// The facing nearest the heading, so its step's dominant axis: facings 0-3 point down, left, up and right, as headings
// 0, 64, 128 and 192 do. The four exact diagonals round clockwise.
export function facingFor(heading: number): number {
  return ((heading + EIGHTH_TURN) >> QUARTER_TURN_SHIFT) & FACING_MASK;
}

// A heading fixes a blob's step and facing, so every write of one writes all three.
export function setHeading(agents: AgentStore, i: number, heading: number): void {
  agents.heading[i] = heading;
  agents.vx[i] = WALK_X_Q8[heading];
  agents.vy[i] = WALK_Y_Q8[heading];
  agents.facing[i] = facingFor(heading);
}
