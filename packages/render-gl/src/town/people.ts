import {
  ACTION_WALK,
  FACING_DOWN,
  FACING_LEFT,
  FACING_RIGHT,
  FACING_UP,
  SNAPSHOT_BYTES,
  actionOf,
  facingOf,
  lookOf,
} from '@nomos/sim-protocol';
import { NO_CODE, PLACE_EXPRESSIONS, PLACE_FACINGS, PLACE_POSES, type PlacePeople } from '@nomos/sim-protocol/place';
import { JUMP_PX } from '../dots/dots.ts';
import type { Retained } from '../renderer/types.ts';

const FLOATS_PER_AGENT = SNAPSHOT_BYTES / Float32Array.BYTES_PER_ELEMENT;
const STAND = PLACE_POSES.indexOf('stand');
const WALK = PLACE_POSES.indexOf('walk');
const NEUTRAL = PLACE_EXPRESSIONS.indexOf('neutral');
const DOWN = PLACE_FACINGS.indexOf('down');
const UP = PLACE_FACINGS.indexOf('up');
const LEFT = PLACE_FACINGS.indexOf('left');
const RIGHT = PLACE_FACINGS.indexOf('right');
// The walk frame changes every 8 art px walked, as the town view's walkers step.
const STRIDE_SHIFT = 3;

// The place's facing for each of the visual word's facing codes, which run in another order.
function wordFacings(): Uint8Array {
  const table = new Uint8Array(4);
  table[FACING_DOWN] = DOWN;
  table[FACING_LEFT] = LEFT;
  table[FACING_UP] = UP;
  table[FACING_RIGHT] = RIGHT;
  return table;
}

const FACING_OF_WORD = wordFacings();

function peopleFor(count: number): PlacePeople {
  return {
    look: new Uint8Array(count),
    pose: new Uint8Array(count),
    facing: new Uint8Array(count),
    step: new Uint8Array(count),
    expression: new Uint8Array(count).fill(NEUTRAL),
    job: new Uint8Array(count).fill(NO_CODE),
    emote: new Uint8Array(count).fill(NO_CODE),
    x: new Int32Array(count),
    y: new Int32Array(count),
    lift: new Uint8Array(count),
  };
}

// The dots' easing, GLSL's mix(prev, cur, alpha), or cur after a jump, so a blob stands where its dot would.
function eased(prev: number, cur: number, alpha: number, jump: boolean): number {
  return jump ? cur : prev * (1 - alpha) + cur * alpha;
}

// The way the blob moved between the snapshots, along the larger axis, or the word's facing for one that stood still
// or jumped.
function facingFor(dx: number, dy: number, jump: boolean, word: number): number {
  if (jump || (dx === 0 && dy === 0)) return FACING_OF_WORD[facingOf(word)];
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? RIGHT : LEFT;
  return dy > 0 ? DOWN : UP;
}

function writePerson(
  people: PlacePeople,
  i: number,
  cur: Float32Array,
  prev: Float32Array,
  word: number,
  alpha: number,
): void {
  const at = i * FLOATS_PER_AGENT;
  const dx = cur[at] - prev[at];
  const dy = cur[at + 1] - prev[at + 1];
  const jump = Math.abs(dx) > JUMP_PX || Math.abs(dy) > JUMP_PX;
  const x = Math.round(eased(prev[at], cur[at], alpha, jump));
  const y = Math.round(eased(prev[at + 1], cur[at + 1], alpha, jump));
  const facing = facingFor(dx, dy, jump, word);
  const walking = actionOf(word) === ACTION_WALK;
  // A walker steps with the distance along the way it faces.
  const along = facing === LEFT || facing === RIGHT ? x : y;
  people.x[i] = x;
  people.y[i] = y;
  people.look[i] = lookOf(word);
  people.pose[i] = walking ? WALK : STAND;
  people.facing[i] = facing;
  people.step[i] = walking ? (along >> STRIDE_SHIFT) & 1 : 0;
}

// The sim's agents as a place's people, one person per agent, rewritten every draw from the two latest snapshots
// (owner request, 10 October 2026). A snapshot's world px are art px, and an agent's point is its person's anchor, the
// ground under its feet. Expression is neutral, with no job or emote yet.
export class TownPeople {
  // Made again only when the agent count changes, so a draw allocates nothing.
  columns: PlacePeople;

  constructor() {
    this.columns = peopleFor(0);
  }

  // True when the columns were made again, for a new count, so the place must take them.
  fit(count: number): boolean {
    if (this.columns.x.length === count) return false;
    this.columns = peopleFor(count);
    return true;
  }

  // The agents of the retained snapshots, eased by alpha as the dots are. Call fit with their count first.
  write(retained: Retained, alpha: number): void {
    const { slot, count } = retained;
    const cur = retained.floats[slot];
    const prev = retained.floats[slot ^ 1];
    const words = retained.words[slot];
    for (let i = 0; i < count; i++) writePerson(this.columns, i, cur, prev, words[i * FLOATS_PER_AGENT + 2], alpha);
  }
}
