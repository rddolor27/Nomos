import {
  ACTION_SIT,
  ACTION_TALK,
  ACTION_WALK,
  EMOTE_BALL,
  EMOTE_COIN,
  EMOTE_HEART,
  EMOTE_MUSIC,
  EMOTE_QUESTION,
  EMOTE_SPEECH,
  FACING_DOWN,
  FACING_LEFT,
  FACING_RIGHT,
  FACING_UP,
  SNAPSHOT_BYTES,
  actionOf,
  eatingOf,
  emoteOf,
  facingOf,
  indoorsOf,
  itemOf,
  lookOf,
} from '@nomos/sim-protocol';
import { NO_CODE, PLACE_EMOTES, PLACE_EXPRESSIONS, PLACE_FACINGS, PLACE_POSES, type PlacePeople } from '@nomos/sim-protocol/place';
import { JUMP_PX } from '../dots/dots.ts';
import type { Retained } from '../renderer/types.ts';

const FLOATS_PER_AGENT = SNAPSHOT_BYTES / Float32Array.BYTES_PER_ELEMENT;
const STAND = PLACE_POSES.indexOf('stand');
const WALK = PLACE_POSES.indexOf('walk');
const SIT = PLACE_POSES.indexOf('sit');
const NEUTRAL = PLACE_EXPRESSIONS.indexOf('neutral');
const DOWN = PLACE_FACINGS.indexOf('down');
const UP = PLACE_FACINGS.indexOf('up');
const LEFT = PLACE_FACINGS.indexOf('left');
const RIGHT = PLACE_FACINGS.indexOf('right');
// The walk frame changes every 8 art px walked, as the town view's walkers step.
const STRIDE_SHIFT = 3;
// The eating loop moves on every 3 ticks, through 4 steps.
const EAT_TICKS = 3;
const EAT_STEP_MASK = 3;

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

// The word's emote field is 5 bits, and its ids run in another order than the place's emotes: id 0 is none. Each id the street
// shows (M2.7's coin, M3.2's speech, signs and question) names the bubble that draws it; any other id draws none.
const EMOTE_IDS = 32;
const BUBBLES = [
  [EMOTE_COIN, 'coin'],
  [EMOTE_SPEECH, 'speech'],
  [EMOTE_MUSIC, 'music'],
  [EMOTE_BALL, 'ball'],
  [EMOTE_HEART, 'heart'],
  [EMOTE_QUESTION, 'question'],
] as const;

function wordEmotes(): Uint8Array {
  const table = new Uint8Array(EMOTE_IDS).fill(NO_CODE);
  for (const [id, name] of BUBBLES) table[id] = PLACE_EMOTES.indexOf(name);
  return table;
}

const EMOTE_OF_WORD = wordEmotes();

function peopleFor(count: number): Required<PlacePeople> {
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
    item: new Uint8Array(count),
    eat: new Uint8Array(count),
    indoors: new Uint8Array(count),
  };
}

// The dots' easing, GLSL's mix(prev, cur, alpha), or cur after a jump, so a blob stands where its dot would.
function eased(prev: number, cur: number, alpha: number, jump: boolean): number {
  return jump ? cur : prev * (1 - alpha) + cur * alpha;
}

// The sim halts a sitter or a chatter with a facing of its own choosing, a keyed way on its seat or the way to its partner, so
// neither turns to the way it last walked, as a blob that only stopped does.
function stoppedByLife(action: number): boolean {
  return action === ACTION_SIT || action === ACTION_TALK;
}

// The way the blob moved between the snapshots, along the larger axis, or the word's facing for one that stood still, jumped,
// sat or chatted.
function facingFor(dx: number, dy: number, jump: boolean, action: number, word: number): number {
  if (jump || stoppedByLife(action) || (dx === 0 && dy === 0)) return FACING_OF_WORD[facingOf(word)];
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? RIGHT : LEFT;
  return dy > 0 ? DOWN : UP;
}

// A sitter sits on the ground at its spot, where its feet stand as a stander's do, so it needs no lift. The atlas has no sitter seen
// from behind, so one facing up stands, as the mockups drew backs. A chatter stands to talk.
function poseFor(action: number, facing: number): number {
  if (action === ACTION_WALK) return WALK;
  return action === ACTION_SIT && facing !== UP ? SIT : STAND;
}

// What the word says of the street: the bubble over the blob, the good carried, how far into the eating loop the blob is (0
// when it isn't eating), and whether it is indoors. Every blob carrying a good shows the same icon, whatever its wallet.
function writeStreet(people: Required<PlacePeople>, i: number, word: number, eatStep: number): void {
  people.emote[i] = EMOTE_OF_WORD[emoteOf(word)];
  people.item[i] = itemOf(word);
  people.eat[i] = eatingOf(word) === 1 ? 1 + eatStep : 0;
  people.indoors[i] = indoorsOf(word);
}

function writePerson(
  people: Required<PlacePeople>,
  i: number,
  cur: Float32Array,
  prev: Float32Array,
  word: number,
  alpha: number,
  eatStep: number,
): void {
  const at = i * FLOATS_PER_AGENT;
  const dx = cur[at] - prev[at];
  const dy = cur[at + 1] - prev[at + 1];
  const jump = Math.abs(dx) > JUMP_PX || Math.abs(dy) > JUMP_PX;
  const x = Math.round(eased(prev[at], cur[at], alpha, jump));
  const y = Math.round(eased(prev[at + 1], cur[at + 1], alpha, jump));
  const action = actionOf(word);
  const facing = facingFor(dx, dy, jump, action, word);
  // A walker steps with the distance along the way it faces.
  const along = facing === LEFT || facing === RIGHT ? x : y;
  people.x[i] = x;
  people.y[i] = y;
  people.look[i] = lookOf(word);
  people.pose[i] = poseFor(action, facing);
  people.facing[i] = facing;
  people.step[i] = action === ACTION_WALK ? (along >> STRIDE_SHIFT) & 1 : 0;
  writeStreet(people, i, word, eatStep);
}

// The sim's agents as a place's people, one person per agent, rewritten every draw from the two latest snapshots
// (owner request, 10 October 2026). A snapshot's world px are art px, and an agent's point is its person's anchor, the
// ground under its feet. Expression is neutral, with no job yet, and the street's bits of the word, the bubble over a blob (a
// buyer's coin, a chat's speech, an outing's sign), the good carried, eating and indoors, go to the emote and street columns
// (M2.7). A sitter sits and a chatter stands, each facing as the word says (M3.2).
export class TownPeople {
  // Made again only when the agent count changes, so a draw allocates nothing.
  columns: Required<PlacePeople>;

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
    const eatStep = Math.floor(retained.tick / EAT_TICKS) & EAT_STEP_MASK;
    for (let i = 0; i < count; i++) writePerson(this.columns, i, cur, prev, words[i * FLOATS_PER_AGENT + 2], alpha, eatStep);
  }
}
